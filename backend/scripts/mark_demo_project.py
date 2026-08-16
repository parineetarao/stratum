"""
One-off administrative script: flags the existing, already-built
"Retail Analytics Demo" project as the single public read-only demo
(Project.is_demo = True).

This does NOT run any pipeline, create any project, or seed any data —
the Retail Analytics Demo project was already created and fully run
through Stratum manually. This script only flips one boolean, after
confirming exactly one project matches by name, and prints what it's
about to change before touching anything.

Usage (dry run, default — makes no changes), run from the backend/ directory:
    python scripts/mark_demo_project.py

Usage (apply the change):
    python scripts/mark_demo_project.py --confirm

Run this against whichever database DATABASE_URL (in the environment /
.env) points at — for the deployed demo, that means running it with the
Render Postgres application database configured, not the local
stratum.db SQLite file.
"""
import argparse
import sys

sys.path.insert(0, __file__.rsplit("scripts", 1)[0])

from app.database import SessionLocal  # noqa: E402
from app.models.project import Project  # noqa: E402

TARGET_PROJECT_NAME = "Retail Analytics Demo"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Actually apply the change. Without this flag, only prints what would change.",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        matches = db.query(Project).filter(Project.name == TARGET_PROJECT_NAME).all()

        if len(matches) == 0:
            print(f"No project named '{TARGET_PROJECT_NAME}' was found. Nothing to do.")
            return 1
        if len(matches) > 1:
            print(f"Found {len(matches)} projects named '{TARGET_PROJECT_NAME}' — refusing to guess which one:")
            for p in matches:
                print(f"  id={p.id} user_id={p.user_id} domain={p.domain} created_at={p.created_at}")
            print("Disambiguate manually (e.g. rename the extras) and re-run.")
            return 1

        target = matches[0]
        print("Target project (will be marked is_demo=True):")
        print(f"  id={target.id} name={target.name!r} user_id={target.user_id} "
              f"domain={target.domain} analysis_mode={target.analysis_mode} "
              f"is_demo={target.is_demo} created_at={target.created_at}")

        others = db.query(Project).filter(Project.is_demo == True, Project.id != target.id).all()  # noqa: E712
        if others:
            print("\nOther project(s) currently flagged is_demo=True (will be un-flagged, "
                  "since exactly one project should be the public demo; no rows are deleted):")
            for p in others:
                print(f"  id={p.id} name={p.name!r} user_id={p.user_id} created_at={p.created_at}")

        if not args.confirm:
            print("\nDry run only — no changes made. Re-run with --confirm to apply.")
            return 0

        for p in others:
            p.is_demo = False
        target.is_demo = True
        db.commit()

        print(f"\nDone. Project id={target.id} ({target.name!r}) is now the public demo.")
        if others:
            print(f"Un-flagged {len(others)} previous demo project(s).")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
