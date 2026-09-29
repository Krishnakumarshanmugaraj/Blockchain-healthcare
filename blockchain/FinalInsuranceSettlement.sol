// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IProofOfCureNFT {
    function proofExists(uint256 tokenId) external view returns (bool);

    function ownerOf(uint256 tokenId) external view returns (address);

    function getProofBasic(uint256 tokenId)
        external
        view
        returns (
            uint256 tokenIdResult,
            uint256 agreementId,
            uint256 patientId,
            string memory recordId,
            uint256 mintedAt
        );

    function getProofParticipants(uint256 tokenId)
        external
        view
        returns (
            address patient,
            address doctor
        );
}

contract FinalInsuranceSettlement {
    enum SettlementStatus {
        Registered,
        Settled,
        Cancelled
    }

    struct Settlement {
        uint256 agreementId;
        uint256 patientId;
        address patient;
        address doctor;
        address insurer;
        uint256 totalCoverage;
        uint256 amountAlreadyPaid;
        uint256 finalSettlementAmount;
        uint256 proofTokenId;
        SettlementStatus status;
        uint256 registeredAt;
        uint256 settledAt;
        bytes32 settlementTransactionHash;
    }

    IProofOfCureNFT public immutable proofOfCureNFT;

    address public immutable contractDeployer;

    mapping(uint256 => Settlement) private settlements;

    mapping(uint256 => bool) private registeredAgreements;

    event SettlementRegistered(
        uint256 indexed agreementId,
        uint256 indexed patientId,
        address indexed insurer,
        address patient,
        address doctor,
        uint256 totalCoverage,
        uint256 amountAlreadyPaid,
        uint256 remainingAmount
    );

    event ProofOfCureVerified(
        uint256 indexed agreementId,
        uint256 indexed proofTokenId,
        address indexed patient,
        address doctor
    );

    event FinalInsurancePayment(
        uint256 indexed agreementId,
        uint256 indexed proofTokenId,
        address indexed doctor,
        address insurer,
        uint256 amount,
        bytes32 settlementHash
    );

    event SettlementCompleted(
        uint256 indexed agreementId,
        uint256 indexed proofTokenId,
        uint256 finalSettlementAmount,
        uint256 settledAt
    );

    event SettlementCancelled(
        uint256 indexed agreementId,
        address indexed insurer
    );

    modifier settlementExists(uint256 agreementId) {
        require(
            registeredAgreements[agreementId],
            "Settlement does not exist"
        );
        _;
    }

    modifier onlyInsurer(uint256 agreementId) {
        require(
            msg.sender == settlements[agreementId].insurer,
            "Only insurer can perform this action"
        );
        _;
    }

    constructor(address proofOfCureNFTAddress) {
        require(
            proofOfCureNFTAddress != address(0),
            "Invalid Proof-of-Cure NFT address"
        );

        proofOfCureNFT = IProofOfCureNFT(
            proofOfCureNFTAddress
        );

        contractDeployer = msg.sender;
    }

    function registerSettlement(
        uint256 agreementId,
        uint256 patientId,
        address patient,
        address doctor,
        uint256 totalCoverage,
        uint256 amountAlreadyPaid
    )
        external
    {
        require(
            !registeredAgreements[agreementId],
            "Settlement already registered"
        );

        require(
            agreementId > 0,
            "Invalid agreement ID"
        );

        require(
            patientId > 0,
            "Invalid patient ID"
        );

        require(
            patient != address(0),
            "Invalid patient address"
        );

        require(
            doctor != address(0),
            "Invalid doctor address"
        );

        require(
            totalCoverage > 0,
            "Coverage must be greater than zero"
        );

        require(
            amountAlreadyPaid <= totalCoverage,
            "Paid amount exceeds coverage"
        );

        uint256 remainingAmount =
            totalCoverage - amountAlreadyPaid;

        Settlement storage settlement =
            settlements[agreementId];

        settlement.agreementId = agreementId;
        settlement.patientId = patientId;
        settlement.patient = patient;
        settlement.doctor = doctor;
        settlement.insurer = msg.sender;
        settlement.totalCoverage = totalCoverage;
        settlement.amountAlreadyPaid = amountAlreadyPaid;
        settlement.finalSettlementAmount = remainingAmount;
        settlement.proofTokenId = 0;
        settlement.status = SettlementStatus.Registered;
        settlement.registeredAt = block.timestamp;
        settlement.settledAt = 0;
        settlement.settlementTransactionHash = bytes32(0);

        registeredAgreements[agreementId] = true;

        emit SettlementRegistered(
            agreementId,
            patientId,
            msg.sender,
            patient,
            doctor,
            totalCoverage,
            amountAlreadyPaid,
            remainingAmount
        );
    }

    function verifyProofOfCure(
        uint256 agreementId,
        uint256 proofTokenId
    )
        public
        view
        settlementExists(agreementId)
        returns (bool)
    {
        Settlement storage settlement =
            settlements[agreementId];

        if (
            settlement.status !=
            SettlementStatus.Registered
        ) {
            return false;
        }

        if (
            !proofOfCureNFT.proofExists(
                proofTokenId
            )
        ) {
            return false;
        }

        address nftOwner =
            proofOfCureNFT.ownerOf(
                proofTokenId
            );

        if (
            nftOwner != settlement.patient
        ) {
            return false;
        }

        (
            uint256 tokenIdResult,
            uint256 nftAgreementId,
            uint256 nftPatientId,
            string memory nftRecordId,
            uint256 nftMintedAt
        ) =
            proofOfCureNFT.getProofBasic(
                proofTokenId
            );

        nftRecordId;
        nftMintedAt;

        if (
            tokenIdResult != proofTokenId
        ) {
            return false;
        }

        if (
            nftAgreementId != agreementId
        ) {
            return false;
        }

        if (
            nftPatientId != settlement.patientId
        ) {
            return false;
        }

        (
            address nftPatient,
            address nftDoctor
        ) =
            proofOfCureNFT
                .getProofParticipants(
                    proofTokenId
                );

        if (
            nftPatient != settlement.patient
        ) {
            return false;
        }

        if (
            nftDoctor != settlement.doctor
        ) {
            return false;
        }

        return true;
    }

    function settleFinalInsurance(
        uint256 agreementId,
        uint256 proofTokenId
    )
        external
        payable
        settlementExists(agreementId)
        onlyInsurer(agreementId)
    {
        Settlement storage settlement =
            settlements[agreementId];

        require(
            settlement.status ==
                SettlementStatus.Registered,
            "Settlement is not active"
        );

        require(
            verifyProofOfCure(
                agreementId,
                proofTokenId
            ),
            "Proof-of-Cure verification failed"
        );

        uint256 remainingAmount =
            settlement.finalSettlementAmount;

        require(
            remainingAmount > 0,
            "No remaining insurance payment"
        );

        require(
            msg.value == remainingAmount,
            "Incorrect settlement payment amount"
        );

        settlement.proofTokenId =
            proofTokenId;

        settlement.status =
            SettlementStatus.Settled;

        settlement.settledAt =
            block.timestamp;

        bytes32 settlementHash =
            keccak256(
                abi.encodePacked(
                    agreementId,
                    proofTokenId,
                    settlement.patientId,
                    settlement.patient,
                    settlement.doctor,
                    settlement.insurer,
                    remainingAmount,
                    block.timestamp,
                    block.number
                )
            );

        settlement.settlementTransactionHash =
            settlementHash;

        emit ProofOfCureVerified(
            agreementId,
            proofTokenId,
            settlement.patient,
            settlement.doctor
        );

        (
            bool success,
        ) =
            payable(
                settlement.doctor
            ).call{
                value: remainingAmount
            }("");

        require(
            success,
            "Final payment transfer failed"
        );

        emit FinalInsurancePayment(
            agreementId,
            proofTokenId,
            settlement.doctor,
            settlement.insurer,
            remainingAmount,
            settlementHash
        );

        emit SettlementCompleted(
            agreementId,
            proofTokenId,
            remainingAmount,
            block.timestamp
        );
    }

    function cancelSettlement(
        uint256 agreementId
    )
        external
        settlementExists(agreementId)
        onlyInsurer(agreementId)
    {
        Settlement storage settlement =
            settlements[agreementId];

        require(
            settlement.status ==
                SettlementStatus.Registered,
            "Settlement cannot be cancelled"
        );

        settlement.status =
            SettlementStatus.Cancelled;

        emit SettlementCancelled(
            agreementId,
            msg.sender
        );
    }

    function getSettlementBasic(
        uint256 agreementId
    )
        external
        view
        settlementExists(agreementId)
        returns (
            uint256 agreementIdResult,
            uint256 patientId,
            address patient,
            address doctor,
            address insurer,
            SettlementStatus status
        )
    {
        Settlement storage settlement =
            settlements[agreementId];

        return (
            settlement.agreementId,
            settlement.patientId,
            settlement.patient,
            settlement.doctor,
            settlement.insurer,
            settlement.status
        );
    }

    function getSettlementFinancials(
        uint256 agreementId
    )
        external
        view
        settlementExists(agreementId)
        returns (
            uint256 totalCoverage,
            uint256 amountAlreadyPaid,
            uint256 finalSettlementAmount
        )
    {
        Settlement storage settlement =
            settlements[agreementId];

        return (
            settlement.totalCoverage,
            settlement.amountAlreadyPaid,
            settlement.finalSettlementAmount
        );
    }

    function getSettlementResult(
        uint256 agreementId
    )
        external
        view
        settlementExists(agreementId)
        returns (
            uint256 proofTokenId,
            uint256 registeredAt,
            uint256 settledAt,
            bytes32 settlementTransactionHash
        )
    {
        Settlement storage settlement =
            settlements[agreementId];

        return (
            settlement.proofTokenId,
            settlement.registeredAt,
            settlement.settledAt,
            settlement.settlementTransactionHash
        );
    }

    function getRemainingAmount(
        uint256 agreementId
    )
        external
        view
        settlementExists(agreementId)
        returns (uint256)
    {
        Settlement storage settlement =
            settlements[agreementId];

        if (
            settlement.status ==
                SettlementStatus.Settled
        ) {
            return 0;
        }

        return settlement.finalSettlementAmount;
    }

    function isSettlementComplete(
        uint256 agreementId
    )
        external
        view
        settlementExists(agreementId)
        returns (bool)
    {
        return (
            settlements[agreementId].status ==
            SettlementStatus.Settled
        );
    }

    function settlementExistsForAgreement(
        uint256 agreementId
    )
        external
        view
        returns (bool)
    {
        return registeredAgreements[agreementId];
    }
}
