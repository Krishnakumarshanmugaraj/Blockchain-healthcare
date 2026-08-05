import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  DashboardOutlined,
  PeopleAltOutlined,
  DescriptionOutlined,
  CloudUploadOutlined,
  VerifiedUserOutlined,
  LogoutOutlined,
  ShieldOutlined,
  ChevronLeftOutlined,
  ChevronRightOutlined,
  AccountCircleOutlined,
} from "@mui/icons-material";

const NAVIGATION_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: DashboardOutlined },
  { path: "/patients", label: "Patients", icon: PeopleAltOutlined },
  { path: "/records", label: "Medical Records", icon: DescriptionOutlined },
  { path: "/upload", label: "Upload Record", icon: CloudUploadOutlined },
  { path: "/verify", label: "Verify Integrity", icon: VerifiedUserOutlined },
];

export default function Sidebar({ collapsed, onToggleCollapse, onNavigate }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_role");
    navigate("/");
  };

  const userEmail = localStorage.getItem("user_email") || "admin@healthchain.org";
  const userRole = localStorage.getItem("user_role") || "Administrator";

  return (
    <div
      style={{
        width: collapsed ? "76px" : "260px",
        height: "100vh",
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        color: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        boxShadow: "4px 0 24px rgba(0, 0, 0, 0.15)",
        position: "relative",
        zIndex: 100,
        userSelect: "none",
      }}
    >
      {/* Brand Header */}
      <div>
        <div
          style={{
            height: "72px",
            display: "flex",
            alignItems: "center",
            padding: collapsed ? "0 16px" : "0 22px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            justifyContent: collapsed ? "center" : "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #0d9488 0%, #0284c7 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 12px rgba(13, 148, 136, 0.4)",
                flexShrink: 0,
              }}
            >
              <ShieldOutlined style={{ fontSize: "24px", color: "#ffffff" }} />
            </div>
            {!collapsed && (
              <div>
                <h1
                  style={{
                    fontSize: "17px",
                    fontWeight: "800",
                    letterSpacing: "-0.3px",
                    margin: 0,
                    background: "linear-gradient(90deg, #ffffff 0%, #cbd5e1 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  HealthChain
                </h1>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    color: "#0d9488",
                  }}
                >
                  Blockchain EHR
                </span>
              </div>
            )}
          </div>

          {onToggleCollapse && !collapsed && (
            <button
              onClick={onToggleCollapse}
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "none",
                color: "#94a3b8",
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s",
              }}
              title="Collapse Sidebar"
            >
              <ChevronLeftOutlined style={{ fontSize: "18px" }} />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {NAVIGATION_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: collapsed ? "12px 0" : "12px 16px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  borderRadius: "10px",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: isActive ? "700" : "500",
                  color: isActive ? "#ffffff" : "#94a3b8",
                  background: isActive
                    ? "linear-gradient(90deg, rgba(13, 148, 136, 0.25) 0%, rgba(2, 132, 199, 0.1) 100%)"
                    : "transparent",
                  borderLeft: isActive ? "3px solid #0d9488" : "3px solid transparent",
                  boxShadow: isActive ? "0 4px 12px rgba(13, 148, 136, 0.15)" : "none",
                  transition: "all 0.18s ease",
                }}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  style={{
                    fontSize: "22px",
                    color: isActive ? "#0d9488" : "#94a3b8",
                    transition: "color 0.18s",
                  }}
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Logout */}
      <div
        style={{
          padding: "16px 12px",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {!collapsed && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "8px 10px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.04)",
            }}
          >
            <AccountCircleOutlined style={{ fontSize: "32px", color: "#0ea5e9" }} />
            <div style={{ overflow: "hidden" }}>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#f8fafc",
                  margin: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {userEmail.split("@")[0]}
              </p>
              <span
                style={{
                  fontSize: "11px",
                  color: "#0d9488",
                  fontWeight: "600",
                  textTransform: "capitalize",
                }}
              >
                {userRole}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            justifyContent: collapsed ? "center" : "flex-start",
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid rgba(244, 63, 94, 0.2)",
            background: "rgba(244, 63, 94, 0.06)",
            color: "#f43f5e",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          title="Sign Out"
        >
          <LogoutOutlined style={{ fontSize: "18px" }} />
          {!collapsed && <span>Logout Session</span>}
        </button>

        {onToggleCollapse && collapsed && (
          <button
            onClick={onToggleCollapse}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "none",
              color: "#94a3b8",
              height: "32px",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
              marginTop: "4px",
            }}
            title="Expand Sidebar"
          >
            <ChevronRightOutlined style={{ fontSize: "18px" }} />
          </button>
        )}
      </div>
    </div>
  );
}