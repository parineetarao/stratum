"""
Relationship Inference Engine
=============================
Infers likely foreign key relationships between tables using three weighted signals:

    1. Name similarity  (weight: 0.55)
       Fuzzy match between the source column name and expected FK naming patterns.
       Preprocessing includes abbreviation expansion and singularization before matching.

    2. Value overlap    (weight: 0.45)
       Proportion of source column values that exist in the target primary key column.

       KNOWN LIMITATION: Value overlap does not account for value distribution.
       A column containing only the value [1, 1, 1, 1] will still produce 100% overlap
       if 1 exists in the target. Future versions should incorporate entropy or
       coverage of the referenced key space as additional signals.

    3. Cardinality ratio (modifier, not a hard filter)
       unique_values / total_values for the source column.
       Used to reduce confidence for columns with near-unique values, which are
       unlikely to be foreign keys. Does not disqualify candidates entirely to
       avoid rejecting legitimate one-to-one relationships.

Confidence weights (empirically chosen, not mathematically derived):
    final_confidence = (name_score * 0.55) + (overlap_score * 0.45)
    cardinality modifier reduces final score if ratio > 0.7

Confidence tiers:
    High   >= 75   auto pre-selected, user can bulk accept
    Medium >= 50   requires individual user review
    Low    <  50   discarded, never shown to user

Candidate generation strategy:
    For each FK candidate column, extract the entity token (e.g. project_id -> project).
    Search for tables whose names semantically match that token.
    If strong matches are found, evaluate ONLY those tables.
    If no strong match exists, fall back to evaluating all primary key tables.

    This means project_id is never compared against users.id or connections.id
    because those table names do not match the entity token 'project'.

    Fallback threshold for targeted search: fuzzy ratio >= 0.75 after
    singularization and abbreviation expansion on both sides.
"""

from typing import List, Dict, Any, Set, Optional, Tuple
from rapidfuzz import fuzz
from app.connectors.base import BaseConnector

MIN_CONFIDENCE = 50
TARGETED_MATCH_THRESHOLD = 0.75

FK_SUFFIXES = ["_id", "_key", "_fk", "_ref", "_code", "_no", "_num", "_number"]

ABBREVIATION_MAP = {
    "cust": "customer",
    "emp": "employee",
    "dept": "department",
    "prod": "product",
    "ord": "order",
    "addr": "address",
    "mgr": "manager",
    "acct": "account",
    "usr": "user",
    "cat": "category",
    "loc": "location",
    "org": "organization",
    "proj": "project",
    "trans": "transaction",
    "inv": "invoice",
    "vend": "vendor",
    "supp": "supplier",
    "branch": "branch",
    "item": "item",
}

NUMERIC_TYPES = {
    "integer", "bigint", "smallint", "int", "int4", "int8",
    "numeric", "decimal", "real", "double precision"
}
STRING_TYPES = {
    "varchar", "text", "char", "character varying", "string"
}


def normalize_type(type_str: str) -> str:
    return type_str.lower().split("(")[0].strip()


def types_are_compatible(type_a: str, type_b: str) -> bool:
    a = normalize_type(type_a)
    b = normalize_type(type_b)
    if a == b:
        return True
    if a in NUMERIC_TYPES and b in NUMERIC_TYPES:
        return True
    if a in STRING_TYPES and b in STRING_TYPES:
        return True
    return False


def expand_abbreviations(name: str) -> str:
    parts = name.lower().replace("-", "_").split("_")
    expanded = []
    for part in parts:
        expanded.append(ABBREVIATION_MAP.get(part, part))
    return "_".join(expanded)


def singularize(word: str) -> str:
    if word.endswith("ies"):
        return word[:-3] + "y"
    if word.endswith("ses") or word.endswith("xes") or word.endswith("zes"):
        return word[:-2]
    if word.endswith("s") and not word.endswith("ss"):
        return word[:-1]
    return word


