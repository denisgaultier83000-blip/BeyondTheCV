#!/usr/bin/env python3
"""
Recalcule users.total_ia_cost depuis l'historique tasks.

Usage:
  python backfill_ai_costs.py --dry-run
  python backfill_ai_costs.py --apply
"""
import argparse
import psycopg2
from psycopg2.extras import RealDictCursor

from database import get_database_url
from services.ia_costs import estimate_task_cost


SUCCESS_STATUSES = ("SUCCESS", "COMPLETED")


def run_backfill(apply: bool = False):
    db_url = get_database_url()
    if not db_url:
        raise RuntimeError("DATABASE_URL introuvable.")

    conn = psycopg2.connect(db_url)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute(
            """
            SELECT id, task_type, result
            FROM tasks
            WHERE status = ANY(%s)
              AND estimated_cost IS NULL
              AND result IS NOT NULL
            """,
            (list(SUCCESS_STATUSES),)
        )
        tasks_to_estimate = cur.fetchall()

        updated_cost_rows = 0
        estimated_total = 0.0
        for row in tasks_to_estimate:
            task_id = row["id"]
            task_type = row.get("task_type")
            result_payload = row.get("result") or ""
            estimated_cost = estimate_task_cost(task_type, str(result_payload))
            estimated_total += estimated_cost
            if apply:
                cur.execute(
                    "UPDATE tasks SET estimated_cost = %s WHERE id = %s",
                    (estimated_cost, task_id)
                )
            updated_cost_rows += 1

        if apply:
            # 1) remet à zéro
            cur.execute("UPDATE users SET total_ia_cost = 0")

            # 2) recalcule avec user_id direct OU fallback via application_id
            cur.execute(
                """
                WITH task_owner AS (
                    SELECT
                        COALESCE(t.user_id, a.user_id) AS owner_user_id,
                        COALESCE(t.estimated_cost, 0) AS estimated_cost
                    FROM tasks t
                    LEFT JOIN job_applications a ON a.id = t.application_id
                    WHERE t.status = ANY(%s)
                ),
                agg AS (
                    SELECT owner_user_id AS user_id, SUM(estimated_cost) AS total_cost
                    FROM task_owner
                    WHERE owner_user_id IS NOT NULL
                    GROUP BY owner_user_id
                )
                UPDATE users u
                SET total_ia_cost = COALESCE(agg.total_cost, 0)
                FROM agg
                WHERE agg.user_id = u.id
                """,
                (list(SUCCESS_STATUSES),)
            )
            conn.commit()
        else:
            conn.rollback()

        cur.execute("SELECT COUNT(*) AS c FROM users")
        users_count = cur.fetchone()["c"]

        cur.execute("SELECT COUNT(*) AS c FROM tasks WHERE status = ANY(%s)", (list(SUCCESS_STATUSES),))
        success_tasks_count = cur.fetchone()["c"]

        print("=== Backfill IA Cost ===")
        print(f"mode: {'APPLY' if apply else 'DRY-RUN'}")
        print(f"users_count: {users_count}")
        print(f"success_tasks_count: {success_tasks_count}")
        print(f"tasks_estimated_now: {updated_cost_rows}")
        print(f"estimated_added_from_null_tasks: {estimated_total:.6f}")
        if apply:
            print("status: committed")
        else:
            print("status: preview_only")
    finally:
        conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Prévisualise sans écrire en base")
    parser.add_argument("--apply", action="store_true", help="Applique le recalcul en base")
    args = parser.parse_args()

    if args.apply and args.dry_run:
        raise SystemExit("Choisissez soit --dry-run soit --apply, pas les deux.")

    apply_mode = args.apply
    if not args.apply and not args.dry_run:
        apply_mode = False

    run_backfill(apply=apply_mode)
