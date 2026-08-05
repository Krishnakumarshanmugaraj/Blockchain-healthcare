from pathlib import Path

from solcx import compile_standard, set_solc_version
from web3 import Web3

# Use Solidity version
set_solc_version("0.8.20")

# Read contract
contract_file = Path("MedicalRecord.sol")

with open(contract_file, "r") as file:
    contract_source = file.read()

compiled = compile_standard(
    {
        "language": "Solidity",
        "sources": {
            "MedicalRecord.sol": {
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

abi = compiled["contracts"]["MedicalRecord.sol"]["MedicalRecord"]["abi"]

bytecode = compiled["contracts"]["MedicalRecord.sol"]["MedicalRecord"]["evm"]["bytecode"]["object"]

# Connect to Ganache
w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:7545"))

print("Connected:", w3.is_connected())

account = w3.eth.accounts[0]
print("Account:", account)
print("Balance:", w3.eth.get_balance(account))

contract = w3.eth.contract(
    abi=abi,
    bytecode=bytecode
)

tx_hash = contract.constructor().transact(
    {
        "from": account,
        "gas": 3000000,
        "gasPrice": w3.to_wei(20, "gwei")
    }
)

tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

print("\nContract deployed!")
print("Address:")
print(tx_receipt.contractAddress)