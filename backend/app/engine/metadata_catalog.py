from typing import List, Dict, Any


def build_ddl(
    table_name: str,
    columns: List[Dict[str, Any]],
    primary_keys: List[str],
    foreign_keys: List[Dict[str, Any]],
) -> str:
    """Renders a best-effort CREATE TABLE statement from discovered metadata."""
    lines = []
    for col in columns:
        col_def = f'    "{col["name"]}" {col["type"]}'
        if not col.get("nullable", True):
            col_def += " NOT NULL"
        lines.append(col_def)

    if primary_keys:
        pk_cols = ", ".join(f'"{k}"' for k in primary_keys)
        lines.append(f"    PRIMARY KEY ({pk_cols})")

    for fk in foreign_keys:
        lines.append(
            f'    FOREIGN KEY ("{fk["column"]}") '
            f'REFERENCES "{fk["referenced_table"]}" ("{fk["referenced_column"]}")'
        )

    body = ",\n".join(lines)
    return f'CREATE TABLE "{table_name}" (\n{body}\n);'
