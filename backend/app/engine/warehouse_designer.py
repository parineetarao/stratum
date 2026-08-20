"""
Warehouse Designer
==================
Classifies operational database tables into fact and dimension tables
using structural heuristics, then generates a star, snowflake, or galaxy
schema design with DDL SQL.

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

Schema recommendation (two independent axes - fact cardinality takes
precedence over dimension normalization, since star/snowflake are both
single-fact-table concepts):
    Galaxy:         more than one fact table shares the dimension set
                    (a fact constellation)
    Snowflake:      exactly one fact table, and one or more dimension
                    tables have their own foreign keys pointing to
                    other dimension tables
    Star:           exactly one fact table, dimension tables have no
                    outgoing foreign keys
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


def identify_primary_keys(table: Dict[str, Any]) -> List[str]:
    return [col["name"] for col in table["columns"] if col.get("is_primary_key")]


def identify_foreign_keys(
    table: Dict[str, Any],
    dim_warehouse_names: Dict[str, str],
    fact_warehouse_names: Dict[str, str]
) -> List[Dict[str, Any]]:
    """
    Outgoing foreign keys from this table to other tables that were
    classified into the warehouse (fact or dimension), mapped to their
    warehouse table names. Used to draw diagram edges and validate joins.
    """
    all_warehouse_names = {**dim_warehouse_names, **fact_warehouse_names}
    foreign_keys = []
    for col in table["columns"]:
        fk = col.get("foreign_key")
        if not fk:
            continue
        referenced = fk.get("referenced_table")
        warehouse_name = all_warehouse_names.get(referenced)
        if not warehouse_name:
            continue
        foreign_keys.append({
            "column_name": col["name"],
            "references_table": referenced,
            "references_warehouse_table": warehouse_name,
            "references_column": fk.get("referenced_column")
        })
    return foreign_keys


def recommend_schema_type(
    schema: List[Dict[str, Any]],
    fact_table_names: List[str],
    dimension_table_names: List[str]
) -> str:
    """
    Classifies the overall warehouse structure along two independent axes:

        Fact cardinality:      one fact table vs. several sharing dimensions
        Dimension normalization: denormalized dimensions vs. dimensions that
                                  themselves reference other dimensions

    More than one fact table means multiple fact tables share a conformed
    set of dimensions - a fact constellation / galaxy schema - which takes
    precedence over the star/snowflake distinction, since star and
    snowflake are both single-fact-table concepts.
    """
    if len(fact_table_names) > 1:
        return "galaxy"

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


def build_surrogate_key_joins(
    foreign_keys: List[Dict[str, Any]],
    dim_warehouse_names: Dict[str, str]
) -> List[Dict[str, str]]:
    """
    Selects, from a fact table's identified foreign keys, only the ones
    that point to a dimension table built by this warehouse design (not
    another fact table - a galaxy-schema fact-to-fact reference has no
    dw_id to rewire to and is left untouched).

    Each entry drives one LEFT JOIN ... dw_id AS dw_<table>_key in the
    generated fact DDL. This uses only foreign-key metadata already
    present on the discovered schema (real DB constraints, or user-
    accepted inferred relationships promoted via relationships.py) -
    no new relationship inference happens here.
    """
    joins: List[Dict[str, str]] = []
    used_names = set()
    for fk in foreign_keys:
        references_table = fk.get("references_table")
        column_name = fk.get("column_name")
        references_column = fk.get("references_column")
        if not references_table or not column_name or not references_column:
            continue
        if references_table not in dim_warehouse_names:
            # Points at a fact table (galaxy schema) or an unclassified
            # table - no dimension dw_id exists to rewire to.
            continue

        dw_key_name = f"dw_{references_table}_key"
        if dw_key_name in used_names:
            # A fact table with two FKs into the same dimension (e.g.
            # ship_from/ship_to) needs distinguishable key names.
            dw_key_name = f"dw_{references_table}_{column_name}_key"
        used_names.add(dw_key_name)

        joins.append({
            "column_name": column_name,
            "references_table": references_table,
            "warehouse_table": dim_warehouse_names[references_table],
            "references_column": references_column,
            "dw_key_name": dw_key_name,
        })
    return joins


def _dimension_select_body(
    table: Dict[str, Any],
    natural_key_columns: Optional[List[str]]
) -> str:
    """
    Builds the SELECT body (no CREATE TABLE header) for a dimension table.

    When a natural key is available, deduplicates rows by that key -
    keeping one row per distinct key value - and assigns a stable dw_id
    surrogate key ordered by the natural key. When no natural key could
    be confidently identified, no deduplication is performed (merging
    rows without a trustworthy key risks silently combining distinct
    records), and dw_id is simply assigned per existing row.
    """
    source_table = table["table_name"]
    col_names = [col["name"] for col in table["columns"]]
    col_list = ",\n        ".join(col_names)

    if natural_key_columns:
        nk = ", ".join(natural_key_columns)
        outer_cols = ",\n    ".join(col_names)
        return (
            f"SELECT\n"
            f"    ROW_NUMBER() OVER (ORDER BY {nk}) AS dw_id,\n"
            f"    {outer_cols},\n"
            f"    CURRENT_TIMESTAMP as dw_created_at,\n"
            f"    CURRENT_TIMESTAMP as dw_updated_at\n"
            f"FROM (\n"
            f"    SELECT\n"
            f"        {col_list},\n"
            f"        ROW_NUMBER() OVER (PARTITION BY {nk} ORDER BY {nk}) "
            f"AS _dw_dedup_rank\n"
            f"    FROM {source_table}\n"
            f") _dw_deduped\n"
            f"WHERE _dw_dedup_rank = 1"
        )

    # Fallback: no reliable natural key identified for this table. Assign
    # a surrogate key per row without deduplication rather than guess.
    outer_cols = ",\n    ".join(col_names)
    return (
        f"SELECT\n"
        f"    ROW_NUMBER() OVER () AS dw_id,\n"
        f"    {outer_cols},\n"
        f"    CURRENT_TIMESTAMP as dw_created_at,\n"
        f"    CURRENT_TIMESTAMP as dw_updated_at\n"
        f"FROM {source_table}"
    )


def _fact_select_body(
    table: Dict[str, Any],
    surrogate_key_joins: List[Dict[str, str]],
    dim_table_prefix: str = ""
) -> str:
    """
    Builds the SELECT body (no CREATE TABLE header) for a fact table.
    All original source columns (including the original natural-key FK
    columns, e.g. customer_id) are preserved unchanged for backward
    compatibility. One dw_<table>_key column is appended per resolved
    surrogate_key_joins entry, populated via LEFT JOIN from the fact's
    original FK column to the dimension's natural key, resolving to the
    dimension's dw_id. dim_table_prefix allows qualifying the joined
    dimension table with a schema (PostgreSQL) when needed.
    """
    source_table = table["table_name"]
    alias = "src"
    col_selections = [f"    {alias}.{col['name']}" for col in table["columns"]]

    join_clauses = []
    surrogate_selections = []
    for i, link in enumerate(surrogate_key_joins):
        dim_alias = f"_dwjoin_{i}"
        dim_table = f"{dim_table_prefix}{link['warehouse_table']}"
        join_clauses.append(
            f"LEFT JOIN {dim_table} AS {dim_alias} "
            f"ON {alias}.{link['column_name']} = {dim_alias}.{link['references_column']}"
        )
        surrogate_selections.append(f"    {dim_alias}.dw_id AS {link['dw_key_name']}")

    all_selections = col_selections + surrogate_selections
    cols_str = ",\n".join(all_selections)
    join_str = ("\n" + "\n".join(join_clauses)) if join_clauses else ""

    return f"SELECT\n{cols_str}\nFROM {source_table} AS {alias}{join_str}"


def generate_dimension_ddl_postgres(
    table: Dict[str, Any],
    warehouse_table_name: str,
    source_schema: str = "public",
    natural_key_columns: Optional[List[str]] = None
) -> str:
    """
    Generates CREATE TABLE AS SELECT for PostgreSQL deployment.
    Uses stratum_warehouse schema for warehouse tables.
    References source schema explicitly.
    Deduplicates by natural_key_columns and assigns a dw_id surrogate key
    (see _dimension_select_body).
    """
    body = _dimension_select_body(table, natural_key_columns).replace(
        f"FROM {table['table_name']}", f"FROM {source_schema}.{table['table_name']}"
    )
    return (
        f"CREATE TABLE {WAREHOUSE_SCHEMA}.{warehouse_table_name} AS\n"
        f"{body};"
    )


def generate_fact_ddl_postgres(
    table: Dict[str, Any],
    warehouse_table_name: str,
    source_schema: str = "public",
    surrogate_key_joins: Optional[List[Dict[str, str]]] = None
) -> str:
    """
    Generates CREATE TABLE AS SELECT for PostgreSQL deployment.
    Appends dw_<table>_key surrogate FK columns (see _fact_select_body).
    """
    body = _fact_select_body(
        table, surrogate_key_joins or [], dim_table_prefix=f"{WAREHOUSE_SCHEMA}."
    ).replace(
        f"FROM {table['table_name']} AS src",
        f"FROM {source_schema}.{table['table_name']} AS src"
    )
    select_part, from_part = body.split("\nFROM ", 1)
    return (
        f"CREATE TABLE {WAREHOUSE_SCHEMA}.{warehouse_table_name} AS\n"
        f"{select_part},\n    CURRENT_TIMESTAMP as dw_created_at\n"
        f"FROM {from_part};"
    )


def generate_dimension_ddl_duckdb(
    table: Dict[str, Any],
    warehouse_table_name: str,
    natural_key_columns: Optional[List[str]] = None
) -> str:
    """
    Generates CREATE TABLE AS SELECT for DuckDB sandbox.
    No schema prefix — DuckDB uses a flat namespace per file.
    Source table already exists in DuckDB as a copy.
    Deduplicates by natural_key_columns and assigns a dw_id surrogate key
    (see _dimension_select_body).
    """
    body = _dimension_select_body(table, natural_key_columns)
    return (
        f"CREATE TABLE IF NOT EXISTS {warehouse_table_name} AS\n"
        f"{body};"
    )


def generate_fact_ddl_duckdb(
    table: Dict[str, Any],
    warehouse_table_name: str,
    surrogate_key_joins: Optional[List[Dict[str, str]]] = None
) -> str:
    """
    Generates CREATE TABLE AS SELECT for DuckDB sandbox.
    Appends dw_<table>_key surrogate FK columns (see _fact_select_body).
    """
    body = _fact_select_body(table, surrogate_key_joins or [])
    select_part, from_part = body.split("\nFROM ", 1)
    return (
        f"CREATE TABLE IF NOT EXISTS {warehouse_table_name} AS\n"
        f"{select_part},\n    CURRENT_TIMESTAMP as dw_created_at\n"
        f"FROM {from_part};"
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
                f"ADD PRIMARY KEY ({', '.join(pk_cols)});"
            )
        lines.append(
            f"CREATE UNIQUE INDEX idx_{wt}_dwid "
            f"ON {WAREHOUSE_SCHEMA}.{wt}(dw_id);"
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
                f"ADD PRIMARY KEY ({', '.join(pk_cols)});"
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
                f"ON {wt}({', '.join(pk_cols)});"
            )
        lines.append(
            f"CREATE UNIQUE INDEX idx_{wt}_dwid ON {wt}(dw_id);"
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
    source_schema: str = "public",
    overrides: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:

    fact_table_names, dimension_table_names = classify_tables(schema)

    if overrides:
        known_tables = {t["table_name"] for t in schema}
        for table_name, classification in overrides.items():
            if table_name not in known_tables:
                continue
            if classification == "fact":
                if table_name in dimension_table_names:
                    dimension_table_names.remove(table_name)
                if table_name not in fact_table_names:
                    fact_table_names.append(table_name)
            elif classification == "dimension":
                if table_name in fact_table_names:
                    fact_table_names.remove(table_name)
                if table_name not in dimension_table_names:
                    dimension_table_names.append(table_name)

    schema_type = recommend_schema_type(schema, fact_table_names, dimension_table_names)
    table_lookup = {t["table_name"]: t for t in schema}

    dim_warehouse_names = {
        name: f"dim_{name}" for name in dimension_table_names
    }
    fact_warehouse_names = {
        name: f"fact_{name}" for name in fact_table_names
    }

    # Dimension natural keys are resolved first since fact tables need to
    # know which dimensions have a trustworthy dedup key when deciding
    # whether joins are meaningful; the actual JOIN itself only needs the
    # dimension's warehouse table name, which dim_warehouse_names already has.
    dimension_natural_keys = {
        name: identify_primary_keys(table_lookup[name])
        for name in dimension_table_names
        if table_lookup.get(name)
    }

    dimension_tables_data = []
    for table_name in dimension_table_names:
        table = table_lookup.get(table_name)
        if not table:
            continue
        attributes = identify_dimensions(table)
        foreign_keys = identify_foreign_keys(
            table, dim_warehouse_names, fact_warehouse_names
        )
        natural_key = dimension_natural_keys.get(table_name) or []
        ddl_pg = generate_dimension_ddl_postgres(
            table, dim_warehouse_names[table_name], source_schema, natural_key
        )
        ddl_duck = generate_dimension_ddl_duckdb(
            table, dim_warehouse_names[table_name], natural_key
        )
        dimension_tables_data.append({
            "source_table": table_name,
            "warehouse_table": dim_warehouse_names[table_name],
            "attributes": attributes,
            "foreign_keys": foreign_keys,
            "primary_key": identify_primary_keys(table),
            "natural_key": natural_key,
            "surrogate_key": "dw_id",
            "deduplicated": bool(natural_key),
            "row_count": table["row_count"],
            "ddl_postgres": ddl_pg,
            "ddl_duckdb": ddl_duck,
            "ddl": ddl_pg,
            "classification_reasons": build_dim_reasons(table, schema)
        })

    fact_tables_data = []
    for table_name in fact_table_names:
        table = table_lookup.get(table_name)
        if not table:
            continue
        measures = identify_measures(table)
        dimensions = identify_dimensions(table)
        foreign_keys = identify_foreign_keys(
            table, dim_warehouse_names, fact_warehouse_names
        )
        surrogate_key_joins = build_surrogate_key_joins(
            foreign_keys, dim_warehouse_names
        )
        ddl_pg = generate_fact_ddl_postgres(
            table, fact_warehouse_names[table_name], source_schema, surrogate_key_joins
        )
        ddl_duck = generate_fact_ddl_duckdb(
            table, fact_warehouse_names[table_name], surrogate_key_joins
        )
        fact_tables_data.append({
            "source_table": table_name,
            "warehouse_table": fact_warehouse_names[table_name],
            "fact_score": compute_fact_score(table, schema),
            "measures": measures,
            "dimensions": dimensions,
            "foreign_keys": foreign_keys,
            "surrogate_key_joins": surrogate_key_joins,
            "primary_key": identify_primary_keys(table),
            "row_count": table["row_count"],
            "ddl_postgres": ddl_pg,
            "ddl_duckdb": ddl_duck,
            "ddl": ddl_pg,
            "classification_reasons": build_fact_reasons(table, schema)
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
        ),
        "overrides": overrides or {}
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