import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import Layout from "../common/Layout";

import DriverStatus from "../../pages/driver/Status";
import DriverDocuments from "../../pages/driver/Documents";
import DriverRideReceived from "../../pages/driver/RideReceived";
import DriverLogin from "../../pages/driver/Login";
import DriverSetPassword from "../../pages/driver/SetPassword";

function hasDriverToken() {
  const t = localStorage.getItem("kaviar_driver_token");
  return Boolean(t && t.length > 20);
}

export default function DriverApp() {
  const location = useLocation();

  // libera a rota /motorista/login sem token (pra não entrar em loop)
  if (!hasDriverToken() && location.pathname !== "/motorista/login") {
    return (
      <Navigate
        to="/motorista/login"
        replace
        state={{ from: location, reason: "driver_auth_required" }}
      />
    );
  }

  return (
    <Layout title="Motorista - KAVIAR">
      <Routes>
        <Route path="/" element={<Navigate to="/motorista/status" replace />} />
        <Route path="/login" element={<DriverLogin />} />
        <Route path="/definir-senha" element={<DriverSetPassword />} />
        <Route path="/status" element={<DriverStatus />} />
        <Route path="/documents" element={<DriverDocuments />} />
        <Route path="/ride" element={<DriverRideReceived />} />
      </Routes>
    </Layout>
  );
}
