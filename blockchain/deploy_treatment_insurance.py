from pathlib import Path

from solcx import compile_standard, set_solc_version
from web3 import Web3


SOLIDITY_VERSION = "0.8.20"
GANACHE_URL = "http://127.0.0.1:7545"
DEPLOYMENT_GAS = 5_000_000
GAS_PRICE_GWEI = 20


def main():
    print("=== TreatmentInsurance Deployment ===")

    # ---------------------------------------------------------
    # Solidity compiler
    # ---------------------------------------------------------
    set_solc_version(SOLIDITY_VERSION)

    contract_path = (
        Path(__file__).resolve().parent
        / "TreatmentInsurance.sol"
    )

    print(f"Contract: {contract_path}")

    if not contract_path.exists():
        raise FileNotFoundError(
            f"Contract not found: {contract_path}"
        )

    contract_source = contract_path.read_text(
        encoding="utf-8"
    )

    print("Compiling TreatmentInsurance.sol...")

    compiled = compile_standard(
        {
            "language": "Solidity",
            "sources": {
                "TreatmentInsurance.sol": {
                    "content": contract_source
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

    contract_data = compiled[
        "contracts"
    ][
        "TreatmentInsurance.sol"
    ][
        "TreatmentInsurance"
    ]

    abi = contract_data["abi"]

    bytecode = contract_data[
        "evm"
    ][
        "bytecode"
    ][
        "object"
    ]

    if not bytecode:
        raise RuntimeError(
            "Contract bytecode is empty."
        )

    print("Compilation successful.")
    print(f"ABI entries: {len(abi)}")
    print(
        f"Bytecode size: {len(bytecode) // 2} bytes"
    )

    # ---------------------------------------------------------
    # Connect to Ganache
    # ---------------------------------------------------------
    print(
        f"Connecting to Ganache at {GANACHE_URL}..."
    )

    w3 = Web3(
        Web3.HTTPProvider(GANACHE_URL)
    )

    if not w3.is_connected():
        raise RuntimeError(
            "Could not connect to Ganache. "
            "Make sure Ganache is running on "
            "127.0.0.1:7545."
        )

    print("Ganache connection: OK")

    # ---------------------------------------------------------
    # Accounts
    # ---------------------------------------------------------
    accounts = w3.eth.accounts

    if len(accounts) < 4:
        raise RuntimeError(
            "Ganache must provide at least 4 accounts."
        )

    deployer = accounts[0]

    print(f"Deployer: {deployer}")

    balance = w3.eth.get_balance(
        deployer
    )

    print(
        "Deployer balance:",
        w3.from_wei(balance, "ether"),
        "ETH"
    )

    # ---------------------------------------------------------
    # Contract object
    # ---------------------------------------------------------
    treatment_insurance = w3.eth.contract(
        abi=abi,
        bytecode=bytecode
    )

    # ---------------------------------------------------------
    # Estimate deployment gas
    # ---------------------------------------------------------
    print("Estimating deployment gas...")

    estimated_gas = (
        treatment_insurance
        .constructor()
        .estimate_gas(
            {
                "from": deployer
            }
        )
    )

    print(
        f"Estimated deployment gas: {estimated_gas}"
    )

    if estimated_gas >= DEPLOYMENT_GAS:
        raise RuntimeError(
            "Deployment gas setting is too low. "
            f"Estimated: {estimated_gas}, "
            f"Configured: {DEPLOYMENT_GAS}"
        )

    print(
        f"Deployment gas limit: {DEPLOYMENT_GAS}"
    )

    # ---------------------------------------------------------
    # Deploy
    # ---------------------------------------------------------
    print(
        "Sending deployment transaction..."
    )

    tx_hash = (
        treatment_insurance
        .constructor()
        .transact(
            {
                "from": deployer,
                "gas": DEPLOYMENT_GAS,
                "gasPrice": w3.to_wei(
                    GAS_PRICE_GWEI,
                    "gwei"
                ),
            }
        )
    )

    print(
        "Transaction hash:",
        tx_hash.hex()
    )

    print(
        "Waiting for deployment confirmation..."
    )

    tx_receipt = (
        w3.eth.wait_for_transaction_receipt(
            tx_hash
        )
    )

    # ---------------------------------------------------------
    # Verify deployment
    # ---------------------------------------------------------
    if tx_receipt.status != 1:
        raise RuntimeError(
            "Contract deployment transaction failed."
        )

    contract_address = (
        tx_receipt.contractAddress
    )

    if not contract_address:
        raise RuntimeError(
            "Deployment succeeded but no "
            "contract address was returned."
        )

    # ---------------------------------------------------------
    # Output
    # ---------------------------------------------------------
    print()
    print(
        "========================================"
    )
    print(
        "TreatmentInsurance deployed successfully"
    )
    print(
        "========================================"
    )

    print(
        "Contract address:",
        contract_address
    )

    print(
        "Deployment transaction:",
        tx_hash.hex()
    )

    print(
        "Block number:",
        tx_receipt.blockNumber
    )

    print(
        "Gas used:",
        tx_receipt.gasUsed
    )

    print()

    print("Ganache test accounts:")

    for index, account in enumerate(
        accounts[:4]
    ):
        print(
            f"Account {index}: {account}"
        )

    print()

    print("Suggested roles:")
    print("Account 0 = Deployer")
    print("Account 1 = Patient")
    print("Account 2 = Doctor")
    print("Account 3 = Insurer")

    print()

    print(
        "Objective 3 contract deployment complete."
    )


if __name__ == "__main__":
    main()
