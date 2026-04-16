import os
import base64
import uuid
import subprocess
import shutil
from jinja2 import Environment, FileSystemLoader

TEMPLATE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "templates"))
OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "output"))

def sanitize_for_latex(data):
    """
    Échappe les caractères spéciaux LaTeX dans les données.
    """
    if data is None:
        return ""
    if isinstance(data, dict):
        return {k: sanitize_for_latex(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_for_latex(i) for i in data]
    elif isinstance(data, str):
        chars = {
            '&': r'\&', '%': r'\%', '$': r'\$', '#': r'\#', '_': r'\_',
            '{': r'\{', '}': r'\}', '~': r'\textasciitilde{}',
            '^': r'\textasciicircum{}', '\\': r'\textbackslash{}'
        }
        # Nettoyage des caractères de contrôle invisibles (comme \x00, \x08) qui font crasher pdflatex
        clean_str = "".join(c for c in data if c.isprintable() or c in ['\n', '\r'])
        clean_str = clean_str.replace('\r', '')
        text = ''.join(chars.get(c, c) for c in clean_str)
        return text.replace('\n', r' \newline ')
    elif isinstance(data, (int, float)):
        return str(data)
    elif isinstance(data, bool):
        return str(data)
    else:
        return data

def generate_pdf_from_latex(data: dict, template_name: str) -> str:
    """
    Remplit un template LaTeX avec les données et compile en PDF.
    """
    # 1. Préparation de l'environnement de template
    env = Environment(
        loader=FileSystemLoader(TEMPLATE_DIR),
        block_start_string='\\BLOCK{',
        block_end_string='}',
        variable_start_string='\\VAR{',
        variable_end_string='}',
        comment_start_string='\\#{',
        comment_end_string='}',
        line_statement_prefix='%%',
        line_comment_prefix='%#',
        trim_blocks=True,
        autoescape=False,
    )
    
    try:
        template = env.get_template(template_name)
    except Exception as e:
        print(f"CRITICAL: Template '{template_name}' not found in '{TEMPLATE_DIR}'. Error: {e}", flush=True)
        # List available templates for debugging
        print(f"[DEBUG] Available templates: {os.listdir(TEMPLATE_DIR)}", flush=True)
        raise e
    
    # 2. Rendu du contenu LaTeX
    # On s'assure que les listes existent pour éviter les erreurs dans le template
    data.setdefault('experiences', [])
    data.setdefault('educations', [])
    data.setdefault('successes', [])
    data.setdefault('failures', [])
    data.setdefault('qualities', [])
    data.setdefault('flaws', [])
    data.setdefault('interests', [])
    data.setdefault('skills', "")
    data.setdefault('bio', "")

    # [FIX] Chemin absolu vers le logo dans le dossier front
    logo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "front", "public", "logo.png"))
    if os.path.exists(logo_path):
        data['logo_path'] = logo_path

    # Nettoyage des données avant injection
    clean_data = sanitize_for_latex(data)
    rendered_tex = template.render(**clean_data)
    print(f"[DEBUG] LaTeX rendered. Length: {len(rendered_tex)} chars. Preview: {rendered_tex[:100]}...", flush=True)
    
    # ⚡ Optimisation RAM Disk (tmpfs) pour des I/O instantanés
    run_dir = "/dev/shm" if os.path.exists("/dev/shm") else OUTPUT_DIR

    # 3. Écriture du fichier .tex temporaire
    # Utilisation d'un UUID pour éviter toute collision en accès concurrent
    unique_id = uuid.uuid4().hex[:8]
    tex_filename = f"temp_{data.get('last_name', 'cv')}_{unique_id}.tex"
    tex_path = os.path.join(run_dir, tex_filename)
    
    if not os.path.exists(run_dir):
        os.makedirs(run_dir, exist_ok=True)
        
    with open(tex_path, "w", encoding="utf-8") as f:
        f.write(rendered_tex)
    print(f"[DEBUG] TeX file written to: {tex_path}", flush=True)
        
    # 4. Compilation avec pdflatex (si disponible)
    if not shutil.which("pdflatex"):
        print("WARNING: pdflatex not found in PATH. Returning .tex source instead.", flush=True)
        return tex_path  # Retourne le fichier source .tex

    try:
        # ⚡ Flags d'optimisation : -interaction=batchmode (pas de console) et -halt-on-error
        result = subprocess.run(
            ["pdflatex", "-interaction=batchmode", "-halt-on-error", "-output-directory", run_dir, tex_path],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=15 # Timeout réduit car la compilation devrait prendre < 1s
        )
        print(f"[DEBUG] pdflatex executed successfully. Return code: {result.returncode}", flush=True)
    except subprocess.TimeoutExpired:
        print("CRITICAL: LaTeX compilation timed out.", flush=True)
        raise Exception("La génération du PDF a pris trop de temps (Timeout).")
    except FileNotFoundError:
        # Double sécurité, retourne le .tex
        print("WARNING: pdflatex not found (FileNotFoundError). Returning .tex source instead.", flush=True)
        return tex_path
    except subprocess.CalledProcessError as e:
        print("LaTeX compilation failed:", flush=True)
        # Decode safely
        stdout_log = e.stdout.decode(errors='replace') if e.stdout else "No stdout"
        stderr_log = e.stderr.decode(errors='replace') if e.stderr else "No stderr"
        print(f"[DEBUG] STDOUT: {stdout_log}", flush=True)
        print(f"[DEBUG] STDERR: {stderr_log}", flush=True)
        # En cas d'erreur de compilation, on retourne quand même le source
        print("WARNING: LaTeX compilation failed. Returning .tex source for debugging.", flush=True)
        return tex_path
        
    # Le fichier PDF généré aura le même nom de base que le .tex
    pdf_filename = tex_filename.replace(".tex", ".pdf")
    pdf_path = os.path.join(run_dir, pdf_filename)
    print(f"[DEBUG] PDF generated at: {pdf_path}. Exists: {os.path.exists(pdf_path)}", flush=True)
    
    # [ROBUSTESSE] Nettoyage complet des fichiers générés par LaTeX (sauf le PDF final)
    for ext in [".tex", ".log", ".aux", ".out"]:
        temp_file = tex_path.replace(".tex", ext)
        if os.path.exists(temp_file):
            os.remove(temp_file)
        
    return pdf_path