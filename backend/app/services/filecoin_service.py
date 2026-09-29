import os
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv


# Load backend/.env
load_dotenv(dotenv_path=Path(".env"))


# Lighthouse endpoints
LIGHTHOUSE_UPLOAD_URL = (
    "https://upload.lighthouse.storage/api/v0/add"
)

LIGHTHOUSE_DEAL_STATUS_URL = (
    "https://api.lighthouse.storage/api/lighthouse/deal_status"
)


def _get_api_key() -> str:
    """
    Read the Lighthouse API key from environment variables.
    """

    api_key = os.getenv("LIGHTHOUSE_API_KEY")

    if not api_key:
        raise RuntimeError(
            "LIGHTHOUSE_API_KEY is not configured"
        )

    return api_key


async def upload_to_lighthouse(
    file_path: str,
    filename: str | None = None,
) -> dict[str, Any]:
    """
    Upload an already AES-256-GCM-encrypted file to Lighthouse.

    Storage mode:
        annual

    The file is already encrypted before this function is called.
    Therefore the plaintext medical information is never uploaded
    to IPFS/Filecoin.
    """

    api_key = _get_api_key()

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(
            f"Encrypted file not found: {file_path}"
        )

    if not path.is_file():
        raise ValueError(
            f"Path is not a file: {file_path}"
        )

    upload_name = filename or path.name

    headers = {
        "Authorization": f"Bearer {api_key}",
        "storageType": "annual",
    }

    with path.open("rb") as file_handle:

        files = {
            "file": (
                upload_name,
                file_handle,
                "application/octet-stream",
            )
        }

        async with httpx.AsyncClient(
            timeout=120
        ) as client:

            response = await client.post(
                LIGHTHOUSE_UPLOAD_URL,
                headers=headers,
                files=files,
            )

    response.raise_for_status()

    payload = response.json()

    # Lighthouse normally returns:
    #
    # {
    #     "Name": "...",
    #     "Hash": "...",
    #     "Size": "..."
    # }
    #
    # Some API versions may wrap the result inside "data".

    if isinstance(payload, dict):
        data = payload.get("data", payload)
    else:
        data = payload

    if not isinstance(data, dict):
        raise RuntimeError(
            f"Unexpected Lighthouse response: {payload}"
        )

    cid = data.get("Hash")

    if not cid:
        raise RuntimeError(
            "Lighthouse upload succeeded, "
            f"but no CID was returned: {payload}"
        )

    return {
        "cid": cid,
        "name": data.get(
            "Name",
            upload_name,
        ),
        "size": str(
            data.get(
                "Size",
                "",
            )
        ),
        "storage_type": "IPFS+Filecoin",
    }


async def get_filecoin_deal_status(
    cid: str,
) -> dict[str, Any]:
    """
    Query Lighthouse for Filecoin deal information
    associated with an IPFS CID.
    """

    if not cid:
        raise ValueError(
            "CID is required"
        )

    async with httpx.AsyncClient(
        timeout=30
    ) as client:

        response = await client.get(
            LIGHTHOUSE_DEAL_STATUS_URL,
            params={
                "cid": cid,
            },
        )

    response.raise_for_status()

    payload = response.json()

    # Lighthouse may return either:
    #
    # []
    #
    # or:
    #
    # {
    #     "data": [...]
    # }

    if isinstance(payload, list):
        deals = payload

    elif isinstance(payload, dict):
        deals = payload.get(
            "data",
            [],
        )

    else:
        deals = []

    if not isinstance(deals, list):
        deals = []

    return {
        "cid": cid,
        "deals": deals,
        "deal_count": len(deals),
        "has_deal": len(deals) > 0,
    }


def extract_first_deal(
    deals: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Extract useful information from the first Filecoin deal.

    Returns empty values when no deal is currently available.
    """

    if not deals:
        return {
            "deal_id": None,
            "status": "PENDING",
            "provider": None,
        }

    deal = deals[0]

    return {
        "deal_id": (
            deal.get("dealId")
            or deal.get("dealID")
            or deal.get("chainDealID")
        ),
        "status": (
            deal.get("dealStatus")
            or deal.get("status")
            or "UNKNOWN"
        ),
        "provider": (
            deal.get("miner")
            or deal.get("provider")
            or deal.get("storageProvider")
        ),
    }
