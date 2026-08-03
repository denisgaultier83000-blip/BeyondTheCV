import os
from dotenv import load_dotenv
import psycopg2

# Charger .env si présent
root = os.path.dirname(os.path.dirname(__file__))
env_path = os.path.join(root, '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)

PG_HOST = os.getenv('PGHOST') or os.getenv('DB_HOST') or os.getenv('DBHOST') or os.getenv('POSTGRES_HOST') or os.getenv('POSTGRES_HOSTNAME') or os.getenv('PGHOST') or os.getenv('HOST') or 'localhost'
PG_PORT = int(os.getenv('PGPORT') or os.getenv('PORT') or 5432)
PG_USER = os.getenv('POSTGRES_USER', os.getenv('DB_USER', 'appuser'))
PG_PASS = os.getenv('POSTGRES_PASSWORD', os.getenv('DB_PASS', 'supersecretpassword'))
PG_DB   = os.getenv('POSTGRES_DB', os.getenv('DB_NAME', 'beyondthecv_dev'))

print(f"Connecting to Postgres at {PG_HOST}:{PG_PORT} db={PG_DB} user={PG_USER}")

sql = '''
CREATE TABLE IF NOT EXISTS interview_debriefs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    company_name TEXT,
    job_title TEXT,
    interview_date TIMESTAMPTZ,
    interview_format TEXT,
    interlocutor_type TEXT,
    interlocutor_name TEXT,
    interlocutor_role TEXT,
    ambiance JSONB,
    positive_signals JSONB,
    red_flags JSONB,
    questions_asked TEXT,
    difficult_questions TEXT,
    learnings TEXT,
    preparation_points TEXT,
    interest_level INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
'''

try:
    conn = psycopg2.connect(host=PG_HOST, port=PG_PORT, dbname=PG_DB, user=PG_USER, password=PG_PASS)
    cur = conn.cursor()
    cur.execute(sql)
    conn.commit()
    print("✅ Table 'interview_debriefs' created or existed already")
except Exception as e:
    print("❌ Error creating table:", e)
    raise
finally:
    try:
        cur.close()
    except:
        pass
    try:
        conn.close()
    except:
        pass
