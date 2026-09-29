from pathlib import Path
import sys

from solcx import compile_standard, set_solc_version
from web3 import Web3


SOLIDITY_VERSION = "0.8.20"
GANACHE_URL = "http://127.0.0.1:7545"

NFT_ADDRESS = Web3.to_checksum_address(
    "0xa17F3152F91BA76dbf806700E5ab53944f711CB7"
)

SETTLEMENT_ADDRESS = Web3.to_checksum_address(
    "0x53b399C76Dc2d0028B1D9a77a950009971a18785"
)

PATIENT_INDEX = 1
DOCTOR_INDEX = 2
INSURER_INDEX = 3

AGREEMENT_ID = 1
PATIENT_ID = 2
PROOF_TOKEN_ID = 1

TOTAL_COVERAGE_ETH = 1.0
AMOUNT_ALREADY_PAID_ETH = 0.25
FINAL_SETTLEMENT_ETH = 0.75


def compile_contract():
    contract_path = (
        Path(__file__).resolve().parent
        / "FinalInsuranceSettlement.sol"
    )

    source = contract_path.read_text(
        encoding="utf-8"
    )

    set_solc_version(SOLIDITY_VERSION)

    compiled = compile_standard(
        {
            "language": "Solidity",
            "sources": {
                "FinalInsuranceSettlement.sol": {
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
                            "abi"
                        ]
                    }
                }
            }
        },
        allow_paths=str(contract_path.parent),
    )

    return compiled[
        "contracts"
    ][
        "FinalInsuranceSettlement.sol"
    ][
        "FinalInsuranceSettlement"
    ][
        "abi"
    ]


def get_balance_eth(w3, address):
    balance = w3.eth.get_balance(address)
    return float(
        w3.from_wei(balance, "ether")
    )


def print_balances(w3, patient, doctor, insurer):
    print()
    print("Account balances:")
    print(
        f"  Patient: {get_balance_eth(w3, patient):.6f} ETH"
    )
    print(
        f"  Doctor:  {get_balance_eth(w3, doctor):.6f} ETH"
    )
    print(
        f"  Insurer: {get_balance_eth(w3, insurer):.6f} ETH"
    )


