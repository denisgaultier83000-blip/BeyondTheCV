import os
from fpdf import FPDF

# Configuration
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "exemple_cv")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "cv_test_simple.pdf")

def create_test_cv():
    # 1. Création du dossier
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        print(f"📁 Dossier créé : {OUTPUT_DIR}")

    # 2. Initialisation du PDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # 3. Contenu structuré pour faciliter le parsing
    # En-tête
    pdf.set_font("Arial", "B", 16)
    pdf.cell(200, 10, txt="Jean DUPONT", ln=True, align='C')
    
    pdf.set_font("Arial", "", 11)
    pdf.cell(200, 6, txt="jean.dupont@test.com | +33 6 12 34 56 78", ln=True, align='C')
    pdf.cell(200, 6, txt="Paris, France | Développeur Fullstack", ln=True, align='C')
    pdf.ln(10)

    # Section Expérience
    pdf.set_font("Arial", "B", 12)
    pdf.set_fill_color(200, 220, 255)
    pdf.cell(0, 8, txt="EXPÉRIENCE PROFESSIONNELLE", ln=True, fill=True)
    pdf.ln(2)

    pdf.set_font("Arial", "B", 11)
    pdf.cell(0, 6, txt="TechCorp - Senior Developer", ln=True)
    pdf.set_font("Arial", "I", 10)
    pdf.cell(0, 6, txt="Janvier 2020 - Présent | Lyon", ln=True)
    pdf.set_font("Arial", "", 10)
    pdf.multi_cell(0, 5, txt="- Développement d'applications web avec React et Python.\n- Gestion d'une équipe de 5 personnes.\n- Amélioration des performances de 30%.")
    pdf.ln(5)

    # Section Formation
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 8, txt="FORMATION", ln=True, fill=True)
    pdf.ln(2)

    pdf.set_font("Arial", "B", 11)
    pdf.cell(0, 6, txt="Université de Technologie - Master Informatique", ln=True)
    pdf.set_font("Arial", "I", 10)
    pdf.cell(0, 6, txt="2015 - 2019 | Paris", ln=True)
    pdf.ln(5)

    # Section Compétences
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 8, txt="COMPÉTENCES", ln=True, fill=True)
    pdf.ln(2)
    pdf.set_font("Arial", "", 10)
    pdf.multi_cell(0, 5, txt="Langages: Python, JavaScript, TypeScript, SQL\nOutils: Docker, Git, AWS, Linux\nLangues: Anglais (Courant), Français (Natif)")

    # 4. Sauvegarde
    pdf.output(OUTPUT_FILE)
    print(f"✅ CV de test généré avec succès : {OUTPUT_FILE}")

if __name__ == "__main__":
    try:
        create_test_cv()
    except Exception as e:
        print(f"❌ Erreur : {e}")
```

### Étape 3 : Génération
Lancez simplement le script :
```bash
python z:\Beyondthecv\generate_test_cv.py
