import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { Box, Button, Card, CardContent, CircularProgress, Container, Typography, Chip, Snackbar } from '@mui/material';

function labelFromStatus(status) {
  if (status === 'active') return 'Ativo';
  if (status === 'expired') return 'Expirado';
  if (status === 'limit_reached') return 'Limite atingido';
  if (status === 'revoked') return 'Revogado';
  return status || 'Indisponivel';
}

const APK_URL = 'https://downloads.kaviar.com.br/kaviar-passageiro-v1.13.8-ota.apk';

export default function GroupInviteLanding() {
  const { code } = useParams();
  const normalizedCode = useMemo(() => String(code || '').trim().toUpperCase(), [code]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState(null);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const textToCopy = invite?.code || normalizedCode;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy).then(() => setCopied(true));
    } else {
      const el = document.createElement('textarea');
      el.value = textToCopy;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
    }
  }

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
              Convite para Grupo KAVIAR
            </Typography>
            <Typography sx={{ color: '#9CA3AF', mb: 3 }}>
              Você foi convidado para participar deste grupo no KAVIAR.
            </Typography>

            {loading ? (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <>
                <Typography sx={{ color: '#FCA5A5', fontWeight: 700, mb: 1 }}>{error}</Typography>
                <Typography sx={{ color: '#9CA3AF' }}>
                  Se você recebeu esse código agora, confirme com o administrador do grupo.
                </Typography>
              </>
            ) : (
              <>
                <Chip label={labelFromStatus(invite?.status)} sx={{ mb: 2, bgcolor: '#1F3A2E', color: '#BFF0D0' }} />
                <Typography sx={{ color: '#F9FAFB', fontSize: 22, fontWeight: 800, mb: 1 }}>{invite?.group?.public_name || 'Grupo KAVIAR'}</Typography>
                {!!invite?.group?.description && <Typography sx={{ color: '#D1D5DB', mb: 2 }}>{invite.group.description}</Typography>}

                <Typography sx={{ color: '#9CA3AF', mb: 0.5 }}>Expira em</Typography>
                <Typography sx={{ color: '#F9FAFB', mb: 3 }}>{invite?.expires_at ? new Date(invite.expires_at).toLocaleString('pt-BR') : '-'}</Typography>

                <Box sx={{ bgcolor: '#1A2236', borderRadius: 2, border: '2px solid #C8A84E', p: 2, mb: 2, textAlign: 'center' }}>
                  <Typography sx={{ color: '#9CA3AF', fontSize: 12, mb: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>Código do convite</Typography>
                  <Typography sx={{ color: '#C8A84E', fontWeight: 900, fontSize: 28, letterSpacing: 4, fontFamily: 'monospace' }}>
                    {invite?.code || normalizedCode}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleCopy}
                  sx={{ bgcolor: '#C8A84E', color: '#111827', fontWeight: 800, mb: 2, '&:hover': { bgcolor: '#B08E30' } }}
                >
                  Copiar código
                </Button>

                <Typography sx={{ color: '#D1D5DB', mb: 3, fontSize: 14, lineHeight: 1.6 }}>
                  Para entrar, copie o código acima, abra o app <strong>KAVIAR Passageiro</strong> e acesse:<br />
                  <strong>Menu &gt; Meus Grupos KAVIAR &gt; Inserir código.</strong>
                </Typography>

                <Button
                  variant="outlined"
                  fullWidth
                  component="a"
                  href={APK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ borderColor: '#4B5563', color: '#9CA3AF', fontWeight: 700, '&:hover': { borderColor: '#C8A84E', color: '#C8A84E' } }}
                >
                  Baixar app passageiro
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </Container>
      <Snackbar
        open={copied}
        autoHideDuration={2500}
        onClose={() => setCopied(false)}
        message="Código copiado!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
