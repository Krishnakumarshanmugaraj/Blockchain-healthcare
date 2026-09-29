import os
from pathlib import Path

from dotenv import load_dotenv
from solcx import compile_source, set_solc_version
from web3 import Web3


load_dotenv()


PROJECT_ROOT = Path(__file__).resolve().parents[3]
BLOCKCHAIN_DIR = PROJECT_ROOT / "blockchain"


RPC_URL = os.getenv(
    "BLOCKCHAIN_RPC_URL",
    "http://127.0.0.1:7545",
)

EXPECTED_CHAIN_ID = int(
    os.getenv(
        "BLOCKCHAIN_CHAIN_ID",
        "1337",
    )
)

TREATMENT_INSURANCE_ADDRESS = os.getenv(
    "TREATMENT_INSURANCE_ADDRESS"
)

PROOF_OF_CURE_NFT_ADDRESS = os.getenv(
    "PROOF_OF_CURE_NFT_ADDRESS"
)

FINAL_SETTLEMENT_ADDRESS = os.getenv(
    "FINAL_INSURANCE_SETTLEMENT_ADDRESS"
)


DEPLOYER_ADDRESS = os.getenv(
    "BLOCKCHAIN_DEPLOYER_ADDRESS"
)

PATIENT_ADDRESS = os.getenv(
    "BLOCKCHAIN_PATIENT_ADDRESS"
)

DOCTOR_ADDRESS = os.getenv(
    "BLOCKCHAIN_DOCTOR_ADDRESS"
)

INSURER_ADDRESS = os.getenv(
    "BLOCKCHAIN_INSURER_ADDRESS"
)

FINAL_SETTLEMENT_INSURER_ADDRESS = os.getenv(
    "FINAL_SETTLEMENT_INSURER_ADDRESS"
)


