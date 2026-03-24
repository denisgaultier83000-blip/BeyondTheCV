import requests
import os
import time

# Configuration
API_URL = "http://localhost:8000"
TEST_PDF_PATH = "test_cv_dummy.pdf"

def create_dummy_pdf():
    """Crée un PDF valide minimaliste pour le test."""
    # En-tête PDF 1.4 simple
    content = (
        b"%PDF-1.4\n"
        b"1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n"
        b"2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n"
        b"3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 4 0 R\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 5 0 R\n>>\nendobj\n"
        b"4 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\nendobj\n"
        b"5 0 obj\n<<\n/Length 55\n>>\nstream\n"
        b"BT\n/F1 12 Tf\n70 700 Td\n(Jean Dupont - Developpeur Python - Paris) Tj\nET\nendstream\nendobj\n"
        b"xref\n0 6\n0000000000 65535 f\n0000000010 00000 n\n0000000060 00000 n\n0000000157 00000 n\n0000000307 00000 n\n0000000394 00000 n\n"
        b"trailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n503\n%%EOF\n"
    )
    with open(TEST_PDF_PATH, "wb") as f:
        f.write(content)

def test_cv_upload():
    print("📄 Création d'un PDF de test...")
    create_dummy_pdf()
    
    print(f"🚀 Test d'upload vers {API_URL}/api/parse-cv...")
    try:
        with open(TEST_PDF_PATH, "rb") as f:
            files = {"file": ("cv.pdf", f, "application/pdf")}
            start = time.time()
            response = requests.post(f"{API_URL}/api/parse-cv", files=files)
            duration = time.time() - start
            
        if response.status_code == 200:
            print(f"✅ Succès ({duration:.2f}s) !")
            print("   Réponse JSON :", response.json())
        else:
            print(f"❌ Échec ({response.status_code}) :", response.text)
            
    except Exception as e:
        print(f"❌ Erreur de connexion : {e}")
    finally:
        if os.path.exists(TEST_PDF_PATH):
            os.remove(TEST_PDF_PATH)

if __name__ == "__main__":
    test_cv_upload()