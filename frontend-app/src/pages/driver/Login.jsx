import React, { useState } from "react";
import { API_BASE_URL } from '../../config/api';
import { Container, TextField, Button, Typography, Stack } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";


export default function DriverLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");

    if (!email || !password) {
      setMsg("Preencha email e senha.");
      return;
    }

    const res = await fetch(`${API_BASE_URL}/api/auth/driver/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data?.error || data?.message || "";
      
      if (res.status === 403 && errorMsg.includes("suspensa")) {
        setMsg("Conta suspensa ou rejeitada. Entre em contato com o suporte.");
      } else if (errorMsg.includes("Credenciais inválidas")) {
        setMsg("Email ou senha incorretos.");
      } else {
        setMsg(errorMsg || "Erro no login. Verifique seus dados.");
      }
      return;
    }

    const token = data?.token || data?.accessToken;
    if (!token) {
      setMsg("Login OK, mas não veio token na resposta.");
      return;
    }

    localStorage.setItem("kaviar_driver_token", token);
    
    if (data?.user) {
      localStorage.setItem("kaviar_driver_data", JSON.stringify(data.user));
    }

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
          <Button variant="outlined" onClick={() => navigate("/cadastro?type=driver")}>
            Primeiro acesso? Cadastre-se
          </Button>
          {msg && <Typography color="error">{msg}</Typography>}
        </Stack>
      </form>
    </Container>
  );
}
