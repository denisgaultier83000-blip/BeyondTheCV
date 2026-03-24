"""
Database services for managing products, evaluations, and subscriptions.
"""
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor, Json
from contextlib import contextmanager
import os
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "")

try:
    db_pool = pool.ThreadedConnectionPool(1, 20, DATABASE_URL)
except Exception as e:
    print(f"[DB CRITICAL] Error initializing connection pool: {e}")
    db_pool = None

def get_postgres_connection():
    """Fournit une connexion brute et directe à PostgreSQL (utilisée par les migrations)."""
    return psycopg2.connect(DATABASE_URL)

@contextmanager
def get_db_connection():
    """Fournit une connexion depuis le pool et la restitue automatiquement."""
    if not db_pool:
        raise Exception("Database pool not initialized")
    conn = db_pool.getconn()
    try:
        yield conn
    finally:
        db_pool.putconn(conn)

# ==================== PRODUCTS ====================

class ProductService:
    """Service for managing products."""
    
    @staticmethod
    def create_product(user_id: str, product_type: str, filename: str, 
                      title: Optional[str] = None, description: Optional[str] = None,
                      file_path: Optional[str] = None, file_size: Optional[int] = None,
                      mime_type: Optional[str] = None, metadata: Optional[Dict] = None) -> str:
        """Create a new product."""
        import uuid
        product_id = str(uuid.uuid4())
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                try:
                    cur.execute("""
                        INSERT INTO products 
                        (id, user_id, product_type, filename, title, description, file_path, file_size, mime_type, metadata)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (product_id, user_id, product_type, filename, title, description, 
                          file_path, file_size, mime_type, Json(metadata) if metadata else None))
                    
                    conn.commit()
                    return product_id
                except Exception as e:
                    conn.rollback()
                    raise Exception(f"Error creating product: {e}")
    
    @staticmethod
    def get_user_products(user_id: str, limit: int = 100, offset: int = 0) -> List[Dict]:
        """Get all products for a user."""
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT * FROM products 
                    WHERE user_id = %s AND deleted_at IS NULL
                    ORDER BY created_at DESC 
                    LIMIT %s OFFSET %s
                """, (user_id, limit, offset))
                
                return cur.fetchall()
    
    @staticmethod
    def get_product_by_id(product_id: str) -> Optional[Dict]:
        """Get a specific product."""
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT * FROM products WHERE id = %s
                """, (product_id,))
                
                return cur.fetchone()
    
    @staticmethod
    def record_download(product_id: str) -> bool:
        """Record a product download."""
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                try:
                    cur.execute("""
                        UPDATE products 
                        SET downloaded_count = downloaded_count + 1,
                            last_downloaded_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (product_id,))
                    
                    conn.commit()
                    return True
                except Exception as e:
                    conn.rollback()
                    raise Exception(f"Error recording download: {e}")
    
    @staticmethod
    def record_print(product_id: str) -> bool:
        """Record a product print."""
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                try:
                    cur.execute("""
                        UPDATE products 
                        SET printed_count = printed_count + 1,
                            last_printed_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (product_id,))
                    
                    conn.commit()
                    return True
                except Exception as e:
                    conn.rollback()
                    raise Exception(f"Error recording print: {e}")
    
    @staticmethod
    def delete_product(product_id: str) -> bool:
        """Soft delete a product."""
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                try:
                    cur.execute("""
                        UPDATE products 
                        SET deleted_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (product_id,))
                    
                    conn.commit()
                    return True
                except Exception as e:
                    conn.rollback()
                    raise Exception(f"Error deleting product: {e}")

# ==================== SUBSCRIPTION MANAGEMENT ====================

class SubscriptionService:
    """Service for managing subscriptions."""
    
    @staticmethod
    def create_subscription(user_id: str, days_duration: int = 90) -> bool:
        """Create initial subscription for a user."""
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                try:
                    expiration_date = datetime.now(timezone.utc) + timedelta(days=days_duration)
                    
                    cur.execute("""
                        UPDATE users 
                        SET subscription_status = 'active',
                            subscription_start_date = CURRENT_TIMESTAMP,
                            subscription_expiration_date = %s,
                            is_premium = TRUE
                        WHERE id = %s
                    """, (expiration_date, user_id))
                    
                    conn.commit()
                    return True
                except Exception as e:
                    conn.rollback()
                    raise Exception(f"Error creating subscription: {e}")
    
    @staticmethod
    def check_subscriptions_expiry() -> Dict[str, int]:
        """Check and update expired subscriptions."""
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                try:
                    # Find expired subscriptions
                    cur.execute("""
                        UPDATE users 
                        SET subscription_status = 'expired'
                        WHERE subscription_status = 'active' 
                        AND subscription_expiration_date < CURRENT_TIMESTAMP
                    """)
                    
                    expired_count = cur.rowcount
                    
                    conn.commit()
                    return {'expired_count': expired_count}
                except Exception as e:
                    conn.rollback()
                    raise Exception(f"Error checking expiry: {e}")
    
    @staticmethod
    def extend_subscription(user_id: str, plan_id: str, price_paid_cents: int, 
                           transaction_id: Optional[str] = None) -> str:
        """Extend a user's subscription."""
        import uuid
        extension_id = str(uuid.uuid4())
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                try:
                    # Get plan duration
                    cur.execute("SELECT duration_days FROM subscription_plans WHERE id = %s", (plan_id,))
                    plan = cur.fetchone()
                    
                    if not plan:
                        raise Exception("Plan not found")
                    
                    duration_days = plan[0]
                    
                    # Calculate new expiration date
                    # If already expired, start from today; otherwise extend from current expiry
                    cur.execute("""
                        SELECT subscription_expiration_date FROM users WHERE id = %s
                    """, (user_id,))
                    
                    result = cur.fetchone()
                    now_utc = datetime.now(timezone.utc)
                    if result and result[0] and result[0].replace(tzinfo=timezone.utc) > now_utc:
                        new_expiration = result[0] + timedelta(days=duration_days)
                    else:
                        new_expiration = now_utc + timedelta(days=duration_days)
                    
                    # Create extension record
                    cur.execute("""
                        INSERT INTO subscription_extensions 
                        (id, user_id, plan_id, new_expiration_date, price_paid_cents, transaction_id, payment_status)
                        VALUES (%s, %s, %s, %s, %s, %s, 'completed')
                    """, (extension_id, user_id, plan_id, new_expiration, price_paid_cents, transaction_id))
                    
                    # Update user subscription
                    cur.execute("""
                        UPDATE users 
                        SET subscription_status = 'extended',
                            subscription_expiration_date = %s,
                            subscription_extension_count = subscription_extension_count + 1,
                            last_extension_date = CURRENT_TIMESTAMP,
                            is_premium = TRUE
                        WHERE id = %s
                    """, (new_expiration, user_id))
                    
                    conn.commit()
                    return extension_id
                except Exception as e:
                    conn.rollback()
                    raise Exception(f"Error extending subscription: {e}")
    
    @staticmethod
    def get_user_subscription(user_id: str) -> Optional[Dict]:
        """Get user's subscription details."""
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        id, email, first_name, last_name, 
                        subscription_status, subscription_start_date, 
                        subscription_expiration_date, subscription_extension_count,
                        is_premium
                    FROM users WHERE id = %s
                """, (user_id,))
                
                return cur.fetchone()