def is_fk_candidate(column_name: str) -> bool:
    name = column_name.lower()

    for suffix in FK_SUFFIXES:
        if name.endswith(suffix) and name != suffix:
            return True

    expanded = expand_abbreviations(name)
    for suffix in FK_SUFFIXES:
        if expanded.endswith(suffix):
            return True

    camel_converted = ""
    for i, char in enumerate(column_name):
        if char.isupper() and i > 0:
            camel_converted += "_" + char.lower()
        else:
            camel_converted += char.lower()

    for suffix in FK_SUFFIXES:
        if camel_converted.endswith(suffix):
            return True

    return False


def extract_entity_token(column_name: str) -> Optional[str]:
    """
    Extracts the entity reference token from a FK-style column name.

    Examples:
        project_id      -> project
        customer_key    -> customer
        order_item_id   -> order_item
        cust_id         -> cust  (abbreviation expanded separately)
        CustomerID      -> customer (after CamelCase conversion)

    Returns None if no known suffix is found.
    """
    name = column_name.lower()

    camel_converted = ""
    for i, char in enumerate(column_name):
        if char.isupper() and i > 0:
            camel_converted += "_" + char.lower()
        else:
            camel_converted += char.lower()

    for suffix in FK_SUFFIXES:
        if camel_converted.endswith(suffix) and len(camel_converted) > len(suffix):
            token = camel_converted[: -len(suffix)].rstrip("_")
            return token if token else None

    for suffix in FK_SUFFIXES:
        if name.endswith(suffix) and len(name) > len(suffix):
            token = name[: -len(suffix)].rstrip("_")
            return token if token else None

    return None


def find_targeted_tables(
    entity_token: str,
    all_table_names: List[str]
) -> List[str]:
    """
    Given an entity token extracted from a column name, returns the list of
    table names that semantically match that token.

    Matching strategy (in order of priority):
        1. Exact match after singularization on both sides
        2. Exact match after abbreviation expansion on token
        3. Fuzzy match above TARGETED_MATCH_THRESHOLD

    A token like 'project' will match 'projects' via singularization.
    A token like 'cust' will match 'customers' via abbreviation expansion.
    A token like 'table' will match 'discovered_tables' via fuzzy match
        only if the ratio meets the threshold.

    Returns empty list if no table meets the threshold,
    which triggers fallback to generic candidate generation.
    """
    token_singular = singularize(entity_token.lower())
    token_expanded = expand_abbreviations(entity_token.lower())
    token_expanded_singular = singularize(token_expanded)

    strong_matches = []

    for table_name in all_table_names:
        table_singular = singularize(table_name.lower())
        table_expanded = expand_abbreviations(table_name.lower())
        table_expanded_singular = singularize(table_expanded)

        token_forms = {token_singular, token_expanded, token_expanded_singular}
        table_forms = {
            table_name.lower(),
            table_singular,
            table_expanded,
            table_expanded_singular
        }

        exact_match = bool(token_forms & table_forms)
        if exact_match:
            strong_matches.append((table_name, 1.0))
            continue

        best_ratio = 0.0
        for tf in token_forms:
            for tbl_f in table_forms:
                ratio = fuzz.ratio(tf, tbl_f) / 100.0
                if ratio > best_ratio:
                    best_ratio = ratio

        if best_ratio >= TARGETED_MATCH_THRESHOLD:
            strong_matches.append((table_name, best_ratio))

    strong_matches.sort(key=lambda x: x[1], reverse=True)
    return [t[0] for t in strong_matches]


def compute_name_score(
    from_col: str,
    to_table: str,
    to_col: str
) -> float:
    from_col_expanded = expand_abbreviations(from_col.lower())
    to_table_lower = to_table.lower()
    to_col_lower = to_col.lower()

    singular = singularize(to_table_lower)
    singular_expanded = expand_abbreviations(singular)
    table_expanded = expand_abbreviations(to_table_lower)

    candidates = [
        f"{to_table_lower}_{to_col_lower}",
        f"{singular}_{to_col_lower}",
        f"{singular_expanded}_{to_col_lower}",
        f"{table_expanded}_{to_col_lower}",
    ]

    scores = []
    for pattern in candidates:
        s1 = fuzz.ratio(from_col.lower(), pattern) / 100.0
        s2 = fuzz.ratio(from_col_expanded, pattern) / 100.0
        scores.append(max(s1, s2))

    return max(scores)


