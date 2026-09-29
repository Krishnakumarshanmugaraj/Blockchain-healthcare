import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  TextField,
  Typography,
} from "@mui/material";

import api from "../api/api";

const P = 23n;
const Q = 11n;
const G = 2n;
const PROTOCOL_VERSION = "Schnorr-ZKP-v1.0";

function modPow(base, exponent, modulus) {
  let result = 1n;
  let current = base % modulus;
  let power = exponent;

  while (power > 0n) {
    if (power % 2n === 1n) {
      result = (result * current) % modulus;
    }

    current = (current * current) % modulus;
    power = power / 2n;
  }

  return result;
}

async function sha256ToInteger(text) {
  const data = new TextEncoder().encode(text);

  const hashBuffer = await window.crypto.subtle.digest(
    "SHA-256",
    data
  );

  const hashBytes = new Uint8Array(hashBuffer);

  let value = 0n;

  for (const byte of hashBytes) {
    value = (value << 8n) + BigInt(byte);
  }

  return value;
}

async function calculateChallenge(
  publicKey,
  commitment,
  message
) {
  const payload =
    `${PROTOCOL_VERSION}|` +
    `${P}|` +
    `${Q}|` +
    `${G}|` +
    `${publicKey}|` +
    `${commitment}|` +
    `${message}`;

  const digestValue = await sha256ToInteger(payload);

  return digestValue % Q;
}

function randomNonce() {
  const values = new Uint32Array(1);

  window.crypto.getRandomValues(values);

  return BigInt(values[0] % Number(Q - 1n)) + 1n;
}

