from pathlib import Path

from solcx import compile_standard, set_solc_version
from web3 import Web3


SOLIDITY_VERSION = "0.8.20"
GANACHE_URL = "http://127.0.0.1:7545"

DEPLOYMENT_GAS = 2_000_000
GAS_PRICE_GWEI = 20


def main():
    print("==============================================")
    print("ProofOfCureNFT Deployment")
    print("==============================================")
    print()

    # ---------------------------------------------------------
    # Solidity compiler
    # ---------------------------------------------------------
    set_solc_version(SOLIDITY_VERSION)

    contract_path = (
        Path(__file__).resolve().parent
        / "ProofOfCureNFT.sol"
    )

    if not contract_path.exists():
        raise FileNotFoundError(
            f"Contract not found: {contract_path}"
        )

    print(f"Contract: {contract_path}")
    print("Compiling ProofOfCureNFT.sol...")

    source = contract_path.read_text(
        encoding="utf-8"
    )

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
        }
    )

    contract_data = compiled[
        "contracts"
    ][
        "ProofOfCureNFT.sol"
    ][
        "ProofOfCureNFT"
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
        f"Bytecode bytes: {len(bytecode) // 2}"
    )

    # ---------------------------------------------------------
    # Connect to Ganache
    # ---------------------------------------------------------
    print()
    print(
        f"Connecting to Ganache at {GANACHE_URL}..."
    )

    w3 = Web3(
        Web3.HTTPProvider(GANACHE_URL)
    )

    if not w3.is_connected():
        raise RuntimeError(
            "Could not connect to Ganache."
        )

    print("Ganache connection: OK")
    print(
        "Chain ID:",
        w3.eth.chain_id
    )

    # ---------------------------------------------------------
    # Deployment account
    # ---------------------------------------------------------
    accounts = w3.eth.accounts

    if len(accounts) < 4:
        raise RuntimeError(
            "Ganache must provide at least 4 accounts."
        )

    deployer = accounts[0]

    balance = w3.eth.get_balance(
        deployer
    )

    print()
    print(
        "Deployer:",
        deployer
    )

    print(
        "Deployer balance:",
        w3.from_wei(
            balance,
            "ether"
        ),
        "ETH"
    )

    # ---------------------------------------------------------
    # Contract object
    # ---------------------------------------------------------
    proof_of_cure = w3.eth.contract(
        abi=abi,
        bytecode=bytecode
    )

    # ---------------------------------------------------------
    # Gas estimation
    # ---------------------------------------------------------
    print()
    print("Estimating deployment gas...")

    estimated_gas = (
        proof_of_cure
        .constructor()
        .estimate_gas(
            {
                "from": deployer
            }
        )
    )

    print(
        "Estimated deployment gas:",
        estimated_gas
    )

    if estimated_gas >= DEPLOYMENT_GAS:
        raise RuntimeError(
            "Configured deployment gas is too low. "
            f"Estimated: {estimated_gas}, "
            f"Configured: {DEPLOYMENT_GAS}"
        )

    print(
        "Deployment gas limit:",
        DEPLOYMENT_GAS
    )

    # ---------------------------------------------------------
    # Deploy
    # ---------------------------------------------------------
    print()
    print(
        "Sending deployment transaction..."
    )

    tx_hash = (
        proof_of_cure
        .constructor()
        .transact(
            {
                "from": deployer,
                "gas": DEPLOYMENT_GAS,
                "gasPrice": w3.to_wei(
                    GAS_PRICE_GWEI,
                    "gwei"
                )
            }
        )
    )

    print(
        "Transaction hash:",
        tx_hash.hex()
    )

    print(
        "Waiting for confirmation..."
    )

    receipt = (
        w3.eth.wait_for_transaction_receipt(
            tx_hash
        )
    )

    # ---------------------------------------------------------
    # Verify
    # ---------------------------------------------------------
    if receipt.status != 1:
        raise RuntimeError(
            "ProofOfCureNFT deployment failed."
        )

    contract_address = (
        receipt.contractAddress
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
        "=============================================="
    )
    print(
        "ProofOfCureNFT deployed successfully"
    )
    print(
        "=============================================="
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
        receipt.blockNumber
    )

    print(
        "Gas used:",
        receipt.gasUsed
    )

    print()
    print(
        "NFT name:",
        "Healthcare Proof of Cure"
    )

    print(
        "NFT symbol:",
        "CURE"
    )

    print()
    print("Ganache accounts:")

    for index, account in enumerate(
        accounts[:4]
    ):
        print(
            f"Account {index}: {account}"
        )

    print()
    print(
        "Proof-of-Cure NFT deployment complete."
    )


if __name__ == "__main__":
    main()
