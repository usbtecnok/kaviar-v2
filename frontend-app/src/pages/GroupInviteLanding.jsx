import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { Box, Button, Card, CardContent, CircularProgress, Container, Typography, Chip } from '@mui/material';

function labelFromStatus(status) {
  if (status === 'active') return 'Ativo';
  if (status === 'expired') return 'Expirado';
  if (status === 'limit_reached') return 'Limite atingido';
  if (status === 'revoked') return 'Revogado';
  return status || 'Indisponivel';
}

export default function GroupInviteLanding() {
  const { code } = useParams();
  const normalizedCode = useMemo(() => String(code || '').trim().toUpperCase(), [code]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');
        const response = await fetch(`${API_BASE_URL}/api/groups/invites/${encodeURIComponent(normalizedCode)}`);
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data?.error || 'Convite nao encontrado');
        }
        setInvite(data.data);
      } catch (err) {
        setError(err.message || 'Convite nao encontrado');
      } finally {
        setLoading(false);
      }
    }

    if (normalizedCode) {
      load();
    } else {
      setLoading(false);
      setError('Codigo de convite invalido');
    }
  }, [normalizedCode]);

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0A0F1F 0%, #111827 55%, #1F2937 100%)', py: 8 }}>
      <Container maxWidth="sm">
        <Card sx={{ borderRadius: 4, border: '1px solid #2A3446', bgcolor: 'rgba(12,16,28,0.95)' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ color: '#F9FAFB', fontWeight: 800, mb: 0.5 }}>
              Convite de Grupo KAVIAR
            </Typography>
            <Typography sx={{ color: '#9CA3AF', mb: 3 }}>
              Convite publico para entrada de passageiro no app.
            </Typography>

            {loading ? (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <>
                <Typography sx={{ color: '#FCA5A5', fontWeight: 700, mb: 1 }}>{error}</Typography>
                <Typography sx={{ color: '#9CA3AF' }}>
                  Se voce recebeu esse codigo agora, confirme com o administrador do grupo.
                </Typography>
              </>
            ) : (
              <>
                <Chip label={labelFromStatus(invite?.status)} sx={{ mb: 2, bgcolor: '#1F3A2E', color: '#BFF0D0' }} />
                <Typography sx={{ color: '#F9FAFB', fontSize: 22, fontWeight: 800, mb: 1 }}>{invite?.group?.public_name || 'Grupo KAVIAR'}</Typography>
                {!!invite?.group?.description && <Typography sx={{ color: '#D1D5DB', mb: 2 }}>{invite.group.description}</Typography>}

                <Typography sx={{ color: '#9CA3AF', mb: 0.5 }}>Codigo</Typography>
                <Typography sx={{ color: '#F9FAFB', fontWeight: 700, mb: 2 }}>{invite?.code || normalizedCode}</Typography>

                <Typography sx={{ color: '#9CA3AF', mb: 0.5 }}>Expira em</Typography>
                <Typography sx={{ color: '#F9FAFB', mb: 2 }}>{invite?.expires_at ? new Date(invite.expires_at).toLocaleString('pt-BR') : '-'}</Typography>

                <Typography sx={{ color: '#9CA3AF', mb: 3 }}>
                  Para entrar no grupo, abra o app KAVIAR Passageiro e use esse codigo na tela Meus Grupos KAVIAR.
                </Typography>

                <Button
                  variant="contained"
                  fullWidth
                  component={Link}
                  to="/passageiro"
                  sx={{ bgcolor: '#C8A84E', color: '#111827', fontWeight: 800, '&:hover': { bgcolor: '#B08E30' } }}
                >
                  Ir para o app Passageiro
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
