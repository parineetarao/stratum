from pathlib import Path

from app.models.connection_file import ConnectionFile


def materialize_file(connection_file: ConnectionFile) -> str:
    """Best-effort rehydration: if the uploaded file's bytes are missing
    from local disk (e.g. an ephemeral host filesystem — a Render web
    service without a persistent disk — wiped storage on a container
    restart) but a durable DB copy exists, rewrite it to stored_path.

    Deliberately never raises: if there's nothing to rehydrate (no DB copy,
    e.g. a file uploaded before this existed), stored_path is returned
    unchanged and the caller's normal "file not found" failure happens
    exactly where it always did, instead of failing earlier/differently
    here and turning a clean downstream error into an unhandled one.
    """
    path = Path(connection_file.stored_path)
    if path.exists() or connection_file.file_data is None:
        return str(path)

    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "wb") as f:
        f.write(connection_file.file_data)
    return str(path)
