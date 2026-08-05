import { useState, useEffect } from "react";
import {
  MenuOutlined,
  WifiTetheringOutlined,
  NotificationsNoneOutlined,
  PersonOutlined,
  LockOutlined,
} from "@mui/icons-material";

export default function Topbar({ onToggleSidebar, isMobile }) {
  const [timeStr, setTimeStr] = useState("");
  const userEmail = localStorage.getItem("user_email") || "admin@healthchain.org";
  const userRole = localStorage.getItem("user_role") || "Administrator";

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      style={{
        height: "72px",
        background: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px",
        position: "sticky",
        top: 0,
        zIndex: 90,
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.02)",
      }}
    >
      {/* Left section: Toggle & Title */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <button
          onClick={onToggleSidebar}
          style={{
            background: "#f1f5f9",
            border: "none",
            color: "#334155",
            width: "38px",
            height: "38px",
            borderRadius: "8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s",
          }}
          title="Toggle Sidebar Menu"
        >
          <MenuOutlined style={{ fontSize: "20px" }} />
        </button>

        <div>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "700",
              color: "#0f172a",
              margin: 0,
              letterSpacing: "-0.2px",
            }}
          >
            Healthcare Management System
          </h2>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>
            Decentralized Cryptographic Ledger & EHR
          </span>
        </div>
      </div>

      {/* Right section: System Status, Date & User Profile */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        {/* Blockchain Node Badge */}
        {!isMobile && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "20px",
              background: "#f0fdfa",
              border: "1px solid #ccfbf1",
            }}
          >
            <WifiTetheringOutlined style={{ fontSize: "16px", color: "#0d9488" }} />
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#0f766e" }}>
              Node Online (SHA-256)
            </span>
          </div>
        )}

        {/* Date Time Badge */}
        {!isMobile && (
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
            {timeStr}
          </span>
        )}

        {/* Quick notification bell */}
        <div
          style={{
            position: "relative",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#475569",
            cursor: "pointer",
          }}
          title="Notifications"
        >
          <NotificationsNoneOutlined style={{ fontSize: "20px" }} />
          <span
            style={{
              position: "absolute",
              top: "6px",
              right: "6px",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#10b981",
            }}
          />
        </div>

        {/* User Card Chip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "4px 8px 4px 12px",
            borderRadius: "24px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
              {userEmail.split("@")[0]}
            </p>
            <span
              style={{
                fontSize: "10px",
                fontWeight: "700",
                color: "#0284c7",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {userRole}
            </span>
          </div>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #0284c7 0%, #0d9488 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "700",
              fontSize: "14px",
            }}
          >
            {userEmail.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}