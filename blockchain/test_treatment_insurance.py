from pathlib import Path

from solcx import compile_standard, set_solc_version
from web3 import Web3


SOLIDITY_VERSION = "0.8.20"
GANACHE_URL = "http://127.0.0.1:7545"

CONTRACT_ADDRESS = "0xF2abeFa3477E74539f1e650dd74cb632BEd3901A"

PATIENT_ACCOUNT_INDEX = 1
DOCTOR_ACCOUNT_INDEX = 2
INSURER_ACCOUNT_INDEX = 3

PATIENT_ID = 2

TOTAL_COVERAGE_ETH = 1
MILESTONE_PAYMENT_ETH = 0.25


def compile_contract():
    set_solc_version(SOLIDITY_VERSION)

    contract_path = (
        Path(__file__).resolve().parent
        / "TreatmentInsurance.sol"
    )

    source = contract_path.read_text(
        encoding="utf-8"
    )

    compiled = compile_standard(
        {
            "language": "Solidity",
            "sources": {
                "TreatmentInsurance.sol": {
                    "content": source
                }
            },
            "settings": {
                "outputSelection": {
                    "*": {
                        "*": [
                            "abi",
                            "evm.bytecode"
                        ]
                    }
                }
            },
        }
    )

    return compiled[
        "contracts"
    ][
        "TreatmentInsurance.sol"
    ][
        "TreatmentInsurance"
    ]["abi"]


def wait_for_success(w3, tx_hash, label):
    receipt = w3.eth.wait_for_transaction_receipt(
        tx_hash
    )

    if receipt.status != 1:
        raise RuntimeError(
            f"{label} transaction failed"
        )

    print(
        f"{label}: SUCCESS"
    )
    print(
        f"  Transaction: {tx_hash.hex()}"
    )
    print(
        f"  Block: {receipt.blockNumber}"
    )
    print(
        f"  Gas used: {receipt.gasUsed}"
    )

    return receipt


