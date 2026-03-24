#!/usr/bin/env python3
"""
Script pour insérer des utilisateurs de test dans PostgreSQL
avec des profils complets pour tester toutes les fonctionnalités
"""
import psycopg2
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
import json
from security import get_password_hash

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "")


def get_postgres_connection():
    return psycopg2.connect(DATABASE_URL)


def insert_test_users():
    print("[TEST DATA] Insertion des utilisateurs de test...")
    print("-" * 60)

    conn = get_postgres_connection()
    cur = conn.cursor()

    # Utilisateurs de test avec profils variés
    test_users = [
        {
            "id": "pm_tech_001",
            "email": "julien.techpm@test.com",
            "password": "test123",
            "first_name": "Julien",
            "last_name": "Morel",
            "sector": "Produit (Tech)",
            "job_title": "Technical Product Manager",
            "experience_years": 7,
            "successes": [
                "Lancement d'une API publique générant 500k€ d'ARR en 6 mois",
                "Migration complexe d'une architecture monolithe vers microservices sans downtime",
                "Réduction du temps de chargement de l'app de 40%"
            ],
            "failures": [
                "Développement d'une feature trop complexe techniquement qui n'a rencontré aucune adoption",
                "Retard de 3 mois sur une roadmap mal estimée avec l'équipe de dev"
            ],
            "qualities": ["Analytique", "Résolution de problèmes", "Rigoureux"],
            "hobbies": ["Domotique (Raspberry Pi)", "Échecs", "VTT de descente"],
            "languages": ["Français", "Anglais"],
            "certifications": ["AWS Cloud Practitioner", "CSPO (Certified Scrum Product Owner)"]
        },
        {
            "id": "pm_growth_002",
            "email": "sophie.growthpm@test.com",
            "password": "test123",
            "first_name": "Sophie",
            "last_name": "Laurent",
            "sector": "Produit (Growth)",
            "job_title": "Growth Product Manager",
            "experience_years": 5,
            "successes": [
                "Optimisation du funnel d'onboarding augmentant la conversion de +45%",
                "Lancement d'un modèle freemium ayant doublé la base d'utilisateurs actifs",
                "Mise en place d'un programme de parrainage générant 20% des nouvelles acquisitions"
            ],
            "failures": [
                "Campagne d'acquisition basée sur un persona erroné causant un fort churn",
                "A/B test mal configuré en production ayant faussé 2 semaines de data"
            ],
            "qualities": ["Orienté performance", "Pragmatique", "Communicant"],
            "hobbies": ["Photographie argentique", "Investissement Crypto", "Kitesurf"],
            "languages": ["Français", "Anglais", "Espagnol"],
            "certifications": ["Reforge Growth Series", "Google Analytics"]
        },
        {
            "id": "pm_ux_003",
            "email": "marc.uxpm@test.com",
            "password": "test123",
            "first_name": "Marc",
            "last_name": "Dufour",
            "sector": "Produit (Discovery)",
            "job_title": "Product Manager",
            "experience_years": 6,
            "successes": [
                "Refonte totale de l'application mobile faisant passer la note store de 3.2 à 4.8/5",
                "Mise en place d'un process de 'Continuous Discovery' avec 50 interviews utilisateurs par mois",
                "Lancement d'un module d'accessibilité primé par une association"
            ],
            "failures": [
                "Trop de temps passé en phase de recherche utilisateur menant à un time-to-market raté par rapport aux concurrents",
                "Feature validée en prototype mais abandonnée car techniquement irréalisable avec la dette technique actuelle"
            ],
            "qualities": ["Empathie", "Créatif", "À l'écoute"],
            "hobbies": ["Poterie", "Théâtre d'improvisation", "Randonnée en haute montagne"],
            "languages": ["Français", "Anglais", "Italien"],
            "certifications": ["Nielsen Norman Group UX Certification"]
        }
    ]

    try:
        for user in test_users:
            # Calculer les dates d'abonnement
            created_at = datetime.now() - timedelta(days=user["experience_years"] * 30)
            subscription_start = created_at
            subscription_expiry = subscription_start + timedelta(days=90)  # 3 mois

            # Insérer l'utilisateur
            cur.execute("""
                INSERT INTO users (
                    id, email, hashed_password, first_name, last_name,
                    created_at, subscription_start_date, subscription_expiration_date,
                    is_premium, subscription_status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, (
                user["id"], user["email"], get_password_hash(user["password"]),
                user["first_name"], user["last_name"], created_at,
                subscription_start, subscription_expiry, True, 'active'
            ))

            # Créer des produits CV pour chaque utilisateur
            for i, product_type in enumerate(['cv_ats', 'document']):
                product_id = f"{user['id']}_cv_{i+1}"
                created_at_cv = created_at + timedelta(days=i*30)

                # Métadonnées du CV avec expériences, succès, échecs, qualités, hobbies
                metadata = {
                    "sector": user["sector"],
                    "job_title": user["job_title"],
                    "experience_years": user["experience_years"],
                    "successes": user["successes"],
                    "failures": user["failures"],
                    "qualities": user["qualities"],
                    "hobbies": user["hobbies"],
                    "languages": user["languages"],
                    "certifications": user["certifications"],
                    "current_status": "Actif" if i == 0 else "Archivé"
                }

                cur.execute("""
                    INSERT INTO products (
                        id, user_id, product_type, filename, title, description,
                        metadata, created_at, is_archived
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                """, (
                    product_id, user["id"], product_type,
                    f"cv_{user['first_name'].lower()}_{user['last_name'].lower()}_{product_type}.pdf",
                    f"CV {user['first_name']} {user['last_name']} - {product_type.replace('_', ' ').title()}",
                    f"CV optimisé pour {user['sector']} - {user['experience_years']} ans d'expérience",
                    json.dumps(metadata),
                    created_at_cv,
                    i != 0  # Premier CV actif, autres archivés
                ))

            # [CRITIQUE] Insérer les données structurées pour le Dashboard (Frontend)
            profile_data = {
                "form": {
                    "first_name": user["first_name"],
                    "last_name": user["last_name"],
                    "email": user["email"],
                    "target_role_primary": user["job_title"],
                    "target_company": "TechCorp",
                    "target_industry": "Technology",
                    "qualities": user["qualities"],
                    "flaws": ["Perfectionniste"],
                    "interests": user["hobbies"],
                    "bio": f"{user['job_title']} orienté résultats."
                },
                "experiences": [
                    {
                        "id": i + 1,
                        "role": user["job_title"],
                        "company": f"Entreprise {i + 1}",
                        "start_date": "2020",
                        "end_date": "2023",
                        "description": succ
                    } for i, succ in enumerate(user["successes"])
                ],
                "educations": []
            }
            cur.execute("""
                INSERT INTO user_profiles (user_id, profile_data) VALUES (%s, %s)
                ON CONFLICT (user_id) DO UPDATE SET profile_data = EXCLUDED.profile_data
            """, (user["id"], json.dumps(profile_data)))

            # Créer des évaluations admin pour certains utilisateurs
            if user["id"] in ["pm_tech_001", "pm_growth_002", "pm_ux_003"]:
                evaluation_date = created_at + timedelta(days=15)
                cur.execute("""
                    INSERT INTO feedbacks (
                        user_id, feature, feedback, reason, job_type, is_positive, sentiment, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    user["id"],
                    "cv_generation",
                    f"Excellent profil {user['sector']}. Profil très complet avec de belles réussites.",
                    "Mettre plus en avant les certifications et ajouter des métriques.",
                    user["job_title"],
                    True,  # is_positive
                    "positive", # sentiment
                    evaluation_date
                ))

            print(f"✅ Utilisateur {user['first_name']} {user['last_name']} ({user['sector']}) créé")

        # Créer quelques extensions d'abonnement pour tester
        extensions = [
            ("pm_tech_001", "plan_3_months", 2499, "Extension de 3 mois pour PM Tech"),
            ("pm_growth_002", "plan_1_month", 999, "Extension d'urgence pour PM Growth"),
            ("pm_ux_003", "plan_6_months", 4499, "Extension longue durée pour PM UX")
        ]

        for user_id, plan_id, price, notes in extensions:
            extension_date = datetime.now() - timedelta(days=30)
            new_expiry = datetime.now() + timedelta(days=60)

            cur.execute("""
                INSERT INTO subscription_extensions (
                    id, user_id, plan_id, extension_date, new_expiration_date,
                    price_paid_cents, payment_status, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, (
                f"ext_{user_id}_{plan_id}",
                user_id, plan_id, extension_date, new_expiry,
                price, "completed", notes
            ))

            # Mettre à jour la date d'expiration de l'utilisateur
            cur.execute("""
                UPDATE users
                SET subscription_expiration_date = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (new_expiry, user_id))

        conn.commit()
        print("✅ Tous les utilisateurs de test ont été insérés avec succès!")
    except Exception as e:
        conn.rollback()
        print(f"❌ ERREUR FATALE LORS DE L'INSERTION : {e}")
    finally:
        conn.close()

    print("\n📊 RÉSUMÉ DES DONNÉES DE TEST:")
    print("- 3 utilisateurs postulant pour le même type de poste (Product Manager) mais avec des profils très différents")
    print("- CV ATS et Document pour chaque utilisateur")
    print("- Évaluations admin pour 3 utilisateurs")
    print("- Extensions d'abonnement pour 3 utilisateurs")
    print("- Profils complets avec succès, échecs, qualités et hobbies")
    print("\n🔐 CREDENTIALS DE CONNEXION:")
    print("Mot de passe pour tous les comptes de test: test123")
    for user in test_users:
        print(f"- {user['email']} ({user['first_name']} {user['last_name']} - {user['sector']})")


if __name__ == "__main__":
    insert_test_users()