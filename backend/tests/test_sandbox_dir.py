from pathlib import Path


def test_sandbox_dir_is_project_relative_by_default():
    """Importing sandbox_engine.py must not hardcode /app or create it as a side effect."""
    from app.engine import sandbox_engine

    assert isinstance(sandbox_engine.SANDBOX_DIR, Path)
    assert str(sandbox_engine.SANDBOX_DIR) != "/app/sandboxes"
    assert sandbox_engine.SANDBOX_DIR.name == "sandboxes"


def test_sandbox_dir_respects_env_override(monkeypatch):
    monkeypatch.setenv("SANDBOX_DIR", "/app/sandboxes")

    from app.config import Settings
    settings = Settings(_env_file=None)

    assert settings.SANDBOX_DIR == "/app/sandboxes"


def test_importing_sandbox_engine_does_not_create_sandbox_dir(tmp_path, monkeypatch):
    """Regression test: importing sandbox_engine.py must not create the
    sandbox directory as a side effect (it used to unconditionally
    os.makedirs('/app/sandboxes'), which raises PermissionError on CI
    runners where '/' is not writable).

    Uses a throwaway tmp_path target so it never touches the real configured
    SANDBOX_DIR (which may hold real per-project DuckDB sandbox files)."""
    from app.engine import sandbox_engine

    redirected = tmp_path / "sandboxes"
    monkeypatch.setattr(sandbox_engine, "SANDBOX_DIR", redirected)

    assert not redirected.exists()


def test_ensure_sandbox_dir_creates_directory_only_when_called(tmp_path, monkeypatch):
    """Directory creation happens only when explicitly requested, not on import."""
    from app.engine import sandbox_engine

    redirected = tmp_path / "sandboxes"
    monkeypatch.setattr(sandbox_engine, "SANDBOX_DIR", redirected)

    assert not redirected.exists()
    sandbox_engine.ensure_sandbox_dir()
    assert redirected.exists()
