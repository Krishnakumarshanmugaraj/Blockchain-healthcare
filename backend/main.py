from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.database import Base, engine
from app.models.medical_record import MedicalRecord
from app.models.user import User
from app.models.patient import Patient
from app.routes.medical_record import router as medical_record_router
from app.routes.auth import router as auth_router
from app.routes.patient import router as patient_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Healthcare Blockchain API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(patient_router)
app.include_router(auth_router)
app.include_router(patient_router)
app.include_router(medical_record_router)

@app.get("/")
def root():
    return {
        "message": "Healthcare Blockchain API is running"
    }