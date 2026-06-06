import React, { useState } from "react";
import { API_BASE_URL } from '../../config/api';
import { Container, TextField, Button, Typography, Stack, Alert, CircularProgress } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

export default function DriverLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const hasPasswordSpaces = password.startsWith(' ') || password.endsWith(' ');

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");

    if (!email || !password) {
      setMsg("Preencha email e senha.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/driver/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMsg = data?.error || data?.message || "";

        if (res.status === 429) {
          const retryAfter = res.headers.get('retry-after');
          const minutes = retryAfter ? Math.ceil(Number(retryAfter) / 60) : 15;
          setMsg(`Muitas tentativas. Aguarde aproximadamente ${minutes} minuto(s) antes de tentar novamente.`);
        } else if (res.status === 403 && errorMsg.includes("suspensa")) {
          setMsg("Conta suspensa ou rejeitada. Entre em contato com o suporte.");
        } else if (errorMsg.includes("Credenciais inválidas")) {
          setMsg("Email ou senha incorretos.");
        } else {
          setMsg(errorMsg || "Erro no login. Verifique seus dados.");
        }
        setSubmitting(false);
        return;
      }

      const token = data?.token || data?.accessToken;
      if (!token) {
        setMsg("Login OK, mas não veio token na resposta.");
        setSubmitting(false);
        return;
      }

      localStorage.setItem("kaviar_driver_token", token);

      if (data?.user) {
        localStorage.setItem("kaviar_driver_data", JSON.stringify(data.user));
      }

      const from = location.state?.from?.pathname;
      navigate(from || "/motorista/status", { replace: true });
    } catch (err) {
      setMsg("Erro de conexão. Verifique sua internet e tente novamente.");
      setSubmitting(false);
    }
  }

  return (
    <Container maxWidth="xs" sx={{ py: 6 }}>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        Login do Motorista
      </Typography>

      <form onSubmit={onSubmit}>
        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
          <TextField
            label="Senha"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />

          {hasPasswordSpaces && password.length > 0 && (
            <Alert severity="warning" sx={{ fontSize: 12, py: 0.5 }}>
              A senha contém espaço no início ou no fim. Verifique se foi digitada corretamente.
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            sx={{ py: 1.5 }}
          >
            {submitting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Entrar'}
          </Button>

          <Button
            variant="outlined"
            onClick={() => navigate("/cadastro?type=driver")}
            disabled={submitting}
          >
            Primeiro acesso? Cadastre-se
          </Button>

          {msg && <Alert severity="error" sx={{ fontSize: 13 }}>{msg}</Alert>}
        </Stack>
      </form>
    </Container>
  );
}
