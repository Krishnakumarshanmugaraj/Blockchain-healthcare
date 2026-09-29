import {
  AccountBalanceWalletOutlined,
  CloudUploadOutlined,
  DashboardOutlined,
  DescriptionOutlined,
  HealthAndSafetyOutlined,
  PeopleOutlined,
  PsychologyOutlined,
  VerifiedOutlined,
  WorkspacePremiumOutlined,
  LogoutOutlined,
} from "@mui/icons-material";
import {
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

const menuItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: <DashboardOutlined />,
  },
  {
    label: "Patients",
    path: "/patients",
    icon: <PeopleOutlined />,
  },
  {
    label: "Medical Records",
    path: "/records",
    icon: <DescriptionOutlined />,
  },
  {
    label: "Upload Record",
    path: "/upload",
    icon: <CloudUploadOutlined />,
  },
  {
    label: "Verify Integrity",
    path: "/verify",
    icon: <VerifiedOutlined />,
  },
  {
    label: "Recovery Prediction",
    path: "/recovery-prediction",
    icon: <PsychologyOutlined />,
  },
  {
    label: "ZKP",
    path: "/zkp",
    icon: <HealthAndSafetyOutlined />,
  },
  {
    label: "Proof of Cure",
    path: "/proof-of-cure",
    icon: <WorkspacePremiumOutlined />,
  },
  {
    label: "Insurance Settlement",
    path: "/insurance-settlement",
    icon: <AccountBalanceWalletOutlined />,
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_role");

    navigate("/", {
      replace: true,
    });
  };

  return (
    <Box
      sx={{
        width: 280,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(180deg, #0f172a 0%, #111c31 100%)",
        color: "#ffffff",
        borderRight:
          "1px solid rgba(148, 163, 184, 0.12)",
      }}
    >
      {/* Brand */}
      <Box
        sx={{
          px: 2.5,
          py: 2.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(135deg, #0d9488 0%, #0284c7 100%)",
            boxShadow:
              "0 0 22px rgba(14, 165, 233, 0.25)",
          }}
        >
          <HealthAndSafetyOutlined
            sx={{
              color: "#ffffff",
              fontSize: 30,
            }}
          />
        </Box>

        <Box>
          <Typography
            sx={{
              fontSize: 18,
              fontWeight: 800,
              lineHeight: 1.1,
            }}
          >
            HealthChain
          </Typography>

          <Typography
            sx={{
              mt: 0.4,
              fontSize: 10,
              letterSpacing: 1.4,
              fontWeight: 700,
              color: "#14b8a6",
            }}
          >
            BLOCKCHAIN EHR
          </Typography>
        </Box>
      </Box>

      <Divider
        sx={{
          borderColor:
            "rgba(148, 163, 184, 0.12)",
        }}
      />

      {/* Navigation */}
      <List
        sx={{
          px: 1.5,
          py: 2,
          flex: 1,
        }}
      >
        {menuItems.map((item) => {
          const selected =
            location.pathname === item.path;

          return (
            <ListItemButton
              key={item.path}
              selected={selected}
              onClick={() =>
                navigate(item.path)
              }
              sx={{
                minHeight: 48,
                mb: 0.6,
                px: 1.5,
                borderRadius: 2,
                color: selected
                  ? "#ffffff"
                  : "#94a3b8",
                borderLeft: selected
                  ? "3px solid #14b8a6"
                  : "3px solid transparent",
                backgroundColor: selected
                  ? "rgba(14, 165, 233, 0.14)"
                  : "transparent",
                "&:hover": {
                  backgroundColor:
                    "rgba(14, 165, 233, 0.10)",
                  color: "#ffffff",
                },
                "&.Mui-selected": {
                  backgroundColor:
                    "rgba(14, 165, 233, 0.14)",
                },
                "&.Mui-selected:hover": {
                  backgroundColor:
                    "rgba(14, 165, 233, 0.18)",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: "inherit",
                }}
              >
                {item.icon}
              </ListItemIcon>

              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: 14,
                  fontWeight: selected
                    ? 700
                    : 600,
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Divider
        sx={{
          borderColor:
            "rgba(148, 163, 184, 0.12)",
        }}
      />

      {/* Current User */}
      <Box
        sx={{
          mx: 1.5,
          mt: 1.5,
          p: 1.5,
          borderRadius: 2,
          background:
            "rgba(148, 163, 184, 0.08)",
        }}
      >
        <Typography
          sx={{
            fontSize: 12,
            color: "#94a3b8",
            mb: 0.5,
          }}
        >
          Signed in as
        </Typography>

        <Typography
          sx={{
            fontSize: 14,
            fontWeight: 700,
            color: "#f8fafc",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {localStorage.getItem(
            "user_email"
          ) || "Healthcare User"}
        </Typography>

        <Typography
          sx={{
            mt: 0.4,
            fontSize: 11,
            fontWeight: 700,
            color: "#14b8a6",
            textTransform: "uppercase",
          }}
        >
          {localStorage.getItem(
            "user_role"
          ) || "User"}
        </Typography>
      </Box>

      {/* Logout */}
      <Box sx={{ p: 1.5 }}>
        <ListItemButton
          onClick={handleLogout}
          sx={{
            minHeight: 46,
            borderRadius: 2,
            color: "#f87171",
            border:
              "1px solid rgba(248, 113, 113, 0.25)",
            "&:hover": {
              background:
                "rgba(248, 113, 113, 0.10)",
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 40,
              color: "inherit",
            }}
          >
            <LogoutOutlined />
          </ListItemIcon>

          <ListItemText
            primary="Logout Session"
            primaryTypographyProps={{
              fontSize: 14,
              fontWeight: 700,
            }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );
}
