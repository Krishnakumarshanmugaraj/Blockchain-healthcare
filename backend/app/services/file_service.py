import hashlib
import os
import shutil
from fastapi import UploadFile

UPLOAD_FOLDER = "uploads/reports"


def save_file(file: UploadFile):
    # Create folder if it doesn't exist
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    # Save uploaded file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Generate SHA-256 hash
    sha256 = hashlib.sha256()

    with open(file_path, "rb") as f:
        while chunk := f.read(4096):
            sha256.update(chunk)

    file_hash = sha256.hexdigest()

    return file.filename, file_path, file_hash