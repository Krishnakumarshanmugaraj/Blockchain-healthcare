
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  VerifiedOutlined,
  WorkspacePremiumOutlined,
  LinkOutlined,
  SecurityOutlined,
} from "@mui/icons-material";

import api from "../api/api";

const NFT_ADDRESS =
  "0x2D71D17c48bCE432712B0D3397Db89797859bFe9";

function shorten(value, start = 10, end = 8) {
  if (!value || value.length <= start + end + 3) {
    return value;
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function DetailRow({ label, value, mono = false }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 2,
        py: 1.25,
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: "#64748b",
          fontWeight: 600,
          minWidth: 160,
        }}
      >
        {label}
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: "#0f172a",
          fontWeight: 600,
          textAlign: "right",
          wordBreak: "break-word",
          fontFamily: mono ? "monospace" : "inherit",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export default function ProofOfCure() {
  const [tokenId, setTokenId] = useState("1");
  const [proof, setProof] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLoadProof = async () => {
    setError("");
    setProof(null);

    const parsedTokenId = Number(tokenId);

    if (
      !Number.isInteger(parsedTokenId) ||
      parsedTokenId <= 0
    ) {
      setError(
        "Please enter a valid Proof-of-Cure token ID."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await api.get(
        `/blockchain/proof-of-cure/${parsedTokenId}`
      );

      const data = response.data;

      if (!data || data.success === false) {
        throw new Error(
          data?.message ||
            `Proof-of-Cure token ${parsedTokenId} was not found.`
        );
      }

      setProof(data);
    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Unable to load the Proof-of-Cure record.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const recoveryProbability =
    proof?.recovery_probability_percent ??
    (typeof proof?.recovery_probability === "number"
      ? proof.recovery_probability / 100
      : 0);

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{ mb: 1 }}
        >
          <WorkspacePremiumOutlined
            sx={{
              fontSize: 38,
              color: "#0d9488",
            }}
          />

          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: "#0f172a",
            }}
          >
            Proof of Cure
          </Typography>
        </Stack>

        <Typography
          variant="body1"
          sx={{
            color: "#64748b",
            maxWidth: 800,
          }}
        >
          Verify the on-chain Proof-of-Cure NFT linking
          the patient's treatment agreement, medical
          record, AI recovery prediction, and
          zero-knowledge proof.
        </Typography>
      </Box>

      {/* Contract information */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          boxShadow:
            "0 4px 18px rgba(15, 23, 42, 0.06)",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack
            direction={{
              xs: "column",
              md: "row",
            }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{
              xs: "flex-start",
              md: "center",
            }}
          >
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  color: "#64748b",
                  mb: 0.5,
                }}
              >
                Proof-of-Cure NFT Contract
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  fontFamily: "monospace",
                  fontWeight: 700,
                  color: "#0f172a",
                  wordBreak: "break-all",
                }}
              >
                {proof?.contract || NFT_ADDRESS}
              </Typography>
            </Box>

            <Chip
              icon={<VerifiedOutlined />}
              label="Local Blockchain Verified"
              sx={{
                fontWeight: 700,
                background: "#dcfce7",
                color: "#166534",
              }}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Token lookup */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          boxShadow:
            "0 4px 18px rgba(15, 23, 42, 0.06)",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color: "#0f172a",
              mb: 2,
            }}
          >
            Find Proof-of-Cure NFT
          </Typography>

          <Stack
            direction={{
              xs: "column",
              sm: "row",
            }}
            spacing={2}
            alignItems={{
              xs: "stretch",
              sm: "center",
            }}
          >
            <TextField
              label="Token ID"
              value={tokenId}
              onChange={(event) =>
                setTokenId(event.target.value)
              }
              type="number"
              inputProps={{ min: 1 }}
              sx={{ minWidth: 260 }}
            />

            <Button
              variant="contained"
              onClick={handleLoadProof}
              disabled={loading}
              startIcon={<VerifiedOutlined />}
              sx={{
                minHeight: 48,
                px: 3,
                background:
                  "linear-gradient(135deg, #0d9488 0%, #0284c7 100%)",
                fontWeight: 700,
                textTransform: "none",
              }}
            >
              {loading
                ? "Loading..."
                : "Verify Proof"}
            </Button>
          </Stack>

          {error && (
            <Alert
              severity="error"
              sx={{
                mt: 2,
                borderRadius: 2,
              }}
            >
              {error}
            </Alert>
          )}
        </CardContent>
      </Card>

      {!proof && !loading && !error && (
        <Card
          sx={{
            borderRadius: 3,
            border: "1px dashed #cbd5e1",
            background: "#f8fafc",
          }}
        >
          <CardContent
            sx={{
              p: 5,
              textAlign: "center",
            }}
          >
            <WorkspacePremiumOutlined
              sx={{
                fontSize: 56,
                color: "#94a3b8",
                mb: 1,
              }}
            />

            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: "#334155",
              }}
            >
              Enter a token ID to verify
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: "#64748b",
                mt: 1,
              }}
            >
              Use Token ID 1 for the current local
              blockchain demonstration.
            </Typography>
          </CardContent>
        </Card>
      )}

      {proof && (
        <>
          {/* Verification banner */}
          <Alert
            severity="success"
            icon={<VerifiedOutlined />}
            sx={{
              mb: 3,
              borderRadius: 2,
              fontWeight: 700,
            }}
          >
            ZERO-KNOWLEDGE / ON-CHAIN PROOF VERIFIED —
            Proof-of-Cure Token #{proof.token_id} belongs
            to the registered patient and is linked to
            Agreement #{proof.agreement_id}.
          </Alert>

          {/* Main evidence */}
          <Grid
            container
            spacing={3}
            sx={{ mb: 3 }}
          >
            {/* NFT Details */}
            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  height: "100%",
                  borderRadius: 3,
                  border:
                    "1px solid #e2e8f0",
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{ mb: 2 }}
                  >
                    <WorkspacePremiumOutlined
                      sx={{
                        color: "#0d9488",
                        fontSize: 30,
                      }}
                    />

                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 800,
                      }}
                    >
                      NFT Details
                    </Typography>
                  </Stack>

                  <Divider />

                  <DetailRow
                    label="Token ID"
                    value={`#${proof.token_id}`}
                  />

                  <Divider />

                  <DetailRow
                    label="Agreement ID"
                    value={`#${proof.agreement_id}`}
                  />

                  <Divider />

                  <DetailRow
                    label="Patient ID"
                    value={`P${String(
                      proof.patient_id
                    ).padStart(2, "0")}`}
                  />

                  <Divider />

                  <DetailRow
                    label="Medical Record"
                    value={proof.record_id}
                  />

                  <Divider />

                  <DetailRow
                    label="NFT Owner"
                    value={shorten(proof.owner)}
                    mono
                  />

                  <Box sx={{ pt: 2 }}>
                    <Chip
                      icon={<VerifiedOutlined />}
                      label="Ownership Verified"
                      sx={{
                        fontWeight: 700,
                        background: "#dcfce7",
                        color: "#166534",
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Recovery Evidence */}
            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  height: "100%",
                  borderRadius: 3,
                  border:
                    "1px solid #e2e8f0",
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{ mb: 2 }}
                  >
                    <SecurityOutlined
                      sx={{
                        color: "#0284c7",
                        fontSize: 30,
                      }}
                    />

                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 800,
                      }}
                    >
                      Recovery Evidence
                    </Typography>
                  </Stack>

                  <Divider />

                  <DetailRow
                    label="AI Model"
                    value={
                      proof.recovery_model_version
                    }
                  />

                  <Divider />

                  <DetailRow
                    label="Recovery Probability"
                    value={`${recoveryProbability.toFixed(
                      2
                    )}%`}
                  />

                  <Box
                    sx={{
                      mt: 2,
                      height: 14,
                      borderRadius: 10,
                      background: "#e2e8f0",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            recoveryProbability
                          )
                        )}%`,
                        height: "100%",
                        background:
                          "linear-gradient(90deg, #0d9488 0%, #0284c7 100%)",
                        borderRadius: 10,
                      }}
                    />
                  </Box>

                  <Chip
                    label="Recovery prediction linked on-chain"
                    sx={{
                      mt: 2,
                      fontWeight: 700,
                      background: "#e0f2fe",
                      color: "#075985",
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Participants */}
          <Card
            sx={{
              mb: 3,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <LinkOutlined
                  sx={{
                    color: "#0d9488",
                    fontSize: 30,
                  }}
                />

                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                  }}
                >
                  Participants
                </Typography>
              </Stack>

              <Divider />

              <Grid
                container
                spacing={3}
                sx={{ mt: 0.5 }}
              >
                <Grid item xs={12} md={6}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#64748b",
                      fontWeight: 700,
                    }}
                  >
                    PATIENT ADDRESS
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{
                      mt: 0.5,
                      fontFamily: "monospace",
                      wordBreak: "break-all",
                      fontWeight: 600,
                    }}
                  >
                    {proof.patient}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#64748b",
                      fontWeight: 700,
                    }}
                  >
                    DOCTOR ADDRESS
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{
                      mt: 0.5,
                      fontFamily: "monospace",
                      wordBreak: "break-all",
                      fontWeight: 600,
                    }}
                  >
                    {proof.doctor}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Hash evidence */}
          <Card
            sx={{
              mb: 3,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <SecurityOutlined
                  sx={{
                    color: "#7c3aed",
                    fontSize: 30,
                  }}
                />

                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                  }}
                >
                  Cryptographic Evidence
                </Typography>
              </Stack>

              <Divider />

              <Box sx={{ py: 2 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#64748b",
                    fontWeight: 700,
                  }}
                >
                  ZERO-KNOWLEDGE PROOF HASH
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    mt: 0.75,
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                    fontWeight: 600,
                  }}
                >
                  {proof.zk_proof_hash}
                </Typography>
              </Box>

              <Divider />

              <Box sx={{ py: 2 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#64748b",
                    fontWeight: 700,
                  }}
                >
                  MEDICAL RECORD HASH
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    mt: 0.75,
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                    fontWeight: 600,
                  }}
                >
                  {proof.medical_record_hash}
                </Typography>
              </Box>

              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
              >
                <Chip
                  icon={<VerifiedOutlined />}
                  label="ZKP Hash Verified"
                  sx={{
                    fontWeight: 700,
                    background: "#dcfce7",
                    color: "#166534",
                  }}
                />

                <Chip
                  icon={<SecurityOutlined />}
                  label="Medical Record Hash Linked"
                  sx={{
                    fontWeight: 700,
                    background: "#e0f2fe",
                    color: "#075985",
                  }}
                />

                <Chip
                  icon={<WorkspacePremiumOutlined />}
                  label="NFT Evidence Stored On-Chain"
                  sx={{
                    fontWeight: 700,
                    background: "#f3e8ff",
                    color: "#6b21a8",
                  }}
                />
              </Stack>
            </CardContent>
          </Card>

          {/* Blockchain evidence */}
          <Card
            sx={{
              borderRadius: 3,
              border: "1px solid #e2e8f0",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  mb: 2,
                }}
              >
                Blockchain Evidence
              </Typography>

              <Divider />

              <DetailRow
                label="Contract"
                value={proof.contract}
                mono
              />

              <Divider />

              <DetailRow
                label="Proof Exists"
                value={
                  proof.proof_exists
                    ? "YES"
                    : "NO"
                }
              />

              <Divider />

              <DetailRow
                label="NFT Owner"
                value={proof.owner}
                mono
              />

              <Divider />

              <DetailRow
                label="Minted At"
                value={
                  proof.minted_at
                    ? new Date(
                        Number(proof.minted_at) *
                          1000
                      ).toLocaleString()
                    : "Available on-chain"
                }
              />

              <Box sx={{ pt: 2 }}>
                <Chip
                  icon={<VerifiedOutlined />}
                  label="On-Chain Proof Verified"
                  sx={{
                    fontWeight: 700,
                    background: "#dcfce7",
                    color: "#166534",
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
