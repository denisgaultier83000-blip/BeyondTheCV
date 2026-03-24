#!/usr/bin/env python3
"""
PostgreSQL Database Initialization Script
Creates all required tables and indexes for BeyondTheCV
"""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "")


def get_postgres_connection():
    return psycopg2.connect(DATABASE_URL)


def main():
    print("[MIGRATIONS] Starting PostgreSQL initialization...")
    print("-" * 60)
    
    try:
        conn = get_postgres_connection()
        cur = conn.cursor()
        print("✅ PostgreSQL connection successful")
        
        # Drop types if exist (reset)
        cur.execute("DROP TYPE IF EXISTS product_type CASCADE;")
        cur.execute("DROP TYPE IF EXISTS subscription_status CASCADE;")
        
        # Create types
        cur.execute("CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'extended');")
        cur.execute("CREATE TYPE product_type AS ENUM ('cv_ats', 'report', 'document', 'other');")
        print("✅ ENUM types created")
        
        # Create tables
        cur.execute("""
            DROP TABLE IF EXISTS users CASCADE;
        """)
        
        cur.execute("""
            CREATE TABLE users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                first_name TEXT,
                last_name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_premium BOOLEAN DEFAULT FALSE,
                subscription_status subscription_status DEFAULT 'active',
                subscription_start_date TIMESTAMP,
                subscription_expiration_date TIMESTAMP,
                subscription_extension_count INTEGER DEFAULT 0,
                last_extension_date TIMESTAMP,
                deleted_at TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )
        """)
        print("✅ Table 'users' created")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                profile_data JSONB
            )
        """)
        print("✅ Table 'user_profiles' created")

        cur.execute("""
            DROP TABLE IF EXISTS products CASCADE;
        """)
        
        cur.execute("""
            CREATE TABLE products (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                product_type product_type NOT NULL,
                filename TEXT NOT NULL,
                file_path TEXT,
                file_size INTEGER,
                mime_type TEXT,
                title TEXT,
                description TEXT,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                downloaded_count INTEGER DEFAULT 0,
                printed_count INTEGER DEFAULT 0,
                last_downloaded_at TIMESTAMP,
                last_printed_at TIMESTAMP,
                is_archived BOOLEAN DEFAULT FALSE,
                deleted_at TIMESTAMP
            )
        """)
        print("✅ Table 'products' created")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS subscription_plans (
                id TEXT PRIMARY KEY,
                plan_name TEXT NOT NULL,
                duration_days INTEGER NOT NULL,
                price_cents INTEGER NOT NULL,
                currency TEXT DEFAULT 'USD',
                description TEXT,
                features JSONB,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Table 'subscription_plans' created")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS subscription_extensions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
                extension_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                new_expiration_date TIMESTAMP NOT NULL,
                price_paid_cents INTEGER,
                payment_status TEXT,
                transaction_id TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Table 'subscription_extensions' created")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS feedbacks (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                feature TEXT,
                feedback TEXT NOT NULL,
                reason TEXT,
                job_type TEXT,
                is_positive BOOLEAN,
                sentiment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Table 'feedbacks' created")

        cur.execute("""
            DROP TABLE IF EXISTS tasks CASCADE;
        """)
        
        cur.execute("""
            CREATE TABLE tasks (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
                status TEXT,
                task_type TEXT,
                result TEXT,
                error_message TEXT,
                progress_percent INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                metadata JSONB
            )
        """)
        print("✅ Table 'tasks' created")

        # Commit tables creation before creating indexes
        conn.commit()

        # Create indexes AFTER all tables are created
        cur.execute("CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
        # cur.execute("CREATE INDEX IF NOT EXISTS idx_users_subscription_expiry ON users(subscription_expiration_date)")  # Commented out for now
        cur.execute("CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)")
        print("✅ Indexes created")

        # Insert default subscription plans
        plans = [
            ("plan_1_month", "1 Month", 30, 999, "One month extension"),
            ("plan_3_months", "3 Months", 90, 2499, "Three months extension"),
            ("plan_6_months", "6 Months", 180, 4499, "Six months extension"),
            ("plan_1_year", "1 Year", 365, 7999, "One year extension"),
        ]
        
        for plan_id, name, days, price_cents, desc in plans:
            cur.execute("""
                INSERT INTO subscription_plans 
                (id, plan_name, duration_days, price_cents, currency, description, is_active)
                VALUES (%s, %s, %s, %s, 'USD', %s, TRUE)
                ON CONFLICT (id) DO NOTHING
            """, (plan_id, name, days, price_cents, desc))
        
        print("✅ Default subscription plans inserted")

        conn.commit()
        print("\n🎉 PostgreSQL migration completed successfully!")
        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        if conn:
            cur.close()
            conn.close()


if __name__ == "__main__":
    main()
