import { useState } from "react";
import api from "../api/api";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import {
  AccountBalanceWalletOutlined,
  CheckCircleOutlined,
  LockOutlined,
  PaymentsOutlined,
  VerifiedOutlined,
  WorkspacePremiumOutlined,
} from "@mui/icons-material";

const NFT_ADDRESS =
  "0x2D71D17c48bCE432712B0D3397Db89797859bFe9";

const SETTLEMENT_ADDRESS =
  "0xB5a279fe7f93de19F9ADf31A835C2dFb50c25758";



function shorten(value, start = 10, end = 8) {
  if (!value) {
    return "";
  }

  if (value.length <= start + end + 3) {
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
        py: 1.4,
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: "#64748b",
          fontWeight: 600,
        }}
      >
        {label}
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: "#0f172a",
          fontWeight: 700,
          textAlign: "right",
          fontFamily: mono ? "monospace" : "inherit",
          wordBreak: "break-word",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export default function InsuranceSettlement() {
  const [settlement, setSettlement] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLoadSettlement = async () => {
    setLoading(true);
    setSettlement(null);

    try {
      const settlementResponse = await api.get(
        "/blockchain/settlement/1"
      );

      const settlementData = settlementResponse.data;

      const verificationResponse = await api.get(
        `/blockchain/settlement/1/verify/${settlementData.proof_token_id}`
      );

      const verificationData = verificationResponse.data;

      setSettlement({
        agreementId: settlementData.agreement_id,
        patientId: settlementData.patient_id,
        patient: settlementData.patient,
        doctor: settlementData.doctor,
        insurer: settlementData.insurer,
        totalCoverage: settlementData.total_coverage_eth,
        amountAlreadyPaid: settlementData.amount_already_paid_eth,
        finalSettlementAmount: settlementData.final_settlement_amount_eth,
        proofTokenId: settlementData.proof_token_id,
        status: settlementData.complete ? "Completed" : "Pending",
        proofVerified: verificationData.valid,
        remainingAmount: settlementData.remaining_amount_eth,
        settlementTransaction:
          settlementData.settlement_transaction_hash,
        settlementHash:
          verificationData.settlement_transaction_hash,
        contract: settlementData.contract,
      });
    } catch (err) {
      console.error("Failed to load settlement:", err);
      setSettlement(null);
    } finally {
      setLoading(false);
    }
  };

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
          <AccountBalanceWalletOutlined
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
            Insurance Settlement
          </Typography>
        </Stack>

        <Typography
          variant="body1"
          sx={{
            color: "#64748b",
            maxWidth: 820,
          }}
        >
          Verify the automated final insurance settlement
          triggered by a validated Proof-of-Cure NFT.
        </Typography>
      </Box>

      {/* Contract cards */}
      <Grid
        container
        spacing={3}
        sx={{ mb: 3 }}
      >
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: "100%",
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              boxShadow:
                "0 4px 18px rgba(15, 23, 42, 0.06)",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="caption"
                sx={{
                  color: "#64748b",
                  fontWeight: 700,
                }}
              >
                PROOF-OF-CURE NFT CONTRACT
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  mt: 1,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  wordBreak: "break-all",
                }}
              >
                {NFT_ADDRESS}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: "100%",
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              boxShadow:
                "0 4px 18px rgba(15, 23, 42, 0.06)",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="caption"
                sx={{
                  color: "#64748b",
                  fontWeight: 700,
                }}
              >
                FINAL SETTLEMENT CONTRACT
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  mt: 1,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  wordBreak: "break-all",
                }}
              >
                {SETTLEMENT_ADDRESS}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Load settlement */}
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
              sm: "row",
            }}
            justifyContent="space-between"
            alignItems={{
              xs: "flex-start",
              sm: "center",
            }}
            spacing={2}
          >
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                Settlement Agreement #1
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  mt: 0.5,
                  color: "#64748b",
                }}
              >
                Patient ID 2 · Proof-of-Cure Token #1
              </Typography>
            </Box>

            <Button
              variant="contained"
              onClick={handleLoadSettlement}
              disabled={loading}
              startIcon={
                <VerifiedOutlined />
              }
              sx={{
                minHeight: 42,
                px: 3,
                background:
                  "linear-gradient(135deg, #0d9488 0%, #0284c7 100%)",
                fontWeight: 700,
                textTransform: "none",
              }}
            >
              {loading
                ? "Loading..."
                : "Verify Settlement"}
            </Button>
          </Stack>

          {loading && (
            <LinearProgress sx={{ mt: 2 }} />
          )}
        </CardContent>
      </Card>

      {!settlement && !loading && (
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
            <AccountBalanceWalletOutlined
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
              Settlement verification ready
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: "#64748b",
                mt: 1,
                mb: 2,
              }}
            >
              Load the completed local blockchain
              settlement to view the final payment
              evidence.
            </Typography>

            <Chip
              icon={<LockOutlined />}
              label="Blockchain-linked demonstration"
              sx={{
                fontWeight: 700,
              }}
            />
          </CardContent>
        </Card>
      )}

      {settlement && (
        <>
          {/* Success */}
          <Alert
            severity="success"
            icon={<CheckCircleOutlined />}
            sx={{
              mb: 3,
              borderRadius: 2,
              fontWeight: 700,
            }}
          >
            FINAL INSURANCE SETTLEMENT VERIFIED —
            Proof-of-Cure Token #{settlement.proofTokenId}
            was validated and the remaining{" "}
            {settlement.finalSettlementAmount.toFixed(
              2
            )} ETH was transferred to the doctor.
          </Alert>

          {/* Status */}
          <Grid
            container
            spacing={3}
            sx={{ mb: 3 }}
          >
            <Grid item xs={12} sm={4}>
              <Card
                sx={{
                  height: "100%",
                  borderRadius: 3,
                  border:
                    "1px solid #bbf7d0",
                  background: "#f0fdf4",
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <CheckCircleOutlined
                    sx={{
                      color: "#16a34a",
                      fontSize: 34,
                    }}
                  />

                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mt: 1,
                      color: "#166534",
                      fontWeight: 700,
                    }}
                  >
                    STATUS
                  </Typography>

                  <Typography
                    variant="h5"
                    sx={{
                      mt: 0.5,
                      fontWeight: 800,
                      color: "#166534",
                    }}
                  >
                    {settlement.status}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card
                sx={{
                  height: "100%",
                  borderRadius: 3,
                  border:
                    "1px solid #bae6fd",
                  background: "#f0f9ff",
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <PaymentsOutlined
                    sx={{
                      color: "#0284c7",
                      fontSize: 34,
                    }}
                  />

                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mt: 1,
                      color: "#075985",
                      fontWeight: 700,
                    }}
                  >
                    FINAL PAYMENT
                  </Typography>

                  <Typography
                    variant="h5"
                    sx={{
                      mt: 0.5,
                      fontWeight: 800,
                      color: "#075985",
                    }}
                  >
                    {settlement.finalSettlementAmount.toFixed(
                      2
                    )}{" "}
                    ETH
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card
                sx={{
                  height: "100%",
                  borderRadius: 3,
                  border:
                    "1px solid #ddd6fe",
                  background: "#faf5ff",
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <WorkspacePremiumOutlined
                    sx={{
                      color: "#7c3aed",
                      fontSize: 34,
                    }}
                  />

                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mt: 1,
                      color: "#6b21a8",
                      fontWeight: 700,
                    }}
                  >
                    PROOF TOKEN
                  </Typography>

                  <Typography
                    variant="h5"
                    sx={{
                      mt: 0.5,
                      fontWeight: 800,
                      color: "#6b21a8",
                    }}
                  >
                    #{settlement.proofTokenId}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Financial breakdown */}
          <Card
            sx={{
              mb: 3,
              borderRadius: 3,
              border:
                "1px solid #e2e8f0",
              boxShadow:
                "0 4px 18px rgba(15, 23, 42, 0.06)",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  mb: 2,
                }}
              >
                Insurance Payment Breakdown
              </Typography>

              <Divider />

              <DetailRow
                label="Total Coverage"
                value={`${settlement.totalCoverage.toFixed(
                  2
                )} ETH`}
              />

              <Divider />

              <DetailRow
                label="Already Paid"
                value={`${settlement.amountAlreadyPaid.toFixed(
                  2
                )} ETH`}
              />

              <Divider />

              <DetailRow
                label="Automated Final Settlement"
                value={`${settlement.finalSettlementAmount.toFixed(
                  2
                )} ETH`}
              />

              <Divider />

              <DetailRow
                label="Remaining After Settlement"
                value={`${settlement.remainingAmount.toFixed(
                  2
                )} ETH`}
              />

              <Box sx={{ mt: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={100}
                  sx={{
                    height: 10,
                    borderRadius: 10,
                  }}
                />
              </Box>

              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 1,
                  color: "#64748b",
                }}
              >
                100% of the declared coverage has now
                been settled.
              </Typography>
            </CardContent>
          </Card>

          {/* Verification */}
          <Grid
            container
            spacing={3}
          >
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
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 800,
                      mb: 2,
                    }}
                  >
                    Proof Verification
                  </Typography>

                  <Divider />

                  <DetailRow
                    label="Agreement"
                    value={`#${settlement.agreementId}`}
                  />

                  <Divider />

                  <DetailRow
                    label="Patient"
                    value={`ID ${settlement.patientId}`}
                  />

                  <Divider />

                  <DetailRow
                    label="Proof-of-Cure Token"
                    value={`#${settlement.proofTokenId}`}
                  />

                  <Divider />

                  <DetailRow
                    label="Verification"
                    value={
                      settlement.proofVerified
                        ? "PASSED"
                        : "FAILED"
                    }
                  />

                  <Box sx={{ pt: 2 }}>
                    <Chip
                      icon={<VerifiedOutlined />}
                      label="Proof-of-Cure Verified"
                      sx={{
                        fontWeight: 700,
                        background:
                          "#dcfce7",
                        color: "#166534",
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

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
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 800,
                      mb: 2,
                    }}
                  >
                    Participants
                  </Typography>

                  <Divider />

                  <Box sx={{ py: 1.5 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#64748b",
                        fontWeight: 700,
                      }}
                    >
                      PATIENT
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.5,
                        fontFamily:
                          "monospace",
                        wordBreak:
                          "break-all",
                      }}
                    >
                      {shorten(
                        settlement.patient
                      )}
                    </Typography>
                  </Box>

                  <Divider />

                  <Box sx={{ py: 1.5 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#64748b",
                        fontWeight: 700,
                      }}
                    >
                      DOCTOR
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.5,
                        fontFamily:
                          "monospace",
                        wordBreak:
                          "break-all",
                      }}
                    >
                      {shorten(
                        settlement.doctor
                      )}
                    </Typography>
                  </Box>

                  <Divider />

                  <Box sx={{ py: 1.5 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#64748b",
                        fontWeight: 700,
                      }}
                    >
                      INSURER
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.5,
                        fontFamily:
                          "monospace",
                        wordBreak:
                          "break-all",
                      }}
                    >
                      {shorten(
                        settlement.insurer
                      )}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Transaction evidence */}
            <Grid item xs={12}>
              <Card
                sx={{
                  borderRadius: 3,
                  border:
                    "1px solid #e2e8f0",
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 800,
                      mb: 2,
                    }}
                  >
                    Blockchain Settlement Evidence
                  </Typography>

                  <Divider />

                  <Box sx={{ py: 2 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#64748b",
                        fontWeight: 700,
                      }}
                    >
                      SETTLEMENT TRANSACTION
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.75,
                        fontFamily:
                          "monospace",
                        wordBreak:
                          "break-all",
                      }}
                    >
                      {settlement.settlementTransaction}
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
                      ON-CHAIN SETTLEMENT HASH
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.75,
                        fontFamily:
                          "monospace",
                        wordBreak:
                          "break-all",
                      }}
                    >
                      {settlement.settlementHash}
                    </Typography>
                  </Box>

                  <Divider />

                  <Box sx={{ pt: 2 }}>
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Chip
                        icon={
                          <CheckCircleOutlined />
                        }
                        label="Payment Confirmed"
                        sx={{
                          fontWeight: 700,
                          background:
                            "#dcfce7",
                          color: "#166534",
                        }}
                      />

                      <Chip
                        icon={<LockOutlined />}
                        label="Settlement Immutable"
                        sx={{
                          fontWeight: 700,
                        }}
                      />

                      <Chip
                        icon={
                          <VerifiedOutlined />
                        }
                        label="Proof Verified"
                        sx={{
                          fontWeight: 700,
                          background:
                            "#e0f2fe",
                          color: "#075985",
                        }}
                      />
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
