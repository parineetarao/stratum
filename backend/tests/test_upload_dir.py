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


def test_importing_connections_does_not_create_upload_dir():
    """Regression test: importing connections.py must not create the upload
    directory as a side effect (it used to unconditionally os.makedirs('/app/uploads'),
    which raises PermissionError on CI runners where '/' is not writable)."""
    from app.api import connections
    import shutil

    target = connections.UPLOAD_DIR
    was_present = target.exists()
    if not was_present:
        assert not target.exists()
    else:
        shutil.rmtree(target)
        import importlib
        importlib.reload(connections)
        assert not connections.UPLOAD_DIR.exists()
