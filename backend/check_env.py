import importlib.util
import shutil
import os
import sys
try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

def check_module(name):
    try:
        if importlib.util.find_spec(name) is not None:
            print(f"[OK] Module '{name}' found.")
            return True
    except ImportError:
        pass
    print(f"[FAIL] Module '{name}' NOT found.")
    return False

def check_command(name):
    if shutil.which(name) is not None:
        print(f"[OK] Command '{name}' found.")
        return True
    else:
        print(f"[FAIL] Command '{name}' NOT found.")
        return False

def check_path(path, is_file=False):
    if os.path.exists(path):
        if is_file and os.path.isfile(path):
             print(f"[OK] File '{path}' found.")
             return True
        elif not is_file and os.path.isdir(path):
             print(f"[OK] Directory '{path}' found.")
             return True
        else:
             print(f"[FAIL] Path '{path}' exists but is not a {'file' if is_file else 'directory'}.")
             return False
    else:
        print(f"[FAIL] Path '{path}' NOT found.")
        return False

def main():
    print("--- Checking Python Dependencies ---")
    # Note: python-docx s'importe via 'docx', email-validator via 'email_validator'
    modules = ["fastapi", "uvicorn", "pypdf", "jinja2", "docx", "email_validator", "openai", "requests", "google.genai", "dotenv", "passlib", "jose", "multipart"]
    all_modules = all(check_module(m) for m in modules)

    print("\n--- Checking System Dependencies ---")
    commands = ["pdflatex"]
    all_commands = all(check_command(c) for c in commands)

    print("\n--- Checking File Structure ---")
    base_dir = os.path.dirname(os.path.abspath(__file__))
    paths = [
        (os.path.join(base_dir, "templates"), False),
        (os.path.join(base_dir, "templates", "cv_ats.tex"), True),
        (os.path.join(base_dir, "templates", "report.tex"), True),
        (os.path.join(base_dir, "output"), False),
        (os.path.join(base_dir, "ai", "prompts"), False),
    ]
    all_paths = all(check_path(p, f) for p, f in paths)

    print("\n--- Checking AI Connectivity ---")
    if load_dotenv:
        load_dotenv()
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            from google import genai
            client = genai.Client(api_key=gemini_key)
            models = [m.name for m in client.models.list()]
            print(f"[OK] Gemini API Connected. Found {len(models)} models.")
            print(f"[INFO] Available models: {', '.join(models)}")
            
            # Vérification des versions Gemini 2.x configurées
            target_fast = "gemini-1.5-flash"
            
            if any(target_fast in m for m in models):
                print(f"[OK] '{target_fast}' is available and ready.")
            else:
                print(f"[CRITICAL] '{target_fast}' NOT found. Check your API Key or Region.")
        except Exception as e:
            print(f"[FAIL] Gemini Connection Error: {e}")
    else:
        print("[INFO] No GEMINI_API_KEY found. Skipping AI check.")

    print("\n--- Summary ---")
    if all_modules and all_commands and all_paths:
        print("✅ Environment looks good!")
    else:
        print("❌ Environment has issues. Check logs above.")

if __name__ == "__main__":
    main()
