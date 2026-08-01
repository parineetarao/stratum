from typing import List, Dict, Any, Tuple

NULL_RATE_CRITICAL_THRESHOLD = 50.0
NULL_RATE_WARNING_THRESHOLD = 20.0
DUPLICATE_RATE_CRITICAL_THRESHOLD = 5.0
LOW_CARDINALITY_THRESHOLD = 0.01

COMPLETENESS_WEIGHT = 0.45
UNIQUENESS_WEIGHT = 0.30
CONSISTENCY_WEIGHT = 0.25


def compute_completeness_score(tables: List[Dict[str, Any]]) -> float:
    total_columns = 0
    weighted_completeness = 0.0

    for table in tables:
        for col in table["columns"]:
            total_columns += 1
            completeness = 1.0 - (col["null_percentage"] / 100.0)
            weighted_completeness += completeness

    if total_columns == 0:
        return 100.0
    return round((weighted_completeness / total_columns) * 100, 2)


def compute_uniqueness_score(tables: List[Dict[str, Any]]) -> float:
    total_tables = len(tables)
    if total_tables == 0:
        return 100.0

    clean_tables = sum(
        1 for t in tables
        if t["duplicate_percentage"] < DUPLICATE_RATE_CRITICAL_THRESHOLD
    )
    return round((clean_tables / total_tables) * 100, 2)


def compute_consistency_score(tables: List[Dict[str, Any]]) -> float:
    total_columns = 0
    consistent_columns = 0

    for table in tables:
        for col in table["columns"]:
            total_columns += 1
            if not col["suspected_type_mismatch"]:
                consistent_columns += 1

    if total_columns == 0:
        return 100.0
    return round((consistent_columns / total_columns) * 100, 2)


def compute_overall_score(
    completeness: float,
    uniqueness: float,
    consistency: float
) -> int:
    score = (
        completeness * COMPLETENESS_WEIGHT +
        uniqueness * UNIQUENESS_WEIGHT +
        consistency * CONSISTENCY_WEIGHT
    )
    return round(score)