def main():
    print()
    print("==============================================")
    print("TreatmentInsurance End-to-End Test")
    print("==============================================")
    print()

    # ---------------------------------------------------------
    # Connect to Ganache
    # ---------------------------------------------------------
    w3 = Web3(
        Web3.HTTPProvider(GANACHE_URL)
    )

    if not w3.is_connected():
        raise RuntimeError(
            "Cannot connect to Ganache at "
            "127.0.0.1:7545"
        )

    print("Ganache connection: OK")
    print(
        "Chain ID:",
        w3.eth.chain_id
    )

    # ---------------------------------------------------------
    # Compile ABI
    # ---------------------------------------------------------
    abi = compile_contract()

    contract = w3.eth.contract(
        address=Web3.to_checksum_address(
            CONTRACT_ADDRESS
        ),
        abi=abi
    )

    print(
        "Contract:",
        CONTRACT_ADDRESS
    )

    # ---------------------------------------------------------
    # Accounts
    # ---------------------------------------------------------
    accounts = w3.eth.accounts

    patient = accounts[PATIENT_ACCOUNT_INDEX]
    doctor = accounts[DOCTOR_ACCOUNT_INDEX]
    insurer = accounts[INSURER_ACCOUNT_INDEX]

    print()
    print("Test participants:")
    print(
        "Patient:",
        patient
    )
    print(
        "Doctor:",
        doctor
    )
    print(
        "Insurer:",
        insurer
    )

    # ---------------------------------------------------------
    # Amounts
    # ---------------------------------------------------------
    total_coverage = w3.to_wei(
        TOTAL_COVERAGE_ETH,
        "ether"
    )

    milestone_payment = w3.to_wei(
        MILESTONE_PAYMENT_ETH,
        "ether"
    )

    print()
    print(
        "Total insurance coverage:",
        TOTAL_COVERAGE_ETH,
        "ETH"
    )

    print(
        "Milestone payment:",
        MILESTONE_PAYMENT_ETH,
        "ETH"
    )

    # ---------------------------------------------------------
    # 1. Create treatment agreement
    # ---------------------------------------------------------
    print()
    print("1. Creating treatment agreement...")

    tx_hash = contract.functions.createTreatmentAgreement(
        PATIENT_ID,
        patient,
        doctor,
        insurer,
        total_coverage
    ).transact(
        {
            "from": patient,
            "gas": 500000
        }
    )

    wait_for_success(
        w3,
        tx_hash,
        "Treatment agreement creation"
    )

    agreement_id = 1

    agreement = contract.functions.getTreatmentAgreement(
        agreement_id
    ).call()

    print()
    print("Agreement created:")
    print(
        "  Agreement ID:",
        agreement[0]
    )
    print(
        "  Patient ID:",
        agreement[1]
    )
    print(
        "  Patient:",
        agreement[2]
    )
    print(
        "  Doctor:",
        agreement[3]
    )
    print(
        "  Insurer:",
        agreement[4]
    )
    print(
        "  Coverage:",
        w3.from_wei(
            agreement[5],
            "ether"
        ),
        "ETH"
    )
    print(
        "  Total paid:",
        w3.from_wei(
            agreement[6],
            "ether"
        ),
        "ETH"
    )
    print(
        "  Status:",
        agreement[8]
    )

    # ---------------------------------------------------------
    # 2. Activate agreement
    # ---------------------------------------------------------
    print()
    print("2. Activating treatment agreement...")

    tx_hash = contract.functions.activateTreatmentAgreement(
        agreement_id
    ).transact(
        {
            "from": patient,
            "gas": 300000
        }
    )

    wait_for_success(
        w3,
        tx_hash,
        "Treatment agreement activation"
    )

    # ---------------------------------------------------------
    # 3. Create milestone
    # ---------------------------------------------------------
    print()
    print("3. Creating treatment milestone...")

    tx_hash = contract.functions.createMilestone(
        agreement_id,
        "Initial treatment milestone",
        milestone_payment
    ).transact(
        {
            "from": doctor,
            "gas": 500000
        }
    )

    wait_for_success(
        w3,
        tx_hash,
        "Milestone creation"
    )

    milestones = contract.functions.getMilestones(
        agreement_id
    ).call()

    if len(milestones) != 1:
        raise RuntimeError(
            "Expected exactly one milestone"
        )

    milestone_id = milestones[0][0]

    print()
    print("Milestone created:")
    print(
        "  Milestone ID:",
        milestone_id
    )
    print(
        "  Description:",
        milestones[0][1]
    )
    print(
        "  Payment:",
        w3.from_wei(
            milestones[0][2],
            "ether"
        ),
        "ETH"
    )
    print(
        "  Status:",
        milestones[0][3]
    )

    # ---------------------------------------------------------
    # 4. Complete milestone
    # ---------------------------------------------------------
    print()
    print("4. Completing treatment milestone...")

    tx_hash = contract.functions.completeMilestone(
        agreement_id,
        milestone_id
    ).transact(
        {
            "from": doctor,
            "gas": 300000
        }
    )

    wait_for_success(
        w3,
        tx_hash,
        "Milestone completion"
    )

    milestones = contract.functions.getMilestones(
        agreement_id
    ).call()

    print(
        "  Milestone status:",
        milestones[0][3]
    )

    # ---------------------------------------------------------
    # 5. Insurer pays milestone
    # ---------------------------------------------------------
    print()
    print("5. Insurer paying completed milestone...")

    doctor_balance_before = w3.eth.get_balance(
        doctor
    )

    tx_hash = contract.functions.payMilestone(
        agreement_id,
        milestone_id
    ).transact(
        {
            "from": insurer,
            "value": milestone_payment,
            "gas": 500000
        }
    )

    receipt = wait_for_success(
        w3,
        tx_hash,
        "Insurance milestone payment"
    )

    doctor_balance_after = w3.eth.get_balance(
        doctor
    )

    agreement = contract.functions.getTreatmentAgreement(
        agreement_id
    ).call()

    print()
    print(
        "  Total paid:",
        w3.from_wei(
            agreement[6],
            "ether"
        ),
        "ETH"
    )

    print(
        "  Doctor balance increase:",
        w3.from_wei(
            doctor_balance_after -
            doctor_balance_before,
            "ether"
        ),
        "ETH"
    )

    print(
        "  Payment transaction:",
        receipt.transactionHash.hex()
    )

    # ---------------------------------------------------------
    # 6. Complete treatment agreement
    # ---------------------------------------------------------
    print()
    print("6. Completing treatment agreement...")

    tx_hash = contract.functions.completeTreatmentAgreement(
        agreement_id
    ).transact(
        {
            "from": patient,
            "gas": 300000
        }
    )

    wait_for_success(
        w3,
        tx_hash,
        "Treatment agreement completion"
    )

    # ---------------------------------------------------------
    # Final state
    # ---------------------------------------------------------
    final_agreement = (
        contract.functions.getTreatmentAgreement(
            agreement_id
        ).call()
    )

    final_milestones = (
        contract.functions.getMilestones(
            agreement_id
        ).call()
    )

    print()
    print("==============================================")
    print("FINAL TREATMENT AGREEMENT")
    print("==============================================")

    print(
        "Agreement ID:",
        final_agreement[0]
    )

    print(
        "Patient ID:",
        final_agreement[1]
    )

    print(
        "Coverage:",
        w3.from_wei(
            final_agreement[5],
            "ether"
        ),
        "ETH"
    )

    print(
        "Total paid:",
        w3.from_wei(
            final_agreement[6],
            "ether"
        ),
        "ETH"
    )

    print(
        "Agreement status:",
        final_agreement[8]
    )

    print(
        "Milestone status:",
        final_milestones[0][3]
    )

    print()
    print("==============================================")
    print("OBJECTIVE 3 END-TO-END TEST: PASSED")
    print("==============================================")
    print()
    print(
        "Treatment agreement: CREATED"
    )
    print(
        "Treatment agreement: ACTIVATED"
    )
    print(
        "Milestone: CREATED"
    )
    print(
        "Milestone: COMPLETED"
    )
    print(
        "Insurance payment: EXECUTED"
    )
    print(
        "Treatment agreement: COMPLETED"
    )
    print()


if __name__ == "__main__":
    main()
