import os
import subprocess
import sys

# Configuration
OUTPUT_DIR = "/app/output"
TEST_TEX_FILE = os.path.join(OUTPUT_DIR, "smoke_test.tex")
TEST_PDF_FILE = os.path.join(OUTPUT_DIR, "smoke_test.pdf")

# 1. Création d'un fichier .tex minimal valide
tex_content = r"""
\documentclass{article}
\begin{document}
Hello World from Docker!
Test characters: \$ \% \& \_ \{ \}
\end{document}
"""

print(f"[1] Writing test TEX file to {TEST_TEX_FILE}...")
os.makedirs(OUTPUT_DIR, exist_ok=True)
with open(TEST_TEX_FILE, "w") as f:
    f.write(tex_content)

if os.path.exists(TEST_TEX_FILE):
    print("[OK] TEX file created.")
else:
    print("[FAIL] TEX file not created.")
    sys.exit(1)

# 2. Vérification de pdflatex
print("[2] Checking pdflatex...")
try:
    res = subprocess.run(["pdflatex", "--version"], capture_output=True, text=True)
    print(f"[OK] pdflatex found: {res.stdout.splitlines()[0]}")
except FileNotFoundError:
    print("[FAIL] pdflatex NOT found in PATH.")
    sys.exit(1)

# 3. Compilation
print(f"[3] Compiling {TEST_TEX_FILE}...")
try:
    res = subprocess.run(
        ["pdflatex", "-interaction=nonstopmode", "-output-directory", OUTPUT_DIR, TEST_TEX_FILE],
        capture_output=True,
        text=True,
        timeout=30
    )
    if res.returncode == 0:
        print("[OK] Compilation successful.")
    else:
        print(f"[FAIL] Compilation failed with code {res.returncode}.")
        print("STDOUT:", res.stdout)
        print("STDERR:", res.stderr)
        sys.exit(1)
except Exception as e:
    print(f"[FAIL] Execution error: {e}")
    sys.exit(1)

# 4. Vérification du PDF
print("[4] Verifying PDF output...")
if os.path.exists(TEST_PDF_FILE) and os.path.getsize(TEST_PDF_FILE) > 0:
    print(f"[OK] PDF created successfully. Size: {os.path.getsize(TEST_PDF_FILE)} bytes.")
else:
    print("[FAIL] PDF missing or empty.")
    sys.exit(1)

print("\n--- SMOKE TEST PASSED ---")