def compute_cardinality_ratio(
    connector: BaseConnector,
    table: str,
    column: str
) -> float:
    try:
        values = connector.get_sample_values(table, column, limit=500)
        if not values:
            return 1.0
        return len(set(values)) / len(values)
    except Exception:
        return 1.0


def compute_value_overlap(
    connector: BaseConnector,
    from_table: str,
    from_col: str,
    to_table: str,
    to_col: str,
    sample_limit: int = 300
) -> float:
    """
    Computes what proportion of source column values exist in the target column.

    KNOWN LIMITATION: Does not account for value distribution or entropy.
    A column with values [1,1,1,1,1] will show 100% overlap if 1 exists in target.
    This is a V1 limitation and should be improved with distribution analysis.
    """
    try:
        from_values = set(
            connector.get_sample_values(from_table, from_col, sample_limit)
        )
        to_values = set(
            connector.get_sample_values(to_table, to_col, sample_limit)
        )
        if not from_values or not to_values:
            return 0.0
        return len(from_values.intersection(to_values)) / len(from_values)
    except Exception:
        return 0.0


def apply_cardinality_modifier(base_confidence: int, cardinality_ratio: float) -> int:
    """
    Reduces confidence for columns with high uniqueness ratio.

    Modifier scale:
        ratio <= 0.5  ->  no reduction
        ratio 0.5-0.7 ->  small reduction (up to 10 points)
        ratio 0.7-0.85 -> moderate reduction (up to 20 points)
        ratio > 0.85  ->  large reduction (up to 30 points)
    """
    if cardinality_ratio <= 0.5:
        return base_confidence
    elif cardinality_ratio <= 0.7:
        penalty = int((cardinality_ratio - 0.5) * 50)
        return base_confidence - penalty
    elif cardinality_ratio <= 0.85:
        penalty = 10 + int((cardinality_ratio - 0.7) * 66)
        return base_confidence - penalty
    else:
        penalty = 20 + int((cardinality_ratio - 0.85) * 66)
        return max(0, base_confidence - penalty)


def compute_confidence(
    name_score: float,
    overlap_score: float,
    cardinality_ratio: float
) -> int:
    """
    Combines signals into a 0-100 confidence score.

    Weights (empirically chosen, not mathematically derived):
        name_score:    55%
        overlap_score: 45%
    """
    if name_score < 0.3 and overlap_score < 0.6:
        return 0
    base = (name_score * 0.55) + (overlap_score * 0.45)
    base_int = round(base * 100)
    return apply_cardinality_modifier(base_int, cardinality_ratio)


def confidence_to_tier(confidence: int) -> str:
    if confidence >= 75:
        return "high"
    elif confidence >= 50:
        return "medium"
    else:
        return "low"


def build_explanation(
    from_col: str,
    from_table: str,
    to_col: str,
    to_table: str,
    name_score: float,
    overlap_score: float,
    cardinality_ratio: float,
    was_targeted: bool = False
) -> Dict[str, Any]:
    reasons = []

    if was_targeted:
        reasons.append(
            f"Column name '{from_col}' directly implies a reference to "
            f"the '{to_table}' table by naming convention"
        )
    elif name_score >= 0.7:
        reasons.append(
            f"Column name '{from_col}' strongly matches the expected naming "
            f"convention for a reference to {to_table}.{to_col}"
        )
    elif name_score >= 0.4:
        reasons.append(
            f"Column name '{from_col}' partially matches the expected pattern "
            f"for {to_table}.{to_col}"
        )

    if overlap_score >= 0.9:
        reasons.append(
            f"{round(overlap_score * 100)}% of values in "
            f"{from_table}.{from_col} exist in {to_table}.{to_col}"
        )
    elif overlap_score >= 0.6:
        reasons.append(
            f"{round(overlap_score * 100)}% of sampled values overlap "
            f"with {to_table}.{to_col}"
        )

    if cardinality_ratio < 0.5:
        reasons.append(
            f"Column contains repeated values (uniqueness ratio "
            f"{round(cardinality_ratio, 2)}), consistent with foreign key behaviour"
        )
    elif cardinality_ratio > 0.85:
        reasons.append(
            f"Column has high uniqueness ratio ({round(cardinality_ratio, 2)}), "
            f"which reduces confidence"
        )

    return {
        "reasons": reasons,
        "signals": {
            "targeted_match": was_targeted,
            "name_match": name_score >= 0.4,
            "strong_name_match": name_score >= 0.7,
            "value_overlap": overlap_score >= 0.6,
            "strong_overlap": overlap_score >= 0.9,
            "low_cardinality": cardinality_ratio < 0.5,
            "high_cardinality_warning": cardinality_ratio > 0.85,
            "type_compatible": True
        },
        "raw_scores": {
            "name_similarity": round(name_score * 100),
            "value_overlap": round(overlap_score * 100),
            "cardinality_ratio": round(cardinality_ratio, 3)
        }
    }