class BlockchainService:
    def __init__(self):
        self.w3 = Web3(
            Web3.HTTPProvider(
                RPC_URL,
                request_kwargs={
                    "timeout": 30
                },
            )
        )

        if not self.w3.is_connected():
            raise RuntimeError(
                f"Unable to connect to blockchain RPC: {RPC_URL}"
            )

        chain_id = self.w3.eth.chain_id

        if chain_id != EXPECTED_CHAIN_ID:
            raise RuntimeError(
                "Blockchain chain ID mismatch: "
                f"expected {EXPECTED_CHAIN_ID}, "
                f"got {chain_id}"
            )

        # ======================================================
        # GANACHE RELAYER
        # ======================================================
        # Ganache exposes unlocked accounts through eth_accounts.
        # The current configured doctor address may no longer be
        # one of those accounts after Ganache was restarted.
        #
        # ProofOfCureNFT.mintProofOfCure() does not currently
        # enforce msg.sender == doctor, so a funded unlocked
        # Ganache account can safely relay the transaction while
        # the actual patient and doctor addresses remain stored
        # inside the NFT proof.
        #
        # This relayer is intentionally used ONLY for Proof-of-Cure.
        # Treatment Insurance and Final Settlement continue to use
        # their required participant/insurer addresses.
        # ======================================================

        available_accounts = self.w3.eth.accounts

        if not available_accounts:
            raise RuntimeError(
                "No unlocked blockchain accounts available for relaying"
            )

        self.relayer_address = self._checksum(
            available_accounts[0]
        )

        self._validate_address(
            TREATMENT_INSURANCE_ADDRESS,
            "TREATMENT_INSURANCE_ADDRESS",
        )

        self._validate_address(
            PROOF_OF_CURE_NFT_ADDRESS,
            "PROOF_OF_CURE_NFT_ADDRESS",
        )

        self._validate_address(
            FINAL_SETTLEMENT_ADDRESS,
            "FINAL_INSURANCE_SETTLEMENT_ADDRESS",
        )

        self._validate_address(
            DEPLOYER_ADDRESS,
            "BLOCKCHAIN_DEPLOYER_ADDRESS",
        )

        self._validate_address(
            PATIENT_ADDRESS,
            "BLOCKCHAIN_PATIENT_ADDRESS",
        )

        self._validate_address(
            DOCTOR_ADDRESS,
            "BLOCKCHAIN_DOCTOR_ADDRESS",
        )

        self._validate_address(
            INSURER_ADDRESS,
            "BLOCKCHAIN_INSURER_ADDRESS",
        )

        self._validate_address(
            FINAL_SETTLEMENT_INSURER_ADDRESS,
            "FINAL_SETTLEMENT_INSURER_ADDRESS",
        )

        self.treatment_insurance = self._load_contract(
            "TreatmentInsurance.sol",
            "TreatmentInsurance",
            TREATMENT_INSURANCE_ADDRESS,
        )

        self.proof_of_cure = self._load_contract(
            "ProofOfCureNFT.sol",
            "ProofOfCureNFT",
            PROOF_OF_CURE_NFT_ADDRESS,
        )

        self.final_settlement = self._load_contract(
            "FinalInsuranceSettlement.sol",
            "FinalInsuranceSettlement",
            FINAL_SETTLEMENT_ADDRESS,
        )

        self._validate_deployed_contract(
            TREATMENT_INSURANCE_ADDRESS,
            "TreatmentInsurance",
        )

        self._validate_deployed_contract(
            PROOF_OF_CURE_NFT_ADDRESS,
            "ProofOfCureNFT",
        )

        self._validate_deployed_contract(
            FINAL_SETTLEMENT_ADDRESS,
            "FinalInsuranceSettlement",
        )

    # ==========================================================
    # BASIC HELPERS
    # ==========================================================

    @staticmethod
    def _validate_address(
        address,
        name,
    ):
        if not address:
            raise RuntimeError(
                f"{name} is not configured"
            )

        if not Web3.is_address(address):
            raise RuntimeError(
                f"{name} is not a valid Ethereum address"
            )

    def _checksum(self, address):
        return Web3.to_checksum_address(address)

    def _load_contract(
        self,
        filename,
        contract_name,
        address,
    ):
        source_path = BLOCKCHAIN_DIR / filename

        if not source_path.exists():
            raise RuntimeError(
                f"Solidity source not found: {source_path}"
            )

        source = source_path.read_text(
            encoding="utf-8"
        )

        set_solc_version("0.8.20")

        compiled = compile_source(
            source,
            output_values=[
                "abi",
                "bin",
            ],
        )

        contract_key = (
            f"<stdin>:{contract_name}"
        )

        if contract_key not in compiled:
            raise RuntimeError(
                f"Contract {contract_name} "
                f"not found in {filename}"
            )

        artifact = compiled[
            contract_key
        ]

        abi = artifact["abi"]

        return self.w3.eth.contract(
            address=self._checksum(address),
            abi=abi,
        )

    def _validate_deployed_contract(
        self,
        address,
        name,
    ):
        code = self.w3.eth.get_code(
            self._checksum(address)
        )

        if not code or code == b"\x00":
            raise RuntimeError(
                f"No deployed bytecode found for {name} "
                f"at {address}"
            )

    def _require_role_address(
        self,
        address,
        role_name,
    ):
        self._validate_address(
            address,
            role_name,
        )

        return self._checksum(address)

    def _send_transaction(
        self,
        contract_function,
        sender,
        value=0,
    ):
        sender = self._checksum(sender)

        nonce = self.w3.eth.get_transaction_count(
            sender,
            "pending",
        )

        transaction = {
            "from": sender,
            "nonce": nonce,
            "chainId": self.w3.eth.chain_id,
            "value": value,
            "gasPrice": self.w3.eth.gas_price,
        }

        gas_estimate = contract_function.estimate_gas(
            {
                "from": sender,
                "value": value,
            }
        )

        transaction["gas"] = int(
            gas_estimate * 1.20
        )

        built_transaction = (
            contract_function.build_transaction(
                transaction
            )
        )

        tx_hash = self.w3.eth.send_transaction(
            built_transaction
        )

        receipt = (
            self.w3.eth.wait_for_transaction_receipt(
                tx_hash,
                timeout=120,
            )
        )

        if receipt["status"] != 1:
            raise RuntimeError(
                "Blockchain transaction reverted: "
                f"{tx_hash.hex()}"
            )

        return {
            "transaction_hash": tx_hash.hex(),
            "block_number": receipt["blockNumber"],
            "gas_used": receipt["gasUsed"],
            "status": receipt["status"],
        }

    # ==========================================================
    # NETWORK
    # ==========================================================

    def get_status(self):
        return {
            "connected": self.w3.is_connected(),
            "chain_id": self.w3.eth.chain_id,
            "expected_chain_id": EXPECTED_CHAIN_ID,
            "latest_block": self.w3.eth.block_number,
            "rpc_url": RPC_URL,
            "relayer_address": self.relayer_address,
            "accounts": {
                "deployer": DEPLOYER_ADDRESS,
                "patient": PATIENT_ADDRESS,
                "doctor": DOCTOR_ADDRESS,
                "insurer": INSURER_ADDRESS,
            },
            "contracts": {
                "treatment_insurance":
                    self.treatment_insurance.address,
                "proof_of_cure":
                    self.proof_of_cure.address,
                "final_settlement":
                    self.final_settlement.address,
            },
        }

    # ==========================================================
    # TREATMENT AGREEMENT READS
    # ==========================================================

    def get_treatment_agreement(
        self,
        agreement_id,
    ):
        result = (
            self.treatment_insurance
            .functions
            .getTreatmentAgreement(
                agreement_id
            )
            .call()
        )

        return {
            "agreement_id": int(result[0]),
            "patient_id": int(result[1]),
            "patient": result[2],
            "doctor": result[3],
            "insurer": result[4],
            "total_coverage_wei": int(result[5]),
            "total_coverage_eth": float(
                self.w3.from_wei(
                    result[5],
                    "ether",
                )
            ),
            "total_paid_wei": int(result[6]),
            "total_paid_eth": float(
                self.w3.from_wei(
                    result[6],
                    "ether",
                )
            ),
            "created_at": int(result[7]),
            "status": int(result[8]),
        }

    def get_milestones(
        self,
        agreement_id,
    ):
        milestones = (
            self.treatment_insurance
            .functions
            .getMilestones(
                agreement_id
            )
            .call()
        )

        return [
            {
                "milestone_id": int(item[0]),
                "description": item[1],
                "payment_amount_wei": int(item[2]),
                "payment_amount_eth": float(
                    self.w3.from_wei(
                        item[2],
                        "ether",
                    )
                ),
                "status": int(item[3]),
                "completed_at": int(item[4]),
                "paid_at": int(item[5]),
            }
            for item in milestones
        ]

    def get_patient_agreements(
        self,
        patient_address,
    ):
        return [
            int(x)
            for x in (
                self.treatment_insurance
                .functions
                .getPatientAgreements(
                    self._checksum(
                        patient_address
                    )
                )
                .call()
            )
        ]

    def get_doctor_agreements(
        self,
        doctor_address,
    ):
        return [
            int(x)
            for x in (
                self.treatment_insurance
                .functions
                .getDoctorAgreements(
                    self._checksum(
                        doctor_address
                    )
                )
                .call()
            )
        ]

    # ==========================================================
    # TREATMENT AGREEMENT WRITES
    # ==========================================================

    def create_treatment_agreement(
        self,
        patient_id,
        patient_address,
        doctor_address,
        insurer_address,
        total_coverage_wei,
    ):
        patient_address = self._checksum(
            patient_address
        )

        doctor_address = self._checksum(
            doctor_address
        )

        insurer_address = self._checksum(
            insurer_address
        )

        before = self.get_patient_agreements(
            patient_address
        )

        result = self._send_transaction(
            self.treatment_insurance
            .functions
            .createTreatmentAgreement(
                int(patient_id),
                patient_address,
                doctor_address,
                insurer_address,
                int(total_coverage_wei),
            ),
            insurer_address,
        )

        after = self.get_patient_agreements(
            patient_address
        )

        new_ids = [
            x for x in after
            if x not in before
        ]

        agreement_id = (
            new_ids[-1]
            if new_ids
            else None
        )

        result["agreement_id"] = agreement_id

        if agreement_id:
            result["agreement"] = (
                self.get_treatment_agreement(
                    agreement_id
                )
            )

        return result

    def activate_treatment_agreement(
        self,
        agreement_id,
        sender=None,
    ):
        sender = sender or INSURER_ADDRESS

        return self._send_transaction(
            self.treatment_insurance
            .functions
            .activateTreatmentAgreement(
                int(agreement_id)
            ),
            sender,
        )

    def create_milestone(
        self,
        agreement_id,
        description,
        payment_amount_wei,
        sender=None,
    ):
        sender = sender or INSURER_ADDRESS

        before = self.get_milestones(
            agreement_id
        )

        result = self._send_transaction(
            self.treatment_insurance
            .functions
            .createMilestone(
                int(agreement_id),
                description,
                int(payment_amount_wei),
            ),
            sender,
        )

        after = self.get_milestones(
            agreement_id
        )

        new_items = [
            item
            for item in after
            if item["milestone_id"]
            not in {
                x["milestone_id"]
                for x in before
            }
        ]

        result["milestone_id"] = (
            new_items[-1]["milestone_id"]
            if new_items
            else None
        )

        return result

    def complete_milestone(
        self,
        agreement_id,
        milestone_id,
        sender=None,
    ):
        sender = sender or INSURER_ADDRESS

        return self._send_transaction(
            self.treatment_insurance
            .functions
            .completeMilestone(
                int(agreement_id),
                int(milestone_id),
            ),
            sender,
        )

    def pay_milestone(
        self,
        agreement_id,
        milestone_id,
        payment_amount_wei,
        sender=None,
    ):
        sender = sender or INSURER_ADDRESS

        return self._send_transaction(
            self.treatment_insurance
            .functions
            .payMilestone(
                int(agreement_id),
                int(milestone_id),
            ),
            sender,
            value=int(payment_amount_wei),
        )

    def complete_treatment_agreement(
        self,
        agreement_id,
        sender=None,
    ):
        sender = sender or INSURER_ADDRESS

        return self._send_transaction(
            self.treatment_insurance
            .functions
            .completeTreatmentAgreement(
                int(agreement_id)
            ),
            sender,
        )

    # ==========================================================
    # PROOF-OF-CURE READS
    # ==========================================================

    def get_total_minted(self):
        return int(
            self.proof_of_cure
            .functions
            .totalMinted()
            .call()
        )

    def proof_exists(
        self,
        token_id,
    ):
        return bool(
            self.proof_of_cure
            .functions
            .proofExists(
                int(token_id)
            )
            .call()
        )

    def get_proof_basic(
        self,
        token_id,
    ):
        result = (
            self.proof_of_cure
            .functions
            .getProofBasic(
                int(token_id)
            )
            .call()
        )

        return {
            "token_id": int(result[0]),
            "agreement_id": int(result[1]),
            "patient_id": int(result[2]),
            "record_id": result[3],
            "minted_at": int(result[4]),
        }

    def get_proof_recovery(
        self,
        token_id,
    ):
        result = (
            self.proof_of_cure
            .functions
            .getProofRecovery(
                int(token_id)
            )
            .call()
        )

        return {
            "recovery_model_version": result[0],
            "recovery_probability": int(
                result[1]
            ),
            "recovery_probability_percent":
                int(result[1]) / 100,
        }

    def get_proof_hashes(
        self,
        token_id,
    ):
        result = (
            self.proof_of_cure
            .functions
            .getProofHashes(
                int(token_id)
            )
            .call()
        )

        return {
            "zk_proof_hash": result[0],
            "medical_record_hash": result[1],
        }

    def get_proof_participants(
        self,
        token_id,
    ):
        result = (
            self.proof_of_cure
            .functions
            .getProofParticipants(
                int(token_id)
            )
            .call()
        )

        return {
            "patient": result[0],
            "doctor": result[1],
        }

    def get_proof_owner(
        self,
        token_id,
    ):
        return (
            self.proof_of_cure
            .functions
            .ownerOf(
                int(token_id)
            )
            .call()
        )

    def get_patient_tokens(
        self,
        patient_address,
    ):
        return [
            int(x)
            for x in (
                self.proof_of_cure
                .functions
                .getPatientTokens(
                    self._checksum(
                        patient_address
                    )
                )
                .call()
            )
        ]

    def get_complete_proof(
        self,
        token_id,
    ):
        if not self.proof_exists(
            token_id
        ):
            raise ValueError(
                f"Proof-of-Cure token {token_id} does not exist"
            )

        return {
            **self.get_proof_basic(
                token_id
            ),
            **self.get_proof_recovery(
                token_id
            ),
            **self.get_proof_hashes(
                token_id
            ),
            **self.get_proof_participants(
                token_id
            ),
            "owner": self.get_proof_owner(
                token_id
            ),
            "contract":
                self.proof_of_cure.address,
        }

    # ==========================================================
    # PROOF-OF-CURE WRITE
    # ==========================================================

    def mint_proof_of_cure(
        self,
        agreement_id,
        patient_id,
        patient_address,
        doctor_address,
        record_id,
        recovery_model_version,
        recovery_probability,
        zk_proof_hash,
        medical_record_hash,
    ):
        patient_address = self._checksum(
            patient_address
        )

        doctor_address = self._checksum(
            doctor_address
        )

        before = self.get_total_minted()

        # IMPORTANT:
        # ProofOfCureNFT stores the supplied patient and doctor
        # addresses inside the proof. The contract currently does
        # not require msg.sender to equal the doctor address.
        #
        # Therefore, use the currently unlocked Ganache relayer
        # instead of the old configured doctor address, which may
        # no longer belong to the current Ganache wallet.
        result = self._send_transaction(
            self.proof_of_cure
            .functions
            .mintProofOfCure(
                (
                    int(agreement_id),
                    int(patient_id),
                    patient_address,
                    doctor_address,
                    str(record_id),
                    str(recovery_model_version),
                    int(recovery_probability),
                    str(zk_proof_hash),
                    str(medical_record_hash),
                )
            ),
            self.relayer_address,
        )

        after = self.get_total_minted()

        token_id = (
            after
            if after > before
            else None
        )

        result["token_id"] = token_id

        if token_id:
            result["proof"] = (
                self.get_complete_proof(
                    token_id
                )
            )

        return result

    # ==========================================================
    # INSURANCE SETTLEMENT READS
    # ==========================================================

    def settlement_exists(
        self,
        agreement_id,
    ):
        return bool(
            self.final_settlement
            .functions
            .settlementExistsForAgreement(
                int(agreement_id)
            )
            .call()
        )

    def get_settlement_basic(
        self,
        agreement_id,
    ):
        result = (
            self.final_settlement
            .functions
            .getSettlementBasic(
                int(agreement_id)
            )
            .call()
        )

        return {
            "agreement_id": int(result[0]),
            "patient_id": int(result[1]),
            "patient": result[2],
            "doctor": result[3],
            "insurer": result[4],
        }

    def get_settlement_financials(
        self,
        agreement_id,
    ):
        result = (
            self.final_settlement
            .functions
            .getSettlementFinancials(
                int(agreement_id)
            )
            .call()
        )

        return {
            "total_coverage_wei": int(result[0]),
            "amount_already_paid_wei": int(result[1]),
            "final_settlement_amount_wei": int(result[2]),
            "total_coverage_eth": float(
                self.w3.from_wei(
                    result[0],
                    "ether",
                )
            ),
            "amount_already_paid_eth": float(
                self.w3.from_wei(
                    result[1],
                    "ether",
                )
            ),
            "final_settlement_amount_eth":
                float(
                    self.w3.from_wei(
                        result[2],
                        "ether",
                    )
                ),
        }

    def get_settlement_result(
        self,
        agreement_id,
    ):
        result = (
            self.final_settlement
            .functions
            .getSettlementResult(
                int(agreement_id)
            )
            .call()
        )

        proof_token_id = int(result[0])
        registered_at = int(result[1])
        settled_at = int(result[2])
        transaction_hash = result[3]

        if isinstance(
            transaction_hash,
            bytes,
        ):
            transaction_hash = (
                "0x"
                + transaction_hash.hex()
            )
        elif transaction_hash is not None:
            transaction_hash = str(
                transaction_hash
            )

        return {
            "proof_token_id": proof_token_id,
            "registered_at": registered_at,
            "settled_at": settled_at,
            "settlement_transaction_hash":
                transaction_hash,
        }

    def get_remaining_amount(
        self,
        agreement_id,
    ):
        amount = (
            self.final_settlement
            .functions
            .getRemainingAmount(
                int(agreement_id)
            )
            .call()
        )

        return {
            "remaining_amount_wei": int(
                amount
            ),
            "remaining_amount_eth": float(
                self.w3.from_wei(
                    amount,
                    "ether",
                )
            ),
        }

    def is_settlement_complete(
        self,
        agreement_id,
    ):
        return bool(
            self.final_settlement
            .functions
            .isSettlementComplete(
                int(agreement_id)
            )
            .call()
        )

    def verify_proof_for_settlement(
        self,
        agreement_id,
        proof_token_id,
    ):
        return bool(
            self.final_settlement
            .functions
            .verifyProofOfCure(
                int(agreement_id),
                int(proof_token_id),
            )
            .call()
        )

    def get_complete_settlement(
        self,
        agreement_id,
    ):
        if not self.settlement_exists(
            agreement_id
        ):
            raise ValueError(
                f"Settlement {agreement_id} does not exist"
            )

        return {
            **self.get_settlement_basic(
                agreement_id
            ),
            **self.get_settlement_financials(
                agreement_id
            ),
            **self.get_settlement_result(
                agreement_id
            ),
            **self.get_remaining_amount(
                agreement_id
            ),
            "complete":
                self.is_settlement_complete(
                    agreement_id
                ),
            "contract":
                self.final_settlement.address,
        }

    # ==========================================================
    # INSURANCE SETTLEMENT WRITES
    # ==========================================================

    def register_settlement(
        self,
        agreement_id,
        patient_id,
        patient_address,
        doctor_address,
        total_coverage_wei,
        amount_already_paid_wei,
        insurer_address=None,
    ):
        insurer_address = (
            insurer_address
            or FINAL_SETTLEMENT_INSURER_ADDRESS
        )

        return self._send_transaction(
            self.final_settlement
            .functions
            .registerSettlement(
                int(agreement_id),
                int(patient_id),
                self._checksum(
                    patient_address
                ),
                self._checksum(
                    doctor_address
                ),
                int(total_coverage_wei),
                int(amount_already_paid_wei),
            ),
            insurer_address,
        )

    def settle_final_insurance(
        self,
        agreement_id,
        proof_token_id,
        settlement_amount_wei,
        insurer_address=None,
    ):
        insurer_address = (
            insurer_address
            or FINAL_SETTLEMENT_INSURER_ADDRESS
        )

        return self._send_transaction(
            self.final_settlement
            .functions
            .settleFinalInsurance(
                int(agreement_id),
                int(proof_token_id),
            ),
            insurer_address,
            value=int(
                settlement_amount_wei
            ),
        )


blockchain_service = BlockchainService()
