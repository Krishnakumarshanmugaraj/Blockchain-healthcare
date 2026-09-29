import hashlib
import json
import sys
from pathlib import Path

from web3 import Web3
from solcx import compile_standard, set_solc_version


SOLIDITY_VERSION = "0.8.20"
GANACHE_URL = "http://127.0.0.1:7545"

NFT_CONTRACT_ADDRESS = "0xa17F3152F91BA76dbf806700E5ab53944f711CB7"

PATIENT_INDEX = 1
DOCTOR_INDEX = 2

AGREEMENT_ID = 1
PATIENT_ID = 2
RECORD_ID = "R002"
RECOVERY_MODEL_VERSION = "RecoveryPrediction-v1.0"
RECOVERY_PROBABILITY = 8727

MEDICAL_RECORD_HASH = (
    "c04b30643646e4599f2b711dc9bdb9acb8781bf34d5f01811431bd447477e7e0"
)


def load_contract():
    contract_path = (
        Path(__file__).resolve().parent / "ProofOfCureNFT.sol"
    )

    source = contract_path.read_text(encoding="utf-8")

    set_solc_version(SOLIDITY_VERSION)

    compiled = compile_standard(
        {
            "language": "Solidity",
            "sources": {
                "ProofOfCureNFT.sol": {
                    "content": source
                }
            },
            "settings": {
                "optimizer": {
                    "enabled": True,
                    "runs": 200
                },
                "outputSelection": {
                    "*": {
                        "*": [
                            "abi",
                            "evm.bytecode"
                        ]
                    }
                }
            }
        },
        allow_paths=str(contract_path.parent),
    )

    contract_data = compiled["contracts"]["ProofOfCureNFT.sol"]["ProofOfCureNFT"]

    return contract_data["abi"]


def create_zkp_hash():
    proof_data = {
        "protocol": "Schnorr-ZKP-v1.0",
        "public_key": 13,
        "commitment": 3,
        "challenge": 7,
        "response": 2,
        "message": "recovery-record-R002",
    }

    canonical_data = json.dumps(
        proof_data,
        sort_keys=True,
        separators=(",", ":"),
    )

    return hashlib.sha256(
        canonical_data.encode("utf-8")
    ).hexdigest()