def infer_relationships(
    schema: List[Dict[str, Any]],
    connector: BaseConnector,
    existing_fk_pairs: Set[tuple]
) -> List[Dict[str, Any]]:

    primary_key_index: Dict[str, List[str]] = {}
    for table in schema:
        pk_cols = [
            col["name"] for col in table["columns"]
            if col["is_primary_key"]
        ]
        if pk_cols:
            primary_key_index[table["table_name"]] = pk_cols

    all_table_names = list(primary_key_index.keys())
    results = []

    for table in schema:
        for col in table["columns"]:
            if col["is_primary_key"]:
                continue

            if not is_fk_candidate(col["name"]):
                continue

            cardinality_ratio = compute_cardinality_ratio(
                connector, table["table_name"], col["name"]
            )

            entity_token = extract_entity_token(col["name"])
            if entity_token:
                candidate_tables = find_targeted_tables(
                    entity_token,
                    [t for t in all_table_names if t != table["table_name"]]
                )
                was_targeted = len(candidate_tables) > 0
            else:
                candidate_tables = []
                was_targeted = False

            if not candidate_tables:
                candidate_tables = [
                    t for t in all_table_names
                    if t != table["table_name"]
                ]
                was_targeted = False

            for target_table_name in candidate_tables:
                pk_cols = primary_key_index.get(target_table_name, [])

                for pk_col in pk_cols:
                    pair_key = (
                        table["table_name"], col["name"],
                        target_table_name, pk_col
                    )
                    if pair_key in existing_fk_pairs:
                        continue

                    target_col_info = next(
                        (
                            c for t in schema
                            if t["table_name"] == target_table_name
                            for c in t["columns"]
                            if c["name"] == pk_col
                        ),
                        None
                    )
                    if not target_col_info:
                        continue

                    if not types_are_compatible(
                        col["type"], target_col_info["type"]
                    ):
                        continue

                    name_score = compute_name_score(
                        col["name"], target_table_name, pk_col
                    )

                    overlap_score = compute_value_overlap(
                        connector,
                        table["table_name"], col["name"],
                        target_table_name, pk_col
                    )

                    confidence = compute_confidence(
                        name_score, overlap_score, cardinality_ratio
                    )

                    if confidence < MIN_CONFIDENCE:
                        continue

                    tier = confidence_to_tier(confidence)
                    explanation = build_explanation(
                        col["name"], table["table_name"],
                        pk_col, target_table_name,
                        name_score, overlap_score, cardinality_ratio,
                        was_targeted=was_targeted
                    )

                    results.append({
                        "from_table": table["table_name"],
                        "from_column": col["name"],
                        "to_table": target_table_name,
                        "to_column": pk_col,
                        "name_similarity_score": round(name_score * 100),
                        "value_overlap_score": round(overlap_score * 100),
                        "confidence_score": confidence,
                        "confidence_tier": tier,
                        "explanation": explanation
                    })

    results.sort(key=lambda x: x["confidence_score"], reverse=True)
    return results