"""
Warehouse Designer
==================
Classifies operational database tables into fact and dimension tables
using structural heuristics, then generates a star or snowflake schema
design with DDL SQL.

Classification heuristics (all empirically chosen):
    Fact table signals:
        - Row count in top 25% of all tables
        - 2+ foreign key columns
        - 1+ numeric measure columns (amount, price, quantity etc)
        - 1+ date/timestamp columns

    Dimension table signals:
        - Row count in bottom 75% of all tables
        - Primarily descriptive/categorical columns
        - Referenced by foreign keys from other tables

Schema recommendation:
    Star schema:    dimension tables have no outgoing foreign keys
    Snowflake:      one or more dimension tables have their own
                    foreign keys pointing to other tables
"""

from typing import List, Dict, Any, Optional, Tuple
import re

MEASURE_KEYWORDS = [
    "amount", "price", "cost", "revenue", "sales", "quantity", "qty",
    "total", "sum", "value", "balance", "fee", "rate", "salary",
    "income", "expense", "profit", "loss", "discount", "tax", "weight",
    "volume", "count", "number", "score", "rating"
]

DATE_KEYWORDS = [
    "date", "time", "at", "on", "created", "updated", "modified",
    "timestamp", "datetime", "day", "month", "year", "period"
]

DESCRIPTIVE_KEYWORDS = [
    "name", "description", "type", "status", "category", "code",
    "label", "title", "address", "city", "country", "region",
    "email", "phone", "gender", "flag", "indicator"
]

NUMERIC_TYPES = {
    "integer", "bigint", "smallint", "int", "int4", "int8",
    "numeric", "decimal", "real", "double precision", "float"
}

DATE_TYPES = {
    "timestamp", "date", "time", "timestamptz",
    "timestamp with time zone", "timestamp without time zone"
}


def normalize_type(type_str: str) -> str:
    return type_str.lower().split("(")[0].strip()


def is_numeric_column(col: Dict[str, Any]) -> bool:
    return normalize_type(col["type"]) in NUMERIC_TYPES


def is_date_column(col: Dict[str, Any]) -> bool:
    normalized = normalize_type(col["type"])
    if normalized in DATE_TYPES:
        return True
    col_name = col["name"].lower()
    return any(kw in col_name for kw in DATE_KEYWORDS)


def is_measure_column(col: Dict[str, Any]) -> bool:
    if not is_numeric_column(col):
        return False
    if col.get("is_primary_key"):
        return False
    if col.get("foreign_key"):
        return False
    col_name = col["name"].lower()
    return any(kw in col_name for kw in MEASURE_KEYWORDS)


def is_descriptive_column(col: Dict[str, Any]) -> bool:
    normalized = normalize_type(col["type"])
    if normalized in {"varchar", "text", "char", "character varying", "string"}:
        return True
    col_name = col["name"].lower()
    return any(kw in col_name for kw in DESCRIPTIVE_KEYWORDS)


def compute_fact_score(
    table: Dict[str, Any],
    all_tables: List[Dict[str, Any]]
) -> float:
    score = 0.0
    columns = table["columns"]

    row_counts = [t["row_count"] for t in all_tables if t["row_count"] > 0]
    if row_counts:
        percentile_75 = sorted(row_counts)[int(len(row_counts) * 0.75)]
        if table["row_count"] >= percentile_75:
            score += 30.0

    fk_count = sum(1 for col in columns if col.get("foreign_key"))
    if fk_count >= 3:
        score += 30.0
    elif fk_count >= 2:
        score += 20.0
    elif fk_count == 1:
        score += 5.0

    measure_count = sum(1 for col in columns if is_measure_column(col))
    if measure_count >= 2:
        score += 25.0
    elif measure_count == 1:
        score += 15.0

    date_count = sum(1 for col in columns if is_date_column(col))
    if date_count >= 1:
        score += 15.0

    return min(score, 100.0)


