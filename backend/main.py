from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.database import Base, engine
from app.models import user, patient, medical_record

from app.routes.auth import router as auth_router
from app.routes.patient import router as patient_router

from app.routes.medical_record import (
    router as medical_record_router,
)

from app.routes.recovery_prediction import (
    router as recovery_prediction_router,
)

from app.routes.zkp import router as zkp_router

from app.routes.blockchain import (
    router as blockchain_router,
)

from app.routes.proof_of_cure import (
    router as proof_of_cure_router,
)


# ---------------------------------------------------------
# Create database tables if they do not already exist
# ---------------------------------------------------------

Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------

app = FastAPI(
    title="Healthcare Blockchain API",
    version="1.0.0",
    description=(
        "Real-time healthcare application API with "
        "PostgreSQL, Hyperledger Fabric, IPFS, "
        "AI recovery prediction, zero-knowledge "
        "proof support, and Ethereum-compatible "
        "smart-contract integration."
    ),
)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Application routes
# ---------------------------------------------------------

app.include_router(auth_router)

app.include_router(patient_router)

app.include_router(medical_record_router)

app.include_router(recovery_prediction_router)

app.include_router(zkp_router)

app.include_router(blockchain_router)

app.include_router(proof_of_cure_router)


# ---------------------------------------------------------
# Root endpoint
# ---------------------------------------------------------

@app.get("/")
def root():
    return {
        "service": "Healthcare Blockchain API",
        "version": "1.0.0",
        "status": "running",
    }
