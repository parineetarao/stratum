import re
from pathlib import Path


def sanitize_table_name(raw_name: str) -> str:
    """Derive a safe logical table name from a filename or user-provided
    name: lowercase, alphanumeric/underscore only, must start with a letter."""
    stem = Path(raw_name).stem
    slug = re.sub(r"[^a-zA-Z0-9_]+", "_", stem.strip()).strip("_").lower()
    if not slug:
        slug = "table"
    if not re.match(r"^[a-zA-Z_]", slug):
        slug = f"t_{slug}"
    return slug


def sanitize_filename(raw_name: str) -> str:
    """Strip directory components and unsafe characters from an uploaded
    filename before it is used to build a filesystem path."""
    name = Path(raw_name).name
    name = re.sub(r"[^a-zA-Z0-9_.\-]+", "_", name).strip("_")
    return name or "file"
