import re
import os

# List of files to refactor
files_to_refactor = [
    "backend/services/dashboard.py",
    "backend/services/documents.py",
    "backend/services/payment.py",
    "backend/services/cv_services.py",
    "backend/services/admin_service.py",
    "backend/services/pitch_service.py"
]

def refactor_file(file_path):
    print(f"Refactoring {file_path}...")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Replace all occurrences of /api/ in router decorators
        # This handles .get, .post, .put, .delete, .patch etc.
        new_content, count = re.subn(r'(@router\.(get|post|put|delete|patch|options|head)\(")/api/', r'\1/', content)

        if count > 0:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"  ...Found and replaced {count} occurrences.")
        else:
            print(f"  ...No occurrences found to replace.")
    except FileNotFoundError:
        print(f"  ...File not found. Skipping.")
    except Exception as e:
        print(f"  ...An error occurred: {e}")

if __name__ == "__main__":
    for f in files_to_refactor:
        refactor_file(f)
    print("Refactoring process finished.")