def flag_issues(tables: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    issues = []

    for table in tables:
        if table["duplicate_percentage"] >= DUPLICATE_RATE_CRITICAL_THRESHOLD:
            issues.append({
                "severity": "critical",
                "table": table["table_name"],
                "column": None,
                "issue_type": "duplicate_rows",
                "description": (
                    f"Table '{table['table_name']}' has "
                    f"{table['duplicate_count']} duplicate rows "
                    f"({table['duplicate_percentage']}% of total rows)"
                ),
                "metric": table["duplicate_percentage"]
            })
        elif table["duplicate_count"] > 0:
            issues.append({
                "severity": "warning",
                "table": table["table_name"],
                "column": None,
                "issue_type": "duplicate_rows",
                "description": (
                    f"Table '{table['table_name']}' has "
                    f"{table['duplicate_count']} duplicate rows"
                ),
                "metric": table["duplicate_percentage"]
            })

        for col in table["columns"]:
            if col["null_percentage"] >= NULL_RATE_CRITICAL_THRESHOLD:
                issues.append({
                    "severity": "critical",
                    "table": table["table_name"],
                    "column": col["column_name"],
                    "issue_type": "high_null_rate",
                    "description": (
                        f"Column '{col['column_name']}' in '{table['table_name']}' "
                        f"has {col['null_percentage']}% null values"
                    ),
                    "metric": col["null_percentage"]
                })
            elif col["null_percentage"] >= NULL_RATE_WARNING_THRESHOLD:
                issues.append({
                    "severity": "warning",
                    "table": table["table_name"],
                    "column": col["column_name"],
                    "issue_type": "high_null_rate",
                    "description": (
                        f"Column '{col['column_name']}' in '{table['table_name']}' "
                        f"has {col['null_percentage']}% null values"
                    ),
                    "metric": col["null_percentage"]
                })

            if col["suspected_type_mismatch"]:
                issues.append({
                    "severity": "warning",
                    "table": table["table_name"],
                    "column": col["column_name"],
                    "issue_type": "type_mismatch",
                    "description": (
                        f"Column '{col['column_name']}' in '{table['table_name']}' "
                        f"is declared as '{col['declared_type']}' but contains "
                        f"values that suggest a different type"
                    ),
                    "metric": None
                })

            if (
                col["uniqueness_ratio"] < LOW_CARDINALITY_THRESHOLD
                and col["total_count"] > 10
                and col["column_name"].lower() in ["id", "uuid", "key", "code"]
            ):
                issues.append({
                    "severity": "critical",
                    "table": table["table_name"],
                    "column": col["column_name"],
                    "issue_type": "low_cardinality_identifier",
                    "description": (
                        f"Column '{col['column_name']}' in '{table['table_name']}' "
                        f"appears to be an identifier but has very low cardinality "
                        f"(uniqueness ratio: {col['uniqueness_ratio']})"
                    ),
                    "metric": col["uniqueness_ratio"]
                })

    return issues


def table_status_label(score: int) -> str:
    if score >= 90:
        return "Healthy"
    if score >= 80:
        return "Warning"
    if score >= 60:
        return "Needs Review"
    return "Critical"


def score_tables(tables: List[Dict[str, Any]], issues: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    issue_counts: Dict[str, int] = {}
    for issue in issues:
        issue_counts[issue["table"]] = issue_counts.get(issue["table"], 0) + 1

    results = []
    for table in tables:
        completeness = compute_completeness_score([table])
        uniqueness = compute_uniqueness_score([table])
        consistency = compute_consistency_score([table])
        overall = compute_overall_score(completeness, uniqueness, consistency)
        results.append({
            "table_name": table["table_name"],
            "score": overall,
            "status": table_status_label(overall),
            "issue_count": issue_counts.get(table["table_name"], 0)
        })

    return sorted(results, key=lambda t: t["score"])


def compute_potential_score(tables: List[Dict[str, Any]]) -> int:
    adjusted_tables = []
    for table in tables:
        adjusted_columns = [
            {**col, "null_percentage": 0.0, "suspected_type_mismatch": False}
            for col in table["columns"]
        ]
        adjusted_tables.append({
            **table,
            "duplicate_percentage": 0.0,
            "columns": adjusted_columns
        })

    completeness = compute_completeness_score(adjusted_tables)
    uniqueness = compute_uniqueness_score(adjusted_tables)
    consistency = compute_consistency_score(adjusted_tables)
    return compute_overall_score(completeness, uniqueness, consistency)


def summarize_issue_impact(tables: List[Dict[str, Any]], issues: List[Dict[str, Any]]) -> Dict[str, Any]:
    table_lookup = {t["table_name"]: t for t in tables}

    duplicate_tables = {i["table"] for i in issues if i["issue_type"] == "duplicate_rows"}
    duplicate_records = sum(
        table_lookup[t]["duplicate_count"] for t in duplicate_tables if t in table_lookup
    )

    missing_value_issues = [i for i in issues if i["issue_type"] == "high_null_rate"]
    missing_value_tables = {i["table"] for i in missing_value_issues}
    missing_values = 0
    for issue in missing_value_issues:
        table = table_lookup.get(issue["table"], {})
        col = next(
            (c for c in table.get("columns", []) if c["column_name"] == issue["column"]),
            None
        )
        if col:
            missing_values += col["null_count"]

    invalid_format_issues = [i for i in issues if i["issue_type"] == "type_mismatch"]
    invalid_format_tables = {i["table"] for i in invalid_format_issues}

    return {
        "duplicate_records": duplicate_records,
        "duplicate_tables": len(duplicate_tables),
        "missing_values": missing_values,
        "missing_value_tables": len(missing_value_tables),
        "invalid_formats": len(invalid_format_issues),
        "invalid_format_tables": len(invalid_format_tables)
    }


def score_profile(tables: List[Dict[str, Any]]) -> Dict[str, Any]:
    completeness = compute_completeness_score(tables)
    uniqueness = compute_uniqueness_score(tables)
    consistency = compute_consistency_score(tables)
    overall = compute_overall_score(completeness, uniqueness, consistency)
    issues = flag_issues(tables)

    critical_count = sum(1 for i in issues if i["severity"] == "critical")
    warning_count = sum(1 for i in issues if i["severity"] == "warning")

    return {
        "overall_score": overall,
        "completeness_score": completeness,
        "uniqueness_score": uniqueness,
        "consistency_score": consistency,
        "total_issues": len(issues),
        "critical_issues": critical_count,
        "warning_issues": warning_count,
        "issues": issues,
        "table_scores": score_tables(tables, issues),
        "potential_score": compute_potential_score(tables),
        "issue_impact": summarize_issue_impact(tables, issues)
    }