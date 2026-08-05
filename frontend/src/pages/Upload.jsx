import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/api";
import {
  CloudUploadOutlined,
  InsertDriveFileOutlined,
  CheckCircleOutlined,
  LockOutlined,
  VerifiedUserOutlined,
  RefreshOutlined,
  ArrowForwardOutlined,
} from "@mui/icons-material";

export default function Upload() {
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  // Real-time computed SHA-256 hash preview
  const [clientHash, setClientHash] = useState("");
  const [calculatingHash, setCalculatingHash] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Upload status
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadResult, setUploadResult] = useState(null);

  const fetchRecords = useCallback(async () => {
    try {
      const [recordsRes, patientsRes] = await Promise.all([
        api.get("/records/"),
        api.get("/patients/"),
      ]);
      setRecords(Array.isArray(recordsRes.data) ? recordsRes.data : []);
      setPatients(Array.isArray(patientsRes.data) ? patientsRes.data : []);
    } catch (err) {
      console.error("Fetch Records for Upload Error:", err);
      setError("Failed to load medical records for selection.");
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Compute SHA-256 using Browser WebCrypto API
  const calculateSHA256 = async (file) => {
    if (!file) return;
    setCalculatingHash(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      setClientHash(hashHex);
    } catch (err) {
      console.error("Hash calculation error:", err);
    } finally {
      setCalculatingHash(false);
    }
  };

  const handleFileChange = (file) => {
    if (!file) return;
    setSelectedFile(file);
    setUploadResult(null);
    setError("");
    calculateSHA256(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!selectedRecordId) {
      setError("Please select a target medical record to attach this document to.");
      return;
    }
    if (!selectedFile) {
      setError("Please choose or drop a medical report file.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      // POST /records/upload/{record_id}
      const response = await api.post(`/records/upload/${selectedRecordId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setUploadResult(response.data);
      setSelectedFile(null);
      setClientHash("");
      fetchRecords(); // Refresh list to reflect attached hash
    } catch (err) {
      console.error("Upload Error:", err);
      const detail = err?.response?.data?.detail || err?.response?.data?.message;
      setError(detail || "Failed to upload document to FastAPI server.");
    } finally {
      setUploading(false);
    }
  };

  // Find selected record details
  const selectedRecord = records.find((r) => String(r.id) === String(selectedRecordId));
  const patientMap = patients.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

  return (
    <DashboardLayout>
      <div className="fade-in" style={{ maxWidth: "840px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "28px", textAlign: "center" }}>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: "800",
              color: "#0f172a",
              margin: 0,
              letterSpacing: "-0.5px",
            }}
          >
            Medical Document & Cryptographic Upload Hub
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: "6px 0 0 0" }}>
            Attach lab reports, MRI scans, and clinical PDFs. Hashes are immutably registered on the blockchain.
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              borderRadius: "12px",
              padding: "14px 18px",
              marginBottom: "24px",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Upload Card Container */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
            padding: "36px",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)",
          }}
        >
          <form onSubmit={handleUploadSubmit}>
            {/* Step 1: Select Target Record */}
            <div style={{ marginBottom: "28px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#0f172a",
                  marginBottom: "8px",
                }}
              >
                1. Select Target Medical Record
              </label>
              <select
                value={selectedRecordId}
                onChange={(e) => {
                  setSelectedRecordId(e.target.value);
                  setError("");
                }}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  outline: "none",
                  background: "#f8fafc",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                <option value="">-- Choose Record to Attach Document --</option>
                {records.map((r) => {
                  const pat = patientMap[r.patient_id];
                  return (
                    <option key={r.id} value={r.id}>
                      #REC-{r.id}: {r.diagnosis} (Patient: {pat ? pat.full_name : `DB ID #${r.patient_id}`})
                    </option>
                  );
                })}
              </select>

              {selectedRecord && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px 14px",
                    background: "#f0fdfa",
                    border: "1px solid #ccfbf1",
                    borderRadius: "10px",
                    fontSize: "13px",
                    color: "#0f766e",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>
                    <strong>Selected Diagnosis:</strong> {selectedRecord.diagnosis}
                  </span>
                  <span>
                    <strong>Physician:</strong> Dr. {selectedRecord.doctor_name}
                  </span>
                </div>
              )}
            </div>

            {/* Step 2: Drag & Drop File Zone */}
            <div style={{ marginBottom: "28px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#0f172a",
                  marginBottom: "8px",
                }}
              >
                2. Select or Drag & Drop Document File
              </label>

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                style={{
                  border: dragActive ? "2px dashed #0d9488" : "2px dashed #cbd5e1",
                  background: dragActive ? "rgba(13, 148, 136, 0.05)" : "#f8fafc",
                  borderRadius: "16px",
                  padding: "40px 20px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  position: "relative",
                }}
              >
                <input
                  type="file"
                  id="file-upload-input"
                  onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    cursor: "pointer",
                    width: "100%",
                    height: "100%",
                  }}
                />

                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "#e0f2fe",
                    color: "#0284c7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 14px auto",
                  }}
                >
                  <CloudUploadOutlined style={{ fontSize: "30px" }} />
                </div>

                <p style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                  Drag & drop medical file here, or <span style={{ color: "#0d9488" }}>browse</span>
                </p>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: "6px 0 0 0" }}>
                  Supports PDF, PNG, JPG, DOCX (Max size: 25 MB)
                </p>
              </div>
            </div>

            {/* Selected File & SHA-256 Preview Badge */}
            {selectedFile && (
              <div
                style={{
                  background: "#0f172a",
                  color: "#f8fafc",
                  borderRadius: "14px",
                  padding: "18px 22px",
                  marginBottom: "28px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                  <InsertDriveFileOutlined style={{ fontSize: "28px", color: "#38bdf8" }} />
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: "700",
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {selectedFile.name}
                    </p>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                      {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || "Medical Document"}
                    </span>
                  </div>
                </div>

                {/* Instant Client-Side SHA-256 Hash Preview */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "10px" }}>
                  <span style={{ fontSize: "11px", color: "#0d9488", fontWeight: "700", letterSpacing: "0.5px" }}>
                    PRE-UPLOAD SHA-256 CRYPTOGRAPHIC HASH (WEBCRYPTO)
                  </span>
                  {calculatingHash ? (
                    <p style={{ fontSize: "12px", color: "#94a3b8", margin: "4px 0 0 0" }}>
                      Calculating SHA-256 digest...
                    </p>
                  ) : (
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: "12px",
                        color: "#34d399",
                        wordBreak: "break-all",
                        marginTop: "4px",
                        background: "rgba(0,0,0,0.4)",
                        padding: "6px 10px",
                        borderRadius: "6px",
                      }}
                    >
                      {clientHash}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submit Upload */}
            <button
              type="submit"
              disabled={uploading || !selectedFile || !selectedRecordId}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg, #0d9488 0%, #0284c7 100%)",
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: "700",
                cursor: uploading || !selectedFile || !selectedRecordId ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                opacity: uploading || !selectedFile || !selectedRecordId ? 0.6 : 1,
                boxShadow: "0 4px 14px rgba(13, 148, 136, 0.3)",
              }}
            >
              {uploading ? (
                <span>Uploading & Registering Hash...</span>
              ) : (
                <>
                  Upload & Register Ledger Hash <ArrowForwardOutlined style={{ fontSize: "18px" }} />
                </>
              )}
            </button>
          </form>

          {/* Upload Success Certificate Card */}
          {uploadResult && (
            <div
              style={{
                marginTop: "32px",
                padding: "24px",
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                borderRadius: "16px",
              }}
              className="fade-in"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#059669" }}>
                <CheckCircleOutlined style={{ fontSize: "28px" }} />
                <h3 style={{ fontSize: "16px", fontWeight: "800", margin: 0 }}>
                  File Successfully Uploaded & Immutably Hashed!
                </h3>
              </div>

              <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", color: "#065f46" }}>
                <div>
                  <strong>Server File Name:</strong> {uploadResult.file_name}
                </div>
                <div>
                  <strong>Server File Path:</strong> {uploadResult.file_path}
                </div>
                <div>
                  <strong>SHA-256 Ledger Hash:</strong>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "12px",
                      background: "#ffffff",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #6ee7b7",
                      marginTop: "4px",
                      wordBreak: "break-all",
                      color: "#047857",
                      fontWeight: "700",
                    }}
                  >
                    {uploadResult.file_hash}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}