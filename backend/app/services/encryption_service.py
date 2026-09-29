import hashlib
import os
from pathlib import Path

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


ALGORITHM = "AES-256-GCM"
NONCE_SIZE = 12
KEY_SIZE = 32

UPLOAD_FOLDER = Path("uploads/encrypted")


def _get_master_key() -> bytes:
    key_hex = os.getenv("AES_MASTER_KEY")

    if not key_hex:
        raise RuntimeError("AES_MASTER_KEY is not configured")

    try:
        key = bytes.fromhex(key_hex)
    except ValueError as exc:
        raise RuntimeError(
            "AES_MASTER_KEY must be a valid hexadecimal key"
        ) from exc

    if len(key) != KEY_SIZE:
        raise RuntimeError(
            "AES_MASTER_KEY must represent exactly 32 bytes"
        )

    return key


def encrypt_file(file_bytes: bytes) -> dict:
    key = _get_master_key()

    nonce = os.urandom(NONCE_SIZE)

    aesgcm = AESGCM(key)

    ciphertext = aesgcm.encrypt(
        nonce,
        file_bytes,
        None,
    )

    encrypted_blob = nonce + ciphertext

    UPLOAD_FOLDER.mkdir(
        parents=True,
        exist_ok=True,
    )

    encrypted_filename = f"{os.urandom(16).hex()}.enc"
    encrypted_path = UPLOAD_FOLDER / encrypted_filename

    encrypted_path.write_bytes(encrypted_blob)

    plaintext_hash = hashlib.sha256(file_bytes).hexdigest()

    return {
        "encrypted_path": str(encrypted_path),
        "plaintext_hash": plaintext_hash,
        "nonce": nonce.hex(),
        "algorithm": ALGORITHM,
    }


def decrypt_file(encrypted_bytes: bytes) -> bytes:
    if len(encrypted_bytes) <= NONCE_SIZE:
        raise ValueError("Invalid encrypted file")

    key = _get_master_key()

    nonce = encrypted_bytes[:NONCE_SIZE]
    ciphertext = encrypted_bytes[NONCE_SIZE:]

    aesgcm = AESGCM(key)

    return aesgcm.decrypt(
        nonce,
        ciphertext,
        None,
    )
