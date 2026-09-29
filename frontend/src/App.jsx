import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Upload from "./pages/Upload";
import Records from "./pages/Records";
import Verify from "./pages/Verify";
import RecoveryPrediction from "./pages/RecoveryPrediction";
import ZKP from "./pages/ZKP";
import ProofOfCure from "./pages/ProofOfCure";
import InsuranceSettlement from "./pages/InsuranceSettlement";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Authentication */}
        <Route
          path="/"
          element={<Login />}
        />

        {/* Main application */}
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/patients"
          element={<Patients />}
        />

        <Route
          path="/upload"
          element={<Upload />}
        />

        <Route
          path="/records"
          element={<Records />}
        />

        <Route
          path="/verify"
          element={<Verify />}
        />

        {/* AI */}
        <Route
          path="/recovery-prediction"
          element={<RecoveryPrediction />}
        />

        {/* Zero-Knowledge Proof */}
        <Route
          path="/zkp"
          element={<ZKP />}
        />

        {/* Objective 4 */}
        <Route
          path="/proof-of-cure"
          element={<ProofOfCure />}
        />

        <Route
          path="/insurance-settlement"
          element={<InsuranceSettlement />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
