import os
from pathlib import Path

import httpx

PINATA_UPLOAD_URL = "https://uploads.pinata.cloud/v3/files"


async def upload_file_to_ipfs(
    file_path: str,
    filename: str | None = None,
) -> dict:
    jwt = os.getenv("PINATA_JWT")

    if not jwt:
        raise RuntimeError("PINATA_JWT is not configured")

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    upload_name = filename or path.name

    headers = {
        "Authorization": f"Bearer {jwt}",
    }

    with path.open("rb") as file_handle:
        files = {
            "file": (
                upload_name,
                file_handle,
                "application/octet-stream",
            )
        }

        data = {
            "network": "public",
            "name": upload_name,
        }

        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                PINATA_UPLOAD_URL,
                headers=headers,
                data=data,
                files=files,
            )

    response.raise_for_status()

    payload = response.json()
    result = payload["data"]

    return {
        "cid": result["cid"],
        "id": result["id"],
        "name": result["name"],
        "size": result["size"],
    }
