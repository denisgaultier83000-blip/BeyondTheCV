from pathlib import Path

import pytest

from backend.services.storage_manager import StorageManager


def test_storage_manager_save_load_and_exists(tmp_path):
    storage = StorageManager(root_dir=tmp_path)

    saved_path = storage.save_text("hello world", "docs", "note.txt")

    assert Path(saved_path).exists()
    assert storage.exists(saved_path)
    assert storage.load_text(saved_path) == "hello world"

    binary_path = storage.save_bytes(b"abc123", "docs", "data.bin")
    assert storage.load_bytes(binary_path) == b"abc123"


def test_storage_manager_rejects_path_traversal(tmp_path):
    storage = StorageManager(root_dir=tmp_path)

    with pytest.raises(ValueError):
        storage.resolve_path("../outside.txt")

    with pytest.raises(ValueError):
        storage.path()


def test_storage_manager_delete_and_delete_user_files(tmp_path):
    storage = StorageManager(root_dir=tmp_path)

    file_path = storage.save_text("temp", "temp", "user-1", "draft.txt")
    assert Path(file_path).exists()
    assert storage.delete(file_path) is True
    assert not Path(file_path).exists()

    storage.save_text("product", "products", "user-42", "resume.txt")
    storage.save_text("upload", "uploads", "user-42", "scan.pdf")
    storage.save_text("cache", "output", "user-42", "report.txt")

    deleted = storage.delete_user_files("user-42")

    assert deleted == 3
    assert not (tmp_path / "products" / "user-42").exists()
    assert not (tmp_path / "uploads" / "user-42").exists()
    assert not (tmp_path / "output" / "user-42").exists()
