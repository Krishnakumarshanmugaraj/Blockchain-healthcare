// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ProofOfCureNFT {
    string public constant name = "Healthcare Proof of Cure";
    string public constant symbol = "CURE";

    uint256 private nextTokenId = 1;

    struct CureProof {
        uint256 tokenId;
        uint256 agreementId;
        uint256 patientId;
        string recordId;
        string recoveryModelVersion;
        uint256 recoveryProbability;
        string zkProofHash;
        string medicalRecordHash;
        uint256 mintedAt;
        address patient;
        address doctor;
    }

    /*
     * Input structure used during minting.
     *
     * Using one struct instead of nine separate parameters
     * prevents Solidity "Stack too deep" errors.
     */
    struct MintData {
        uint256 agreementId;
        uint256 patientId;
        address patient;
        address doctor;
        string recordId;
        string recoveryModelVersion;
        uint256 recoveryProbability;
        string zkProofHash;
        string medicalRecordHash;
    }

    mapping(uint256 => CureProof) private cureProofs;

    mapping(uint256 => address) private tokenOwners;

    mapping(address => uint256[]) private ownerTokens;

    event ProofOfCureMinted(
        uint256 indexed tokenId,
        uint256 indexed agreementId,
        uint256 indexed patientId,
        address patient,
        address doctor,
        string recordId
    );

    /*
     * Mint a Proof-of-Cure NFT.
     *
     * The NFT stores:
     * - treatment agreement reference
     * - patient reference
     * - medical record reference
     * - AI model version
     * - recovery probability
     * - ZKP hash
     * - medical record hash
     * - patient and doctor addresses
     */
    function mintProofOfCure(
        MintData calldata data
    )
        external
        returns (uint256 tokenId)
    {
        require(
            data.patient != address(0),
            "Invalid patient address"
        );

        require(
            data.doctor != address(0),
            "Invalid doctor address"
        );

        require(
            bytes(data.recordId).length > 0,
            "Record ID required"
        );

        require(
            bytes(data.recoveryModelVersion).length > 0,
            "Model version required"
        );

        require(
            data.recoveryProbability <= 10000,
            "Invalid recovery probability"
        );

        require(
            bytes(data.zkProofHash).length > 0,
            "ZKP hash required"
        );

        require(
            bytes(data.medicalRecordHash).length > 0,
            "Medical record hash required"
        );

        tokenId = nextTokenId;

        nextTokenId++;

        CureProof storage proof = cureProofs[tokenId];

        proof.tokenId = tokenId;
        proof.agreementId = data.agreementId;
        proof.patientId = data.patientId;
        proof.recordId = data.recordId;
        proof.recoveryModelVersion = data.recoveryModelVersion;
        proof.recoveryProbability = data.recoveryProbability;
        proof.zkProofHash = data.zkProofHash;
        proof.medicalRecordHash = data.medicalRecordHash;
        proof.mintedAt = block.timestamp;
        proof.patient = data.patient;
        proof.doctor = data.doctor;

        tokenOwners[tokenId] = data.patient;

        ownerTokens[data.patient].push(tokenId);

        emit ProofOfCureMinted(
            tokenId,
            data.agreementId,
            data.patientId,
            data.patient,
            data.doctor,
            data.recordId
        );
    }

    /*
     * Basic Proof-of-Cure information.
     */
    function getProofBasic(
        uint256 tokenId
    )
        external
        view
        returns (
            uint256 tokenIdResult,
            uint256 agreementId,
            uint256 patientId,
            string memory recordId,
            uint256 mintedAt
        )
    {
        require(
            tokenOwners[tokenId] != address(0),
            "Proof of Cure does not exist"
        );

        CureProof storage proof = cureProofs[tokenId];

        return (
            proof.tokenId,
            proof.agreementId,
            proof.patientId,
            proof.recordId,
            proof.mintedAt
        );
    }

    /*
     * AI recovery prediction information.
     */
    function getProofRecovery(
        uint256 tokenId
    )
        external
        view
        returns (
            string memory recoveryModelVersion,
            uint256 recoveryProbability
        )
    {
        require(
            tokenOwners[tokenId] != address(0),
            "Proof of Cure does not exist"
        );

        CureProof storage proof = cureProofs[tokenId];

        return (
            proof.recoveryModelVersion,
            proof.recoveryProbability
        );
    }

    /*
     * ZKP and medical-record hashes.
     */
    function getProofHashes(
        uint256 tokenId
    )
        external
        view
        returns (
            string memory zkProofHash,
            string memory medicalRecordHash
        )
    {
        require(
            tokenOwners[tokenId] != address(0),
            "Proof of Cure does not exist"
        );

        CureProof storage proof = cureProofs[tokenId];

        return (
            proof.zkProofHash,
            proof.medicalRecordHash
        );
    }

    /*
     * Patient and doctor information.
     */
    function getProofParticipants(
        uint256 tokenId
    )
        external
        view
        returns (
            address patient,
            address doctor
        )
    {
        require(
            tokenOwners[tokenId] != address(0),
            "Proof of Cure does not exist"
        );

        CureProof storage proof = cureProofs[tokenId];

        return (
            proof.patient,
            proof.doctor
        );
    }

    /*
     * NFT ownership lookup.
     */
    function ownerOf(
        uint256 tokenId
    )
        external
        view
        returns (address)
    {
        require(
            tokenOwners[tokenId] != address(0),
            "Token does not exist"
        );

        return tokenOwners[tokenId];
    }

    /*
     * Return all Proof-of-Cure token IDs
     * belonging to a patient.
     */
    function getPatientTokens(
        address patient
    )
        external
        view
        returns (uint256[] memory)
    {
        return ownerTokens[patient];
    }

    /*
     * Number of Proof-of-Cure NFTs minted.
     */
    function totalMinted()
        external
        view
        returns (uint256)
    {
        return nextTokenId - 1;
    }

    /*
     * Check whether a Proof-of-Cure NFT exists.
     */
    function proofExists(
        uint256 tokenId
    )
        external
        view
        returns (bool)
    {
        return tokenOwners[tokenId] != address(0);
    }
}
