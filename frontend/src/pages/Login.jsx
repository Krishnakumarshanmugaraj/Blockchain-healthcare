import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import {
  ShieldOutlined,
  LockOutlined,
  EmailOutlined,
  PersonOutlined,
  BadgeOutlined,
  VisibilityOutlined,
  VisibilityOffOutlined,
  ArrowForwardOutlined,
} from "@mui/icons-material";

export default function Login() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("Doctor");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // If token exists, auto-redirect
  useEffect(() => {
    const existingToken = localStorage.getItem("token");
    if (existingToken) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!email.trim() || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/login", {
        email: email.trim(),
        password: password,
      });

      const data = response.data;
      const token = data?.access_token || data?.token;

      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("user_email", email.trim());
        localStorage.setItem("user_role", role || "Doctor");
        navigate("/dashboard", { replace: true });
      } else {
        throw new Error("Invalid response token from server.");
      }
    } catch (err) {
      console.error("Login Error:", err);
      const detail = err?.response?.data?.detail || err?.response?.data?.message;
      setError(detail || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!fullName.trim() || !email.trim() || !password) {
      setError("Please complete all registration fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/register", {
        full_name: fullName.trim(),
        email: email.trim(),
        password: password,
        role: role,
      });

      if (response.data) {
        setSuccessMsg("Account registered successfully! You can now log in.");
        setIsRegisterMode(false);
        setPassword("");
      }
    } catch (err) {
      console.error("Registration Error:", err);
      const detail = err?.response?.data?.detail || err?.response?.data?.message;
      setError(detail || "Failed to register. Email may already be in use.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "radial-gradient(circle at 50% 20%, #1e293b 0%, #0f172a 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Decorative Glow Circles */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "15%",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(13, 148, 136, 0.15) 0%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "15%",
          width: "450px",
          height: "450px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(2, 132, 199, 0.15) 0%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "440px",
          maxWidth: "100%",
          background: "rgba(30, 41, 59, 0.75)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "20px",
          padding: "40px 36px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          color: "#f8fafc",
          position: "relative",
          zIndex: 10,
        }}
        className="scale-in"
      >
        {/* Brand Shield Logo */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #0d9488 0%, #0284c7 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 24px rgba(13, 148, 136, 0.5)",
              marginBottom: "14px",
            }}
          >
            <ShieldOutlined style={{ fontSize: "32px", color: "#ffffff" }} />
          </div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: "800",
              margin: 0,
              letterSpacing: "-0.5px",
              textAlign: "center",
            }}
          >
            HealthChain Platform
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "#94a3b8",
              margin: "4px 0 0 0",
              textAlign: "center",
            }}
          >
            Blockchain-Secured Healthcare Records Access
          </p>
        </div>

        {/* Tab Selector */}
        <div
          style={{
            display: "flex",
            background: "rgba(15, 23, 42, 0.6)",
            padding: "4px",
            borderRadius: "12px",
            marginBottom: "24px",
            border: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false);
              setError("");
              setSuccessMsg("");
            }}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: "8px",
              border: "none",
              background: !isRegisterMode
                ? "linear-gradient(135deg, #0d9488 0%, #0284c7 100%)"
                : "transparent",
              color: !isRegisterMode ? "#ffffff" : "#94a3b8",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(true);
              setError("");
              setSuccessMsg("");
            }}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: "8px",
              border: "none",
              background: isRegisterMode
                ? "linear-gradient(135deg, #0d9488 0%, #0284c7 100%)"
                : "transparent",
              color: isRegisterMode ? "#ffffff" : "#94a3b8",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            Create Account
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div
            style={{
              background: "rgba(244, 63, 94, 0.15)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              color: "#fb7185",
              borderRadius: "10px",
              padding: "10px 14px",
              fontSize: "13px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>⚠️ {error}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#34d399",
              borderRadius: "10px",
              padding: "10px 14px",
              fontSize: "13px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>✅ {successMsg}</span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={isRegisterMode ? handleRegister : handleLogin}>
          {isRegisterMode && (
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#cbd5e1",
                  marginBottom: "6px",
                }}
              >
                Full Name
              </label>
              <div style={{ position: "relative" }}>
                <PersonOutlined
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "12px",
                    color: "#64748b",
                    fontSize: "20px",
                  }}
                />
                <input
                  type="text"
                  placeholder="Dr. John Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px 12px 42px",
                    background: "rgba(15, 23, 42, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "10px",
                    color: "#ffffff",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "#cbd5e1",
                marginBottom: "6px",
              }}
            >
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <EmailOutlined
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "12px",
                  color: "#64748b",
                  fontSize: "20px",
                }}
              />
              <input
                type="email"
                placeholder="doctor@hospital.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 42px",
                  background: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "10px",
                  color: "#ffffff",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: isRegisterMode ? "16px" : "22px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                color: "#cbd5e1",
                marginBottom: "6px",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <LockOutlined
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "12px",
                  color: "#64748b",
                  fontSize: "20px",
                }}
              />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 42px 12px 42px",
                  background: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "10px",
                  color: "#ffffff",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "12px",
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                {showPassword ? (
                  <VisibilityOffOutlined style={{ fontSize: "18px" }} />
                ) : (
                  <VisibilityOutlined style={{ fontSize: "18px" }} />
                )}
              </button>
            </div>
          </div>

          {/* Role selector when registering */}
          {isRegisterMode && (
            <div style={{ marginBottom: "22px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#cbd5e1",
                  marginBottom: "6px",
                }}
              >
                Assign Staff Role
              </label>
              <div style={{ position: "relative" }}>
                <BadgeOutlined
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "12px",
                    color: "#64748b",
                    fontSize: "20px",
                  }}
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px 12px 42px",
                    background: "rgba(15, 23, 42, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "10px",
                    color: "#ffffff",
                    fontSize: "14px",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="Doctor" style={{ background: "#0f172a" }}>
                    Doctor
                  </option>
                  <option value="Administrator" style={{ background: "#0f172a" }}>
                    Administrator
                  </option>
                  <option value="Nurse" style={{ background: "#0f172a" }}>
                    Medical Nurse
                  </option>
                  <option value="Auditor" style={{ background: "#0f172a" }}>
                    Blockchain Auditor
                  </option>
                </select>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #0d9488 0%, #0284c7 100%)",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: "700",
              cursor: loading ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 14px rgba(13, 148, 136, 0.4)",
              transition: "all 0.2s ease",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : isRegisterMode ? (
              <>
                Register Account <ArrowForwardOutlined style={{ fontSize: "18px" }} />
              </>
            ) : (
              <>
                Access System Dashboard <ArrowForwardOutlined style={{ fontSize: "18px" }} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
