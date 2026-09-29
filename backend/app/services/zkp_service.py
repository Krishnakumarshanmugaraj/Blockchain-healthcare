import hashlib
from dataclasses import dataclass


# -------------------------------------------------------------------
# Educational Schnorr Zero-Knowledge Proof parameters
# -------------------------------------------------------------------
#
# This is a small finite-field group intentionally used for an
# academic demonstration. It is NOT suitable for production
# cryptography.
#
# p = 23 is a safe prime.
# q = 11 is the prime-order subgroup.
# g = 2 has order 11 modulo 23.
# -------------------------------------------------------------------

P = 23
Q = 11
G = 2

PROTOCOL_VERSION = "Schnorr-ZKP-v1.0"


@dataclass
class ZKProof:
    public_key: int
    commitment: int
    challenge: int
    response: int
    message: str


def _challenge(
    public_key: int,
    commitment: int,
    message: str,
) -> int:
    """
    Generate the Fiat-Shamir challenge.

    The verifier can independently calculate the same challenge
    without learning the prover's private secret.
    """

    payload = (
        f"{PROTOCOL_VERSION}|"
        f"{P}|"
        f"{Q}|"
        f"{G}|"
        f"{public_key}|"
        f"{commitment}|"
        f"{message}"
    ).encode("utf-8")

    digest = hashlib.sha256(payload).digest()

    return int.from_bytes(digest, byteorder="big") % Q


def generate_proof(
    private_secret: int,
    message: str,
) -> ZKProof:
    """
    Generate a Schnorr-style proof of knowledge.

    The private secret is never returned as part of the proof.
    """

    if not isinstance(private_secret, int):
        raise ValueError("Private secret must be an integer")

    if not 1 <= private_secret < Q:
        raise ValueError(
            f"Private secret must be between 1 and {Q - 1}"
        )

    if not message or not message.strip():
        raise ValueError("Message must not be empty")

    # Public value: y = g^x mod p
    public_key = pow(G, private_secret, P)

    # Deterministic nonce for this academic prototype.
    #
    # A production implementation must use a secure random nonce
    # and must never reuse a nonce.
    nonce_payload = (
        f"{private_secret}|"
        f"{message}|"
        f"{PROTOCOL_VERSION}"
    ).encode("utf-8")

    nonce_digest = hashlib.sha256(nonce_payload).digest()

    nonce = (
        int.from_bytes(nonce_digest, byteorder="big") % (Q - 1)
    ) + 1

    # Commitment: t = g^r mod p
    commitment = pow(G, nonce, P)

    # Fiat-Shamir challenge
    challenge = _challenge(
        public_key=public_key,
        commitment=commitment,
        message=message,
    )

    # Response: s = r + c*x mod q
    response = (
        nonce + challenge * private_secret
    ) % Q

    return ZKProof(
        public_key=public_key,
        commitment=commitment,
        challenge=challenge,
        response=response,
        message=message,
    )


def verify_proof(
    public_key: int,
    commitment: int,
    challenge: int,
    response: int,
    message: str,
) -> bool:
    """
    Verify a Schnorr-style zero-knowledge proof.

    The verifier receives only the public key, commitment,
    challenge, response, and public message.

    The private secret is never required.
    """

    if not isinstance(public_key, int):
        return False

    if not isinstance(commitment, int):
        return False

    if not isinstance(challenge, int):
        return False

    if not isinstance(response, int):
        return False

    if not message or not message.strip():
        return False

    if not 1 <= public_key < P:
        return False

    if not 1 <= commitment < P:
        return False

    if not 0 <= challenge < Q:
        return False

    if not 0 <= response < Q:
        return False

    expected_challenge = _challenge(
        public_key=public_key,
        commitment=commitment,
        message=message,
    )

    # Reject if the supplied challenge was not derived from
    # the public transcript.
    if challenge != expected_challenge:
        return False

    # Schnorr verification:
    #
    # g^s == t * y^c (mod p)
    #
    left_side = pow(G, response, P)

    right_side = (
        commitment
        * pow(public_key, challenge, P)
    ) % P

    return left_side == right_side


def protocol_information() -> dict:
    """
    Return public information about the ZKP demonstration.
    """

    return {
        "protocol_version": PROTOCOL_VERSION,
        "protocol": "Schnorr-style Zero-Knowledge Proof",
        "purpose": (
            "Educational demonstration of proving knowledge "
            "of a private secret without revealing the secret"
        ),
        "prime_modulus": P,
        "subgroup_order": Q,
        "generator": G,
        "hash_function": "SHA-256",
        "private_secret_revealed": False,
        "production_ready": False,
        "warning": (
            "Small demonstration parameters are intentionally used "
            "for academic testing and are not suitable for production."
        ),
    }
