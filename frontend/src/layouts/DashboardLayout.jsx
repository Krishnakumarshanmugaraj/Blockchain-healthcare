import { useState, useEffect, useCallback, useMemo, Component } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 76;
const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;
const STORAGE_KEY = "healthchain:sidebar-collapsed";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("Dashboard content crash:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <h3 style={{ color: "#0f172a", marginBottom: "8px" }}>Something went wrong</h3>
          <p style={{ color: "#64748b", marginBottom: "16px" }}>
            An unexpected error occurred while loading this panel.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              padding: "8px 18px",
              background: "#0d9488",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Retry Section
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function DashboardLayout({ children }) {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1280
  );
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < MOBILE_BREAKPOINT;
  const isTablet = windowWidth >= MOBILE_BREAKPOINT && windowWidth < TABLET_BREAKPOINT;
  const effectiveCollapsed = isTablet ? true : collapsed;

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem(STORAGE_KEY, String(next));
        } catch {}
        return next;
      });
    }
  }, [isMobile]);

  const closeMobileSidebar = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const currentSidebarWidth = effectiveCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f6f8fa" }}>
      {/* Mobile Drawer Backdrop */}
      {isMobile && mobileOpen && (
        <div
          onClick={closeMobileSidebar}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 950,
          }}
        />
      )}

      {/* Sidebar Container */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 1000,
          transform: isMobile && !mobileOpen ? "translateX(-100%)" : "translateX(0)",
          transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <Sidebar
          collapsed={isMobile ? false : effectiveCollapsed}
          onToggleCollapse={isMobile ? undefined : toggleSidebar}
          onNavigate={closeMobileSidebar}
        />
      </aside>

      {/* Main Content Body */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          marginLeft: isMobile ? "0px" : `${currentSidebarWidth}px`,
          transition: "margin-left 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          minWidth: 0,
        }}
      >
        <Topbar onToggleSidebar={toggleSidebar} isMobile={isMobile} />

        <main style={{ flex: 1, padding: isMobile ? "20px 16px" : "32px 36px" }}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>

        <footer
          style={{
            padding: "18px 36px",
            borderTop: "1px solid #e2e8f0",
            background: "#ffffff",
            color: "#64748b",
            fontSize: "13px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <span>
            &copy; {new Date().getFullYear()} HealthChain Network. Cryptographically Secured EHR
            Platform.
          </span>
          <div style={{ display: "flex", gap: "16px", fontWeight: "600", fontSize: "12px" }}>
            <span style={{ color: "#0d9488" }}>● SHA-256 Ledger Active</span>
            <span>FastAPI Backend v1.0</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
