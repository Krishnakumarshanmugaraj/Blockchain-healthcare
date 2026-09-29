import getpass
import sys

from app.config.database import SessionLocal
from app.models.user import User
from app.services.security import hash_password


EMAIL = "fabrictestdoctor@example.com"


def main():
    print("=" * 60)
    print("Healthcare Doctor Password Reset")
    print("=" * 60)
    print()
    print(f"Account: {EMAIL}")
    print()

    password = getpass.getpass(
        "Enter new password: "
    )

    confirmation = getpass.getpass(
        "Confirm new password: "
    )

    if not password:
        print("ERROR: Password cannot be empty.")
        sys.exit(1)

    if password != confirmation:
        print("ERROR: Passwords do not match.")
        sys.exit(1)

    if len(password) < 8:
        print(
            "ERROR: Password must contain at least 8 characters."
        )
        sys.exit(1)

    db = SessionLocal()

    try:
        user = (
            db.query(User)
            .filter(User.email == EMAIL)
            .first()
        )

        if user is None:
            print(
                f"ERROR: User {EMAIL} was not found."
            )
            sys.exit(1)

        old_fabric_identity = user.fabric_identity

        user.password = hash_password(password)

        db.commit()
        db.refresh(user)

        print()
        print("Password reset successfully.")
        print()
        print(f"Email: {user.email}")
        print(f"Role: {user.role}")
        print(
            "Fabric identity preserved:",
            old_fabric_identity
        )
        print()
        print(
            "The password was entered securely and "
            "was not stored in this script."
        )

    except Exception as exc:
        db.rollback()
        print()
        print(
            f"ERROR: Password reset failed: {exc}"
        )
        sys.exit(1)

    finally:
        db.close()


if __name__ == "__main__":
    main()