def classify_tables(
    schema: List[Dict[str, Any]]
) -> Tuple[List[str], List[str]]:
    scores = {}
    for table in schema:
        scores[table["table_name"]] = compute_fact_score(table, schema)

    sorted_tables = sorted(scores.items(), key=lambda x: x[1], reverse=True)

    fact_tables = []
    dimension_tables = []

    for table_name, score in sorted_tables:
        if score >= 50:
            fact_tables.append(table_name)
        else:
            dimension_tables.append(table_name)

    if not fact_tables and sorted_tables:
        fact_tables.append(sorted_tables[0][0])
        dimension_tables = [t for t in dimension_tables
                           if t != sorted_tables[0][0]]

    return fact_tables, dimension_tables


def identify_measures(table: Dict[str, Any]) -> List[Dict[str, Any]]:
    measures = []
    for col in table["columns"]:
        if is_measure_column(col):
            measures.append({
                "column_name": col["name"],
                "data_type": col["type"],
                "suggested_aggregations": suggest_aggregations(col["name"])
            })
    return measures


def suggest_aggregations(column_name: str) -> List[str]:
    name = column_name.lower()
    if any(kw in name for kw in ["quantity", "qty", "count", "number"]):
        return ["SUM", "AVG", "MAX", "MIN"]
    if any(kw in name for kw in ["rate", "ratio", "percentage", "score"]):
        return ["AVG", "MAX", "MIN"]
    return ["SUM", "AVG", "MAX", "MIN"]


def identify_dimensions(table: Dict[str, Any]) -> List[Dict[str, Any]]:
    dimensions = []
    for col in table["columns"]:
        if col.get("is_primary_key"):
            continue
        if col.get("foreign_key"):
            continue
        if is_measure_column(col):
            continue
        dimensions.append({
            "column_name": col["name"],
            "data_type": col["type"],
            "is_date": is_date_column(col),
            "is_descriptive": is_descriptive_column(col)
        })
    return dimensions


def recommend_schema_type(
    schema: List[Dict[str, Any]],
    dimension_table_names: List[str]
) -> str:
    for table in schema:
        if table["table_name"] not in dimension_table_names:
            continue
        for col in table["columns"]:
            if col.get("foreign_key"):
                referenced = col["foreign_key"].get("referenced_table")
                if referenced and referenced in dimension_table_names:
                    return "snowflake"
    return "star"


WAREHOUSE_SCHEMA = "stratum_warehouse"


def generate_dimension_ddl_postgres(
    table: Dict[str, Any],
    warehouse_table_name: str,
    source_schema: str = "public"
) -> str:
    """
    Generates CREATE TABLE AS SELECT for PostgreSQL deployment.
    Uses stratum_warehouse schema for warehouse tables.
    References source schema explicitly.
    """
    source_table = table["table_name"]
    col_selections = [
        f"    {col['name']}" for col in table["columns"]
    ]
    col_selections.append("    CURRENT_TIMESTAMP as dw_created_at")
    col_selections.append("    CURRENT_TIMESTAMP as dw_updated_at")
    cols_str = ",\n".join(col_selections)

    return (
        f"CREATE TABLE {WAREHOUSE_SCHEMA}.{warehouse_table_name} AS\n"
        f"SELECT\n{cols_str}\n"
        f"FROM {source_schema}.{source_table};"
    )


def generate_fact_ddl_postgres(
    table: Dict[str, Any],
    warehouse_table_name: str,
    source_schema: str = "public"
) -> str:
    """
    Generates CREATE TABLE AS SELECT for PostgreSQL deployment.
    """
    source_table = table["table_name"]
    col_selections = [
        f"    {col['name']}" for col in table["columns"]
    ]
    col_selections.append("    CURRENT_TIMESTAMP as dw_created_at")
    cols_str = ",\n".join(col_selections)

    return (
        f"CREATE TABLE {WAREHOUSE_SCHEMA}.{warehouse_table_name} AS\n"
        f"SELECT\n{cols_str}\n"
        f"FROM {source_schema}.{source_table};"
    )


