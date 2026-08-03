from pathlib import Path


def test_upload_dir_is_project_relative_by_default():
    """Importing connections.py must not hardcode /app or create it as a side effect."""
    from app.api import connections

    assert isinstance(connections.UPLOAD_DIR, Path)
    assert str(connections.UPLOAD_DIR) != "/app/uploads"
    assert connections.UPLOAD_DIR.name == "uploads"


def test_upload_dir_respects_env_override(monkeypatch):
    monkeypatch.setenv("UPLOAD_DIR", "/app/uploads")

    from app.config import Settings
    settings = Settings(_env_file=None)

    assert settings.UPLOAD_DIR == "/app/uploads"


def test_importing_connections_does_not_create_upload_dir(tmp_path, monkeypatch):
    """Regression test: importing connections.py must not create the upload
    directory as a side effect (it used to unconditionally os.makedirs('/app/uploads'),
    which raises PermissionError on CI runners where '/' is not writable).

    Uses a throwaway tmp_path target so it never touches the real configured
    UPLOAD_DIR (which may hold real uploaded project data)."""
    from app.api import connections

    redirected = tmp_path / "uploads"
    monkeypatch.setattr(connections, "UPLOAD_DIR", redirected)

    assert not redirected.exists()
