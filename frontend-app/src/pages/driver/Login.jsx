import React, { useState } from "react";
import { Container, TextField, Button, Typography, Stack } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://kaviar-v2.onrender.com";

export default function DriverLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");

    const res = await fetch(`${API_BASE_URL}/api/auth/driver/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMsg(data?.error || data?.message || "Erro no login do motorista.");
      return;
    }

    const token = data?.token || data?.accessToken;
    if (!token) {
      setMsg("Login OK, mas não veio token na resposta.");
      return;
    }

    localStorage.setItem("kaviar_driver_token", token);

    const from = location.state?.from?.pathname;
    navigate(from || "/motorista/status", { replace: true });
  }

  return (
    <Container maxWidth="xs" sx={{ py: 6 }}>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        Login do Motorista
      </Typography>

      <form onSubmit={onSubmit}>
        <Stack spacing={2}>
          <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" variant="contained">Entrar</Button>
          {msg && <Typography color="error">{msg}</Typography>}
        </Stack>
      </form>
    </Container>
  );
}
