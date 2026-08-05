import { useState, useEffect, useCallback, useMemo } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/api";
import {
  SearchOutlined,
  AddOutlined,
  FilterListOutlined,
  EditOutlined,
  DeleteOutlined,
  VisibilityOutlined,
  CloseOutlined,
  PersonOutlined,
  PhoneOutlined,
  HomeOutlined,
  ContactPhoneOutlined,
  BadgeOutlined,
} from "@mui/icons-material";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-","A1+"];
const GENDERS = ["Male", "Female", "Other"];
const PAGE_SIZE = 8;

const INITIAL_FORM = {
  patient_id: "",
  full_name: "",
  age: "",
  gender: "Male",
  blood_group: "A+",
  contact: "",
  address: "",
  emergency_contact: "",
};

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [bloodGroupFilter, setBloodGroupFilter] = useState("");
  const [page, setPage] = useState(1);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null); // null means adding
  const [viewingPatient, setViewingPatient] = useState(null);
  const [deletingPatient, setDeletingPatient] = useState(null);

  // Form State
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/patients/");
      setPatients(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Fetch Patients Error:", err);
      setError("Unable to load patient records from backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleOpenAddModal = () => {
    setEditingPatient(null);
    setFormData({
      patient_id: `PAT-${Math.floor(1000 + Math.random() * 9000)}`,
      full_name: "",
      age: "",
      gender: "Male",
      blood_group: "A+",
      contact: "",
      address: "",
      emergency_contact: "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (patient) => {
    setEditingPatient(patient);
    setFormData({
      patient_id: patient.patient_id || "",
      full_name: patient.full_name || "",
      age: patient.age ? String(patient.age) : "",
      gender: patient.gender || "Male",
      blood_group: patient.blood_group || "A+",
      contact: patient.contact || "",
      address: patient.address || "",
      emergency_contact: patient.emergency_contact || "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.patient_id.trim()) {
      setFormError("Patient Unique ID is required.");
      return;
    }
    if (!formData.full_name.trim()) {
      setFormError("Patient full name is required.");
      return;
    }
    const ageNum = parseInt(formData.age, 10);
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      setFormError("Please enter a valid age between 1 and 120.");
      return;
    }
    if (!formData.contact.trim()) {
      setFormError("Contact number is required.");
      return;
    }
    if (!formData.address.trim()) {
      setFormError("Address is required.");
      return;
    }
    if (!formData.emergency_contact.trim()) {
      setFormError("Emergency contact is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingPatient) {
        // PUT /patients/{id} where id is integer primary key!
        const response = await api.put(`/patients/${editingPatient.id}`, {
          full_name: formData.full_name.trim(),
          age: ageNum,
          gender: formData.gender,
          blood_group: formData.blood_group,
          contact: formData.contact.trim(),
          address: formData.address.trim(),
          emergency_contact: formData.emergency_contact.trim(),
        });

        setPatients((prev) =>
          prev.map((p) => (p.id === editingPatient.id ? response.data : p))
        );
      } else {
        // POST /patients/
        const response = await api.post("/patients/", {
          patient_id: formData.patient_id.trim(),
          full_name: formData.full_name.trim(),
          age: ageNum,
          gender: formData.gender,
          blood_group: formData.blood_group,
          contact: formData.contact.trim(),
          address: formData.address.trim(),
          emergency_contact: formData.emergency_contact.trim(),
        });

        setPatients((prev) => [response.data, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Save Patient Error:", err);
      const detail = err?.response?.data?.detail || err?.response?.data?.message;
      setFormError(detail || "Failed to save patient record. Check field inputs.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPatient) return;
    try {
      // DELETE /patients/{id} using integer primary key!
      await api.delete(`/patients/${deletingPatient.id}`);
      setPatients((prev) => prev.filter((p) => p.id !== deletingPatient.id));
      setDeletingPatient(null);
    } catch (err) {
      console.error("Delete Patient Error:", err);
      alert("Failed to delete patient. Ensure there are no dependent medical records.");
    }
  };

  // Filtered and paginated list
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.full_name?.toLowerCase().includes(q) ||
        p.patient_id?.toLowerCase().includes(q) ||
        p.contact?.toLowerCase().includes(q);

      const matchesGender = !genderFilter || p.gender === genderFilter;
      const matchesBloodGroup = !bloodGroupFilter || p.blood_group === bloodGroupFilter;

      return matchesSearch && matchesGender && matchesBloodGroup;
    });
  }, [patients, search, genderFilter, bloodGroupFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / PAGE_SIZE));
  const currentPatients = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredPatients.slice(start, start + PAGE_SIZE);
  }, [filteredPatients, page]);

  return (
    <DashboardLayout>
      <div className="fade-in">
        {/* Header */}
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
              Patient Directory
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b", margin: "4px 0 0 0" }}>
              {filteredPatients.length} total patient record{filteredPatients.length !== 1 && "s"} registered
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
            <AddOutlined style={{ fontSize: "20px" }} /> Register New Patient
          </button>
        </div>

        {/* Toolbar & Filter Bar */}
        <div
          style={{
            background: "#ffffff",
            padding: "16px 20px",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            marginBottom: "24px",
            display: "flex",
            flexWrap: "wrap",
            gap: "14px",
            alignItems: "center",
            boxShadow: "0 2px 4px 0 rgba(0,0,0,0.02)",
          }}
        >
          {/* Search Bar */}
          <div style={{ position: "relative", flex: "1 1 260px" }}>
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
              placeholder="Search patient by name, PAT-ID, or phone..."
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

          {/* Gender Filter */}
          <select
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              fontSize: "14px",
              background: "#f8fafc",
              color: "#334155",
              cursor: "pointer",
              minWidth: "140px",
            }}
          >
            <option value="">All Genders</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Blood Group Filter */}
          <select
            value={bloodGroupFilter}
            onChange={(e) => {
              setBloodGroupFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              fontSize: "14px",
              background: "#f8fafc",
              color: "#334155",
              cursor: "pointer",
              minWidth: "160px",
            }}
          >
            <option value="">All Blood Groups</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                Blood Group {bg}
              </option>
            ))}
          </select>

          {(search || genderFilter || bloodGroupFilter) && (
            <button
              onClick={() => {
                setSearch("");
                setGenderFilter("");
                setBloodGroupFilter("");
                setPage(1);
              }}
              style={{
                background: "#f1f5f9",
                border: "none",
                color: "#64748b",
                padding: "10px 16px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Clear Filters
            </button>
          )}
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

        {/* Patients Table */}
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
              Loading patients directory...
            </div>
          ) : currentPatients.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <p style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                No patient records found
              </p>
              <p style={{ color: "#64748b", fontSize: "14px", margin: "6px 0 16px 0" }}>
                Try adjusting your search query or add a new patient.
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
                + Add Patient Now
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
                    <th style={{ padding: "16px 20px" }}>Patient ID</th>
                    <th style={{ padding: "16px 20px" }}>Full Name</th>
                    <th style={{ padding: "16px 20px" }}>Age & Gender</th>
                    <th style={{ padding: "16px 20px" }}>Blood Group</th>
                    <th style={{ padding: "16px 20px" }}>Contact</th>
                    <th style={{ padding: "16px 20px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPatients.map((patient) => (
                    <tr
                      key={patient.id}
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
                            fontFamily: "monospace",
                            color: "#0d9488",
                            background: "#f0fdfa",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            border: "1px solid #ccfbf1",
                          }}
                        >
                          {patient.patient_id}
                        </span>
                      </td>

                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>
                          {patient.full_name}
                        </div>
                        <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                          DB ID #{patient.id}
                        </span>
                      </td>

                      <td style={{ padding: "16px 20px", fontSize: "14px", color: "#334155" }}>
                        {patient.age} yrs • {patient.gender}
                      </td>

                      <td style={{ padding: "16px 20px" }}>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "800",
                            color: "#0284c7",
                            background: "#f0f9ff",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            border: "1px solid #e0f2fe",
                          }}
                        >
                          🩸 {patient.blood_group}
                        </span>
                      </td>

                      <td style={{ padding: "16px 20px", fontSize: "14px", color: "#334155" }}>
                        {patient.contact}
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
                            onClick={() => setViewingPatient(patient)}
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
                            title="View Full Details"
                          >
                            <VisibilityOutlined style={{ fontSize: "18px" }} />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(patient)}
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
                            title="Edit Patient"
                          >
                            <EditOutlined style={{ fontSize: "18px" }} />
                          </button>

                          <button
                            onClick={() => setDeletingPatient(patient)}
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
                            title="Delete Patient"
                          >
                            <DeleteOutlined style={{ fontSize: "18px" }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Bar */}
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

        {/* Add / Edit Form Modal */}
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
                width: "540px",
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
                  {editingPatient ? "Edit Patient Record" : "Register New Patient"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                  }}
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
                {/* Unique Patient ID */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>
                    Patient Unique ID
                  </label>
                  <input
                    type="text"
                    disabled={Boolean(editingPatient)}
                    value={formData.patient_id}
                    onChange={(e) => setFormData((prev) => ({ ...prev, patient_id: e.target.value }))}
                    placeholder="PAT-1001"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      outline: "none",
                      background: editingPatient ? "#f1f5f9" : "#ffffff",
                    }}
                  />
                </div>

                {/* Full Name */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                    placeholder="e.g. Eleanor Vance"
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

                {/* Age & Gender */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>
                      Age
                    </label>
                    <input
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData((prev) => ({ ...prev, age: e.target.value }))}
                      placeholder="e.g. 32"
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

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>
                      Gender
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1px solid #cbd5e1",
                        fontSize: "14px",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      {GENDERS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Blood Group & Contact */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>
                      Blood Group
                    </label>
                    <select
                      value={formData.blood_group}
                      onChange={(e) => setFormData((prev) => ({ ...prev, blood_group: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1px solid #cbd5e1",
                        fontSize: "14px",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>
                      Contact Number
                    </label>
                    <input
                      type="text"
                      value={formData.contact}
                      onChange={(e) => setFormData((prev) => ({ ...prev, contact: e.target.value }))}
                      placeholder="+1 (555) 019-2834"
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
                </div>

                {/* Residential Address */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>
                    Residential Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="742 Evergreen Terrace, Springfield"
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

                {/* Emergency Contact */}
                <div style={{ marginBottom: "24px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>
                    Emergency Contact (Name & Phone)
                  </label>
                  <input
                    type="text"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData((prev) => ({ ...prev, emergency_contact: e.target.value }))}
                    placeholder="Jane Vance (+1 555-019-9999)"
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
                    {submitting ? "Saving..." : editingPatient ? "Save Changes" : "Create Patient Record"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Details Modal */}
        {viewingPatient && (
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
                width: "480px",
                maxWidth: "100%",
                background: "#ffffff",
                borderRadius: "20px",
                padding: "32px",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
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
                <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                  Patient File Summary
                </h2>
                <button
                  onClick={() => setViewingPatient(null)}
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                >
                  <CloseOutlined style={{ fontSize: "24px" }} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "12px" }}>
                  <div style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>
                    {viewingPatient.full_name}
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#0d9488" }}>
                    {viewingPatient.patient_id} • DB Primary Key #{viewingPatient.id}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Age / Gender</span>
                    <p style={{ fontSize: "14px", fontWeight: "700", margin: "2px 0 0 0" }}>
                      {viewingPatient.age} yrs ({viewingPatient.gender})
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Blood Group</span>
                    <p style={{ fontSize: "14px", fontWeight: "700", color: "#0284c7", margin: "2px 0 0 0" }}>
                      🩸 {viewingPatient.blood_group}
                    </p>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Primary Contact</span>
                  <p style={{ fontSize: "14px", fontWeight: "600", margin: "2px 0 0 0" }}>
                    {viewingPatient.contact}
                  </p>
                </div>

                <div>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Address</span>
                  <p style={{ fontSize: "14px", color: "#334155", margin: "2px 0 0 0" }}>
                    {viewingPatient.address}
                  </p>
                </div>

                <div>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Emergency Contact</span>
                  <p style={{ fontSize: "14px", fontWeight: "600", color: "#f43f5e", margin: "2px 0 0 0" }}>
                    🚨 {viewingPatient.emergency_contact}
                  </p>
                </div>
              </div>

              <div style={{ marginTop: "24px", textAlign: "right" }}>
                <button
                  onClick={() => setViewingPatient(null)}
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
        {deletingPatient && (
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
                Delete Patient Record?
              </h3>
              <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 20px 0" }}>
                Are you sure you want to delete patient <strong>{deletingPatient.full_name}</strong> (ID: {deletingPatient.patient_id})?
                This action cannot be undone.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  onClick={() => setDeletingPatient(null)}
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
                  Delete Patient
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
