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
        "issues": issues
    }