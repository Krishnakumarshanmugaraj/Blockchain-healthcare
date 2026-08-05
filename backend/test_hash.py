from app.services.security import (
    hash_password,
    verify_password
)

password = "doctor123"

hashed_password = hash_password(password)

print("Original Password:", password)
print("Hashed Password:", hashed_password)

print(
    "Verification:",
    verify_password(password, hashed_password)
)