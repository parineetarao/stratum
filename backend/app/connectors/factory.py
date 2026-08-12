from app.models.connection import Connection, ConnectionType
from app.connectors.base import BaseConnector
from app.connectors.postgres_connector import PostgresConnector
from app.connectors.csv_connector import CSVConnector, MultiFileConnector
from app.core.file_storage import materialize_file


def build_connector(connection: Connection) -> BaseConnector:
    """Single entry point every downstream module (metadata discovery,
    profiling, relationships, warehouse, KPIs, SQL workspace, sandbox,
    dashboard, cleaning) should use to get a BaseConnector for a stored
    Connection. Hides whether a file-based project is backed by zero, one,
    or many uploaded files."""
    if connection.connection_type == ConnectionType.postgresql:
        return PostgresConnector(
            connection.connection_string,
            source_schema=connection.source_schema or "public",
        )

    files = connection.files
    if files:
        # Rehydrate from the DB copy first if the ephemeral host filesystem
        # dropped the on-disk file (e.g. a container restart).
        paths = [(materialize_file(f), f.table_name) for f in files]
        return MultiFileConnector(paths)

    # Legacy file-based connection created before multi-file support, or a
    # brand-new connection row that hasn't had files attached yet.
    return CSVConnector(connection.file_path)
