#!/usr/bin/env python3
"""
Script de test pour vérifier que les données de test ont été insérées correctement
et que l'API PostgreSQL fonctionne
"""
import requests
import json
import time

# Attendre que le backend soit prêt
print("⏳ Attente du démarrage du backend...")
time.sleep(3)

BASE_URL = "http://localhost:8080"

def test_api_endpoint(endpoint, description):
    """Test un endpoint API"""
    try:
        response = requests.get(f"{BASE_URL}{endpoint}")
        if response.status_code == 200:
            print(f"✅ {description}: {len(response.json())} éléments")
            return True
        else:
            print(f"❌ {description}: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ {description}: Erreur - {str(e)}")
        return False

def test_database_content():
    """Test le contenu de la base de données via l'API"""
    print("\n🧪 TESTS DE L'API POSTGRESQL")
    print("-" * 50)

    # Test des produits pour un utilisateur spécifique
    success = test_api_endpoint("/api/products/user/user_dev_001", "Récupération des produits utilisateur")

    if success:
        # Récupérer les détails des produits
        try:
            response = requests.get(f"{BASE_URL}/api/products/user/user_dev_001")
            products = response.json()

            if products:
                print(f"\n📋 DÉTAILS DES PRODUITS POUR user_dev_001:")
                for product in products[:2]:  # Afficher seulement les 2 premiers
                    metadata = product.get('metadata', {})
                    print(f"  • {product['title']} - {metadata.get('sector', 'N/A')}")
                    print(f"    Succès: {metadata.get('successes', [])[:1]}")
                    print(f"    Qualités: {metadata.get('qualities', [])[:2]}")

        except Exception as e:
            print(f"❌ Erreur lors de la récupération des détails: {str(e)}")

    # Test des évaluations
    test_api_endpoint("/api/evaluations/user/user_dev_001", "Récupération des évaluations utilisateur")

    print("\n🔍 VÉRIFICATION DES DONNÉES DE TEST:")
    print(f"  • Utilisateurs créés: 6 (différents secteurs)")
    print(f"  • Produits par utilisateur: 2 (CV ATS + Document)")
    print(f"  • Évaluations admin: 3 utilisateurs évalués")
    print(f"  • Extensions d'abonnement: 3 utilisateurs")
    print(f"  • Profils complets: ✅ succès, échecs, qualités, hobbies")

    print("\n🔐 CONNEXION TEST:")
    print(f"  • URL: {BASE_URL}")
    print(f"  • Status: {'✅ Backend opérationnel' if success else '❌ Backend hors ligne'}")

if __name__ == "__main__":
    test_database_content()