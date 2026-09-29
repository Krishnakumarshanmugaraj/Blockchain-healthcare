// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TreatmentInsurance {
    enum AgreementStatus {
        Created,
        Active,
        Completed,
        Cancelled
    }

    enum MilestoneStatus {
        Pending,
        Completed,
        Paid
    }

    struct Milestone {
        uint256 milestoneId;
        string description;
        uint256 paymentAmount;
        MilestoneStatus status;
        uint256 completedAt;
        uint256 paidAt;
    }

    struct TreatmentAgreement {
        uint256 agreementId;
        uint256 patientId;
        address patient;
        address doctor;
        address insurer;
        uint256 totalCoverage;
        uint256 totalPaid;
        uint256 createdAt;
        AgreementStatus status;
    }

    uint256 private nextAgreementId = 1;
    uint256 private nextMilestoneId = 1;

    mapping(uint256 => TreatmentAgreement)
        public agreements;

    mapping(uint256 => Milestone[])
        private agreementMilestones;

    mapping(address => uint256[])
        private patientAgreements;

    mapping(address => uint256[])
        private doctorAgreements;

    event TreatmentAgreementCreated(
        uint256 indexed agreementId,
        uint256 indexed patientId,
        address indexed patient,
        address doctor,
        address insurer,
        uint256 totalCoverage
    );

    event TreatmentAgreementActivated(
        uint256 indexed agreementId
    );

    event MilestoneCreated(
        uint256 indexed agreementId,
        uint256 indexed milestoneId,
        string description,
        uint256 paymentAmount
    );

    event MilestoneCompleted(
        uint256 indexed agreementId,
        uint256 indexed milestoneId
    );

    event MilestonePaid(
        uint256 indexed agreementId,
        uint256 indexed milestoneId,
        uint256 amount,
        address recipient
    );

    event TreatmentAgreementCompleted(
        uint256 indexed agreementId
    );

    event TreatmentAgreementCancelled(
        uint256 indexed agreementId
    );

    modifier agreementExists(uint256 agreementId) {
        require(
            agreements[agreementId].agreementId != 0,
            "Agreement does not exist"
        );
        _;
    }

    modifier onlyAgreementParticipant(
        uint256 agreementId
    ) {
        TreatmentAgreement memory agreement =
            agreements[agreementId];

        require(
            msg.sender == agreement.patient ||
            msg.sender == agreement.doctor ||
            msg.sender == agreement.insurer,
            "Not an agreement participant"
        );

        _;
    }

    function createTreatmentAgreement(
        uint256 patientId,
        address patient,
        address doctor,
        address insurer,
        uint256 totalCoverage
    )
        external
        returns (uint256 agreementId)
    {
        require(
            patient != address(0),
            "Invalid patient address"
        );

        require(
            doctor != address(0),
            "Invalid doctor address"
        );

        require(
            insurer != address(0),
            "Invalid insurer address"
        );

        require(
            totalCoverage > 0,
            "Coverage must be greater than zero"
        );

        agreementId = nextAgreementId;

        nextAgreementId++;

        agreements[agreementId] =
            TreatmentAgreement({
                agreementId: agreementId,
                patientId: patientId,
                patient: patient,
                doctor: doctor,
                insurer: insurer,
                totalCoverage: totalCoverage,
                totalPaid: 0,
                createdAt: block.timestamp,
                status: AgreementStatus.Created
            });

        patientAgreements[patient].push(
            agreementId
        );

        doctorAgreements[doctor].push(
            agreementId
        );

        emit TreatmentAgreementCreated(
            agreementId,
            patientId,
            patient,
            doctor,
            insurer,
            totalCoverage
        );
    }

    function activateTreatmentAgreement(
        uint256 agreementId
    )
        external
        agreementExists(agreementId)
        onlyAgreementParticipant(agreementId)
    {
        require(
            agreements[agreementId].status ==
                AgreementStatus.Created,
            "Agreement cannot be activated"
        );

        agreements[agreementId].status =
            AgreementStatus.Active;

        emit TreatmentAgreementActivated(
            agreementId
        );
    }

    function createMilestone(
        uint256 agreementId,
        string calldata description,
        uint256 paymentAmount
    )
        external
        agreementExists(agreementId)
        onlyAgreementParticipant(agreementId)
        returns (uint256 milestoneId)
    {
        require(
            agreements[agreementId].status ==
                AgreementStatus.Active,
            "Agreement is not active"
        );

        require(
            bytes(description).length > 0,
            "Description required"
        );

        require(
            paymentAmount > 0,
            "Payment must be greater than zero"
        );

        require(
            agreements[agreementId].totalPaid +
                paymentAmount <=
                agreements[agreementId].totalCoverage,
            "Milestones exceed coverage"
        );

        milestoneId = nextMilestoneId;

        nextMilestoneId++;

        agreementMilestones[agreementId].push(
            Milestone({
                milestoneId: milestoneId,
                description: description,
                paymentAmount: paymentAmount,
                status: MilestoneStatus.Pending,
                completedAt: 0,
                paidAt: 0
            })
        );

        emit MilestoneCreated(
            agreementId,
            milestoneId,
            description,
            paymentAmount
        );
    }

    function completeMilestone(
        uint256 agreementId,
        uint256 milestoneId
    )
        external
        agreementExists(agreementId)
        onlyAgreementParticipant(agreementId)
    {
        Milestone storage milestone =
            _findMilestone(
                agreementId,
                milestoneId
            );

        require(
            milestone.status ==
                MilestoneStatus.Pending,
            "Milestone is not pending"
        );

        milestone.status =
            MilestoneStatus.Completed;

        milestone.completedAt =
            block.timestamp;

        emit MilestoneCompleted(
            agreementId,
            milestoneId
        );
    }

    function payMilestone(
        uint256 agreementId,
        uint256 milestoneId
    )
        external
        payable
        agreementExists(agreementId)
    {
        TreatmentAgreement storage agreement =
            agreements[agreementId];

        require(
            msg.sender == agreement.insurer,
            "Only insurer can make payment"
        );

        require(
            agreement.status ==
                AgreementStatus.Active,
            "Agreement is not active"
        );

        Milestone storage milestone =
            _findMilestone(
                agreementId,
                milestoneId
            );

        require(
            milestone.status ==
                MilestoneStatus.Completed,
            "Milestone not completed"
        );

        require(
            msg.value == milestone.paymentAmount,
            "Incorrect payment amount"
        );

        require(
            agreement.totalPaid +
                msg.value <=
                agreement.totalCoverage,
            "Coverage exceeded"
        );

        agreement.totalPaid += msg.value;

        milestone.status =
            MilestoneStatus.Paid;

        milestone.paidAt =
            block.timestamp;

        payable(agreement.doctor).transfer(
            msg.value
        );

        emit MilestonePaid(
            agreementId,
            milestoneId,
            msg.value,
            agreement.doctor
        );
    }

    function completeTreatmentAgreement(
        uint256 agreementId
    )
        external
        agreementExists(agreementId)
        onlyAgreementParticipant(agreementId)
    {
        TreatmentAgreement storage agreement =
            agreements[agreementId];

        require(
            agreement.status ==
                AgreementStatus.Active,
            "Agreement is not active"
        );

        require(
            _allMilestonesPaid(agreementId),
            "All milestones must be paid"
        );

        agreement.status =
            AgreementStatus.Completed;

        emit TreatmentAgreementCompleted(
            agreementId
        );
    }

    function cancelTreatmentAgreement(
        uint256 agreementId
    )
        external
        agreementExists(agreementId)
        onlyAgreementParticipant(agreementId)
    {
        require(
            agreements[agreementId].status !=
                AgreementStatus.Completed,
            "Completed agreement cannot be cancelled"
        );

        agreements[agreementId].status =
            AgreementStatus.Cancelled;

        emit TreatmentAgreementCancelled(
            agreementId
        );
    }

    function getTreatmentAgreement(
        uint256 agreementId
    )
        external
        view
        agreementExists(agreementId)
        returns (
            uint256,
            uint256,
            address,
            address,
            address,
            uint256,
            uint256,
            uint256,
            AgreementStatus
        )
    {
        TreatmentAgreement memory agreement =
            agreements[agreementId];

        return (
            agreement.agreementId,
            agreement.patientId,
            agreement.patient,
            agreement.doctor,
            agreement.insurer,
            agreement.totalCoverage,
            agreement.totalPaid,
            agreement.createdAt,
            agreement.status
        );
    }

    function getMilestones(
        uint256 agreementId
    )
        external
        view
        agreementExists(agreementId)
        returns (Milestone[] memory)
    {
        return agreementMilestones[agreementId];
    }

    function getPatientAgreements(
        address patient
    )
        external
        view
        returns (uint256[] memory)
    {
        return patientAgreements[patient];
    }

    function getDoctorAgreements(
        address doctor
    )
        external
        view
        returns (uint256[] memory)
    {
        return doctorAgreements[doctor];
    }

    function _findMilestone(
        uint256 agreementId,
        uint256 milestoneId
    )
        internal
        view
        returns (Milestone storage)
    {
        Milestone[] storage milestones =
            agreementMilestones[agreementId];

        for (uint256 i = 0; i < milestones.length; i++) {
            if (
                milestones[i].milestoneId ==
                milestoneId
            ) {
                return milestones[i];
            }
        }

        revert("Milestone does not exist");
    }

    function _allMilestonesPaid(
        uint256 agreementId
    )
        internal
        view
        returns (bool)
    {
        Milestone[] storage milestones =
            agreementMilestones[agreementId];

        require(
            milestones.length > 0,
            "No milestones exist"
        );

        for (
            uint256 i = 0;
            i < milestones.length;
            i++
        ) {
            if (
                milestones[i].status !=
                MilestoneStatus.Paid
            ) {
                return false;
            }
        }

        return true;
    }

    receive() external payable {}
}
