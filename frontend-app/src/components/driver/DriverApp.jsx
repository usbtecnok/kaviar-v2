import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import Layout from "../common/Layout";

import DriverStatus from "../../pages/driver/Status";
import DriverDocuments from "../../pages/driver/Documents";
import DriverRideReceived from "../../pages/driver/RideReceived";

function hasDriverToken() {
  const t = localStorage.getItem("kaviar_driver_token");
  return Boolean(t && t.length > 20);
}

export default function DriverApp() {
  const location = useLocation();

  if (!hasDriverToken()) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location, reason: "driver_auth_required" }}
      />
    );
  }

  return (
    <Layout title="Motorista - KAVIAR">
      <Routes>
        <Route path="/" element={<Navigate to="/motorista/status" replace />} />
        <Route path="/status" element={<DriverStatus />} />
        <Route path="/documents" element={<DriverDocuments />} />
        <Route path="/ride" element={<DriverRideReceived />} />
      </Routes>
    </Layout>
  );
}
