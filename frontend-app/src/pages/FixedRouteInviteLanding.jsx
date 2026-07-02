import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { API_BASE_URL } from '../config/api';
import { PASSENGER_APK_URL } from '../utils/whatsappInvite';

const DAY_LABELS = {
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sab',
  7: 'Dom',
};

function mapStatusLabel(status) {
  if (status === 'active') return 'Convite válido';
  if (status === 'paused') return 'Rota pausada';
  if (status === 'cancelled') return 'Rota cancelada';
  if (status === 'archived') return 'Rota encerrada';
  return 'Indisponível';
}

function mapStatusTone(status) {
  if (status === 'active') return { bg: '#153526', fg: '#B8F3CC' };
  if (status === 'paused') return { bg: '#3A2E16', fg: '#F6DA9A' };
  if (status === 'cancelled' || status === 'archived') return { bg: '#3A1D1D', fg: '#F9B2B2' };
  return { bg: '#23304A', fg: '#CFE0FF' };
}

function formatMoney(cents) {
  const value = Number(cents || 0) / 100;
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDays(days) {
  if (!Array.isArray(days) || days.length === 0) return '-';
  return days
    .map((d) => DAY_LABELS[Number(d)])
    .filter(Boolean)
    .join('  ·  ');
}

function tripTypeLabel(tripType) {
  if (tripType === 'one_way_outbound') return 'Só ida';
  if (tripType === 'one_way_return') return 'Só volta';
  return 'Ida e volta';
}

function tripTypeLead(tripType) {
  if (tripType === 'one_way_outbound') return 'Ida programada com horário combinado.';
  if (tripType === 'one_way_return') return 'Volta programada com horário combinado.';
  return 'Ida e volta programadas.';
}

function scheduleText(tripType, departureTime, returnTime) {
  if (tripType === 'one_way_outbound') return `Ida programada: ${departureTime || '-'}`;
  if (tripType === 'one_way_return') return `Volta programada: ${returnTime || '-'}`;
  return `Ida: ${departureTime || '-'} · Volta: ${returnTime || '-'}`;
}

function fallbackCopy(text) {
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

export default function FixedRouteInviteLanding() {
  const { code } = useParams();
  const normalizedCode = useMemo(() => String(code || '').trim().toUpperCase(), [code]);

  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [invite, setInvite] = useState(null);
  const [snack, setSnack] = useState('');

  const status = invite?.status || 'unknown';
  const statusTone = mapStatusTone(status);
  const noSeats = Number(invite?.seats_available || 0) <= 0;

  useEffect(() => {
    async function loadInvite() {
      try {
        setLoading(true);
        setErrorType('');
        setErrorMessage('');

        const response = await fetch(
          `${API_BASE_URL}/api/fixed-routes/invites/${encodeURIComponent(normalizedCode)}`,
        );
        const data = await response.json();

        if (!response.ok || !data?.success) {
          const backendMessage = String(data?.error || 'Erro ao carregar convite.');
          if (response.status === 404) {
            setErrorType('invalid_code');
            setErrorMessage('Código inválido ou convite não encontrado.');
          } else {
            setErrorType('load_error');
            setErrorMessage(backendMessage);
          }
          setInvite(null);
          return;
        }

        setInvite(data.data || null);
      } catch (err) {
        setErrorType('load_error');
        setErrorMessage(err?.message || 'Erro ao carregar convite.');
        setInvite(null);
      } finally {
        setLoading(false);
      }
    }

    if (!normalizedCode || !normalizedCode.startsWith('KFR-')) {
      setLoading(false);
      setInvite(null);
      setErrorType('invalid_code');
      setErrorMessage('Código inválido ou convite não encontrado.');
      return;
    }

    loadInvite();
  }, [normalizedCode]);

  function deepLink() {
    const inviteCode = invite?.code || normalizedCode;
    return `kaviar-passenger://fixed-routes?inviteCode=${encodeURIComponent(inviteCode)}`;
  }

  function inviteUrl() {
    const inviteCode = invite?.code || normalizedCode;
    return `https://kaviar.com.br/rotas-fixas/${inviteCode}`;
  }

  async function copyCode() {
    const text = invite?.code || normalizedCode;
    if (!text) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopy(text);
      }
      setSnack('Código KFR copiado.');
    } catch {
      setSnack('Não foi possível copiar agora.');
    }
  }

  async function copyInviteText() {
    const inviteCode = invite?.code || normalizedCode;
    const text = [
      `Tenho uma Corrida Compartilhada no KAVIAR. ${tripTypeLead(invite?.trip_type || 'round_trip')}`,
      'Para reservar sua vaga, baixe o app Passageiro e use o código:',
      inviteCode,
      'Link:',
      `https://kaviar.com.br/rotas-fixas/${inviteCode}`,
    ].join('\n');

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopy(text);
      }
      setSnack('Convite completo copiado.');
    } catch {
      setSnack('Não foi possível copiar agora.');
    }
  }

  function openPassengerApp() {
    window.location.href = deepLink();
  }

  const routeTitle = invite?.title || 'Corrida Compartilhada KAVIAR';
  const driverName = invite?.driver?.first_name || invite?.driver?.name || '';
  const tripType = invite?.trip_type || 'round_trip';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 15% 15%, rgba(200,168,78,0.18) 0%, rgba(11,16,31,0) 42%), linear-gradient(170deg, #090D17 0%, #0F172A 55%, #161F33 100%)',
        py: { xs: 4, md: 7 },
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            borderRadius: 4,
            border: '1px solid #2E3A53',
            bgcolor: 'rgba(9,14,26,0.92)',
            boxShadow: '0 30px 60px rgba(3,8,20,0.55)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Typography sx={{ color: '#C8A84E', fontWeight: 800, fontSize: 12, letterSpacing: 1.1, mb: 1 }}>
              CORRIDAS COMPARTILHADAS KAVIAR
            </Typography>
            <Typography variant="h4" sx={{ color: '#F8FAFC', fontWeight: 900, lineHeight: 1.15, mb: 1 }}>
              Você foi convidado para uma Corrida Compartilhada KAVIAR.
            </Typography>
            <Typography sx={{ color: '#CBD5E1', mb: 0.5, fontWeight: 600 }}>
              Reserve sua vaga com horário combinado.
            </Typography>
            <Typography sx={{ color: '#A8B3C7', mb: 3 }}>
              {tripTypeLead(tripType)}
            </Typography>

            {loading ? (
              <Box sx={{ py: 7, textAlign: 'center' }}>
                <CircularProgress size={34} sx={{ color: '#C8A84E' }} />
                <Typography sx={{ color: '#A8B3C7', mt: 2 }}>Carregando convite...</Typography>
              </Box>
            ) : errorType ? (
              <Alert
                severity={errorType === 'invalid_code' ? 'warning' : 'error'}
                sx={{ mb: 1, borderRadius: 2, bgcolor: '#162237', color: '#E2E8F0', border: '1px solid #324364' }}
              >
                {errorType === 'invalid_code' ? 'Código inválido' : 'Erro de carregamento'}: {errorMessage}
              </Alert>
            ) : (
              <>
                <Chip
                  label={mapStatusLabel(status)}
                  sx={{ mb: 2, bgcolor: statusTone.bg, color: statusTone.fg, fontWeight: 700, borderRadius: 1.5 }}
                />

                {(status === 'paused' || status === 'cancelled' || status === 'archived') && (
                  <Alert severity="warning" sx={{ mb: 2, borderRadius: 2, bgcolor: '#2A2413', color: '#F3DFC0', border: '1px solid #66501F' }}>
                    Esta rota está temporariamente indisponível para novas reservas no momento.
                  </Alert>
                )}

                {noSeats && status === 'active' && (
                  <Alert severity="info" sx={{ mb: 2, borderRadius: 2, bgcolor: '#13283C', color: '#D4E7FF', border: '1px solid #244B6D' }}>
                    Sem vagas disponíveis agora. Você pode tentar novamente mais tarde.
                  </Alert>
                )}

                <Typography sx={{ color: '#F8FAFC', fontSize: { xs: 24, md: 28 }, fontWeight: 900, mb: 0.75 }}>
                  {routeTitle}
                </Typography>

                {!!driverName && (
                  <Typography sx={{ color: '#CBD5E1', mb: 2.5, fontSize: 14 }}>
                    Motorista: {driverName}
                  </Typography>
                )}

                <Box sx={{ border: '1px solid #2A344A', borderRadius: 2.5, p: 2.2, bgcolor: '#0E1628', mb: 2.2 }}>
                  <Typography sx={{ color: '#8FA2C7', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, mb: 0.75 }}>
                    Trajeto geral
                  </Typography>
                  <Typography sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: 18, lineHeight: 1.35 }}>
                    {invite?.origin_label || '-'}
                  </Typography>
                  <Typography sx={{ color: '#C8A84E', fontWeight: 900, my: 0.4 }}>
                    →
                  </Typography>
                  <Typography sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: 18, lineHeight: 1.35 }}>
                    {invite?.destination_label || '-'}
                  </Typography>
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mb: 2 }}>
                  <Box sx={{ flex: 1, border: '1px solid #2A344A', borderRadius: 2, p: 1.6, bgcolor: '#0E1628' }}>
                    <Typography sx={{ color: '#8FA2C7', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Tipo</Typography>
                    <Typography sx={{ color: '#F1F5F9', fontWeight: 800, fontSize: 17 }}>{tripTypeLabel(tripType)}</Typography>
                  </Box>
                  <Box sx={{ flex: 1, border: '1px solid #2A344A', borderRadius: 2, p: 1.6, bgcolor: '#0E1628' }}>
                    <Typography sx={{ color: '#8FA2C7', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Horário</Typography>
                    <Typography sx={{ color: '#F1F5F9', fontWeight: 800, fontSize: 17 }}>{scheduleText(tripType, invite?.departure_time, invite?.return_time)}</Typography>
                  </Box>
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mb: 2.2 }}>
                  <Box sx={{ flex: 1, border: '1px solid #3A3020', borderRadius: 2, p: 1.6, bgcolor: '#1A1620' }}>
                    <Typography sx={{ color: '#D8C18B', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Valor por passageiro</Typography>
                    <Typography sx={{ color: '#FFE7A7', fontWeight: 900, fontSize: 20 }}>
                      {formatMoney(invite?.price_per_passenger_cents)}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, border: '1px solid #244B6D', borderRadius: 2, p: 1.6, bgcolor: '#102033' }}>
                    <Typography sx={{ color: '#9CC8F2', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Vagas disponíveis</Typography>
                    <Typography sx={{ color: '#D8ECFF', fontWeight: 900, fontSize: 20 }}>
                      {Number(invite?.seats_available || 0)}
                    </Typography>
                  </Box>
                </Stack>

                <Typography sx={{ color: '#A8B3C7', fontSize: 13, mb: 0.5 }}>Dias da semana</Typography>
                <Typography sx={{ color: '#E6ECF7', fontWeight: 700, mb: 2 }}>{formatDays(invite?.days_of_week)}</Typography>

                {!!invite?.description && (
                  <>
                    <Divider sx={{ borderColor: '#2A344A', mb: 1.3 }} />
                    <Typography sx={{ color: '#A8B3C7', fontSize: 13, mb: 0.5 }}>Descrição e regras</Typography>
                    <Typography sx={{ color: '#D6DEEC', fontSize: 14, lineHeight: 1.55, mb: 2.1 }}>
                      {invite.description}
                    </Typography>
                  </>
                )}

                <Box sx={{ border: '2px solid #C8A84E', borderRadius: 2.4, p: 1.8, textAlign: 'center', bgcolor: '#1A2236', mb: 2.3 }}>
                  <Typography sx={{ color: '#9FB0CB', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, mb: 0.35 }}>
                    Código KFR
                  </Typography>
                  <Typography sx={{ color: '#F8D891', fontWeight: 900, letterSpacing: 2.3, fontSize: { xs: 23, md: 26 }, fontFamily: 'monospace' }}>
                    {invite?.code || normalizedCode}
                  </Typography>
                </Box>

                <Typography sx={{ color: '#D8E0EF', mb: 2.2, fontSize: 13.5, lineHeight: 1.5 }}>
                  A vaga só fica reservada quando você confirma pelo app KAVIAR Passageiro.
                </Typography>

                <Stack spacing={1.2}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={openPassengerApp}
                    sx={{
                      borderRadius: 2,
                      py: 1.3,
                      fontWeight: 800,
                      textTransform: 'none',
                      bgcolor: '#2A6BE9',
                      color: '#F8FAFC',
                      '&:hover': { bgcolor: '#1F50AF' },
                    }}
                  >
                    Abrir no app KAVIAR Passageiro
                  </Button>

                  <Button
                    variant="outlined"
                    fullWidth
                    component="a"
                    href={PASSENGER_APK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      borderRadius: 2,
                      py: 1.2,
                      fontWeight: 700,
                      textTransform: 'none',
                      borderColor: '#4D627F',
                      color: '#D8E2F1',
                      '&:hover': { borderColor: '#C8A84E', color: '#F3D690' },
                    }}
                  >
                    Baixar app Passageiro
                  </Button>

                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={copyCode}
                    sx={{
                      borderRadius: 2,
                      py: 1.2,
                      fontWeight: 700,
                      textTransform: 'none',
                      borderColor: '#3E4C65',
                      color: '#CAD7EA',
                      '&:hover': { borderColor: '#94AACE', color: '#E6EEFC' },
                    }}
                  >
                    Copiar código
                  </Button>

                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={copyInviteText}
                    sx={{
                      borderRadius: 2,
                      py: 1.2,
                      fontWeight: 700,
                      textTransform: 'none',
                      borderColor: '#3E4C65',
                      color: '#CAD7EA',
                      '&:hover': { borderColor: '#94AACE', color: '#E6EEFC' },
                    }}
                  >
                    Copiar convite
                  </Button>
                </Stack>

                <Typography sx={{ color: '#8D9BB3', fontSize: 12, mt: 1.8, textAlign: 'center' }}>
                  Se o app não abrir, use o código no app Passageiro em Minhas Corridas Compartilhadas.
                </Typography>

                <Typography sx={{ color: '#7183A3', fontSize: 11, mt: 0.8, textAlign: 'center' }}>
                  Link do convite: {inviteUrl()}
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      </Container>

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={2600}
        onClose={() => setSnack('')}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}