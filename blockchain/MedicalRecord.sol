// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MedicalRecord {

    struct Record {
        uint256 recordId;
        string fileHash;
        uint256 timestamp;
    }

    mapping(uint256 => Record) public records;

    function storeRecord(
        uint256 _recordId,
        string memory _fileHash
    ) public {

        records[_recordId] = Record(
            _recordId,
            _fileHash,
            block.timestamp
        );
    }

    function getRecord(
        uint256 _recordId
    )
        public
        view
        returns (
            uint256,
            string memory,
            uint256
        )
    {
        Record memory record = records[_recordId];

        return (
            record.recordId,
            record.fileHash,
            record.timestamp
        );
    }
}