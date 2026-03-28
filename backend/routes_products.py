"""
API routes for products, evaluations, and subscriptions.
"""
from fastapi import APIRouter, HTTPException, Query, Depends, File, UploadFile, Body
from typing import List, Optional
import os
import uuid
from datetime import datetime, timezone

from db_schemas import (
    ProductCreate, ProductResponse, ProductListResponse,
    SubscriptionExtensionCreate, SubscriptionExtensionResponse,
    UserResponse, SubscriptionPlanResponse
)
from db_services import (
    ProductService, SubscriptionService
)

router = APIRouter(prefix="/api", tags=["products", "subscriptions"])

# ==================== PRODUCTS ROUTES ====================

@router.post("/products", response_model=ProductResponse, tags=["products"])
def create_product(
    user_id: str = Query(...),
    product_type: str = Query(...),
    filename: str = Query(...),
    title: Optional[str] = Query(None),
    description: Optional[str] = Query(None),
    file: Optional[UploadFile] = File(None)
):
    """Create a new product."""
    try:
        # Save file if provided
        file_path = None
        file_size = None
        mime_type = None
        
        if file:
            # [SECURITÉ] Prévention du Path Traversal
            secure_filename = os.path.basename(filename)
            file_path = f"products/{user_id}/{secure_filename}"
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            content = file.file.read()
            file_size = len(content)
            mime_type = file.content_type
            
            with open(file_path, "wb") as f:
                f.write(content)
        
        product_id = ProductService.create_product(
            user_id=user_id,
            product_type=product_type,
            filename=secure_filename if file else filename,
            title=title or filename,
            description=description,
            file_path=file_path,
            file_size=file_size,
            mime_type=mime_type
        )
        
        return {
            "id": product_id,
            "user_id": user_id,
            "product_type": product_type,
            "filename": secure_filename if file else filename,
            "title": title or filename,
            "description": description,
            "file_size": file_size,
            "mime_type": mime_type,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "downloaded_count": 0,
            "printed_count": 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/products/user/{user_id}", response_model=List[ProductResponse], tags=["products"])
def get_user_products(
    user_id: str,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """Get all products for a user."""
    try:
        products = ProductService.get_user_products(user_id, limit, offset)
        return products
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/products/{product_id}", response_model=ProductResponse, tags=["products"])
def get_product(product_id: str):
    """Get a specific product."""
    try:
        product = ProductService.get_product_by_id(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return product
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/products/{product_id}/download", tags=["products"])
def record_product_download(product_id: str):
    """Record a product download."""
    try:
        # Verify product exists
        product = ProductService.get_product_by_id(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        ProductService.record_download(product_id)
        return {"status": "success", "message": "Download recorded"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/products/{product_id}/print", tags=["products"])
def record_product_print(product_id: str):
    """Record a product print."""
    try:
        product = ProductService.get_product_by_id(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        ProductService.record_print(product_id)
        return {"status": "success", "message": "Print recorded"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/products/{product_id}", tags=["products"])
def delete_product(product_id: str):
    """Delete a product (soft delete)."""
    try:
        product = ProductService.get_product_by_id(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        ProductService.delete_product(product_id)
        return {"status": "success", "message": "Product deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== SUBSCRIPTION ROUTES ====================

@router.post("/subscriptions/{user_id}/extend", response_model=SubscriptionExtensionResponse, tags=["subscriptions"])
def extend_subscription(user_id: str, plan_id: str, price_paid_cents: int):
    """Extend a user's subscription."""
    try:
        extension_id = SubscriptionService.extend_subscription(
            user_id=user_id,
            plan_id=plan_id,
            price_paid_cents=price_paid_cents
        )
        
        # Get the extension details
        from db_services import get_db_connection
        from psycopg2.extras import RealDictCursor
        
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM subscription_extensions WHERE id = %s", (extension_id,))
                result = cur.fetchone()
                return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/subscriptions/{user_id}", tags=["subscriptions"])
def get_user_subscription(user_id: str):
    """Get user's subscription details."""
    try:
        subscription = SubscriptionService.get_user_subscription(user_id)
        if not subscription:
            raise HTTPException(status_code=404, detail="User not found")
        return subscription
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/subscriptions/check-expiry", tags=["subscriptions"])
def check_subscriptions_expiry():
    """Check and update expired subscriptions (admin task)."""
    try:
        result = SubscriptionService.check_subscriptions_expiry()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