def generate_dimension_ddl_duckdb(
    table: Dict[str, Any],
    warehouse_table_name: str
) -> str:
    """
    Generates CREATE TABLE AS SELECT for DuckDB sandbox.
    No schema prefix — DuckDB uses a flat namespace per file.
    Source table already exists in DuckDB as a copy.
    """
    source_table = table["table_name"]
    col_selections = [
        f"    {col['name']}" for col in table["columns"]
    ]
    col_selections.append("    CURRENT_TIMESTAMP as dw_created_at")
    col_selections.append("    CURRENT_TIMESTAMP as dw_updated_at")
    cols_str = ",\n".join(col_selections)

    return (
        f"CREATE TABLE IF NOT EXISTS {warehouse_table_name} AS\n"
        f"SELECT\n{cols_str}\n"
        f"FROM {source_table};"
    )


def generate_fact_ddl_duckdb(
    table: Dict[str, Any],
    warehouse_table_name: str
) -> str:
    """
    Generates CREATE TABLE AS SELECT for DuckDB sandbox.
    """
    source_table = table["table_name"]
    col_selections = [
        f"    {col['name']}" for col in table["columns"]
    ]
    col_selections.append("    CURRENT_TIMESTAMP as dw_created_at")
    cols_str = ",\n".join(col_selections)

    return (
        f"CREATE TABLE IF NOT EXISTS {warehouse_table_name} AS\n"
        f"SELECT\n{cols_str}\n"
        f"FROM {source_table};"
    )


def generate_constraints_postgres(
    fact_tables: List[Dict[str, Any]],
    dimension_tables: List[Dict[str, Any]],
    dim_warehouse_names: Dict[str, str],
    fact_warehouse_names: Dict[str, str]
) -> str:
    lines = []

    for dt in dimension_tables:
        wt = dim_warehouse_names[dt["table_name"]]
        pk_cols = [
            col["name"] for col in dt["columns"]
            if col.get("is_primary_key")
        ]
        if pk_cols:
            lines.append(
                f"ALTER TABLE {WAREHOUSE_SCHEMA}.{wt} "
                f"ADD PRIMARY KEY ({pk_cols[0]});"
            )

    for ft in fact_tables:
        wt = fact_warehouse_names[ft["table_name"]]
        pk_cols = [
            col["name"] for col in ft["columns"]
            if col.get("is_primary_key")
        ]
        if pk_cols:
            lines.append(
                f"ALTER TABLE {WAREHOUSE_SCHEMA}.{wt} "
                f"ADD PRIMARY KEY ({pk_cols[0]});"
            )
        fk_cols = [
            col["name"] for col in ft["columns"]
            if col.get("foreign_key")
        ]
        for fk_col in fk_cols:
            lines.append(
                f"CREATE INDEX idx_{wt}_{fk_col} "
                f"ON {WAREHOUSE_SCHEMA}.{wt}({fk_col});"
            )
        date_cols = [
            col["name"] for col in ft["columns"]
            if is_date_column(col) and not col.get("is_primary_key")
        ]
        for date_col in date_cols[:1]:
            lines.append(
                f"CREATE INDEX idx_{wt}_{date_col} "
                f"ON {WAREHOUSE_SCHEMA}.{wt}({date_col});"
            )

    return "\n".join(lines)


def generate_constraints_duckdb(
    fact_tables: List[Dict[str, Any]],
    dimension_tables: List[Dict[str, Any]],
    dim_warehouse_names: Dict[str, str],
    fact_warehouse_names: Dict[str, str]
) -> str:
    """
    DuckDB supports primary keys but not all constraint syntax.
    Generate only what DuckDB supports.
    """
    lines = []

    for dt in dimension_tables:
        wt = dim_warehouse_names[dt["table_name"]]
        pk_cols = [
            col["name"] for col in dt["columns"]
            if col.get("is_primary_key")
        ]
        if pk_cols:
            lines.append(
                f"CREATE UNIQUE INDEX idx_{wt}_pk "
                f"ON {wt}({pk_cols[0]});"
            )

    for ft in fact_tables:
        wt = fact_warehouse_names[ft["table_name"]]
        fk_cols = [
            col["name"] for col in ft["columns"]
            if col.get("foreign_key")
        ]
        for fk_col in fk_cols:
            lines.append(
                f"CREATE INDEX idx_{wt}_{fk_col} ON {wt}({fk_col});"
            )

    return "\n".join(lines)


