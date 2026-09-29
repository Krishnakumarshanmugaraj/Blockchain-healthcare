import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";

import api from "../api/api";

const initialForm = {
  age: 35,
  condition_severity: 3,
  treatment_adherence: 90,
  comorbidity_count: 1,
  hospital_stay_days: 5,
  early_response_score: 85,
};

function RecoveryPrediction() {
  const [form, setForm] = useState(initialForm);
  const [prediction, setPrediction] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [infoLoading, setInfoLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const loadModelInfo = async () => {
    setInfoLoading(true);
    setError("");

    try {
      const response = await api.get("/ai/recovery-prediction/model-info");
      setModelInfo(response.data);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Unable to load AI model information."
      );
    } finally {
      setInfoLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");
    setPrediction(null);

    try {
      const response = await api.post("/ai/recovery-prediction", {
        age: Number(form.age),
        condition_severity: Number(form.condition_severity),
        treatment_adherence: Number(form.treatment_adherence),
        comorbidity_count: Number(form.comorbidity_count),
        hospital_stay_days: Number(form.hospital_stay_days),
        early_response_score: Number(form.early_response_score),
      });

      setPrediction(response.data);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Unable to generate recovery prediction."
      );
    } finally {
      setLoading(false);
    }
  };

  const getRiskMessage = (riskLevel) => {
    if (riskLevel === "LOW") {
      return "The prototype model predicts a relatively low recovery risk.";
    }

    if (riskLevel === "MEDIUM") {
      return "The prototype model predicts a moderate recovery risk.";
    }

    return "The prototype model predicts a relatively high recovery risk.";
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        AI Recovery Prediction
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        AI-assisted recovery prediction using patient and treatment
        characteristics.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        This is an academic prototype using synthetic training data. It is
        not clinically validated and must not be used as a medical diagnosis
        or treatment recommendation.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Patient Recovery Factors
              </Typography>

              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      type="number"
                      label="Age"
                      name="age"
                      value={form.age}
                      onChange={handleChange}
                      inputProps={{
                        min: 18,
                        max: 120,
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      select
                      label="Condition Severity"
                      name="condition_severity"
                      value={form.condition_severity}
                      onChange={handleChange}
                    >
                      {Array.from({ length: 10 }, (_, index) => index + 1).map(
                        (value) => (
                          <MenuItem key={value} value={value}>
                            {value}
                          </MenuItem>
                        )
                      )}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      type="number"
                      label="Treatment Adherence (%)"
                      name="treatment_adherence"
                      value={form.treatment_adherence}
                      onChange={handleChange}
                      inputProps={{
                        min: 0,
                        max: 100,
                        step: 0.1,
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      type="number"
                      label="Comorbidity Count"
                      name="comorbidity_count"
                      value={form.comorbidity_count}
                      onChange={handleChange}
                      inputProps={{
                        min: 0,
                        max: 20,
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      type="number"
                      label="Hospital Stay (days)"
                      name="hospital_stay_days"
                      value={form.hospital_stay_days}
                      onChange={handleChange}
                      inputProps={{
                        min: 1,
                        max: 365,
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      type="number"
                      label="Early Response Score"
                      name="early_response_score"
                      value={form.early_response_score}
                      onChange={handleChange}
                      inputProps={{
                        min: 0,
                        max: 100,
                        step: 0.1,
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={loading}
                      sx={{ mt: 1 }}
                    >
                      {loading ? (
                        <>
                          <CircularProgress
                            size={22}
                            sx={{ mr: 1 }}
                          />
                          Predicting...
                        </>
                      ) : (
                        "Generate Recovery Prediction"
                      )}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                AI Model
              </Typography>

              {modelInfo ? (
                <Box>
                  <Typography>
                    <strong>Version:</strong> {modelInfo.model_version}
                  </Typography>

                  <Typography>
                    <strong>Model:</strong> {modelInfo.model_type}
                  </Typography>

                  <Typography>
                    <strong>Features:</strong> {modelInfo.feature_count}
                  </Typography>

                  <Typography>
                    <strong>Training:</strong> {modelInfo.training_data}
                  </Typography>

                  <Typography sx={{ mt: 1 }}>
                    <strong>Clinical validation:</strong>{" "}
                    {modelInfo.clinical_validation ? "Yes" : "No"}
                  </Typography>

                  <Typography sx={{ mt: 1 }} color="text.secondary">
                    {modelInfo.purpose}
                  </Typography>
                </Box>
              ) : (
                <Typography color="text.secondary">
                  Model information has not been loaded.
                </Typography>
              )}

              <Button
                variant="outlined"
                onClick={loadModelInfo}
                disabled={infoLoading}
                sx={{ mt: 2 }}
              >
                {infoLoading ? "Loading..." : "Load Model Information"}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {prediction && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h5" fontWeight={700} gutterBottom>
                  Prediction Result
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <Typography color="text.secondary">
                      Recovery Probability
                    </Typography>

                    <Typography variant="h3" fontWeight={700}>
                      {prediction.recovery_percentage}%
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Typography color="text.secondary">
                      Risk Level
                    </Typography>

                    <Typography variant="h4" fontWeight={700}>
                      {prediction.risk_level}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Typography color="text.secondary">
                      Predicted Recovery
                    </Typography>

                    <Typography variant="h4" fontWeight={700}>
                      {prediction.predicted_recovery ? "YES" : "NO"}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Alert
                      severity={
                        prediction.risk_level === "LOW"
                          ? "success"
                          : prediction.risk_level === "MEDIUM"
                            ? "warning"
                            : "error"
                      }
                    >
                      {getRiskMessage(prediction.risk_level)}
                    </Alert>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography color="text.secondary">
                      Model version: {prediction.model_version}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

export default RecoveryPrediction;
