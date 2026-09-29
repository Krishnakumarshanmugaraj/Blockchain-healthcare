import os
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv


# ---------------------------------------------------------
# ENVIRONMENT
# ---------------------------------------------------------

load_dotenv(dotenv_path=Path(".env"))

FABRIC_GATEWAY_URL = os.getenv(
    "FABRIC_GATEWAY_URL",
    "http://localhost:3000",
).rstrip("/")

TIMEOUT = 60.0


# ---------------------------------------------------------
# FABRIC AUDIT HISTORY
# ---------------------------------------------------------

async def get_record_history(
    record_id: str,
) -> dict[str, Any]:
    """
    Retrieve the complete Fabric transaction history
    for a blockchain medical record.
    """

    if not record_id:
        raise ValueError(
            "Record ID is required"
        )

    url = (
        f"{FABRIC_GATEWAY_URL}"
        f"/records/{record_id}/history"
    )

    async with httpx.AsyncClient(
        timeout=TIMEOUT
    ) as client:

        response = await client.get(url)

    response.raise_for_status()

    payload = response.json()

    if not isinstance(payload, dict):
        raise RuntimeError(
            "Unexpected Fabric audit response"
        )

    return payload

