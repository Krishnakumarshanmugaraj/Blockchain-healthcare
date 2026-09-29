import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/api";
import {
  PeopleAltOutlined,
  DescriptionOutlined,
  CloudUploadOutlined,
  VerifiedUserOutlined,
  RefreshOutlined,
  AddCircleOutlined,
  ArrowForwardOutlined,
  CheckCircleOutlined,
  ScheduleOutlined,
  LocalHospitalOutlined,
} from "@mui/icons-material";

export default function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setError(null);
    try {
      const [patientsRes, recordsRes] = await Promise.all([
        api.get("/patients/"),
        api.get("/records/"),
      ]);

      setPatients(Array.isArray(patientsRes.data) ? patientsRes.data : []);
      setRecords(Array.isArray(recordsRes.data) ? recordsRes.data : []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
      setError("Failed to fetch current network statistics from backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchDashboardData();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchDashboardData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  // Calculated metrics
  const totalPatients = patients.length;
  const totalRecords = records.length;
  const uploadedFiles = useMemo(
    () => records.filter((r) => r.file_name || r.file_path).length,
    [records]
  );
  const verifiedHashes = useMemo(
    () => records.filter((r) => r.file_hash && r.file_hash.trim().length > 0).length,
    [records]
  );

  // Blood group breakdown calculation
  const bloodGroupCounts = useMemo(() => {
    const counts = {};
    patients.forEach((p) => {
      if (p.blood_group) {
        counts[p.blood_group] = (counts[p.blood_group] || 0) + 1;
      }
    });
    return counts;
  }, [patients]);

  const recentRecords = useMemo(() => {
    return [...records]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 5);
  }, [records]);

  return (
    <DashboardLayout>
      <div className="fade-in">
        {/* Page Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: "800",
                color: "#0f172a",
                margin: 0,
                letterSpacing: "-0.5px",
              }}
            >
              Executive EHR Dashboard
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b", margin: "4px 0 0 0" }}>
              Real-time Blockchain Node Statistics & Patient Health Records
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {lastUpdated && (
              <span
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <ScheduleOutlined style={{ fontSize: "16px" }} />
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 18px",
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                color: "#0f172a",
                fontSize: "13px",
                fontWeight: "700",
                cursor: refreshing ? "wait" : "pointer",
                boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
                transition: "all 0.15s ease",
              }}
            >
              <RefreshOutlined
                style={{
                  fontSize: "18px",
                  animation: refreshing ? "spin 1s linear infinite" : "none",
                }}
              />
              {refreshing ? "Refreshing..." : "Refresh Stats"}
            </button>
          </div>
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

        {/* Top 4 Metrics Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          {/* Card 1: Patients */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.04)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#64748b" }}>
                  Registered Patients
                </span>
                <h2
                  style={{
                    fontSize: "32px",
                    fontWeight: "800",
                    color: "#0f172a",
                    margin: "8px 0 0 0",
                    lineHeight: 1,
                  }}
                >
                  {loading ? "..." : totalPatients}
                </h2>
              </div>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "#f0fdfa",
                  color: "#0d9488",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <PeopleAltOutlined style={{ fontSize: "24px" }} />
              </div>
            </div>
            <div style={{ marginTop: "16px", fontSize: "12px", color: "#0d9488", fontWeight: "700" }}>
              ● Synchronized with DB
            </div>
          </div>

          {/* Card 2: Medical Records */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#64748b" }}>
                  Medical Records
                </span>
                <h2
                  style={{
                    fontSize: "32px",
                    fontWeight: "800",
                    color: "#0f172a",
                    margin: "8px 0 0 0",
                    lineHeight: 1,
                  }}
                >
                  {loading ? "..." : totalRecords}
                </h2>
              </div>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "#f0f9ff",
                  color: "#0284c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <DescriptionOutlined style={{ fontSize: "24px" }} />
              </div>
            </div>
            <div style={{ marginTop: "16px", fontSize: "12px", color: "#0284c7", fontWeight: "700" }}>
              ● Encrypted Health Data
            </div>
          </div>

          {/* Card 3: Lab Reports */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#64748b" }}>
                  Uploaded Lab Files
                </span>
                <h2
                  style={{
                    fontSize: "32px",
                    fontWeight: "800",
                    color: "#0f172a",
                    margin: "8px 0 0 0",
                    lineHeight: 1,
                  }}
                >
                  {loading ? "..." : uploadedFiles}
                </h2>
              </div>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "#e0e7ff",
                  color: "#4f46e5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CloudUploadOutlined style={{ fontSize: "24px" }} />
              </div>
            </div>
            <div style={{ marginTop: "16px", fontSize: "12px", color: "#4f46e5", fontWeight: "700" }}>
              ● Attachment Storage Active
            </div>
          </div>

          {/* Card 4: Verified Hashes */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#64748b" }}>
                  Verified Ledger Hashes
                </span>
                <h2
                  style={{
                    fontSize: "32px",
                    fontWeight: "800",
                    color: "#0f172a",
                    margin: "8px 0 0 0",
                    lineHeight: 1,
                  }}
                >
                  {loading ? "..." : verifiedHashes}
                </h2>
              </div>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "#ecfdf5",
                  color: "#059669",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <VerifiedUserOutlined style={{ fontSize: "24px" }} />
              </div>
            </div>
            <div style={{ marginTop: "16px", fontSize: "12px", color: "#059669", fontWeight: "700" }}>
              ● Immutability Guaranteed
            </div>
          </div>
        </div>

        {/* Quick Action Hub */}
        <div style={{ marginBottom: "32px" }}>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "800",
              color: "#0f172a",
              marginBottom: "16px",
            }}
          >
            Quick Management Shortcuts
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            <Link
              to="/patients"
              style={{
                background: "#ffffff",
                borderRadius: "14px",
                padding: "18px",
                border: "1px solid #e2e8f0",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 4px 0 rgba(0,0,0,0.02)",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "#f0fdfa",
                  color: "#0d9488",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AddCircleOutlined style={{ fontSize: "22px" }} />
              </div>
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                  Add New Patient
                </h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Register EHR record</span>
              </div>
            </Link>

            <Link
              to="/records"
              style={{
                background: "#ffffff",
                borderRadius: "14px",
                padding: "18px",
                border: "1px solid #e2e8f0",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "#f0f9ff",
                  color: "#0284c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LocalHospitalOutlined style={{ fontSize: "22px" }} />
              </div>
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                  New Medical Entry
                </h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Diagnosis & prescriptions</span>
              </div>
            </Link>

            <Link
              to="/upload"
              style={{
                background: "#ffffff",
                borderRadius: "14px",
                padding: "18px",
                border: "1px solid #e2e8f0",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "#e0e7ff",
                  color: "#4f46e5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CloudUploadOutlined style={{ fontSize: "22px" }} />
              </div>
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                  Upload Report
                </h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Lab results & SHA-256</span>
              </div>
            </Link>

            <Link
              to="/verify"
              style={{
                background: "#ffffff",
                borderRadius: "14px",
                padding: "18px",
                border: "1px solid #e2e8f0",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "#ecfdf5",
                  color: "#059669",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <VerifiedUserOutlined style={{ fontSize: "22px" }} />
              </div>
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                  Verify Hash
                </h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Audit cryptographic proof</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Lower Grid: Recent Records Feed & Blood Group Demographics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
          }}
        >
          {/* Recent Records Feed */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                Recent Medical Entries
              </h2>
              <Link
                to="/records"
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#0d9488",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                View all <ArrowForwardOutlined style={{ fontSize: "16px" }} />
              </Link>
            </div>

            {loading ? (
              <p style={{ color: "#64748b", fontSize: "14px" }}>Loading records feed...</p>
            ) : recentRecords.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "36px 12px",
                  background: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px dashed #cbd5e1",
                }}
              >
                <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
                  No medical records added yet.
                </p>
                <Link
                  to="/records"
                  style={{
                    display: "inline-block",
                    marginTop: "10px",
                    color: "#0d9488",
                    fontWeight: "700",
                    fontSize: "13px",
                    textDecoration: "none",
                  }}
                >
                  + Create first medical entry
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {recentRecords.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: "14px",
                      borderRadius: "12px",
                      background: "#f8fafc",
                      border: "1px solid #f1f5f9",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                        {r.diagnosis}
                      </h3>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>
                        Dr. {r.doctor_name} • Patient DB ID #{r.patient_id}
                      </span>
                    </div>
                    {r.file_hash ? (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#059669",
                          background: "#ecfdf5",
                          padding: "4px 10px",
                          borderRadius: "20px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <CheckCircleOutlined style={{ fontSize: "14px" }} /> Verified Hash
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "600",
                          color: "#d97706",
                          background: "#fffbeb",
                          padding: "4px 10px",
                          borderRadius: "20px",
                        }}
                      >
                        Pending Report
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Blood Group Patient Distribution */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.04)",
            }}
          >
            <h2
              style={{
                fontSize: "16px",
                fontWeight: "800",
                color: "#0f172a",
                marginBottom: "20px",
              }}
            >
              Patient Blood Group Demographics
            </h2>

            {Object.keys(bloodGroupCounts).length === 0 ? (
              <p style={{ color: "#64748b", fontSize: "14px" }}>No blood group data available.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {Object.entries(bloodGroupCounts).map(([bg, count]) => (
                  <div
                    key={bg}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "12px",
                      background: "#f0fdfa",
                      border: "1px solid #ccfbf1",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: "15px", fontWeight: "800", color: "#0f766e" }}>
                      🩸 {bg}
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "#0d9488",
                        background: "#ffffff",
                        padding: "2px 10px",
                        borderRadius: "12px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                      }}
                    >
                      {count} patient{count !== 1 && "s"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}