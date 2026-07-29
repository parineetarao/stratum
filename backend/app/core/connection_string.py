from typing import Optional, TypedDict
from urllib.parse import urlsplit, parse_qs, unquote


class ParsedPostgresConnection(TypedDict):
    host: Optional[str]
    port: Optional[int]
    database: Optional[str]
    user: Optional[str]
    sslmode: Optional[str]


def parse_postgres_connection_string(
    connection_string: Optional[str],
) -> ParsedPostgresConnection:
    """Extracts display-safe fields from a PostgreSQL DSN. Never returns the
    password — callers must not surface it in API responses."""
    empty: ParsedPostgresConnection = {
        "host": None, "port": None, "database": None,
        "user": None, "sslmode": None,
    }
    if not connection_string:
        return empty
    try:
        parts = urlsplit(connection_string)
        query = parse_qs(parts.query)
        return {
            "host": parts.hostname,
            "port": parts.port,
            "database": parts.path.lstrip("/") or None,
            "user": unquote(parts.username) if parts.username else None,
            "sslmode": (query.get("sslmode") or [None])[0],
        }
    except Exception:
        return empty
