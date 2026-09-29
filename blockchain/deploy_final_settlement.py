from pathlib import Path
import sys

from solcx import compile_standard, set_solc_version
from web3 import Web3


SOLIDITY_VERSION = "0.8.20"
GANACHE_URL = "http://127.0.0.1:7545"

PROOF_OF_CURE_NFT_ADDRESS = (
    "0x2D71D17c48bCE432712B0D3397Db89797859bFe9"
)

DEPLOYMENT_GAS = 2_000_000
GAS_PRICE_GWEI = 20


def compile_contract():
    contract_path = (
        Path(__file__).resolve().parent
        / "FinalInsuranceSettlement.sol"
    )

    print(f"Contract: {contract_path}")
    print("Compiling FinalInsuranceSettlement.sol...")

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
                            "abi",
                            "evm.bytecode"
                        ]
                    }
                }
            }
        },
        allow_paths=str(contract_path.parent),
    )

    contract_data = compiled[
        "contracts"
    ][
        "FinalInsuranceSettlement.sol"
    ][
        "FinalInsuranceSettlement"
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

    return abi, bytecode


def main():
    print("=" * 60)
    print("Final Insurance Settlement Deployment")
    print("=" * 60)

    print()

    abi, bytecode = compile_contract()

    print()
    print(
        f"Connecting to Ganache at {GANACHE_URL}..."
    )

    w3 = Web3(
        Web3.HTTPProvider(GANACHE_URL)
    )

    if not w3.is_connected():
        print(
            "ERROR: Could not connect to Ganache."
        )
        sys.exit(1)

    print("Ganache connection: OK")

    chain_id = w3.eth.chain_id

    print(f"Chain ID: {chain_id}")

    if chain_id != 1337:
        print(
            "WARNING: Expected Ganache chain ID 1337."
        )

    nft_address = Web3.to_checksum_address(
        PROOF_OF_CURE_NFT_ADDRESS
    )

    print()
    print("Proof-of-Cure NFT address:")
    print(nft_address)

    code = w3.eth.get_code(
        nft_address
    )

    if len(code) <= 2:
        print(
            "ERROR: No contract code found at "
            "the Proof-of-Cure NFT address."
        )
        sys.exit(1)

    print(
        "Proof-of-Cure NFT contract: VERIFIED"
    )

    deployer = w3.eth.accounts[0]

    print()
    print(f"Deployer: {deployer}")

    balance = w3.eth.get_balance(
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

    contract = w3.eth.contract(
        abi=abi,
        bytecode=bytecode
    )

    print()
    print("Preparing deployment transaction...")

    constructor = contract.constructor(
        nft_address
    )

    print("Estimating deployment gas...")

    estimated_gas = constructor.estimate_gas(
        {
            "from": deployer
        }
    )

    print(
        f"Estimated deployment gas: "
        f"{estimated_gas}"
    )

    gas_limit = max(
        DEPLOYMENT_GAS,
        estimated_gas + 100_000
    )

    print(
        f"Deployment gas limit: "
        f"{gas_limit}"
    )

    nonce = w3.eth.get_transaction_count(
        deployer
    )

    transaction = constructor.build_transaction(
        {
            "from": deployer,
            "nonce": nonce,
            "gas": gas_limit,
            "gasPrice": w3.to_wei(
                GAS_PRICE_GWEI,
                "gwei"
            ),
            "chainId": chain_id
        }
    )

    print()
    print("Sending deployment transaction...")

    tx_hash = w3.eth.send_transaction(
        transaction
    )

    print(
        f"Transaction hash: "
        f"{tx_hash.hex()}"
    )

    print("Waiting for confirmation...")

    receipt = w3.eth.wait_for_transaction_receipt(
        tx_hash
    )

    if receipt.status != 1:
        print()
        print(
            "ERROR: Deployment transaction failed."
        )
        print(
            f"Gas used: {receipt.gasUsed}"
        )
        sys.exit(1)

    contract_address = receipt.contractAddress

    print()
    print("=" * 60)
    print(
        "FinalInsuranceSettlement "
        "deployed successfully"
    )
    print("=" * 60)

    print(
        f"Contract address: "
        f"{contract_address}"
    )

    print(
        f"Proof-of-Cure NFT: "
        f"{nft_address}"
    )

    print(
        f"Deployment transaction: "
        f"{tx_hash.hex()}"
    )

    print(
        f"Block number: "
        f"{receipt.blockNumber}"
    )

    print(
        f"Gas used: "
        f"{receipt.gasUsed}"
    )

    print()
    print(
        "Final Insurance Settlement deployment complete."
    )


if __name__ == "__main__":
    main()
