import { useState, useEffect, useCallback, useMemo } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/api";
import {
  SearchOutlined,
  AddOutlined,
  EditOutlined,
  DeleteOutlined,
  VisibilityOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  ContentCopyOutlined,
  HistoryOutlined,
  LockOutlined,
  CloudOutlined,
  StorageOutlined,
  VerifiedOutlined,
  RefreshOutlined,
} from "@mui/icons-material";

export default function Records() {
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);

  const [auditRecord, setAuditRecord] = useState(null);
  const [auditHistory, setAuditHistory] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");

  const [formData, setFormData] = useState({
    patient_id: "",
    doctor_name: "",
    diagnosis: "",
    prescription: "",
    notes: "",
  });

  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  // ---------------------------------------------------------
  // FETCH RECORDS AND PATIENTS
  // ---------------------------------------------------------

  const fetchRecordsAndPatients = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [recordsResponse, patientsResponse] = await Promise.all([
        api.get("/records/"),
        api.get("/patients/"),
      ]);

      setRecords(
        Array.isArray(recordsResponse.data)
          ? recordsResponse.data
          : []
      );

      setPatients(
        Array.isArray(patientsResponse.data)
          ? patientsResponse.data
          : []
      );
    } catch (err) {
      console.error("Fetch records error:", err);

      if (err?.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
      } else if (err?.response?.status === 403) {
        setError(
          "You are not authorized to view these medical records."
        );
      } else {
        setError("Failed to fetch medical records.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchRecordsAndPatients();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchRecordsAndPatients]);

  // ---------------------------------------------------------
  // PATIENT MAP
  // ---------------------------------------------------------

  const patientMap = useMemo(() => {
    const map = {};

    patients.forEach((patient) => {
      map[patient.id] = patient;
    });

    return map;
  }, [patients]);

  // ---------------------------------------------------------
  // ADD RECORD
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // EDIT RECORD
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // CREATE / UPDATE
  // ---------------------------------------------------------

  const handleFormSubmit = async (event) => {
    event.preventDefault();
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
      setFormError("Diagnosis is required.");
      return;
    }

    if (!formData.prescription.trim()) {
      setFormError("Prescription is required.");
      return;
    }

    setSubmitting(true);

    try {
      if (editingRecord) {
        const response = await api.put(
          `/records/${editingRecord.id}`,
          {
            doctor_name: formData.doctor_name.trim(),
            diagnosis: formData.diagnosis.trim(),
            prescription: formData.prescription.trim(),
            notes: formData.notes.trim() || null,
          }
        );

        setRecords((previous) =>
          previous.map((record) =>
            record.id === editingRecord.id
              ? response.data
              : record
          )
        );
      } else {
        const response = await api.post("/records/", {
          patient_id: parseInt(formData.patient_id, 10),
          doctor_name: formData.doctor_name.trim(),
          diagnosis: formData.diagnosis.trim(),
          prescription: formData.prescription.trim(),
          notes: formData.notes.trim() || null,
        });

        setRecords((previous) => [
          response.data,
          ...previous,
        ]);
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error("Save record error:", err);

      setFormError(
        err?.response?.data?.detail ||
          "Failed to save medical record."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) {
      return;
    }

    try {
      await api.delete(`/records/${deletingRecord.id}`);

      setRecords((previous) =>
        previous.filter(
          (record) => record.id !== deletingRecord.id
        )
      );

      setDeletingRecord(null);
    } catch (err) {
      console.error("Delete record error:", err);

      alert(
        err?.response?.data?.detail ||
          "Failed to delete medical record."
      );
    }
  };

  // ---------------------------------------------------------
  // COPY HASH
  // ---------------------------------------------------------

  const copyHashToClipboard = async (hash) => {
    if (!hash) {
      return;
    }

    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(true);

      setTimeout(() => {
        setCopiedHash(false);
      }, 2000);
    } catch (err) {
      console.error("Copy hash error:", err);
    }
  };

  // ---------------------------------------------------------
  // FABRIC AUDIT HISTORY
  // ---------------------------------------------------------

  const handleOpenAuditHistory = async (record) => {
    setAuditRecord(record);
    setAuditHistory([]);
    setAuditError("");

    if (!record?.blockchain_record_id) {
      setAuditError(
        "This medical record has not been registered on Hyperledger Fabric."
      );
      return;
    }

    setAuditLoading(true);

    try {
      const response = await api.get(
        `/records/${record.id}/history`
      );

      const history = response?.data?.history;

      setAuditHistory(
        Array.isArray(history) ? history : []
      );
    } catch (err) {
      console.error("Fabric audit history error:", err);

      if (err?.response?.status === 401) {
        setAuditError(
          "Your authentication session has expired."
        );
      } else if (err?.response?.status === 403) {
        setAuditError(
          "You are not authorized to view this audit history."
        );
      } else {
        setAuditError(
          err?.response?.data?.detail ||
            "Unable to retrieve Fabric audit history."
        );
      }
    } finally {
      setAuditLoading(false);
    }
  };

  const handleCloseAuditHistory = () => {
    setAuditRecord(null);
    setAuditHistory([]);
    setAuditError("");
    setAuditLoading(false);
  };

  // ---------------------------------------------------------
  // SEARCH
  // ---------------------------------------------------------

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const patient = patientMap[record.patient_id];

      const patientName =
        patient?.full_name?.toLowerCase() || "";

      const patientCode =
        patient?.patient_id?.toLowerCase() || "";

      return (
        !query ||
        record.diagnosis?.toLowerCase().includes(query) ||
        record.doctor_name?.toLowerCase().includes(query) ||
        record.prescription?.toLowerCase().includes(query) ||
        record.file_hash?.toLowerCase().includes(query) ||
        record.blockchain_record_id
          ?.toLowerCase()
          .includes(query) ||
        record.ipfs_cid
          ?.toLowerCase()
          .includes(query) ||
        patientName.includes(query) ||
        patientCode.includes(query)
      );
    });
  }, [records, patientMap, search]);

  // ---------------------------------------------------------
  // PAGINATION
  // ---------------------------------------------------------

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRecords.length / PAGE_SIZE)
  );

  const currentRecords = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;

    return filteredRecords.slice(
      start,
      start + PAGE_SIZE
    );
  }, [filteredRecords, page]);

  // ---------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------

  const formatTimestamp = (timestamp) => {
    if (!timestamp) {
      return "Unknown timestamp";
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return timestamp;
    }

    return date.toLocaleString();
  };

  const shortenValue = (value, length = 18) => {
    if (!value) {
      return "—";
    }

    if (value.length <= length) {
      return value;
    }

    return `${value.substring(0, length)}...`;
  };

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <DashboardLayout>
      <div className="fade-in">

        {/* PAGE HEADER */}

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
              }}
            >
              Medical Records Registry
            </h1>

            <p
              style={{
                fontSize: "14px",
                color: "#64748b",
                margin: "4px 0 0 0",
              }}
            >
              {filteredRecords.length} clinical record
              {filteredRecords.length !== 1 && "s"} indexed
            </p>
          </div>

          <button
            onClick={handleOpenAddModal}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "11px 22px",
              background:
                "linear-gradient(135deg, #0d9488 0%, #0284c7 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            <AddOutlined style={{ fontSize: "20px" }} />
            Create Medical Record
          </button>
        </div>

        {/* SEARCH */}

        <div
          style={{
            background: "#ffffff",
            padding: "16px 20px",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            marginBottom: "24px",
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
              placeholder="Search by diagnosis, doctor, patient, blockchain ID, IPFS CID, or SHA-256 hash..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
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
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* ERROR */}

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

        {/* RECORD TABLE */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}
        >
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "#64748b",
              }}
            >
              Loading medical records...
            </div>
          ) : currentRecords.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
              }}
            >
              <p
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#0f172a",
                }}
              >
                No medical records found
              </p>

              <p
                style={{
                  color: "#64748b",
                  fontSize: "14px",
                }}
              >
                Create a medical record entry to get started.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#f8fafc",
                      borderBottom: "1px solid #e2e8f0",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      color: "#64748b",
                    }}
                  >
                    <th style={{ padding: "16px 20px" }}>
                      Record ID
                    </th>

                    <th style={{ padding: "16px 20px" }}>
                      Patient
                    </th>

                    <th style={{ padding: "16px 20px" }}>
                      Doctor
                    </th>

                    <th style={{ padding: "16px 20px" }}>
                      Diagnosis
                    </th>

                    <th style={{ padding: "16px 20px" }}>
                      Security & Storage
                    </th>

                    <th
                      style={{
                        padding: "16px 20px",
                        textAlign: "right",
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {currentRecords.map((record) => {
                    const patient =
                      patientMap[record.patient_id];

                    return (
                      <tr
                        key={record.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        <td style={{ padding: "16px 20px" }}>
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: "700",
                            }}
                          >
                            #REC-{record.id}
                          </div>

                          {record.blockchain_record_id && (
                            <div
                              style={{
                                marginTop: "5px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "3px 7px",
                                background: "#eff6ff",
                                color: "#1d4ed8",
                                borderRadius: "5px",
                                fontSize: "10px",
                                fontWeight: "800",
                              }}
                            >
                              <VerifiedOutlined
                                style={{ fontSize: "12px" }}
                              />

                              {record.blockchain_record_id}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: "16px 20px" }}>
                          {patient ? (
                            <>
                              <div
                                style={{
                                  fontWeight: "700",
                                  fontSize: "14px",
                                }}
                              >
                                {patient.full_name}
                              </div>

                              <span
                                style={{
                                  fontSize: "11px",
                                  color: "#0d9488",
                                  fontWeight: "700",
                                }}
                              >
                                {patient.patient_id}
                              </span>
                            </>
                          ) : (
                            `Patient #${record.patient_id}`
                          )}
                        </td>

                        <td
                          style={{
                            padding: "16px 20px",
                            fontSize: "14px",
                            fontWeight: "600",
                          }}
                        >
                          {record.doctor_name}
                        </td>

                        <td style={{ padding: "16px 20px" }}>
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: "700",
                            }}
                          >
                            {record.diagnosis}
                          </div>
                        </td>

                        <td style={{ padding: "16px 20px" }}>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "6px",
                            }}
                          >
                            {record.file_hash && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: "800",
                                  color: "#059669",
                                  background: "#ecfdf5",
                                  padding: "4px 8px",
                                  borderRadius: "20px",
                                  width: "fit-content",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                <CheckCircleOutlined
                                  style={{ fontSize: "13px" }}
                                />
                                SHA-256
                              </span>
                            )}

                            {record.encryption_algorithm && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: "700",
                                  color: "#7c3aed",
                                  background: "#f5f3ff",
                                  padding: "4px 8px",
                                  borderRadius: "20px",
                                  width: "fit-content",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                <LockOutlined
                                  style={{ fontSize: "12px" }}
                                />
                                {record.encryption_algorithm}
                              </span>
                            )}

                            {record.ipfs_cid && (
                              <span
                                title={record.ipfs_cid}
                                style={{
                                  fontSize: "10px",
                                  fontWeight: "700",
                                  color: "#0369a1",
                                  background: "#f0f9ff",
                                  padding: "4px 8px",
                                  borderRadius: "20px",
                                  width: "fit-content",
                                  maxWidth: "180px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <CloudOutlined
                                  style={{
                                    fontSize: "12px",
                                    verticalAlign: "middle",
                                  }}
                                />{" "}
                                IPFS:{" "}
                                {shortenValue(
                                  record.ipfs_cid,
                                  12
                                )}
                              </span>
                            )}

                            {record.storage_type && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: "700",
                                  color: "#475569",
                                  background: "#f8fafc",
                                  padding: "4px 8px",
                                  borderRadius: "20px",
                                  width: "fit-content",
                                }}
                              >
                                <StorageOutlined
                                  style={{
                                    fontSize: "12px",
                                    verticalAlign: "middle",
                                  }}
                                />{" "}
                                {record.storage_type}
                              </span>
                            )}

                            {record.filecoin_deal_status && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: "700",
                                  color:
                                    record.filecoin_deal_status ===
                                    "ACTIVE"
                                      ? "#059669"
                                      : "#b45309",
                                  background:
                                    record.filecoin_deal_status ===
                                    "ACTIVE"
                                      ? "#ecfdf5"
                                      : "#fffbeb",
                                  padding: "4px 8px",
                                  borderRadius: "20px",
                                  width: "fit-content",
                                }}
                              >
                                Filecoin:{" "}
                                {record.filecoin_deal_status}
                              </span>
                            )}
                          </div>
                        </td>

                        <td
                          style={{
                            padding: "16px 20px",
                            textAlign: "right",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              gap: "7px",
                            }}
                          >
                            <button
                              onClick={() =>
                                setViewingRecord(record)
                              }
                              title="View Record"
                              style={{
                                background: "#f1f5f9",
                                border: "none",
                                color: "#475569",
                                width: "34px",
                                height: "34px",
                                borderRadius: "8px",
                                cursor: "pointer",
                              }}
                            >
                              <VisibilityOutlined
                                style={{ fontSize: "18px" }}
                              />
                            </button>

                            <button
                              onClick={() =>
                                handleOpenAuditHistory(record)
                              }
                              title="View Fabric Audit History"
                              style={{
                                background: "#eff6ff",
                                border: "none",
                                color: "#2563eb",
                                width: "34px",
                                height: "34px",
                                borderRadius: "8px",
                                cursor: "pointer",
                              }}
                            >
                              <HistoryOutlined
                                style={{ fontSize: "18px" }}
                              />
                            </button>

                            <button
                              onClick={() =>
                                handleOpenEditModal(record)
                              }
                              title="Edit Record"
                              style={{
                                background: "#f0f9ff",
                                border: "none",
                                color: "#0284c7",
                                width: "34px",
                                height: "34px",
                                borderRadius: "8px",
                                cursor: "pointer",
                              }}
                            >
                              <EditOutlined
                                style={{ fontSize: "18px" }}
                              />
                            </button>

                            <button
                              onClick={() =>
                                setDeletingRecord(record)
                              }
                              title="Delete Record"
                              style={{
                                background: "#fef2f2",
                                border: "none",
                                color: "#f43f5e",
                                width: "34px",
                                height: "34px",
                                borderRadius: "8px",
                                cursor: "pointer",
                              }}
                            >
                              <DeleteOutlined
                                style={{ fontSize: "18px" }}
                              />
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

          {/* PAGINATION */}

          {totalPages > 1 && (
            <div
              style={{
                padding: "16px 20px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                }}
              >
                Page {page} of {totalPages}
              </span>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                }}
              >
                <button
                  disabled={page === 1}
                  onClick={() =>
                    setPage((previous) => previous - 1)
                  }
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    cursor:
                      page === 1
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  Previous
                </button>

                <button
                  disabled={page === totalPages}
                  onClick={() =>
                    setPage((previous) => previous + 1)
                  }
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    cursor:
                      page === totalPages
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* =====================================================
            ADD / EDIT MODAL
        ====================================================== */}

        {isModalOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.6)",
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
                maxHeight: "90vh",
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "24px",
                }}
              >
                <h2
                  style={{
                    fontSize: "20px",
                    margin: 0,
                  }}
                >
                  {editingRecord
                    ? "Edit Medical Entry"
                    : "New Medical Entry"}
                </h2>

                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <CloseOutlined />
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
                    marginBottom: "20px",
                  }}
                >
                  {formError}
                </div>
              )}

              <form onSubmit={handleFormSubmit}>
                {!editingRecord && (
                  <div style={{ marginBottom: "16px" }}>
                    <label>Select Patient</label>

                    <select
                      value={formData.patient_id}
                      onChange={(event) =>
                        setFormData((previous) => ({
                          ...previous,
                          patient_id: event.target.value,
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "11px",
                        marginTop: "6px",
                        borderRadius: "10px",
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      <option value="">
                        -- Select Patient --
                      </option>

                      {patients.map((patient) => (
                        <option
                          key={patient.id}
                          value={patient.id}
                        >
                          {patient.full_name} (
                          {patient.patient_id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ marginBottom: "16px" }}>
                  <label>Doctor Name</label>

                  <input
                    type="text"
                    value={formData.doctor_name}
                    onChange={(event) =>
                      setFormData((previous) => ({
                        ...previous,
                        doctor_name: event.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "11px",
                      marginTop: "6px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label>Diagnosis</label>

                  <input
                    type="text"
                    value={formData.diagnosis}
                    onChange={(event) =>
                      setFormData((previous) => ({
                        ...previous,
                        diagnosis: event.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "11px",
                      marginTop: "6px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label>Prescription</label>

                  <textarea
                    rows={3}
                    value={formData.prescription}
                    onChange={(event) =>
                      setFormData((previous) => ({
                        ...previous,
                        prescription: event.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "11px",
                      marginTop: "6px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <label>Clinical Notes</label>

                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(event) =>
                      setFormData((previous) => ({
                        ...previous,
                        notes: event.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "11px",
                      marginTop: "6px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Saving..."
                      : editingRecord
                      ? "Save Record"
                      : "Create Record"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =====================================================
            VIEW RECORD MODAL
        ====================================================== */}

        {viewingRecord && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.6)",
              zIndex: 1100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            <div
              style={{
                width: "600px",
                maxWidth: "100%",
                background: "#ffffff",
                borderRadius: "20px",
                padding: "30px",
                maxHeight: "90vh",
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h2 style={{ margin: 0 }}>
                  Medical Record #REC-{viewingRecord.id}
                </h2>

                <button
                  onClick={() => setViewingRecord(null)}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                  }}
                >
                  <CloseOutlined />
                </button>
              </div>

              <div
                style={{
                  marginTop: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div>
                  <strong>Patient:</strong>{" "}
                  {patientMap[viewingRecord.patient_id]
                    ?.full_name ||
                    `Patient #${viewingRecord.patient_id}`}
                </div>

                <div>
                  <strong>Doctor:</strong>{" "}
                  {viewingRecord.doctor_name}
                </div>

                <div>
                  <strong>Diagnosis:</strong>{" "}
                  {viewingRecord.diagnosis}
                </div>

                <div>
                  <strong>Prescription:</strong>
                  <p>{viewingRecord.prescription}</p>
                </div>

                {viewingRecord.notes && (
                  <div>
                    <strong>Notes:</strong>
                    <p>{viewingRecord.notes}</p>
                  </div>
                )}

                <div
                  style={{
                    padding: "16px",
                    background: "#f8fafc",
                    borderRadius: "12px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "14px",
                      marginTop: 0,
                    }}
                  >
                    Secure Storage Metadata
                  </h3>

                  <div>
                    <strong>Encryption:</strong>{" "}
                    {viewingRecord.encryption_algorithm ||
                      "Not recorded"}
                  </div>

                  <div>
                    <strong>Storage:</strong>{" "}
                    {viewingRecord.storage_type ||
                      "Not recorded"}
                  </div>

                  <div
                    style={{
                      marginTop: "8px",
                    }}
                  >
                    <strong>IPFS CID:</strong>

                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: "11px",
                        wordBreak: "break-all",
                        marginTop: "4px",
                      }}
                    >
                      {viewingRecord.ipfs_cid ||
                        "Not recorded"}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "8px",
                    }}
                  >
                    <strong>Filecoin:</strong>{" "}
                    {viewingRecord.filecoin_deal_status ||
                      "Not recorded"}
                  </div>
                </div>

                <div
                  style={{
                    background: "#0f172a",
                    color: "#ffffff",
                    padding: "16px",
                    borderRadius: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <strong>SHA-256 Hash</strong>

                    {viewingRecord.file_hash && (
                      <button
                        onClick={() =>
                          copyHashToClipboard(
                            viewingRecord.file_hash
                          )
                        }
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <ContentCopyOutlined
                          style={{ fontSize: "14px" }}
                        />

                        {copiedHash
                          ? "Copied!"
                          : "Copy"}
                      </button>
                    )}
                  </div>

                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "11px",
                      wordBreak: "break-all",
                      marginTop: "10px",
                      color: "#34d399",
                    }}
                  >
                    {viewingRecord.file_hash ||
                      "No file uploaded"}
                  </div>
                </div>

                {viewingRecord.blockchain_record_id && (
                  <button
                    onClick={() => {
                      const record = viewingRecord;

                      setViewingRecord(null);
                      handleOpenAuditHistory(record);
                    }}
                    style={{
                      padding: "11px",
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      border: "1px solid #bfdbfe",
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontWeight: "700",
                    }}
                  >
                    <HistoryOutlined
                      style={{
                        fontSize: "18px",
                        verticalAlign: "middle",
                      }}
                    />{" "}
                    View Fabric Audit History
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            FABRIC AUDIT HISTORY MODAL
        ====================================================== */}

        {auditRecord && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.7)",
              zIndex: 1200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            <div
              style={{
                width: "800px",
                maxWidth: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                background: "#ffffff",
                borderRadius: "20px",
              }}
            >
              {/* HEADER */}

              <div
                style={{
                  padding: "24px",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <HistoryOutlined
                    style={{
                      color: "#2563eb",
                      fontSize: "30px",
                    }}
                  />

                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "20px",
                      }}
                    >
                      Hyperledger Fabric Audit History
                    </h2>

                    <p
                      style={{
                        margin: "4px 0 0 0",
                        color: "#64748b",
                        fontSize: "12px",
                      }}
                    >
                      Blockchain Record:{" "}
                      <strong>
                        {
                          auditRecord.blockchain_record_id
                        }
                      </strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCloseAuditHistory}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                  }}
                >
                  <CloseOutlined />
                </button>
              </div>

              {/* SUMMARY */}

              <div
                style={{
                  padding: "20px 24px",
                  background: "#f8fafc",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(3, minmax(0, 1fr))",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      padding: "12px",
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#64748b",
                        fontWeight: "800",
                      }}
                    >
                      BLOCKCHAIN RECORD
                    </div>

                    <strong
                      style={{
                        color: "#1d4ed8",
                      }}
                    >
                      {auditRecord.blockchain_record_id ||
                        "Not registered"}
                    </strong>
                  </div>

                  <div
                    style={{
                      padding: "12px",
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#64748b",
                        fontWeight: "800",
                      }}
                    >
                      TRANSACTIONS
                    </div>

                    <strong>
                      {auditLoading
                        ? "Loading..."
                        : auditHistory.length}
                    </strong>
                  </div>

                  <div
                    style={{
                      padding: "12px",
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#64748b",
                        fontWeight: "800",
                      }}
                    >
                      LEDGER STATUS
                    </div>

                    <strong
                      style={{
                        color: auditError
                          ? "#dc2626"
                          : "#059669",
                      }}
                    >
                      {auditError
                        ? "ERROR"
                        : auditLoading
                        ? "QUERYING"
                        : "VERIFIED"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* CONTENT */}

              <div style={{ padding: "24px" }}>
                {auditLoading ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "50px",
                      color: "#64748b",
                    }}
                  >
                    <RefreshOutlined
                      style={{
                        fontSize: "32px",
                      }}
                    />

                    <p>
                      Querying Hyperledger Fabric
                      ledger...
                    </p>
                  </div>
                ) : auditError ? (
                  <div
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      color: "#991b1b",
                      borderRadius: "12px",
                      padding: "18px",
                    }}
                  >
                    <strong>
                      Audit history unavailable
                    </strong>

                    <p
                      style={{
                        marginBottom: 0,
                      }}
                    >
                      {auditError}
                    </p>
                  </div>
                ) : auditHistory.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "45px",
                      color: "#64748b",
                    }}
                  >
                    <HistoryOutlined
                      style={{
                        fontSize: "40px",
                      }}
                    />

                    <p>
                      No Fabric history found.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                      }}
                    >
                      Each entry represents a
                      transaction recorded on the
                      Hyperledger Fabric ledger.
                    </p>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "14px",
                      }}
                    >
                      {auditHistory.map(
                        (entry, index) => {
                          const onChainRecord =
                            entry?.record;

                          return (
                            <div
                              key={
                                entry?.txId ||
                                `${index}-${entry?.timestamp}`
                              }
                              style={{
                                border:
                                  "1px solid #dbeafe",
                                borderRadius: "12px",
                                overflow: "hidden",
                              }}
                            >
                              {/* TRANSACTION HEADER */}

                              <div
                                style={{
                                  padding: "13px 16px",
                                  background: "#eff6ff",
                                  borderBottom:
                                    "1px solid #dbeafe",
                                  display: "flex",
                                  justifyContent:
                                    "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <strong
                                  style={{
                                    color: "#1e3a8a",
                                    fontSize: "13px",
                                  }}
                                >
                                  <CheckCircleOutlined
                                    style={{
                                      fontSize: "17px",
                                      verticalAlign:
                                        "middle",
                                      marginRight: "6px",
                                    }}
                                  />

                                  Fabric Transaction{" "}
                                  {index + 1}
                                </strong>

                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: "800",
                                    color:
                                      entry?.isDelete
                                        ? "#dc2626"
                                        : "#059669",
                                  }}
                                >
                                  {entry?.isDelete
                                    ? "DELETED"
                                    : "RECORDED"}
                                </span>
                              </div>

                              {/* TRANSACTION DATA */}

                              <div
                                style={{
                                  padding: "16px",
                                }}
                              >
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(2, minmax(0, 1fr))",
                                    gap: "16px",
                                  }}
                                >
                                  <div>
                                    <div
                                      style={{
                                        fontSize: "10px",
                                        color: "#64748b",
                                        fontWeight: "800",
                                      }}
                                    >
                                      TRANSACTION ID
                                    </div>

                                    <div
                                      style={{
                                        marginTop: "5px",
                                        fontFamily:
                                          "monospace",
                                        fontSize: "11px",
                                        wordBreak:
                                          "break-all",
                                      }}
                                    >
                                      {entry?.txId ||
                                        "Not available"}
                                    </div>
                                  </div>

                                  <div>
                                    <div
                                      style={{
                                        fontSize: "10px",
                                        color: "#64748b",
                                        fontWeight: "800",
                                      }}
                                    >
                                      FABRIC TIMESTAMP
                                    </div>

                                    <div
                                      style={{
                                        marginTop: "5px",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                      }}
                                    >
                                      {formatTimestamp(
                                        entry?.timestamp
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {onChainRecord && (
                                  <div
                                    style={{
                                      marginTop: "16px",
                                      padding: "14px",
                                      background: "#f8fafc",
                                      border:
                                        "1px solid #e2e8f0",
                                      borderRadius: "10px",
                                    }}
                                  >
                                    <strong
                                      style={{
                                        fontSize: "11px",
                                      }}
                                    >
                                      ON-CHAIN RECORD
                                      METADATA
                                    </strong>

                                    <div
                                      style={{
                                        marginTop: "10px",
                                        display: "grid",
                                        gridTemplateColumns:
                                          "repeat(2, minmax(0, 1fr))",
                                        gap: "12px",
                                      }}
                                    >
                                      <div>
                                        <small>
                                          Record ID
                                        </small>

                                        <div>
                                          {onChainRecord.id ||
                                            "—"}
                                        </div>
                                      </div>

                                      <div>
                                        <small>
                                          Patient ID
                                        </small>

                                        <div>
                                          {onChainRecord.patientId ||
                                            "—"}
                                        </div>
                                      </div>

                                      <div>
                                        <small>
                                          Doctor
                                        </small>

                                        <div>
                                          {onChainRecord.doctorId ||
                                            "—"}
                                        </div>
                                      </div>

                                      <div>
                                        <small>
                                          Encryption
                                        </small>

                                        <div
                                          style={{
                                            color:
                                              "#7c3aed",
                                          }}
                                        >
                                          {onChainRecord.encryptionAlgorithm ||
                                            "—"}
                                        </div>
                                      </div>

                                      <div
                                        style={{
                                          gridColumn:
                                            "1 / -1",
                                        }}
                                      >
                                        <small>
                                          SHA-256 Record
                                          Hash
                                        </small>

                                        <div
                                          style={{
                                            marginTop: "3px",
                                            fontFamily:
                                              "monospace",
                                            fontSize: "10px",
                                            color:
                                              "#059669",
                                            wordBreak:
                                              "break-all",
                                          }}
                                        >
                                          {onChainRecord.recordHash ||
                                            "—"}
                                        </div>
                                      </div>

                                      <div
                                        style={{
                                          gridColumn:
                                            "1 / -1",
                                        }}
                                      >
                                        <small>
                                          IPFS CID
                                        </small>

                                        <div
                                          style={{
                                            marginTop: "3px",
                                            fontFamily:
                                              "monospace",
                                            fontSize: "10px",
                                            color:
                                              "#0369a1",
                                            wordBreak:
                                              "break-all",
                                          }}
                                        >
                                          {onChainRecord.ipfsCid ||
                                            "—"}
                                        </div>
                                      </div>

                                      <div>
                                        <small>
                                          Storage
                                        </small>

                                        <div>
                                          {onChainRecord.storageType ||
                                            "—"}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* FOOTER */}

              <div
                style={{
                  padding: "16px 24px",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "#64748b",
                  }}
                >
                  <LockOutlined
                    style={{
                      fontSize: "13px",
                      verticalAlign: "middle",
                    }}
                  />{" "}
                  Ledger queried through Fabric Gateway
                </span>

                <button
                  onClick={handleCloseAuditHistory}
                  style={{
                    padding: "9px 20px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#f1f5f9",
                    cursor: "pointer",
                    fontWeight: "700",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            DELETE MODAL
        ====================================================== */}

        {deletingRecord && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.6)",
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
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                }}
              >
                Delete Medical Record?
              </h3>

              <p
                style={{
                  color: "#64748b",
                }}
              >
                Are you sure you want to delete
                <strong>
                  {" "}
                  #REC-{deletingRecord.id}
                </strong>
                ?
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <button
                  onClick={() =>
                    setDeletingRecord(null)
                  }
                >
                  Cancel
                </button>

                <button
                  onClick={handleDeleteConfirm}
                  style={{
                    background: "#f43f5e",
                    color: "#ffffff",
                    border: "none",
                    padding: "9px 18px",
                    borderRadius: "8px",
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
