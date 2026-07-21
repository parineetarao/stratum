from typing import List, Dict, Any
from app.connectors.base import BaseConnector

def discover_schema(connector: BaseConnector) -> Dict[str, Any]:
    tables = connector.get_tables()
    schema = []

    for table_name in tables:
        columns = connector.get_columns(table_name)
        primary_keys = connector.get_primary_keys(table_name)
        foreign_keys = connector.get_foreign_keys(table_name)
        row_count = connector.get_row_count(table_name)

        enriched_columns = []
        for col in columns:
            enriched_columns.append({
                "name": col["name"],
                "type": col["type"],
                "nullable": col.get("nullable", True),
                "is_primary_key": col["name"] in primary_keys,
                "foreign_key": next(
                    (
                        fk for fk in foreign_keys
                        if fk["column"] == col["name"]
                    ),
                    None
                )
            })

        schema.append({
            "table_name": table_name,
            "row_count": row_count,
            "column_count": len(columns),
            "columns": enriched_columns,
            "primary_keys": primary_keys,
            "foreign_keys": foreign_keys
        })

    return {
        "table_count": len(tables),
        "tables": schema
    }