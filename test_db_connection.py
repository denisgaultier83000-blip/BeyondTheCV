import requests
import sys
import time
import json

# Configuration
API_URL = "http://localhost:8000"

def test_db_connection():
    print(f"🔍 Testing Database Connection via API at {API_URL}...")

    # 1. Vérification de l'API (Ping)
    try:
        response = requests.get(f"{API_URL}/")
        if response.status_code == 200:
            print("✅ API is reachable (Health Check OK).")
        else:
            print(f"❌ API returned status {response.status_code}.")
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to API. Is the backend running?")
        sys.exit(1)

    # 2. Vérification de la Base de Données (Query)
    # On utilise /api/user/status qui exécute une requête SQL SELECT sur la table 'users'
    print("⏳ Querying database via /api/user/status...")
    try:
        start_time = time.time()
        response = requests.get(f"{API_URL}/api/user/status")
        duration = (time.time() - start_time) * 1000

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Database query successful ({duration:.2f}ms).")
            print(f"   Response: {json.dumps(data, indent=2)}")
        elif response.status_code == 500:
            print("❌ Database query failed (Internal Server Error).")
            print("👉 Check backend logs for 'aiosqlite' or 'sqlite3' errors.")
            sys.exit(1)
        else:
            print(f"⚠️ Unexpected status code: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Error during DB check: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_db_connection()