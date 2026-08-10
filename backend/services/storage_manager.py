from __future__ import annotations

import os
import re
import shutil
from pathlib import Path


class StorageManager:
    def __init__(self, root_dir: str | None = None):
        default_root = os.getenv(
            "BTCV_STORAGE_ROOT",
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),
        )
        self.root_dir = Path(root_dir or default_root).resolve()
        self.root_dir.mkdir(parents=True, exist_ok=True)

    def _sanitize_part(self, part: str) -> str:
        value = Path(str(part or "").strip()).name
        value = re.sub(r"[^A-Za-z0-9._-]+", "_", value).strip("._")
        if not value:
            raise ValueError("Invalid storage path segment")
        return value[:255]

    def _build_path(self, *parts: str) -> Path:
        cleaned_parts = [self._sanitize_part(part) for part in parts if str(part or "").strip()]
        if not cleaned_parts:
            raise ValueError("Storage path cannot be empty")
        return (self.root_dir.joinpath(*cleaned_parts)).resolve()

    def resolve_path(self, path: str) -> str:
        candidate = Path(str(path or "").strip())
        if not candidate.is_absolute():
            candidate = self.root_dir / candidate
        candidate = candidate.resolve()
        if os.path.commonpath([str(self.root_dir), str(candidate)]) != str(self.root_dir):
            raise ValueError("Path is outside storage root")
        return str(candidate)

    def path(self, *parts: str) -> str:
        return str(self._build_path(*parts))

    def ensure_dir(self, *parts: str) -> str:
        directory = self._build_path(*parts)
        directory.mkdir(parents=True, exist_ok=True)
        return str(directory)

    def safe_filename(self, filename: str) -> str:
        return self._sanitize_part(filename)

    def save_bytes(self, content: bytes, *parts: str) -> str:
        file_path = self._build_path(*parts)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(content)
        return str(file_path)

    def save_text(self, content: str, *parts: str, encoding: str = "utf-8") -> str:
        file_path = self._build_path(*parts)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content, encoding=encoding)
        return str(file_path)

    def load_bytes(self, path: str) -> bytes:
        return Path(self.resolve_path(path)).read_bytes()

    def load_text(self, path: str, encoding: str = "utf-8") -> str:
        return Path(self.resolve_path(path)).read_text(encoding=encoding)

    def exists(self, path: str) -> bool:
        try:
            return Path(self.resolve_path(path)).exists()
        except ValueError:
            return False

    def delete(self, path: str) -> bool:
        try:
            resolved = Path(self.resolve_path(path))
        except ValueError:
            return False

        if not resolved.exists():
            return False

        if resolved.is_dir():
            shutil.rmtree(resolved)
        else:
            resolved.unlink()
        return True

    def delete_user_files(self, user_id: str) -> int:
        deleted = 0
        namespaces = ["products", "uploads", "temp", "output"]
        for namespace in namespaces:
            target_dir = Path(self.path(namespace, user_id))
            if target_dir.exists():
                shutil.rmtree(target_dir)
                deleted += 1
        return deleted


storage = StorageManager()
