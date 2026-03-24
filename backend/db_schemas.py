"""
Pydantic models for database operations.
Includes schemas for users, products, evaluations, and subscriptions.
"""
from pydantic import BaseModel, Field, EmailStr, AwareDatetime
from typing import Optional, List, Dict, Any
from enum import Enum

# --- Enums ---
class SubscriptionStatusEnum(str, Enum):
    active = "active"
    expired = "expired"
    extended = "extended"

class ProductTypeEnum(str, Enum):
    cv_ats = "cv_ats"
    report = "report"
    document = "document"
    other = "other"

# --- User Models ---
class UserBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_premium: bool = False

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_premium: Optional[bool] = None

class UserSubscriptionUpdate(BaseModel):
    subscription_status: SubscriptionStatusEnum
    subscription_expiration_date: AwareDatetime
    subscription_extension_count: Optional[int] = None

class UserResponse(UserBase):
    id: str
    created_at: AwareDatetime
    updated_at: AwareDatetime
    subscription_status: SubscriptionStatusEnum
    subscription_expiration_date: Optional[AwareDatetime] = None
    subscription_extension_count: int = 0
    is_active: bool = True

    class Config:
        from_attributes = True

# --- Product Models ---
class ProductBase(BaseModel):
    product_type: ProductTypeEnum
    filename: str
    title: Optional[str] = None
    description: Optional[str] = None
    mime_type: Optional[str] = None

class ProductCreate(ProductBase):
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None

class ProductUpdate(BaseModel):
    filename: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    is_archived: Optional[bool] = None

class ProductResponse(ProductBase):
    id: str
    user_id: str
    file_size: Optional[int] = None
    file_path: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: AwareDatetime
    updated_at: AwareDatetime
    downloaded_count: int = 0
    printed_count: int = 0
    last_downloaded_at: Optional[AwareDatetime] = None
    last_printed_at: Optional[AwareDatetime] = None
    is_archived: bool = False

    class Config:
        from_attributes = True

class ProductListResponse(BaseModel):
    """Simplified product list response for web display."""
    id: str
    title: str
    product_type: ProductTypeEnum
    created_at: AwareDatetime
    downloaded_count: int
    printed_count: int

    class Config:
        from_attributes = True

# --- Subscription Plan Models ---
class SubscriptionPlanBase(BaseModel):
    plan_name: str
    duration_days: int
    price_cents: int
    currency: str = "USD"
    description: Optional[str] = None

class SubscriptionPlanCreate(SubscriptionPlanBase):
    features: Optional[Dict[str, Any]] = None

class SubscriptionPlanResponse(SubscriptionPlanCreate):
    id: str
    is_active: bool = True
    created_at: AwareDatetime
    updated_at: AwareDatetime

    class Config:
        from_attributes = True

# --- Subscription Extension Models ---
class SubscriptionExtensionCreate(BaseModel):
    user_id: str
    plan_id: str
    notes: Optional[str] = None

class SubscriptionExtensionResponse(BaseModel):
    id: str
    user_id: str
    plan_id: str
    extension_date: AwareDatetime
    new_expiration_date: AwareDatetime
    price_paid_cents: Optional[int] = None
    payment_status: Optional[str] = None
    transaction_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: AwareDatetime

    class Config:
        from_attributes = True

# --- Feedback Models ---
class FeedbackBase(BaseModel):
    feature: Optional[str] = None
    feedback: str
    reason: Optional[str] = None
    job_type: Optional[str] = None
    is_positive: Optional[bool] = None

class FeedbackCreate(FeedbackBase):
    user_id: str

class FeedbackResponse(FeedbackBase):
    id: int
    user_id: str
    sentiment: Optional[str] = None
    created_at: AwareDatetime

    class Config:
        from_attributes = True

# --- Task Models ---
class TaskCreate(BaseModel):
    user_id: Optional[str] = None
    task_type: str
    metadata: Optional[Dict[str, Any]] = None

class TaskUpdate(BaseModel):
    status: Optional[str] = None
    progress_percent: Optional[int] = None
    result: Optional[str] = None
    error_message: Optional[str] = None

class TaskResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    status: str
    task_type: str
    progress_percent: int = 0
    created_at: AwareDatetime
    started_at: Optional[AwareDatetime] = None
    completed_at: Optional[AwareDatetime] = None
    result: Optional[str] = None
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True