def design_warehouse(
    schema: List[Dict[str, Any]],
    source_schema: str = "public"
) -> Dict[str, Any]:

    fact_table_names, dimension_table_names = classify_tables(schema)
    schema_type = recommend_schema_type(schema, dimension_table_names)
    table_lookup = {t["table_name"]: t for t in schema}

    dim_warehouse_names = {
        name: f"dim_{name}" for name in dimension_table_names
    }
    fact_warehouse_names = {
        name: f"fact_{name}" for name in fact_table_names
    }

    fact_tables_data = []
    for table_name in fact_table_names:
        table = table_lookup.get(table_name)
        if not table:
            continue
        measures = identify_measures(table)
        dimensions = identify_dimensions(table)
        ddl_pg = generate_fact_ddl_postgres(
            table, fact_warehouse_names[table_name], source_schema
        )
        ddl_duck = generate_fact_ddl_duckdb(
            table, fact_warehouse_names[table_name]
        )
        fact_tables_data.append({
            "source_table": table_name,
            "warehouse_table": fact_warehouse_names[table_name],
            "fact_score": compute_fact_score(table, schema),
            "measures": measures,
            "dimensions": dimensions,
            "row_count": table["row_count"],
            "ddl_postgres": ddl_pg,
            "ddl_duckdb": ddl_duck,
            "ddl": ddl_pg,
            "classification_reasons": build_fact_reasons(table, schema)
        })

    dimension_tables_data = []
    for table_name in dimension_table_names:
        table = table_lookup.get(table_name)
        if not table:
            continue
        attributes = identify_dimensions(table)
        ddl_pg = generate_dimension_ddl_postgres(
            table, dim_warehouse_names[table_name], source_schema
        )
        ddl_duck = generate_dimension_ddl_duckdb(
            table, dim_warehouse_names[table_name]
        )
        dimension_tables_data.append({
            "source_table": table_name,
            "warehouse_table": dim_warehouse_names[table_name],
            "attributes": attributes,
            "row_count": table["row_count"],
            "ddl_postgres": ddl_pg,
            "ddl_duckdb": ddl_duck,
            "ddl": ddl_pg,
            "classification_reasons": build_dim_reasons(table, schema)
        })

    header_pg = (
        f"-- STRATUM GENERATED WAREHOUSE SCRIPT (PostgreSQL)\n"
        f"-- Schema Type: {schema_type.upper()}\n"
        f"-- Source Schema: {source_schema}\n"
        f"-- Warehouse Schema: {WAREHOUSE_SCHEMA}\n"
        f"-- Safe to execute against your PostgreSQL database\n\n"
        f"CREATE SCHEMA IF NOT EXISTS {WAREHOUSE_SCHEMA};\n"
    )

    header_duck = (
        f"-- STRATUM GENERATED WAREHOUSE SCRIPT (DuckDB Sandbox)\n"
        f"-- Schema Type: {schema_type.upper()}\n"
        f"-- Execute via Stratum sandbox only\n\n"
    )

    dim_pg = "-- DIMENSION TABLES\n\n" + "\n\n".join(
        dt["ddl_postgres"] for dt in dimension_tables_data
    )
    dim_duck = "-- DIMENSION TABLES\n\n" + "\n\n".join(
        dt["ddl_duckdb"] for dt in dimension_tables_data
    )

    fact_pg = "-- FACT TABLES\n\n" + "\n\n".join(
        ft["ddl_postgres"] for ft in fact_tables_data
    )
    fact_duck = "-- FACT TABLES\n\n" + "\n\n".join(
        ft["ddl_duckdb"] for ft in fact_tables_data
    )

    constraint_pg = (
        "-- PRIMARY KEYS AND INDEXES\n\n" +
        generate_constraints_postgres(
            [table_lookup[ft["source_table"]] for ft in fact_tables_data],
            [table_lookup[dt["source_table"]] for dt in dimension_tables_data],
            dim_warehouse_names,
            fact_warehouse_names
        )
    )

    constraint_duck = (
        "-- INDEXES\n\n" +
        generate_constraints_duckdb(
            [table_lookup[ft["source_table"]] for ft in fact_tables_data],
            [table_lookup[dt["source_table"]] for dt in dimension_tables_data],
            dim_warehouse_names,
            fact_warehouse_names
        )
    )

    full_ddl_postgres = "\n\n".join([
        header_pg, dim_pg, fact_pg, constraint_pg
    ])

    full_ddl_duckdb = "\n\n".join([
        header_duck, dim_duck, fact_duck, constraint_duck
    ])

    return {
        "schema_type": schema_type,
        "fact_tables": fact_tables_data,
        "dimension_tables": dimension_tables_data,
        "full_ddl": full_ddl_postgres,
        "full_ddl_postgres": full_ddl_postgres,
        "full_ddl_duckdb": full_ddl_duckdb,
        "fact_count": len(fact_tables_data),
        "dimension_count": len(dimension_tables_data),
        "warehouse_table_names": (
            list(dim_warehouse_names.values()) +
            list(fact_warehouse_names.values())
        )
    }


