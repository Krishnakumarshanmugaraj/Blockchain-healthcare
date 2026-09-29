import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/api";
import {
  VerifiedUserOutlined,
  CloudUploadOutlined,
  CheckCircleOutlined,
  ErrorOutlined,
  LockOutlined,
} from "@mui/icons-material";

export default function Verify() {
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [, setLoading] = useState(true);

  // Verification mode: 'hash' or 'file'
  const [verifyMode, setVerifyMode] = useState("hash");
  const [hashInput, setHashInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [computedFileHash, setComputedFileHash] = useState("");

  // Verification state
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  const fetchLedgerData = useCallback(async () => {
    setLoading(true);
    try {
      const [recordsRes, patientsRes] = await Promise.all([
        api.get("/records/"),
        api.get("/patients/"),
      ]);
      setRecords(Array.isArray(recordsRes.data) ? recordsRes.data : []);
      setPatients(Array.isArray(patientsRes.data) ? patientsRes.data : []);
    } catch (err) {
      console.error("Fetch Ledger Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchLedgerData();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchLedgerData]);

  const patientMap = patients.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

  // Compute file SHA-256 hash
  const processFileVerification = async (file) => {
    if (!file) return;
    setSelectedFile(file);
    setVerifying(true);
    setVerificationResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      setComputedFileHash(hashHex);
      auditHashInLedger(hashHex);
    } catch (err) {
      console.error("File hashing error:", err);
    } finally {
      setVerifying(false);
    }
  };

  const auditHashInLedger = (targetHash) => {
    const cleanHash = targetHash.trim().toLowerCase();
    if (!cleanHash) {
      setVerificationResult(null);
      return;
    }

    const matchedRecord = records.find(
      (r) => r.file_hash && r.file_hash.trim().toLowerCase() === cleanHash
    );

    if (matchedRecord) {
      const patient = patientMap[matchedRecord.patient_id];
      setVerificationResult({
        status: "VERIFIED",
        record: matchedRecord,
        patient: patient,
        hash: matchedRecord.file_hash,
        timestamp: matchedRecord.created_at || new Date().toISOString(),
      });
    } else {
      setVerificationResult({
        status: "UNMATCHED",
        hash: targetHash,
      });
    }
  };

  const handleHashVerifySubmit = (e) => {
    e.preventDefault();
    if (!hashInput.trim()) return;
    setVerifying(true);
    setTimeout(() => {
      auditHashInLedger(hashInput.trim());
      setVerifying(false);
    }, 300);
  };

  return (
    <DashboardLayout>
      <div className="fade-in" style={{ maxWidth: "880px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px auto",
              boxShadow: "0 0 20px rgba(5, 150, 105, 0.4)",
            }}
          >
            <VerifiedUserOutlined style={{ fontSize: "32px" }} />
          </div>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: "800",
              color: "#0f172a",
              margin: 0,
              letterSpacing: "-0.5px",
            }}
          >
            Blockchain Integrity & Cryptographic Auditor
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: "6px 0 0 0" }}>
            Verify medical report authenticity against SHA-256 hashes registered on the HealthChain ledger.
          </p>
        </div>

        {/* Verification Mode Selector */}
        <div
          style={{
            display: "flex",
            background: "#ffffff",
            padding: "6px",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            marginBottom: "28px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
          }}
        >
          <button
            onClick={() => {
              setVerifyMode("hash");
              setVerificationResult(null);
            }}
            style={{
              flex: 1,
              padding: "12px 0",
              borderRadius: "10px",
              border: "none",
              background: verifyMode === "hash" ? "#0f172a" : "transparent",
              color: verifyMode === "hash" ? "#ffffff" : "#64748b",
              fontSize: "14px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            🔍 Verify by Hash String
          </button>
          <button
            onClick={() => {
              setVerifyMode("file");
              setVerificationResult(null);
            }}
            style={{
              flex: 1,
              padding: "12px 0",
              borderRadius: "10px",
              border: "none",
              background: verifyMode === "file" ? "#0f172a" : "transparent",
              color: verifyMode === "file" ? "#ffffff" : "#64748b",
              fontSize: "14px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            📄 Verify by Document File
          </button>
        </div>

        {/* Mode 1: Hash String Audit Input */}
        {verifyMode === "hash" && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              border: "1px solid #e2e8f0",
              padding: "32px",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)",
              marginBottom: "32px",
            }}
          >
            <form onSubmit={handleHashVerifySubmit}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#0f172a",
                  marginBottom: "8px",
                }}
              >
                Paste 64-Character SHA-256 Hash Digest
              </label>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <LockOutlined
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "12px",
                      color: "#94a3b8",
                      fontSize: "20px",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="e.g. e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                    value={hashInput}
                    onChange={(e) => setHashInput(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px 12px 42px",
                      borderRadius: "12px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      fontFamily: "monospace",
                      outline: "none",
                      background: "#f8fafc",
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifying || !hashInput.trim()}
                  style={{
                    padding: "0 28px",
                    borderRadius: "12px",
                    border: "none",
                    background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: "700",
                    cursor: verifying || !hashInput.trim() ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
                  }}
                >
                  {verifying ? "Auditing..." : "Audit Hash"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Mode 2: File Audit Upload */}
        {verifyMode === "file" && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              border: "1px solid #e2e8f0",
              padding: "32px",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)",
              marginBottom: "32px",
            }}
          >
            <div style={{ position: "relative" }}>
              <input
                type="file"
                onChange={(e) => e.target.files && processFileVerification(e.target.files[0])}
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
                  border: "2px dashed #cbd5e1",
                  background: "#f8fafc",
                  borderRadius: "16px",
                  padding: "36px 20px",
                  textAlign: "center",
                }}
              >
                <CloudUploadOutlined style={{ fontSize: "36px", color: "#0d9488", marginBottom: "8px" }} />
                <p style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                  Select or drop medical report document to audit
                </p>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: "4px 0 0 0" }}>
                  Instant WebCrypto digest computation against HealthChain ledger
                </p>
              </div>
            </div>

            {selectedFile && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 16px",
                  background: "#f1f5f9",
                  borderRadius: "10px",
                  fontSize: "13px",
                  color: "#334155",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  <strong>Selected File:</strong> {selectedFile.name}
                </span>
                <span style={{ fontFamily: "monospace", color: "#059669" }}>
                  Hash: {computedFileHash.substring(0, 16)}...
                </span>
              </div>
            )}
          </div>
        )}

        {/* Verification Certificate Results */}
        {verificationResult && verificationResult.status === "VERIFIED" && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              border: "2px solid #10b981",
              padding: "32px",
              boxShadow: "0 20px 25px -5px rgba(16, 185, 129, 0.15)",
            }}
            className="scale-in"
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                paddingBottom: "20px",
                borderBottom: "1px solid #e2e8f0",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "#ecfdf5",
                  color: "#059669",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircleOutlined style={{ fontSize: "28px" }} />
              </div>
              <div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "800",
                    letterSpacing: "1px",
                    color: "#059669",
                    background: "#ecfdf5",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    textTransform: "uppercase",
                  }}
                >
                  ● IMMUTABLE & VERIFIED ON BLOCKCHAIN
                </span>
                <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: "4px 0 0 0" }}>
                  Cryptographic Integrity Certificate
                </h2>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px" }}>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>
                  Medical Entry ID
                </span>
                <p style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", margin: "2px 0 0 0" }}>
                  #REC-{verificationResult.record.id}
                </p>
              </div>

              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px" }}>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>
                  Patient File
                </span>
                <p style={{ fontSize: "16px", fontWeight: "800", color: "#0d9488", margin: "2px 0 0 0" }}>
                  {verificationResult.patient ? verificationResult.patient.full_name : `DB ID #${verificationResult.record.patient_id}`}
                </p>
              </div>

              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px" }}>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>
                  Diagnosis
                </span>
                <p style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", margin: "2px 0 0 0" }}>
                  {verificationResult.record.diagnosis}
                </p>
              </div>

              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px" }}>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>
                  Attending Doctor
                </span>
                <p style={{ fontSize: "14px", fontWeight: "700", color: "#0284c7", margin: "2px 0 0 0" }}>
                  Dr. {verificationResult.record.doctor_name}
                </p>
              </div>
            </div>

            {/* Cryptographic Hash Box */}
            <div
              style={{
                background: "#0f172a",
                color: "#f8fafc",
                padding: "18px",
                borderRadius: "14px",
              }}
            >
              <span style={{ fontSize: "11px", color: "#34d399", fontWeight: "800", letterSpacing: "0.5px" }}>
                AUDITED SHA-256 LEDGER FINGERPRINT
              </span>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "13px",
                  color: "#34d399",
                  wordBreak: "break-all",
                  marginTop: "6px",
                  background: "rgba(0,0,0,0.3)",
                  padding: "10px 12px",
                  borderRadius: "8px",
                }}
              >
                {verificationResult.hash}
              </div>
            </div>
          </div>
        )}

        {verificationResult && verificationResult.status === "UNMATCHED" && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              border: "2px solid #f43f5e",
              padding: "32px",
              boxShadow: "0 20px 25px -5px rgba(244, 63, 94, 0.15)",
            }}
            className="scale-in"
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px", color: "#f43f5e" }}>
              <ErrorOutlined style={{ fontSize: "36px" }} />
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: "800", margin: 0 }}>
                  Hash Not Found in Ledger / Document Tampered
                </h2>
                <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
                  The provided SHA-256 fingerprint does not match any registered medical record on HealthChain.
                </p>
              </div>
            </div>

            <div
              style={{
                fontFamily: "monospace",
                fontSize: "12px",
                color: "#991b1b",
                background: "#fef2f2",
                padding: "10px 14px",
                borderRadius: "8px",
                marginTop: "16px",
                wordBreak: "break-all",
                border: "1px solid #fecaca",
              }}
            >
              Audited Input: {verificationResult.hash}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}