function ZKP() {
  const [privateSecret, setPrivateSecret] = useState("7");
  const [message, setMessage] = useState(
    "recovery-record-R002"
  );

  const [proof, setProof] = useState(null);
  const [verification, setVerification] = useState(null);
  const [protocolInfo, setProtocolInfo] = useState(null);

  const [loading, setLoading] = useState(false);
  const [infoLoading, setInfoLoading] = useState(false);

  const [error, setError] = useState("");

  const loadProtocolInfo = async () => {
    setInfoLoading(true);
    setError("");

    try {
      const response = await api.get("/zkp/info");
      setProtocolInfo(response.data);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Unable to load ZKP protocol information."
      );
    } finally {
      setInfoLoading(false);
    }
  };

  const generateAndVerifyProof = async () => {
    setLoading(true);
    setError("");
    setProof(null);
    setVerification(null);

    try {
      const secret = BigInt(privateSecret);
      const proofMessage = message.trim();

      if (secret < 1n || secret >= Q) {
        throw new Error(
          "Private secret must be between 1 and 10."
        );
      }

      if (!proofMessage) {
        throw new Error(
          "Proof message cannot be empty."
        );
      }

      /*
       * IMPORTANT:
       *
       * The private secret stays inside the browser.
       * It is NEVER sent to the backend.
       */

      const publicKey = modPow(
        G,
        secret,
        P
      );

      const nonce = randomNonce();

      const commitment = modPow(
        G,
        nonce,
        P
      );

      const challenge = await calculateChallenge(
        publicKey,
        commitment,
        proofMessage
      );

      const response =
        (nonce + challenge * secret) % Q;

      const generatedProof = {
        public_key: Number(publicKey),
        commitment: Number(commitment),
        challenge: Number(challenge),
        response: Number(response),
        message: proofMessage,
      };

      setProof(generatedProof);

      /*
       * Only the proof is sent to FastAPI.
       * The private secret is NOT sent.
       */

      const verificationResponse = await api.post(
        "/zkp/verify",
        generatedProof
      );

      setVerification(
        verificationResponse.data
      );
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to generate or verify the ZKP."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography
        variant="h4"
        fontWeight={700}
        gutterBottom
      >
        Zero-Knowledge Proof
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: 3 }}
      >
        Demonstration of proving knowledge of a
        private secret without revealing the secret
        to the verifier.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Academic demonstration using a
        Schnorr-style zero-knowledge proof.
        The small parameters used here are not
        suitable for production cryptography.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography
                variant="h6"
                fontWeight={600}
                gutterBottom
              >
                Private Information
              </Typography>

              <Alert
                severity="warning"
                sx={{ mb: 2 }}
              >
                The private secret remains inside this
                browser and is never sent to the backend.
              </Alert>

              <TextField
                fullWidth
                type="number"
                label="Private Secret"
                value={privateSecret}
                onChange={(event) =>
                  setPrivateSecret(event.target.value)
                }
                inputProps={{
                  min: 1,
                  max: 10,
                }}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Proof Message"
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                sx={{ mb: 2 }}
              />

              <Button
                variant="contained"
                size="large"
                onClick={generateAndVerifyProof}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <CircularProgress
                      size={22}
                      sx={{ mr: 1 }}
                    />
                    Generating & Verifying...
                  </>
                ) : (
                  "Generate & Verify ZKP"
                )}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography
                variant="h6"
                fontWeight={600}
                gutterBottom
              >
                ZKP Protocol
              </Typography>

              {protocolInfo ? (
                <Box>
                  <Typography>
                    <strong>Protocol:</strong>{" "}
                    {protocolInfo.protocol}
                  </Typography>

                  <Typography>
                    <strong>Version:</strong>{" "}
                    {protocolInfo.protocol_version}
                  </Typography>

                  <Typography>
                    <strong>Hash:</strong>{" "}
                    {protocolInfo.hash_function}
                  </Typography>

                  <Typography>
                    <strong>Generator:</strong>{" "}
                    {protocolInfo.generator}
                  </Typography>

                  <Typography>
                    <strong>Private secret revealed:</strong>{" "}
                    {protocolInfo.private_secret_revealed
                      ? "Yes"
                      : "No"}
                  </Typography>

                  <Typography>
                    <strong>Production ready:</strong>{" "}
                    {protocolInfo.production_ready
                      ? "Yes"
                      : "No"}
                  </Typography>
                </Box>
              ) : (
                <Typography color="text.secondary">
                  Protocol information has not been loaded.
                </Typography>
              )}

              <Button
                variant="outlined"
                onClick={loadProtocolInfo}
                disabled={infoLoading}
                sx={{ mt: 2 }}
              >
                {infoLoading
                  ? "Loading..."
                  : "Load Protocol Information"}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {proof && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography
                  variant="h6"
                  fontWeight={600}
                  gutterBottom
                >
                  Generated Proof
                </Typography>

                <Alert
                  severity="success"
                  sx={{ mb: 2 }}
                >
                  Proof generated successfully.
                  The private secret was not sent to
                  the backend.
                </Alert>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <Typography color="text.secondary">
                      Public Key
                    </Typography>

                    <Typography variant="h5">
                      {proof.public_key}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <Typography color="text.secondary">
                      Commitment
                    </Typography>

                    <Typography variant="h5">
                      {proof.commitment}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <Typography color="text.secondary">
                      Challenge
                    </Typography>

                    <Typography variant="h5">
                      {proof.challenge}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <Typography color="text.secondary">
                      Response
                    </Typography>

                    <Typography variant="h5">
                      {proof.response}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {verification && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography
                  variant="h5"
                  fontWeight={700}
                  gutterBottom
                >
                  Verification Result
                </Typography>

                <Alert
                  severity={
                    verification.valid
                      ? "success"
                      : "error"
                  }
                >
                  {verification.valid
                    ? "ZERO-KNOWLEDGE PROOF VERIFIED"
                    : "ZERO-KNOWLEDGE PROOF INVALID"}
                </Alert>

                <Typography sx={{ mt: 2 }}>
                  <strong>Protocol:</strong>{" "}
                  {verification.protocol_version}
                </Typography>

                <Typography>
                  <strong>Verifier:</strong>{" "}
                  {verification.message}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

export default ZKP;
