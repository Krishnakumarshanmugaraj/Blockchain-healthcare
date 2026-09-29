from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from app.config.database import Base


class MedicalRecord(Base):
    __tablename__ = "medical_records"

    # Primary database ID
    id = Column(Integer, primary_key=True, index=True)

    # Patient information
    patient_id = Column(
        Integer,
        ForeignKey("patients.id"),
        nullable=False,
    )

    # Medical information
    doctor_name = Column(String, nullable=False)
    diagnosis = Column(String, nullable=False)
    prescription = Column(String, nullable=False)
    notes = Column(String, nullable=True)

    # Original uploaded file information
    file_name = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    file_hash = Column(String, nullable=True)

    # Hyperledger Fabric / blockchain metadata
    blockchain_record_id = Column(
        String,
        nullable=True,
        unique=True,
    )
    ipfs_cid = Column(String, nullable=True)
    encryption_algorithm = Column(String, nullable=True)
    storage_type = Column(String, nullable=True)
    fabric_tx_id = Column(String, nullable=True)

    # Lighthouse / Filecoin metadata
    lighthouse_cid = Column(String, nullable=True)
    filecoin_deal_id = Column(String, nullable=True)
    filecoin_deal_status = Column(String, nullable=True)
    filecoin_provider = Column(String, nullable=True)

    # Record creation timestamp
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )
