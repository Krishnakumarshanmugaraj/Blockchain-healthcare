from pydantic import BaseModel, Field


class ZKProofVerificationRequest(BaseModel):
    public_key: int = Field(..., description="Public value generated from the private secret")
    commitment: int = Field(..., description="Schnorr commitment")
    challenge: int = Field(..., description="Fiat-Shamir challenge")
    response: int = Field(..., description="Schnorr response")
    message: str = Field(..., min_length=1, max_length=500)


class ZKProofVerificationResponse(BaseModel):
    valid: bool
    protocol_version: str
    message: str


class ZKProtocolInformationResponse(BaseModel):
    protocol_version: str
    protocol: str
    purpose: str
    prime_modulus: int
    subgroup_order: int
    generator: int
    hash_function: str
    private_secret_revealed: bool
    production_ready: bool
    warning: str
