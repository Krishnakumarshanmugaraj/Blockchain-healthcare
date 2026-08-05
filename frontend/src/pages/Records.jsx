import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/api";
import {
  SearchOutlined,
  AddOutlined,
  EditOutlined,
  DeleteOutlined,
  VisibilityOutlined,
  CloudUploadOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  DescriptionOutlined,
  ContentCopyOutlined,
  MedicalServicesOutlined,
  LocalPharmacyOutlined,
} from "@mui/icons-material";

export default function Records() {
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Pagination
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    patient_id: "",
    doctor_name: "",
    diagnosis: "",
    prescription: "",
    notes: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Copy hash notification
  const [copiedHash, setCopiedHash] = useState(false);

  const fetchRecordsAndPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [recordsRes, patientsRes] = await Promise.all([
        api.get("/records/"),
        api.get("/patients/"),
      ]);

      setRecords(Array.isArray(recordsRes.data) ? recordsRes.data : []);
      setPatients(Array.isArray(patientsRes.data) ? patientsRes.data : []);
    } catch (err) {
      console.error("Fetch Records Error:", err);
      setError("Failed to fetch medical records from backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecordsAndPatients();
  }, [fetchRecordsAndPatients]);

  // Patient mapping dictionary: patient.id -> Patient object
  const patientMap = useMemo(() => {
    const map = {};
    patients.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [patients]);

  const handleOpenAddModal = () => {
    setEditingRecord(null);
    setFormData({
      patient_id: patients.length > 0 ? String(patients[0].id) : "",
      doctor_name: "",
      diagnosis: "",
      prescription: "",
      notes: "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record) => {
    setEditingRecord(record);
    setFormData({
      patient_id: String(record.patient_id),
      doctor_name: record.doctor_name || "",
      diagnosis: record.diagnosis || "",
      prescription: record.prescription || "",
      notes: record.notes || "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.patient_id) {
      setFormError("Please select a patient.");
      return;
    }
    if (!formData.doctor_name.trim()) {
      setFormError("Attending doctor name is required.");
      return;
    }
    if (!formData.diagnosis.trim()) {
      setFormError("Medical diagnosis description is required.");
      return;
    }
    if (!formData.prescription.trim()) {
      setFormError("Prescription instructions are required.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingRecord) {
        // PUT /records/{record_id}
        const response = await api.put(`/records/${editingRecord.id}`, {
          doctor_name: formData.doctor_name.trim(),
          diagnosis: formData.diagnosis.trim(),
          prescription: formData.prescription.trim(),
          notes: formData.notes.trim() || null,
        });

        setRecords((prev) =>
          prev.map((r) => (r.id === editingRecord.id ? response.data : r))
        );
      } else {
        // POST /records/
        const response = await api.post("/records/", {
          patient_id: parseInt(formData.patient_id, 10),
          doctor_name: formData.doctor_name.trim(),
          diagnosis: formData.diagnosis.trim(),
          prescription: formData.prescription.trim(),
          notes: formData.notes.trim() || null,
        });

        setRecords((prev) => [response.data, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Save Record Error:", err);
      const detail = err?.response?.data?.detail || err?.response?.data?.message;
      setFormError(detail || "Failed to save medical record.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;
    try {
      await api.delete(`/records/${deletingRecord.id}`);
      setRecords((prev) => prev.filter((r) => r.id !== deletingRecord.id));
      setDeletingRecord(null);
    } catch (err) {
      console.error("Delete Record Error:", err);
      alert("Failed to delete medical record.");
    }
  };

  const copyHashToClipboard = (hash) => {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const patient = patientMap[r.patient_id];
      const patientName = patient?.full_name?.toLowerCase() || "";
      const patCode = patient?.patient_id?.toLowerCase() || "";

      return (
        !q ||
        r.diagnosis?.toLowerCase().includes(q) ||
        r.doctor_name?.toLowerCase().includes(q) ||
        r.prescription?.toLowerCase().includes(q) ||
        r.file_hash?.toLowerCase().includes(q) ||
        patientName.includes(q) ||
        patCode.includes(q)
      );
    });
  }, [records, patientMap, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const currentRecords = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, page]);

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
              Medical Records Registry
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b", margin: "4px 0 0 0" }}>
              {filteredRecords.length} clinical record{filteredRecords.length !== 1 && "s"} indexed
            </p>
          </div>

          <button
            onClick={handleOpenAddModal}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "11px 22px",
              background: "linear-gradient(135deg, #0d9488 0%, #0284c7 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(13, 148, 136, 0.3)",
              transition: "all 0.15s ease",
            }}
          >
            <AddOutlined style={{ fontSize: "20px" }} /> Create Medical Record
          </button>
        </div>

        {/* Search Toolbar */}
        <div
          style={{
            background: "#ffffff",
            padding: "16px 20px",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            marginBottom: "24px",
            boxShadow: "0 2px 4px 0 rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ position: "relative" }}>
            <SearchOutlined
              style={{
                position: "absolute",
                left: "14px",
                top: "11px",
                color: "#94a3b8",
                fontSize: "20px",
              }}
            />
            <input
              type="text"
              placeholder="Search by diagnosis, doctor, patient name, or SHA-256 hash..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "10px 14px 10px 42px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                outline: "none",
                background: "#f8fafc",
              }}
            />
          </div>
        </div>

        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              borderRadius: "12px",
              padding: "14px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {/* Records Table */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)",
          }}
        >
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
              Loading medical records...
            </div>
          ) : currentRecords.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <p style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                No medical records found
              </p>
              <p style={{ color: "#64748b", fontSize: "14px", margin: "6px 0 16px 0" }}>
                Create a medical record entry for a patient to get started.
              </p>
              <button
                onClick={handleOpenAddModal}
                style={{
                  padding: "9px 18px",
                  background: "#0d9488",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                + Add Record Entry
              </button>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr
                    style={{
                      background: "#f8fafc",
                      borderBottom: "1px solid #e2e8f0",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "#64748b",
                    }}
                  >
                    <th style={{ padding: "16px 20px" }}>Record ID</th>
                    <th style={{ padding: "16px 20px" }}>Patient Details</th>
                    <th style={{ padding: "16px 20px" }}>Attending Doctor</th>
                    <th style={{ padding: "16px 20px" }}>Diagnosis</th>
                    <th style={{ padding: "16px 20px" }}>Attached Report & Hash</th>
                    <th style={{ padding: "16px 20px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.map((record) => {
                    const patient = patientMap[record.patient_id];

                    return (
                      <tr
                        key={record.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          transition: "background 0.15s",
                        }}
                      >
                        <td style={{ padding: "16px 20px" }}>
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: "700",
                              color: "#0f172a",
                            }}
                          >
                            #REC-{record.id}
                          </span>
                        </td>

                        <td style={{ padding: "16px 20px" }}>
                          {patient ? (
                            <div>
                              <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>
                                {patient.full_name}
                              </div>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  color: "#0d9488",
                                  background: "#f0fdfa",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                }}
                              >
                                {patient.patient_id}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: "13px", color: "#64748b" }}>
                              Patient DB ID #{record.patient_id}
                            </span>
                          )}
                        </td>

                        <td style={{ padding: "16px 20px", fontSize: "14px", fontWeight: "600", color: "#334155" }}>
                          Dr. {record.doctor_name}
                        </td>

                        <td style={{ padding: "16px 20px" }}>
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: "700",
                              color: "#0f172a",
                            }}
                          >
                            {record.diagnosis}
                          </div>
                        </td>

                        <td style={{ padding: "16px 20px" }}>
                          {record.file_hash ? (
                            <div>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  color: "#059669",
                                  background: "#ecfdf5",
                                  padding: "4px 10px",
                                  borderRadius: "20px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                <CheckCircleOutlined style={{ fontSize: "14px" }} /> Hash Verified
                              </span>
                              <div
                                style={{
                                  fontSize: "11px",
                                  fontFamily: "monospace",
                                  color: "#64748b",
                                  marginTop: "4px",
                                }}
                              >
                                {record.file_hash.substring(0, 16)}...
                              </div>
                            </div>
                          ) : (
                            <Link
                              to="/upload"
                              style={{
                                fontSize: "12px",
                                fontWeight: "700",
                                color: "#0284c7",
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <CloudUploadOutlined style={{ fontSize: "16px" }} /> Attach Report
                            </Link>
                          )}
                        </td>

                        <td style={{ padding: "16px 20px", textAlign: "right" }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              gap: "8px",
                            }}
                          >
                            <button
                              onClick={() => setViewingRecord(record)}
                              style={{
                                background: "#f1f5f9",
                                border: "none",
                                color: "#475569",
                                width: "34px",
                                height: "34px",
                                borderRadius: "8px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              title="View Prescription & Details"
                            >
                              <VisibilityOutlined style={{ fontSize: "18px" }} />
                            </button>

                            <button
                              onClick={() => handleOpenEditModal(record)}
                              style={{
                                background: "#f0f9ff",
                                border: "none",
                                color: "#0284c7",
                                width: "34px",
                                height: "34px",
                                borderRadius: "8px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              title="Edit Medical Entry"
                            >
                              <EditOutlined style={{ fontSize: "18px" }} />
                            </button>

                            <button
                              onClick={() => setDeletingRecord(record)}
                              style={{
                                background: "#fef2f2",
                                border: "none",
                                color: "#f43f5e",
                                width: "34px",
                                height: "34px",
                                borderRadius: "8px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              title="Delete Record"
                            >
                              <DeleteOutlined style={{ fontSize: "18px" }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                padding: "16px 20px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
              }}
            >
              <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>
                Page {page} of {totalPages}
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    fontSize: "13px",
                    fontWeight: "600",
                    opacity: page === 1 ? 0.5 : 1,
                  }}
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    cursor: page === totalPages ? "not-allowed" : "pointer",
                    fontSize: "13px",
                    fontWeight: "600",
                    opacity: page === totalPages ? 0.5 : 1,
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add / Edit Record Modal */}
        {isModalOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.6)",
              backdropFilter: "blur(4px)",
              zIndex: 1100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            <div
              style={{
                width: "560px",
                maxWidth: "100%",
                background: "#ffffff",
                borderRadius: "20px",
                padding: "32px",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                maxHeight: "90vh",
                overflowY: "auto",
              }}
              className="scale-in"
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "24px",
                }}
              >
                <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                  {editingRecord ? "Edit Medical Entry" : "New Medical Entry"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                >
                  <CloseOutlined style={{ fontSize: "24px" }} />
                </button>
              </div>

              {formError && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#991b1b",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    marginBottom: "20px",
                  }}
                >
                  ⚠️ {formError}
                </div>
              )}

              <form onSubmit={handleFormSubmit}>
                {/* Select Patient */}
                {!editingRecord && (
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>
                      Select Patient
                    </label>
                    <select
                      value={formData.patient_id}
                      onChange={(e) => setFormData((prev) => ({ ...prev, patient_id: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        borderRadius: "10px",
                        border: "1px solid #cbd5e1",
                        fontSize: "14px",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      <option value="">-- Choose Registered Patient --</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name} ({p.patient_id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Attending Doctor */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>
                    Attending Physician / Doctor Name
                  </label>
                  <input
                    type="text"
                    value={formData.doctor_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, doctor_name: e.target.value }))}
                    placeholder="e.g. Dr. Sarah Jenkins"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Diagnosis */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>
                    Diagnosis Summary
                  </label>
                  <input
                    type="text"
                    value={formData.diagnosis}
                    onChange={(e) => setFormData((prev) => ({ ...prev, diagnosis: e.target.value }))}
                    placeholder="e.g. Acute Bronchitis / Stage II Hypertension"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Prescription */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>
                    Rx Prescription & Dosage
                  </label>
                  <textarea
                    rows={3}
                    value={formData.prescription}
                    onChange={(e) => setFormData((prev) => ({ ...prev, prescription: e.target.value }))}
                    placeholder="Amoxicillin 500mg - 1 tab thrice daily for 7 days"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                </div>

                {/* Additional Clinical Notes */}
                <div style={{ marginBottom: "24px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>
                    Additional Clinical Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Patient advised rest and follow up in 2 weeks..."
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "#475569",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: "10px 24px",
                      borderRadius: "10px",
                      border: "none",
                      background: "linear-gradient(135deg, #0d9488 0%, #0284c7 100%)",
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "#ffffff",
                      cursor: submitting ? "wait" : "pointer",
                    }}
                  >
                    {submitting ? "Saving..." : editingRecord ? "Save Record" : "Create Medical Entry"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Prescription & Record Details Modal */}
        {viewingRecord && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.6)",
              backdropFilter: "blur(4px)",
              zIndex: 1100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            <div
              style={{
                width: "560px",
                maxWidth: "100%",
                background: "#ffffff",
                borderRadius: "20px",
                padding: "32px",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                maxHeight: "90vh",
                overflowY: "auto",
              }}
              className="scale-in"
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <MedicalServicesOutlined style={{ fontSize: "28px", color: "#0d9488" }} />
                  <div>
                    <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                      Medical Record Entry #REC-{viewingRecord.id}
                    </h2>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      Created {new Date(viewingRecord.created_at || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setViewingRecord(null)}
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                >
                  <CloseOutlined style={{ fontSize: "24px" }} />
                </button>
              </div>

              {/* Prescription Card */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div
                  style={{
                    padding: "16px",
                    background: "#f0fdfa",
                    border: "1px solid #ccfbf1",
                    borderRadius: "12px",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "#0f766e", fontWeight: "700" }}>
                    Patient Info
                  </span>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>
                    {patientMap[viewingRecord.patient_id]?.full_name || `Patient ID #${viewingRecord.patient_id}`}
                  </div>
                  <span style={{ fontSize: "13px", color: "#0d9488", fontWeight: "600" }}>
                    Attending Physician: Dr. {viewingRecord.doctor_name}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>
                    Diagnosis
                  </span>
                  <p style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: "4px 0 0 0" }}>
                    {viewingRecord.diagnosis}
                  </p>
                </div>

                <div
                  style={{
                    padding: "16px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#0284c7" }}>
                    <LocalPharmacyOutlined style={{ fontSize: "20px" }} />
                    <span style={{ fontSize: "13px", fontWeight: "700" }}>Rx Prescription</span>
                  </div>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#334155",
                      margin: "8px 0 0 0",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.6,
                    }}
                  >
                    {viewingRecord.prescription}
                  </p>
                </div>

                {viewingRecord.notes && (
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>
                      Clinical Notes
                    </span>
                    <p style={{ fontSize: "14px", color: "#475569", margin: "4px 0 0 0" }}>
                      {viewingRecord.notes}
                    </p>
                  </div>
                )}

                {/* Cryptographic SHA-256 Ledger Section */}
                <div
                  style={{
                    padding: "16px",
                    background: "#0f172a",
                    color: "#f8fafc",
                    borderRadius: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#0d9488", fontWeight: "700" }}>
                      SHA-256 Blockchain Ledger Proof
                    </span>
                    {viewingRecord.file_hash && (
                      <button
                        onClick={() => copyHashToClipboard(viewingRecord.file_hash)}
                        style={{
                          background: "rgba(255, 255, 255, 0.1)",
                          border: "none",
                          color: "#38bdf8",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "700",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <ContentCopyOutlined style={{ fontSize: "14px" }} />
                        {copiedHash ? "Copied!" : "Copy Hash"}
                      </button>
                    )}
                  </div>

                  {viewingRecord.file_hash ? (
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: "12px",
                        wordBreak: "break-all",
                        background: "rgba(0,0,0,0.3)",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        marginTop: "8px",
                        color: "#34d399",
                      }}
                    >
                      {viewingRecord.file_hash}
                    </div>
                  ) : (
                    <p style={{ fontSize: "13px", color: "#94a3b8", margin: "8px 0 0 0" }}>
                      No file uploaded yet. Attach lab report PDF to generate SHA-256 hash.
                    </p>
                  )}
                </div>
              </div>

              <div style={{ marginTop: "24px", textAlign: "right" }}>
                <button
                  onClick={() => setViewingRecord(null)}
                  style={{
                    padding: "9px 20px",
                    borderRadius: "8px",
                    background: "#f1f5f9",
                    border: "none",
                    color: "#475569",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingRecord && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.6)",
              backdropFilter: "blur(4px)",
              zIndex: 1100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            <div
              style={{
                width: "420px",
                maxWidth: "100%",
                background: "#ffffff",
                borderRadius: "20px",
                padding: "28px",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              }}
              className="scale-in"
            >
              <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: "0 0 10px 0" }}>
                Delete Medical Record?
              </h3>
              <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 20px 0" }}>
                Are you sure you want to delete medical entry <strong>#REC-{deletingRecord.id}</strong> (Diagnosis: {deletingRecord.diagnosis})?
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  onClick={() => setDeletingRecord(null)}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "8px",
                    background: "#f1f5f9",
                    border: "none",
                    color: "#475569",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "8px",
                    background: "#f43f5e",
                    border: "none",
                    color: "#ffffff",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Delete Record
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}