import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from app.connectors.base import BaseConnector

# A text-declared column is flagged as a type mismatch once at least this
# fraction of its non-null values successfully parse as numeric. A strict
# 100%-must-convert check misses the most common real-world case -- a
# genuinely numeric column with one stray typo or placeholder value -- since
# a single unconvertible value would otherwise hide an entire column of
# obvious numbers. A high threshold still keeps genuinely text columns
# (names, emails, ...) from being misflagged, since those convert at or near
# 0%, nowhere close to this bar.
TYPE_MISMATCH_CONVERSION_THRESHOLD = 0.95


def detect_type_mismatch(series: pd.Series, declared_type: str) -> bool:
    normalized = declared_type.lower().split("(")[0].strip()
    excluded_types = [
        "int", "float", "double", "real", "numeric", "decimal",
        "timestamp", "date", "time", "bool", "boolean", "json"
    ]
    if any(t in normalized for t in excluded_types):
        return False
    non_null = series.dropna()
    if len(non_null) == 0:
        return False
    try:
        convertible_ratio = pd.to_numeric(non_null, errors="coerce").notna().mean()
    except (ValueError, TypeError):
        return False
    return bool(convertible_ratio >= TYPE_MISMATCH_CONVERSION_THRESHOLD)


def safe_top_values(series: pd.Series) -> List[Dict[str, Any]]:
    try:
        safe_series = series.copy()
        safe_series = safe_series.apply(
            lambda x: str(x) if isinstance(x, (list, dict)) else x
        )
        counts = safe_series.value_counts().head(5)
        return [
            {"value": str(val), "count": int(count)}
            for val, count in counts.items()
        ]
    except Exception:
        return []


def profile_column(
    series: pd.Series,
    column_name: str,
    declared_type: str
) -> Dict[str, Any]:
    # Convert any unhashable types (lists, dicts from JSON columns) to strings
    # before any computation. This affects JSON/JSONB columns from PostgreSQL.
    if series.dtype == object:
        series = series.apply(
            lambda x: str(x) if isinstance(x, (list, dict)) else x
        )

    total_count = len(series)
    null_count = int(series.isnull().sum())
    null_percentage = round((null_count / total_count * 100), 2) if total_count > 0 else 0.0
    unique_count = int(series.nunique())
    uniqueness_ratio = round(unique_count / total_count, 4) if total_count > 0 else 0.0
    non_null = series.dropna()
    top_values = safe_top_values(series)

    numeric_stats = None
    normalized_type = declared_type.lower().split("(")[0].strip()
    numeric_indicators = ["int", "float", "numeric", "decimal", "real", "double", "bigint", "smallint"]
    is_numeric = any(ind in normalized_type for ind in numeric_indicators)

    if is_numeric and len(non_null) > 0:
        try:
            numeric_series = pd.to_numeric(non_null, errors="coerce").dropna()
            if len(numeric_series) > 0:
                numeric_stats = {
                    "min": round(float(numeric_series.min()), 4),
                    "max": round(float(numeric_series.max()), 4),
                    "mean": round(float(numeric_series.mean()), 4),
                    "median": round(float(numeric_series.median()), 4),
                    "std_dev": round(float(numeric_series.std()), 4) if len(numeric_series) > 1 else 0.0
                }
        except Exception:
            pass

    return {
        "column_name": column_name,
        "declared_type": declared_type,
        "total_count": total_count,
        "null_count": null_count,
        "null_percentage": null_percentage,
        "unique_count": unique_count,
        "uniqueness_ratio": uniqueness_ratio,
        "top_values": top_values,
        "numeric_stats": numeric_stats,
        "suspected_type_mismatch": detect_type_mismatch(series, declared_type)
    }


def profile_table(
    connector: BaseConnector,
    table_name: str,
    columns: List[Dict[str, Any]]
) -> Dict[str, Any]:
    try:
        df = connector.run_query(f"SELECT * FROM {table_name}")
    except Exception as e:
        return {
            "table_name": table_name,
            "error": str(e),
            "row_count": 0,
            "duplicate_count": 0,
            "duplicate_percentage": 0.0,
            "columns": []
        }

    row_count = len(df)

    try:
        df_safe = df.copy()
        for col in df_safe.columns:
            if df_safe[col].dtype == object:
                df_safe[col] = df_safe[col].apply(
                    lambda x: str(x) if isinstance(x, (list, dict)) else x
                )
        duplicate_count = int(df_safe.duplicated().sum())
    except Exception:
        duplicate_count = 0

    duplicate_percentage = round((duplicate_count / row_count * 100), 2) if row_count > 0 else 0.0

    column_profiles = []
    for col_info in columns:
        col_name = col_info["name"]
        declared_type = col_info["type"]
        if col_name not in df.columns:
            continue
        col_profile = profile_column(df[col_name], col_name, declared_type)
        column_profiles.append(col_profile)

    return {
        "table_name": table_name,
        "row_count": row_count,
        "duplicate_count": duplicate_count,
        "duplicate_percentage": duplicate_percentage,
        "columns": column_profiles
    }


def profile_database(
    connector: BaseConnector,
    schema: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    results = []
    for table in schema:
        table_profile = profile_table(
            connector,
            table["table_name"],
            table["columns"]
        )
        results.append(table_profile)
    return results