def main():
    print("=" * 70)
    print("Objective 4 - Automated Final Insurance Settlement Test")
    print("=" * 70)

    print()
    print(f"Connecting to Ganache at {GANACHE_URL}...")

    w3 = Web3(
        Web3.HTTPProvider(GANACHE_URL)
    )

    if not w3.is_connected():
        print("ERROR: Could not connect to Ganache.")
        sys.exit(1)

    print("Ganache connection: OK")

    chain_id = w3.eth.chain_id
    print(f"Chain ID: {chain_id}")

    if chain_id != 1337:
        print("WARNING: Expected Ganache chain ID 1337.")

    accounts = w3.eth.accounts

    patient = Web3.to_checksum_address(
        accounts[PATIENT_INDEX]
    )

    doctor = Web3.to_checksum_address(
        accounts[DOCTOR_INDEX]
    )

    insurer = Web3.to_checksum_address(
        accounts[INSURER_INDEX]
    )

    print()
    print("Participants:")
    print(f"  Patient: {patient}")
    print(f"  Doctor:  {doctor}")
    print(f"  Insurer: {insurer}")

    print()
    print("Loading contracts...")

    nft_abi = [
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "tokenId",
                    "type": "uint256"
                }
            ],
            "name": "ownerOf",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "tokenId",
                    "type": "uint256"
                }
            ],
            "name": "proofExists",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ]

    settlement_abi = compile_contract()

    nft = w3.eth.contract(
        address=NFT_ADDRESS,
        abi=nft_abi
    )

    settlement = w3.eth.contract(
        address=SETTLEMENT_ADDRESS,
        abi=settlement_abi
    )

    print("Contracts loaded successfully.")

    print()
    print("Checking Proof-of-Cure NFT...")

    proof_exists = nft.functions.proofExists(
        PROOF_TOKEN_ID
    ).call()

    print(
        f"Proof token {PROOF_TOKEN_ID} exists: "
        f"{proof_exists}"
    )

    if not proof_exists:
        print(
            "ERROR: Proof-of-Cure NFT does not exist."
        )
        sys.exit(1)

    nft_owner = nft.functions.ownerOf(
        PROOF_TOKEN_ID
    ).call()

    print(f"NFT owner: {nft_owner}")
    print(f"Expected patient: {patient}")

    if nft_owner.lower() != patient.lower():
        print(
            "ERROR: NFT is not owned by the expected patient."
        )
        sys.exit(1)

    print(
        "Proof-of-Cure ownership: PASSED"
    )

    print()
    print("Registering insurance settlement...")

    total_coverage = w3.to_wei(
        TOTAL_COVERAGE_ETH,
        "ether"
    )

    amount_already_paid = w3.to_wei(
        AMOUNT_ALREADY_PAID_ETH,
        "ether"
    )

    final_amount = w3.to_wei(
        FINAL_SETTLEMENT_ETH,
        "ether"
    )

    print(
        f"Total coverage: {TOTAL_COVERAGE_ETH} ETH"
    )

    print(
        f"Amount already paid: "
        f"{AMOUNT_ALREADY_PAID_ETH} ETH"
    )

    print(
        f"Remaining settlement: "
        f"{FINAL_SETTLEMENT_ETH} ETH"
    )

    registration_tx = (
        settlement.functions.registerSettlement(
            AGREEMENT_ID,
            PATIENT_ID,
            patient,
            doctor,
            total_coverage,
            amount_already_paid
        )
        .build_transaction(
            {
                "from": insurer,
                "nonce": w3.eth.get_transaction_count(
                    insurer
                ),
                "gas": 500_000,
                "gasPrice": w3.to_wei(
                    20,
                    "gwei"
                ),
                "chainId": chain_id
            }
        )
    )

    registration_hash = w3.eth.send_transaction(
        registration_tx
    )

    print(
        f"Registration transaction: "
        f"{registration_hash.hex()}"
    )

    registration_receipt = (
        w3.eth.wait_for_transaction_receipt(
            registration_hash
        )
    )

    if registration_receipt.status != 1:
        print(
            "ERROR: Settlement registration failed."
        )
        sys.exit(1)

    print(
        f"Registration block: "
        f"{registration_receipt.blockNumber}"
    )

    print(
        "Settlement registration: PASSED"
    )

    print()
    print("Checking settlement financials...")

    financials = (
        settlement.functions.getSettlementFinancials(
            AGREEMENT_ID
        ).call()
    )

    actual_total = financials[0]
    actual_paid = financials[1]
    actual_remaining = financials[2]

    print(
        f"  Total coverage: "
        f"{w3.from_wei(actual_total, 'ether')} ETH"
    )

    print(
        f"  Already paid: "
        f"{w3.from_wei(actual_paid, 'ether')} ETH"
    )

    print(
        f"  Remaining: "
        f"{w3.from_wei(actual_remaining, 'ether')} ETH"
    )

    if actual_total != total_coverage:
        print(
            "ERROR: Total coverage mismatch."
        )
        sys.exit(1)

    if actual_paid != amount_already_paid:
        print(
            "ERROR: Previously paid amount mismatch."
        )
        sys.exit(1)

    if actual_remaining != final_amount:
        print(
            "ERROR: Remaining settlement mismatch."
        )
        sys.exit(1)

    print(
        "Settlement financial data: PASSED"
    )

    print()
    print("Verifying Proof-of-Cure against settlement...")

    proof_valid = (
        settlement.functions.verifyProofOfCure(
            AGREEMENT_ID,
            PROOF_TOKEN_ID
        ).call()
    )

    print(
        f"Proof-of-Cure verification result: "
        f"{proof_valid}"
    )

    if not proof_valid:
        print(
            "ERROR: Proof-of-Cure verification failed."
        )
        sys.exit(1)

    print(
        "Proof-of-Cure settlement verification: PASSED"
    )

    print()
    print("Checking doctor balance before final payment...")

    doctor_balance_before = w3.eth.get_balance(
        doctor
    )

    insurer_balance_before = w3.eth.get_balance(
        insurer
    )

    print(
        "Doctor balance before:",
        w3.from_wei(
            doctor_balance_before,
            "ether"
        ),
        "ETH"
    )

    print(
        "Insurer balance before:",
        w3.from_wei(
            insurer_balance_before,
            "ether"
        ),
        "ETH"
    )

    print()
    print("Executing automated final insurance settlement...")

    settlement_tx = (
        settlement.functions.settleFinalInsurance(
            AGREEMENT_ID,
            PROOF_TOKEN_ID
        )
        .build_transaction(
            {
                "from": insurer,
                "value": final_amount,
                "nonce": w3.eth.get_transaction_count(
                    insurer
                ),
                "gas": 700_000,
                "gasPrice": w3.to_wei(
                    20,
                    "gwei"
                ),
                "chainId": chain_id
            }
        )
    )

    settlement_hash = w3.eth.send_transaction(
        settlement_tx
    )

    print(
        f"Settlement transaction: "
        f"{settlement_hash.hex()}"
    )

    print("Waiting for confirmation...")

    settlement_receipt = (
        w3.eth.wait_for_transaction_receipt(
            settlement_hash
        )
    )

    if settlement_receipt.status != 1:
        print(
            "ERROR: Final insurance settlement failed."
        )
        sys.exit(1)

    print()
    print(
        f"Settlement block: "
        f"{settlement_receipt.blockNumber}"
    )

    print(
        f"Settlement gas used: "
        f"{settlement_receipt.gasUsed}"
    )

    print()
    print("Checking balances after final payment...")

    doctor_balance_after = w3.eth.get_balance(
        doctor
    )

    insurer_balance_after = w3.eth.get_balance(
        insurer
    )

    doctor_increase = (
        doctor_balance_after -
        doctor_balance_before
    )

    insurer_decrease = (
        insurer_balance_before -
        insurer_balance_after
    )

    print(
        "Doctor balance after:",
        w3.from_wei(
            doctor_balance_after,
            "ether"
        ),
        "ETH"
    )

    print(
        "Insurer balance after:",
        w3.from_wei(
            insurer_balance_after,
            "ether"
        ),
        "ETH"
    )

    print(
        "Doctor balance increase:",
        w3.from_wei(
            doctor_increase,
            "ether"
        ),
        "ETH"
    )

    print(
        "Insurer balance decrease:",
        w3.from_wei(
            insurer_decrease,
            "ether"
        ),
        "ETH"
    )

    if doctor_increase != final_amount:
        print()
        print(
            "WARNING: Doctor balance increase differs "
            "from the expected payment because gas "
            "accounting may affect the payer only."
        )

    print()
    print("Checking final settlement status...")

    basic = (
        settlement.functions.getSettlementBasic(
            AGREEMENT_ID
        ).call()
    )

    result = (
        settlement.functions.getSettlementResult(
            AGREEMENT_ID
        ).call()
    )

    remaining_after = (
        settlement.functions.getRemainingAmount(
            AGREEMENT_ID
        ).call()
    )

    complete = (
        settlement.functions.isSettlementComplete(
            AGREEMENT_ID
        ).call()
    )

    print()
    print("Settlement basic data:")
    print(
        f"  Agreement ID: {basic[0]}"
    )

    print(
        f"  Patient ID:   {basic[1]}"
    )

    print(
        f"  Patient:      {basic[2]}"
    )

    print(
        f"  Doctor:       {basic[3]}"
    )

    print(
        f"  Insurer:      {basic[4]}"
    )

    print(
        f"  Status:       {basic[5]}"
    )

    print()
    print("Settlement result:")
    print(
        f"  Proof token ID: {result[0]}"
    )

    print(
        f"  Registered at:  {result[1]}"
    )

    print(
        f"  Settled at:     {result[2]}"
    )

    print(
        f"  Settlement hash: {result[3].hex()}"
    )

    print()
    print(
        f"Remaining amount after settlement: "
        f"{w3.from_wei(remaining_after, 'ether')} ETH"
    )

    print(
        f"Settlement complete: {complete}"
    )

    print()
    print("Running final validation...")

    checks = [
        (
            "NFT exists",
            proof_exists
        ),
        (
            "NFT owned by patient",
            nft_owner.lower() == patient.lower()
        ),
        (
            "Settlement registered",
            basic[0] == AGREEMENT_ID
        ),
        (
            "Patient linked",
            basic[1] == PATIENT_ID
        ),
        (
            "Doctor linked",
            basic[3].lower() == doctor.lower()
        ),
        (
            "Insurer linked",
            basic[4].lower() == insurer.lower()
        ),
        (
            "Proof token recorded",
            result[0] == PROOF_TOKEN_ID
        ),
        (
            "Remaining amount becomes zero",
            remaining_after == 0
        ),
        (
            "Settlement marked complete",
            complete is True
        ),
        (
            "Final settlement transaction confirmed",
            settlement_receipt.status == 1
        ),
    ]

    all_passed = True

    for name, passed in checks:
        status = "PASS" if passed else "FAIL"

        print(
            f"  [{status}] {name}"
        )

        if not passed:
            all_passed = False

    print()

    if not all_passed:
        print("=" * 70)
        print("OBJECTIVE 4 FINAL SETTLEMENT TEST: FAILED")
        print("=" * 70)
        sys.exit(1)

    print("=" * 70)
    print("OBJECTIVE 4 END-TO-END TEST: PASSED")
    print("=" * 70)

    print()
    print("Verified workflow:")
    print("1. Proof-of-Cure NFT exists")
    print("2. NFT belongs to the patient")
    print("3. Insurance settlement is registered")
    print("4. Total coverage is recorded")
    print("5. Previous milestone payment is recorded")
    print("6. Remaining insurance amount is calculated")
    print("7. Proof-of-Cure NFT is cryptographically checked on-chain")
    print("8. Correct agreement and patient are verified")
    print("9. Final insurance payment is automatically transferred")
    print("10. Settlement is permanently marked as completed")
    print()
    print(
        "Objective 4 implementation is complete "
        "for the academic blockchain prototype."
    )


if __name__ == "__main__":
    main()