def build_fact_reasons(
    table: Dict[str, Any],
    all_tables: List[Dict[str, Any]]
) -> List[str]:
    reasons = []
    columns = table["columns"]

    row_counts = [t["row_count"] for t in all_tables if t["row_count"] > 0]
    if row_counts:
        percentile_75 = sorted(row_counts)[int(len(row_counts) * 0.75)]
        if table["row_count"] >= percentile_75:
            reasons.append(
                f"High row count ({table['row_count']} rows) — "
                f"tables with many rows typically record business events"
            )

    fk_count = sum(1 for col in columns if col.get("foreign_key"))
    if fk_count >= 2:
        reasons.append(
            f"{fk_count} foreign key columns — "
            f"fact tables reference multiple dimension tables"
        )

    measure_cols = [col["name"] for col in columns if is_measure_column(col)]
    if measure_cols:
        reasons.append(
            f"Contains numeric measure columns: "
            f"{', '.join(measure_cols[:3])} — suitable for aggregation"
        )

    date_cols = [col["name"] for col in columns if is_date_column(col)]
    if date_cols:
        reasons.append(
            f"Contains date column {date_cols[0]} — "
            f"fact tables record when events occurred"
        )

    return reasons


def build_dim_reasons(
    table: Dict[str, Any],
    all_tables: List[Dict[str, Any]]
) -> List[str]:
    reasons = []
    columns = table["columns"]

    row_counts = [t["row_count"] for t in all_tables if t["row_count"] > 0]
    if row_counts:
        median = sorted(row_counts)[len(row_counts) // 2]
        if table["row_count"] <= median:
            reasons.append(
                f"Lower row count ({table['row_count']} rows) — "
                f"dimension tables are typically smaller reference datasets"
            )

    descriptive = [
        col["name"] for col in columns if is_descriptive_column(col)
    ]
    if descriptive:
        reasons.append(
            f"Contains descriptive attributes: "
            f"{', '.join(descriptive[:3])} — "
            f"dimension tables describe business entities"
        )

    fk_count = sum(1 for col in columns if col.get("foreign_key"))
    if fk_count == 0:
        reasons.append(
            "No outgoing foreign keys — "
            "dimension tables serve as lookup targets"
        )

    return reasons