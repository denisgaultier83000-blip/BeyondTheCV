import os
import pytest
import uuid
from backend.services.latex import sanitize_for_latex, generate_pdf_from_latex

# --- Test 1: Validation de la fonction `sanitize_for_latex` ---

def test_sanitize_for_latex_special_chars():
    """
    Vérifie que les caractères spéciaux LaTeX sont correctement échappés.
    """
    input_str = "& % $ # _ { } ~ ^ \\"
    expected_output = r"\& \% \$ \# \_ \{ \} \textasciitilde{} \textasciicircum{} \textbackslash{}"
    assert sanitize_for_latex(input_str) == expected_output

def test_sanitize_for_latex_with_newlines():
    """
    Vérifie que les sauts de ligne sont convertis en commande LaTeX.
    """
    input_str = "Ligne 1\nLigne 2\r\nLigne 3"
    expected_output = r"Ligne 1 \newline Ligne 2 \newline Ligne 3"
    assert sanitize_for_latex(input_str) == expected_output

def test_sanitize_for_latex_recursive_dict():
    """
    Vérifie que la fonction parcourt récursivement les dictionnaires.
    """
    input_dict = {"key1": "value&", "nested": {"key2": "value%"}}
    expected_dict = {"key1": r"value\&", "nested": {"key2": r"value\%"}}
    assert sanitize_for_latex(input_dict) == expected_dict

def test_sanitize_for_latex_recursive_list():
    """
    Vérifie que la fonction parcourt récursivement les listes.
    """
    input_list = ["item$", ["nested_item#"]]
    expected_list = [r"item\$", [r"nested\_item\#"]]
    assert sanitize_for_latex(input_list) == expected_list

def test_sanitize_for_latex_with_none():
    """
    Vérifie que None est converti en chaîne vide.
    """
    assert sanitize_for_latex(None) == ""


# --- Environnement de test LaTeX ---

@pytest.fixture
def setup_latex_env(tmp_path):
    """
    Crée un environnement de test pour la génération LaTeX avec des dossiers temporaires.
    """
    output_dir = tmp_path / "output"
    output_dir.mkdir()
    template_dir = tmp_path / "templates"
    template_dir.mkdir()
    
    (template_dir / "test_template.tex").write_text("Name: \\VAR{last_name}")
    
    return str(template_dir), str(output_dir)

# --- Test 3 (Nouveau): Fallback si pdflatex est manquant ---
def test_generate_pdf_fallback_if_pdflatex_missing(mocker, setup_latex_env):
    """
    Vérifie que la fonction retourne le chemin du .tex si pdflatex n'est pas trouvé.
    """
    template_dir, output_dir = setup_latex_env
    
    mocker.patch('backend.services.latex.TEMPLATE_DIR', template_dir)
    mocker.patch('backend.services.latex.OUTPUT_DIR', output_dir)
    # Simule l'absence de pdflatex dans le PATH système
    mocker.patch('shutil.which', return_value=None)
    
    data = {"last_name": "NoPdf"}
    
    result_path = generate_pdf_from_latex(data, "test_template.tex")
    
    # Le résultat doit être le chemin vers le fichier .tex, pas .pdf
    assert result_path.endswith(".tex")
    assert os.path.exists(result_path)