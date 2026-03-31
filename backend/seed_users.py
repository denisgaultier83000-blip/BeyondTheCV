import asyncio
import json
from passlib.context import CryptContext
import uuid
from datetime import datetime
import psycopg2

# [FIX EXPERT] Importe DATABASE_URL depuis le module centralisé
# pour garantir une source de vérité unique pour la connexion.
from database import init_db, DATABASE_URL

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def seed_test_users():
    # 1. Force l'initialisation de la base de données et de ses tables (users, etc.)
    init_db()

    # 2. Connexion stricte à PostgreSQL
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    # La table 'users' est déjà gérée par database.py. On crée juste user_profiles si nécessaire.
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_profiles (
            user_id TEXT PRIMARY KEY,
            profile_data TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    
    # 2. Création des 10 utilisateurs (test1@test.com à test10@test.com)
    for i in range(1, 11):
        email = f"test{i}@test.com"
        hashed_pw = pwd_context.hash(f"test{i}") # Le mot de passe est test1, test2...
        user_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        try:
            # Insertion alignée sur le modèle officiel (database.py)
            cursor.execute("""
                INSERT INTO users (id, email, hashed_password, first_name, last_name, created_at, is_premium)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (user_id, email, hashed_pw, f"Candidat{i}", "Test", now, True))
            
            # Un profil orienté "Tech" pour les impairs, "Sales/Management" pour les pairs
            target_role = "Développeur Fullstack Sénior" if i % 2 != 0 else "Directeur Commercial"
            target_company = "Google" if i % 2 != 0 else "Salesforce"
            
            # Écrasement pour nos profils hyper-détaillés
            if i == 9:
                target_role = "Product Manager"
                target_company = "Doctolib"
            elif i == 10:
                target_role = "Data Scientist Senior"
                target_company = "LVMH"
            
            mock_data = {
                "form": {
                    "first_name": f"Candidat{i}", 
                    "last_name": "Test", 
                    "email": email, 
                    "target_role_primary": target_role, 
                    "target_company": target_company
                },
                "experiences": [],
                "educations": []
            }

            # Injection d'un parcours complet spécifiquement pour test2
            if i == 2:
                mock_data["form"]["bio"] = "Directeur commercial avec plus de 10 ans d'expérience dans la vente de solutions SaaS B2B. Expert en stratégie d'acquisition et management d'équipes performantes."
                mock_data["form"]["skills"] = "Négociation B2B, Management, Stratégie Commerciale, Salesforce, CRM, Leadership"
                mock_data["experiences"] = [
                    {
                        "id": 1,
                        "role": "Directeur Régional des Ventes",
                        "company": "Oracle",
                        "start_date": "Janvier 2018",
                        "end_date": "Présent",
                        "description": "Gestion d'une équipe de 15 commerciaux. Définition de la stratégie de vente B2B. Résultat : Augmentation du CA de 35% en 2 ans."
                    },
                    {
                        "id": 2,
                        "role": "Ingénieur Commercial",
                        "company": "SAP",
                        "start_date": "Mars 2014",
                        "end_date": "Décembre 2017",
                        "description": "Vente de solutions ERP complexes. Prospection de comptes stratégiques. Dépassement régulier des objectifs (+120%)."
                    }
                ]
            
            # PROFIL 9 : PRODUCT MANAGER (Orienté Produit & Business)
            elif i == 9:
                mock_data["form"]["bio"] = "Product Manager avec 6 ans d'expérience dans la santé numérique et le SaaS. Passionné par la résolution de problèmes utilisateurs via des solutions scalables et l'analyse de données."
                mock_data["form"]["skills"] = "Product Management, Agile/Scrum, User Research, SQL, Jira, Figma, Data Analysis, A/B Testing"
                mock_data["form"]["job_description"] = "Doctolib recherche un Senior Product Manager pour rejoindre l'équipe Patient. Vos missions : définir la roadmap, collaborer avec les équipes tech et design, analyser les KPIs (conversion, rétention) et mener des user research. Compétences requises : 5+ ans d'expérience en produit, maîtrise des méthodologies agiles, esprit analytique, SQL, anglais courant."
                mock_data["form"]["work_style"] = ["Orienté solution", "Organisé"]
                mock_data["form"]["relational_style"] = ["Communicant", "Leader"]
                mock_data["form"]["professional_approach"] = ["Vision stratégique", "Force de proposition"]
                mock_data["form"]["flaws"] = ["Perfectionniste", "Trop exigeant"]
                mock_data["experiences"] = [
                    {
                        "id": 1, "role": "Product Manager", "company": "Alan", "start_date": "2020", "end_date": "Présent",
                        "description": "Gestion de la roadmap produit pour la verticale assurance. Animation des rituels agiles avec 10 développeurs. Augmentation de l'engagement utilisateur de 25%."
                    },
                    {
                        "id": 2, "role": "Product Owner", "company": "Criteo", "start_date": "2017", "end_date": "2020",
                        "description": "Création de nouvelles fonctionnalités B2B. Rédaction des user stories et priorisation du backlog."
                    }
                ]
                mock_data["educations"] = [
                    {"id": 1, "degree": "Master Management de l'Innovation", "school": "HEC Paris", "year": "2017"}
                ]
                
            # PROFIL 10 : DATA SCIENTIST (Orienté Tech & Analytique)
            elif i == 10:
                mock_data["form"]["bio"] = "Data Scientist spécialisé en Machine Learning et NLP avec 5 ans d'expérience. Expert en Python, je transforme les données brutes en algorithmes prédictifs pour améliorer l'expérience client."
                mock_data["form"]["skills"] = "Python, Machine Learning, NLP, TensorFlow, SQL, AWS, Git, Data Visualization"
                mock_data["form"]["job_description"] = "LVMH recrute un Data Scientist Senior pour son équipe Client & Innovation. Rôle : concevoir des modèles prédictifs, faire du NLP sur les retours clients, travailler sur AWS/GCP, mettre en production des algorithmes de machine learning. Requis : Python, TensorFlow, PyTorch, SQL, expérience en Cloud, bon relationnel pour vulgariser la data aux équipes métier."
                mock_data["form"]["work_style"] = ["Analytique", "Rigoureux"]
                mock_data["form"]["relational_style"] = ["Pédagogue", "Collaboratif"]
                mock_data["form"]["professional_approach"] = ["Pragmatique", "Orienté performance"]
                mock_data["form"]["flaws"] = ["Introverti", "A du mal à déléguer"]
                mock_data["experiences"] = [
                    {
                        "id": 1, "role": "Data Scientist", "company": "Sephora", "start_date": "2021", "end_date": "Présent",
                        "description": "Développement d'un moteur de recommandation de produits basé sur du filtrage collaboratif. Déploiement des modèles sur GCP. +15% de taux de conversion."
                    },
                    {
                        "id": 2, "role": "Data Analyst", "company": "BNP Paribas", "start_date": "2018", "end_date": "2021",
                        "description": "Analyse des données clients, création de dashboards interactifs sous Tableau, automatisation des reportings en Python."
                    }
                ]
                mock_data["educations"] = [
                    {"id": 1, "degree": "Diplôme d'Ingénieur en Mathématiques Appliquées", "school": "Polytechnique", "year": "2018"}
                ]
            
        cursor.execute("INSERT INTO user_profiles (user_id, profile_data) VALUES (%s, %s)", (user_id, json.dumps(mock_data)))
            print(f"✅ Utilisateur {email} créé (Mdp: test{i} | Rôle: {target_role})")
    except psycopg2.IntegrityError as e:
        conn.rollback()
            print(f"⚠️ L'utilisateur {email} existe déjà ou erreur : {e}")
            
    conn.commit()
    conn.close()
    print("🎉 Injection des profils de test terminée !")

if __name__ == "__main__":
    seed_test_users()