import os
import uuid
import zipfile
import shutil
from fastapi import HTTPException, UploadFile
from app.config import UPLOAD_DIR, MAX_FILE_SIZE_MB

ALLOWED_TABULAR_EXT = {".csv"}
ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".webp"}
ALLOWED_TEXT_EXT = {".txt"}
ALLOWED_ZIP_EXT = {".zip"}


def _generate_path(subdir: str, filename: str) -> str:
    """Buat path unik dengan UUID agar tidak collision."""
    os.makedirs(os.path.join(UPLOAD_DIR, subdir), exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}_{filename}"
    return os.path.join(UPLOAD_DIR, subdir, unique_name)


def validate_file_size(file: UploadFile):
    """Cek ukuran file tidak melebihi batas."""
    file.file.seek(0, 2)  # seek ke akhir
    size_mb = file.file.tell() / (1024 * 1024)
    file.file.seek(0)     # reset ke awal
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"Ukuran file melebihi batas {MAX_FILE_SIZE_MB}MB"
        )


def save_tabular(file: UploadFile) -> tuple[str, str]:
    """
    Simpan file CSV.
    Return: (filepath, original_filename)
    """
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_TABULAR_EXT:
        raise HTTPException(
            status_code=400, detail="Hanya file .csv yang diperbolehkan")

    validate_file_size(file)

    filepath = _generate_path("tabular", file.filename)
    content = file.file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    return filepath, file.filename


def save_text(file: UploadFile) -> tuple[str, str]:
    """
    Simpan file teks .txt.
    Return: (filepath, original_filename)
    """
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_TEXT_EXT:
        raise HTTPException(
            status_code=400, detail="Hanya file .txt yang diperbolehkan")

    validate_file_size(file)

    filepath = _generate_path("text", file.filename)
    content = file.file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    return filepath, file.filename


def save_image_zip(file: UploadFile) -> tuple[str, dict]:
    """
    Simpan dan extract ZIP gambar.
    Struktur ZIP: folder_label/gambar.jpg
    Return: (extract_dir, meta)
    meta = {classes: [...], total_images: int, class_counts: {label: count}}
    """
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_ZIP_EXT:
        raise HTTPException(
            status_code=400, detail="Hanya file .zip yang diperbolehkan untuk dataset gambar")

    validate_file_size(file)

    # Simpan ZIP dulu
    zip_path = _generate_path("image_zip", file.filename)
    content = file.file.read()
    with open(zip_path, "wb") as f:
        f.write(content)

    # Extract ke folder
    extract_dir = zip_path.replace(
        ".zip", "_extracted").replace("image_zip", "image")
    os.makedirs(extract_dir, exist_ok=True)

    try:
        with zipfile.ZipFile(zip_path, "r") as z:
            z.extractall(extract_dir)
    except zipfile.BadZipFile:
        os.remove(zip_path)
        shutil.rmtree(extract_dir, ignore_errors=True)
        raise HTTPException(
            status_code=400, detail="File ZIP tidak valid atau rusak")

    # Hapus ZIP setelah extract
    os.remove(zip_path)

    # Scan struktur folder untuk deteksi label
    classes = []
    class_counts = {}
    total_images = 0

    for item in sorted(os.listdir(extract_dir)):
        item_path = os.path.join(extract_dir, item)
        if os.path.isdir(item_path):
            images = [
                f for f in os.listdir(item_path)
                if os.path.splitext(f)[1].lower() in ALLOWED_IMAGE_EXT
            ]
            if images:
                classes.append(item)
                class_counts[item] = len(images)
                total_images += len(images)

    if not classes:
        shutil.rmtree(extract_dir, ignore_errors=True)
        raise HTTPException(
            status_code=400,
            detail="ZIP tidak mengandung struktur folder yang valid. "
                   "Pastikan ZIP berisi folder per kelas yang masing-masing berisi gambar."
        )

    meta = {
        "classes":      classes,
        "total_images": total_images,
        "class_counts": class_counts,
    }

    return extract_dir, file.filename, meta
