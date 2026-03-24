#!/usr/bin/env python3
"""
Test script for new PostgreSQL API endpoints.
"""
import requests
import json
import sys

API_URL = "http://localhost:8000/api"

def test_create_product():
    """Test creating a product."""
    print("\n📦 Test 1: Creating a product...")
    
    payload = {
        "user_id": "user_test_001",
        "product_type": "cv_ats",
        "filename": "cv_john_doe.pdf",
        "title": "CV - ATS Format",
        "description": "Format optimisé pour les ATS"
    }
    
    try:
        response = requests.post(f"{API_URL}/products", json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            return response.json()["id"]
        else:
            print(f"❌ Error: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Exception: {e}")
        return None

def test_get_user_products(user_id):
    """Test getting user products."""
    print(f"\n📋 Test 2: Getting products for user {user_id}...")
    
    try:
        response = requests.get(f"{API_URL}/products/user/{user_id}")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_record_download(product_id):
    """Test recording a download."""
    print(f"\n⬇️  Test 3: Recording download for product {product_id}...")
    
    try:
        response = requests.post(f"{API_URL}/products/{product_id}/download")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_record_print(product_id):
    """Test recording a print."""
    print(f"\n🖨️  Test 4: Recording print for product {product_id}...")
    
    try:
        response = requests.post(f"{API_URL}/products/{product_id}/print")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_create_evaluation():
    """Test creating an evaluation."""
    print("\n⭐ Test 5: Creating an evaluation...")
    
    payload = {
        "user_id": "user_test_001",
        "product_id": None,
        "evaluator_name": "Admin",
        "rating": "5_excellent",
        "overall_satisfaction_score": 5,
        "quality_score": 5,
        "usability_score": 5,
        "feature_completeness_score": 4,
        "comments": "Excellent product!",
        "improvements_suggested": "Could add more templates",
        "would_recommend": True,
        "tags": ["ui", "feature_complete"],
        "internal_notes": "Premium customer"
    }
    
    try:
        response = requests.post(f"{API_URL}/evaluations", json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2, default=str)}")
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_evaluation_stats():
    """Test getting evaluation statistics."""
    print("\n📊 Test 6: Getting evaluation statistics...")
    
    try:
        response = requests.get(f"{API_URL}/evaluations-stats?time_period_days=30")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_get_subscription(user_id):
    """Test getting user subscription details."""
    print(f"\n💳 Test 7: Getting subscription for user {user_id}...")
    
    try:
        response = requests.get(f"{API_URL}/subscriptions/{user_id}")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2, default=str)}")
    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 PostgreSQL API Test Suite")
    print("=" * 60)
    
    try:
        # Test 1: Create product
        product_id = test_create_product()
        
        if product_id:
            # Test 2: Get user products
            test_get_user_products("user_test_001")
            
            # Test 3: Record download
            test_record_download(product_id)
            
            # Test 4: Record print
            test_record_print(product_id)
        
        # Test 5: Create evaluation
        test_create_evaluation()
        
        # Test 6: Get evaluation stats
        test_evaluation_stats()
        
        # Test 7: Get subscription
        test_get_subscription("user_test_001")
        
        print("\n" + "=" * 60)
        print("✅ All tests completed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        sys.exit(1)
