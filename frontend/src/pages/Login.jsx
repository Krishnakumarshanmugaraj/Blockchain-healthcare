import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowForward,
  EmailOutlined,
  LockOutlined,
  ShieldOutlined,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import api from "../api/api";

export default function Login() {
  const [mode, setMode] = useState("login");

  const [email, setEmail] = useState(
    "fabrictestdoctor@example.com"
  );

  const [password, setPassword] = useState("");

  const [fullName, setFullName] = useState("");

  const [role, setRole] = useState("doctor");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const handleModeChange = (_, newMode) => {
    setMode(newMode);
    setError("");
    setSuccess("");
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        "/auth/login",
        {
          email: normalizedEmail,
          password,
        }
      );

      const data = response.data;

      if (!data?.access_token) {
        throw new Error(
          "Login succeeded but no access token was returned."
        );
      }

      localStorage.setItem(
        "token",
        data.access_token
      );

      localStorage.setItem(
        "user_email",
        normalizedEmail
      );

      localStorage.setItem(
        "user_role",
        data.role || "user"
      );

      setPassword("");

      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Login error:", err);

      if (err?.response?.status === 401) {
        setError(
          "Invalid email or password. Please try again."
        );
      } else if (err?.response?.data?.detail) {
        setError(
          String(err.response.data.detail)
        );
      } else if (err?.request) {
        setError(
          "Unable to connect to the backend. Please make sure the FastAPI server is running on port 8000."
        );
      } else {
        setError(
          "Login failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must contain at least 8 characters."
      );
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/register", {
        full_name: fullName.trim(),
        email: normalizedEmail,
        password,
        role,
      });

      setSuccess(
        "Account created successfully. You can now sign in."
      );

      setMode("login");
      setPassword("");
      setFullName("");
    } catch (err) {
      console.error(
        "Registration error:",
        err
      );

      if (err?.response?.data?.detail) {
        setError(
          String(err.response.data.detail)
        );
      } else if (err?.request) {
        setError(
          "Unable to connect to the backend. Please make sure the FastAPI server is running on port 8000."
        );
      } else {
        setError(
          "Registration failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit =
    mode === "login"
      ? handleLogin
      : handleRegister;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        px: 2,
        py: 4,
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 4,
          border:
            "1px solid rgba(148, 163, 184, 0.25)",
          background:
            "rgba(30, 41, 59, 0.92)",
          boxShadow:
            "0 25px 70px rgba(0, 0, 0, 0.35)",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            px: { xs: 3, sm: 5 },
            pt: 5,
            pb: 4,
          }}
        >
          {/* Logo */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mb: 3,
            }}
          >
            <Box
              sx={{
                width: 70,
                height: 70,
                borderRadius: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "linear-gradient(135deg, #0d9488 0%, #0284c7 100%)",
                boxShadow:
                  "0 0 30px rgba(14, 165, 233, 0.35)",
              }}
            >
              <ShieldOutlined
                sx={{
                  color: "#ffffff",
                  fontSize: 42,
                }}
              />
            </Box>
          </Box>

          {/* Title */}
          <Typography
            variant="h4"
            sx={{
              textAlign: "center",
              fontWeight: 800,
              color: "#f8fafc",
            }}
          >
            HealthChain Platform
          </Typography>

          <Typography
            sx={{
              textAlign: "center",
              color: "#94a3b8",
              mt: 1,
              mb: 4,
            }}
          >
            Blockchain-Secured Healthcare Records Access
          </Typography>

          {/* Tabs */}
          <Tabs
            value={mode}
            onChange={handleModeChange}
            variant="fullWidth"
            sx={{
              mb: 3,
              background:
                "rgba(15, 23, 42, 0.65)",
              borderRadius: 2,
              minHeight: 48,
              "& .MuiTabs-indicator": {
                height: "100%",
                borderRadius: 2,
                zIndex: 0,
                background:
                  "linear-gradient(135deg, #0d9488 0%, #0284c7 100%)",
              },
              "& .MuiTab-root": {
                zIndex: 1,
                color: "#94a3b8",
                fontWeight: 700,
                textTransform: "none",
                minHeight: 48,
              },
              "& .Mui-selected": {
                color: "#ffffff !important",
              },
            }}
          >
            <Tab
              value="login"
              label="Sign In"
            />

            <Tab
              value="register"
              label="Create Account"
            />
          </Tabs>

          {/* Messages */}
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 2.5,
                borderRadius: 2,
              }}
              onClose={() => setError("")}
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              severity="success"
              sx={{
                mb: 2.5,
                borderRadius: 2,
              }}
              onClose={() => setSuccess("")}
            >
              {success}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
          >
            {mode === "register" && (
              <TextField
                fullWidth
                label="Full Name"
                value={fullName}
                onChange={(event) =>
                  setFullName(
                    event.target.value
                  )
                }
                margin="normal"
                autoComplete="name"
                InputProps={{
                  sx: {
                    color: "#f8fafc",
                  },
                }}
              />
            )}

            <TextField
              fullWidth
              label="Email Address"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              margin="normal"
              type="email"
              autoComplete="email"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlined
                      sx={{
                        color: "#64748b",
                      }}
                    />
                  </InputAdornment>
                ),
                sx: {
                  color: "#f8fafc",
                },
              }}
            />

            <TextField
              fullWidth
              label="Password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              margin="normal"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              autoComplete={
                mode === "login"
                  ? "current-password"
                  : "new-password"
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined
                      sx={{
                        color: "#64748b",
                      }}
                    />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() =>
                        setShowPassword(
                          (value) => !value
                        )
                      }
                      edge="end"
                      sx={{
                        color: "#64748b",
                      }}
                      type="button"
                    >
                      {showPassword ? (
                        <VisibilityOff />
                      ) : (
                        <Visibility />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  color: "#f8fafc",
                },
              }}
            />

            {mode === "register" && (
              <TextField
                fullWidth
                select
                label="Role"
                value={role}
                onChange={(event) =>
                  setRole(event.target.value)
                }
                margin="normal"
                SelectProps={{
                  native: true,
                }}
                InputProps={{
                  sx: {
                    color: "#f8fafc",
                  },
                }}
              >
                <option value="doctor">
                  Doctor
                </option>

                <option value="patient">
                  Patient
                </option>
              </TextField>
            )}

            <Button
              fullWidth
              type="submit"
              variant="contained"
              disabled={loading}
              endIcon={
                loading ? (
                  <CircularProgress
                    size={20}
                    color="inherit"
                  />
                ) : (
                  <ArrowForward />
                )
              }
              sx={{
                mt: 3,
                minHeight: 54,
                borderRadius: 2,
                fontSize: 17,
                fontWeight: 800,
                textTransform: "none",
                background:
                  "linear-gradient(135deg, #0d9488 0%, #0284c7 100%)",
                boxShadow:
                  "0 8px 24px rgba(14, 165, 233, 0.25)",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #0f766e 0%, #0369a1 100%)",
                },
              }}
            >
              {mode === "login"
                ? "Access System Dashboard"
                : "Create Healthcare Account"}
            </Button>
          </Box>

          <Typography
            variant="caption"
            sx={{
              display: "block",
              textAlign: "center",
              color: "#64748b",
              mt: 3,
            }}
          >
            Secure authentication · Role-based access
            control · Blockchain auditability
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
