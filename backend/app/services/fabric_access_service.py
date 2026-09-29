import os
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv


load_dotenv(dotenv_path=Path(".env"))

FABRIC_GATEWAY_URL = os.getenv(
    "FABRIC_GATEWAY_URL",
    "http://localhost:3000",
).rstrip("/")

TIMEOUT = 60.0


async def grant_record_access(
    patient_id: str,
    doctor_id: str,
) -> dict[str, Any]:
    """
    Grant a doctor access to a patient's blockchain records.
    """

    if not patient_id:
        raise ValueError("patient_id is required")

    if not doctor_id:
        raise ValueError("doctor_id is required")

    async with httpx.AsyncClient(
        timeout=TIMEOUT
    ) as client:
        response = await client.post(
            f"{FABRIC_GATEWAY_URL}/access/grant",
            json={
                "patientId": patient_id,
                "doctorId": doctor_id,
            },
        )

    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:
            detail = response.text

        raise RuntimeError(
            f"Fabric grant access failed: {detail}"
        )

    return response.json()


async def revoke_record_access(
    patient_id: str,
    doctor_id: str,
) -> dict[str, Any]:
    """
    Revoke a doctor's access to a patient's blockchain records.
    """

    if not patient_id:
        raise ValueError("patient_id is required")

    if not doctor_id:
        raise ValueError("doctor_id is required")

    async with httpx.AsyncClient(
        timeout=TIMEOUT
    ) as client:
        response = await client.post(
            f"{FABRIC_GATEWAY_URL}/access/revoke",
            json={
                "patientId": patient_id,
                "doctorId": doctor_id,
            },
        )

    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:
            detail = response.text

        raise RuntimeError(
            f"Fabric revoke access failed: {detail}"
        )

    return response.json()


async def check_record_access(
    patient_id: str,
    doctor_id: str,
) -> dict[str, Any]:
    """
    Check whether a doctor has access to a patient's
    blockchain records.
    """

    if not patient_id:
        raise ValueError("patient_id is required")

    if not doctor_id:
        raise ValueError("doctor_id is required")

    async with httpx.AsyncClient(
        timeout=TIMEOUT
    ) as client:
        response = await client.get(
            f"{FABRIC_GATEWAY_URL}/access/"
            f"{patient_id}/{doctor_id}"
        )

    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:
            detail = response.text

        raise RuntimeError(
            f"Fabric access check failed: {detail}"
        )

    return response.json()
