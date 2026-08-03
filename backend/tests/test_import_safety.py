from pathlib import Path


def test_importing_app_main_does_not_touch_root_app_dir():
    before = Path("/app").exists()
    import app.main  # noqa: F401
    after = Path("/app").exists()

    assert before == after