def main():
    print("=" * 60)
    print("Proof-of-Cure NFT End-to-End Test")
    print("=" * 60)

    print()
    print(f"Connecting to Ganache at {GANACHE_URL}...")

    w3 = Web3(Web3.HTTPProvider(GANACHE_URL))

    if not w3.is_connected():
        print("ERROR: Could not connect to Ganache.")
        sys.exit(1)

    print("Ganache connection: OK")

    chain_id = w3.eth.chain_id
    print(f"Chain ID: {chain_id}")

    if chain_id != 1337:
        print("WARNING: Expected Ganache chain ID 1337.")

    print()
    print("Loading deployed ProofOfCureNFT contract...")

    abi = load_contract()

    contract = w3.eth.contract(
        address=Web3.to_checksum_address(NFT_CONTRACT_ADDRESS),
        abi=abi,
    )

    print(f"Contract: {NFT_CONTRACT_ADDRESS}")

    print()
    print("Reading NFT information...")

    name = contract.functions.name().call()
    symbol = contract.functions.symbol().call()
    total_before = contract.functions.totalMinted().call()

    print(f"NFT name: {name}")
    print(f"NFT symbol: {symbol}")
    print(f"Tokens minted before test: {total_before}")

    accounts = w3.eth.accounts

    patient = Web3.to_checksum_address(accounts[PATIENT_INDEX])
    doctor = Web3.to_checksum_address(accounts[DOCTOR_INDEX])

    print()
    print("Test participants:")
    print(f"Patient: {patient}")
    print(f"Doctor:  {doctor}")

    print()
    print("Preparing Proof-of-Cure data...")

    zkp_hash = create_zkp_hash()

    print(f"Agreement ID: {AGREEMENT_ID}")
    print(f"Patient ID: {PATIENT_ID}")
    print(f"Record ID: {RECORD_ID}")
    print(f"Recovery model: {RECOVERY_MODEL_VERSION}")
    print(
        f"Recovery probability: "
        f"{RECOVERY_PROBABILITY / 100:.2f}%"
    )
    print(f"ZKP hash: {zkp_hash}")
    print(f"Medical record hash: {MEDICAL_RECORD_HASH}")

    mint_data = (
        AGREEMENT_ID,
        PATIENT_ID,
        patient,
        doctor,
        RECORD_ID,
        RECOVERY_MODEL_VERSION,
        RECOVERY_PROBABILITY,
        zkp_hash,
        MEDICAL_RECORD_HASH,
    )

    print()
    print("Estimating mint gas...")

    gas_estimate = contract.functions.mintProofOfCure(
        mint_data
    ).estimate_gas(
        {
            "from": doctor
        }
    )

    print(f"Estimated mint gas: {gas_estimate}")

    gas_limit = gas_estimate + 100_000

    print(f"Mint gas limit: {gas_limit}")

    print()
    print("Minting Proof-of-Cure NFT...")

    transaction = contract.functions.mintProofOfCure(
        mint_data
    ).build_transaction(
        {
            "from": doctor,
            "nonce": w3.eth.get_transaction_count(doctor),
            "gas": gas_limit,
            "gasPrice": w3.to_wei(20, "gwei"),
            "chainId": chain_id,
        }
    )

    private_key = w3.eth.account.from_key(
        w3.eth.account._keys.PrivateKey(
            bytes.fromhex(
                "0x".replace("0x", "")
            )
        )
    ) if False else None

    print()
    print("NOTE:")
    print("Ganache accounts are unlocked by Ganache.")
    print("Sending transaction through eth_sendTransaction...")

    tx_hash = w3.eth.send_transaction(transaction)

    print(f"Transaction hash: {tx_hash.hex()}")
    print("Waiting for confirmation...")

    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    if receipt.status != 1:
        print("ERROR: NFT mint transaction failed.")
        sys.exit(1)

    print()
    print("=" * 60)
    print("Proof-of-Cure NFT minted successfully")
    print("=" * 60)

    print(f"Block number: {receipt.blockNumber}")
    print(f"Gas used: {receipt.gasUsed}")

    total_after = contract.functions.totalMinted().call()

    token_id = total_after

    print(f"Token ID: {token_id}")
    print(f"Total minted: {total_after}")

    print()
    print("Verifying NFT ownership...")

    owner = contract.functions.ownerOf(token_id).call()

    print(f"NFT owner: {owner}")
    print(f"Expected patient: {patient}")

    if owner.lower() != patient.lower():
        print("ERROR: NFT owner does not match patient.")
        sys.exit(1)

    print("Ownership verification: PASSED")

    print()
    print("Checking proof existence...")

    exists = contract.functions.proofExists(token_id).call()

    print(f"Proof exists: {exists}")

    if not exists:
        print("ERROR: Proof does not exist.")
        sys.exit(1)

    print("Proof existence verification: PASSED")

    print()
    print("Reading Proof-of-Cure metadata...")

    basic = contract.functions.getProofBasic(
        token_id
    ).call()

    recovery = contract.functions.getProofRecovery(
        token_id
    ).call()

    hashes = contract.functions.getProofHashes(
        token_id
    ).call()

    participants = contract.functions.getProofParticipants(
        token_id
    ).call()

    print()
    print("Basic proof data:")
    print(f"  Token ID:     {basic[0]}")
    print(f"  Agreement ID: {basic[1]}")
    print(f"  Patient ID:   {basic[2]}")
    print(f"  Record ID:    {basic[3]}")
    print(f"  Minted At:    {basic[4]}")

    print()
    print("Recovery data:")
    print(f"  Model:        {recovery[0]}")
    print(
        f"  Probability:  {recovery[1] / 100:.2f}%"
    )

    print()
    print("Integrity hashes:")
    print(f"  ZKP hash:     {hashes[0]}")
    print(f"  Record hash:  {hashes[1]}")

    print()
    print("Participants:")
    print(f"  Patient:      {participants[0]}")
    print(f"  Doctor:       {participants[1]}")

    print()
    print("Validating stored metadata...")

    checks = [
        ("Token ID", basic[0] == token_id),
        ("Agreement ID", basic[1] == AGREEMENT_ID),
        ("Patient ID", basic[2] == PATIENT_ID),
        ("Record ID", basic[3] == RECORD_ID),
        (
            "Recovery model",
            recovery[0] == RECOVERY_MODEL_VERSION
        ),
        (
            "Recovery probability",
            recovery[1] == RECOVERY_PROBABILITY
        ),
        ("ZKP hash", hashes[0] == zkp_hash),
        (
            "Medical record hash",
            hashes[1] == MEDICAL_RECORD_HASH
        ),
        (
            "Patient participant",
            participants[0].lower() == patient.lower()
        ),
        (
            "Doctor participant",
            participants[1].lower() == doctor.lower()
        ),
    ]

    all_passed = True

    for check_name, passed in checks:
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {check_name}")

        if not passed:
            all_passed = False

    patient_tokens = contract.functions.getPatientTokens(
        patient
    ).call()

    print()
    print("Patient NFT collection:")
    print(f"  Patient token IDs: {patient_tokens}")

    if token_id not in patient_tokens:
        print("ERROR: Token missing from patient's token list.")
        all_passed = False
    else:
        print("  [PASS] Token appears in patient's NFT collection.")

    print()

    if not all_passed:
        print("=" * 60)
        print("OBJECTIVE 4 NFT TEST: FAILED")
        print("=" * 60)
        sys.exit(1)

    print("=" * 60)
    print("OBJECTIVE 4 NFT TEST: PASSED")
    print("=" * 60)

    print()
    print("Proof-of-Cure NFT successfully demonstrates:")
    print("1. NFT minting")
    print("2. Patient ownership")
    print("3. Agreement linkage")
    print("4. Medical record linkage")
    print("5. AI recovery prediction linkage")
    print("6. ZKP hash linkage")
    print("7. Medical-record integrity hash")
    print("8. On-chain proof verification")


if __name__ == "__main__":
    main()
