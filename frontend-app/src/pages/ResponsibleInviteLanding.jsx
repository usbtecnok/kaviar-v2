import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Container, Snackbar, Stack, Typography } from '@mui/material';

const APK_URL = 'https://downloads.kaviar.com.br/kaviar-passageiro-v1.13.8-ota.apk';

function statusLabel(status) {
  if (status === 'active') return 'Convite válido';
  if (status === 'expired') return 'Convite expirado';
  if (status === 'revoked') return 'Convite revogado';
  if (status === 'consumed') return 'Convite já utilizado';
  if (status === 'invalid') return 'Convite inválido';
  return 'Indisponível';
}

function statusColor(status) {
  if (status === 'active') return { bg: '#1F3A2E', fg: '#BFF0D0' };
  if (status === 'expired') return { bg: '#3B2D1A', fg: '#F6D497' };
  if (status === 'revoked' || status === 'consumed' || status === 'invalid') return { bg: '#3B1E1E', fg: '#FCA5A5' };
  return { bg: '#222838', fg: '#D3D8E2' };
}

export default function ResponsibleInviteLanding() {
  const { code } = useParams();
  const normalizedCode = useMemo(() => String(code || '').trim().toUpperCase(), [code]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState(null);
  const [copied, setCopied] = useState(false);

  const status = invite?.status || (error ? 'invalid' : 'active');
  const colors = statusColor(status);

  useEffect(() => {
    async function loadInvite() {
      try {
        setLoading(true);
        setError('');
        const response = await fetch(`${API_BASE_URL}/api/groups/responsible-invites/${encodeURIComponent(normalizedCode)}`);
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data?.error || 'Erro de carregamento.');
        }
        setInvite(data.data);
      } catch (err) {
        setInvite(null);
        setError(err.message || 'Erro de carregamento.');
      } finally {
        setLoading(false);
      }
    }

    if (!normalizedCode) {
      setLoading(false);
      setError('Convite inválido.');
      return;
    }

    loadInvite();
  }, [normalizedCode]);

  async function copyCode() {
    const textToCopy = invite?.code || normalizedCode;
    if (!textToCopy) return;

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      return;
    }

    const el = document.createElement('textarea');
    el.value = textToCopy;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setCopied(true);
  }

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0A0F1F 0%, #111827 55%, #1F2937 100%)', py: 6 }}>
      <Container maxWidth="md">
        <Card sx={{ borderRadius: 4, border: '1px solid #2A3446', bgcolor: 'rgba(12,16,28,0.95)' }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Typography variant="h4" sx={{ color: '#F9FAFB', fontWeight: 900, mb: 1 }}>
              Convite para Responsável do Grupo
            </Typography>
            <Typography sx={{ color: '#9CA3AF', mb: 3 }}>
              Você foi convidado para ser Responsável do Grupo no KAVIAR.
            </Typography>

            {loading ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Chip label={statusLabel(status)} sx={{ mb: 2, bgcolor: colors.bg, color: colors.fg }} />

                {!!error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                <Typography sx={{ color: '#F9FAFB', fontSize: 22, fontWeight: 800, mb: 0.75 }}>
                  {invite?.group?.public_name || 'Grupo KAVIAR'}
                </Typography>
                {!!invite?.group?.description && (
                  <Typography sx={{ color: '#D1D5DB', mb: 2 }}>{invite.group.description}</Typography>
                )}

                <Typography sx={{ color: '#D1D5DB', mb: 2, lineHeight: 1.65 }}>
                  Essa função ajuda a organizar a mobilidade do grupo, publicar comunicados importantes e acompanhar a demanda de passageiros de forma simples e segura.
                </Typography>

                <Stack spacing={1.25} sx={{ mb: 2.5 }}>
                  <Box>
                    <Typography sx={{ color: '#BFF0D0', fontWeight: 800, mb: 0.5 }}>O Responsável do Grupo pode:</Typography>
                    <Typography sx={{ color: '#D1D5DB', fontSize: 14, lineHeight: 1.6 }}>
                      - ajudar a organizar horários e pontos de encontro gerais;<br />
                      - publicar comunicados no Mural do Grupo, quando essa permissão estiver liberada;<br />
                      - acompanhar informações agregadas do grupo;<br />
                      - orientar os membros sobre como usar o KAVIAR;<br />
                      - ajudar o KAVIAR a entender a demanda de corridas do grupo.
                    </Typography>
                  </Box>

                  <Box>
                    <Typography sx={{ color: '#FCA5A5', fontWeight: 800, mb: 0.5 }}>O Responsável do Grupo não pode:</Typography>
                    <Typography sx={{ color: '#D1D5DB', fontSize: 14, lineHeight: 1.6 }}>
                      - ver telefone dos membros;<br />
                      - ver localização exata dos membros;<br />
                      - ver rota individual dos membros;<br />
                      - escolher motorista manualmente;<br />
                      - definir preço;<br />
                      - garantir disponibilidade de carro;<br />
                      - prometer corrida garantida;<br />
                      - representar vínculo trabalhista com o KAVIAR.
                    </Typography>
                  </Box>
                </Stack>

                <Box sx={{ border: '1px solid #2A3446', borderRadius: 2, p: 2, mb: 2.5, bgcolor: '#111827' }}>
                  <Typography sx={{ color: '#F6D497', fontWeight: 800, mb: 0.5 }}>Exemplo de organização:</Typography>
                  <Typography sx={{ color: '#D1D5DB', fontSize: 14, lineHeight: 1.6 }}>
                    Para planejamento de demanda, uma referência simples é considerar até 4 passageiros por carro comum, dependendo do tipo de corrida, bagagem, rota e disponibilidade. Essa referência serve apenas para organização e não garante atendimento automático.
                  </Typography>
                </Box>

                <Box sx={{ border: '1px solid #2A3446', borderRadius: 2, p: 2, mb: 2.5, bgcolor: '#0F172A' }}>
                  <Typography sx={{ color: '#F9FAFB', fontWeight: 700, mb: 0.5 }}>Consentimento</Typography>
                  <Typography sx={{ color: '#D1D5DB', fontSize: 14, lineHeight: 1.6 }}>
                    Li e entendi a função de Responsável do Grupo. Confirmo que essa função é apenas de organização e comunicação, sem acesso a dados sensíveis dos membros e sem garantia de corridas, preços ou motoristas.
                  </Typography>
                </Box>

                <Box sx={{ bgcolor: '#1A2236', borderRadius: 2, border: '2px solid #C8A84E', p: 2, mb: 2, textAlign: 'center' }}>
                  <Typography sx={{ color: '#9CA3AF', fontSize: 12, mb: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Código do convite
                  </Typography>
                  <Typography sx={{ color: '#C8A84E', fontWeight: 900, fontSize: { xs: 24, md: 28 }, letterSpacing: 3, fontFamily: 'monospace' }}>
                    {invite?.code || normalizedCode}
                  </Typography>
                </Box>

                <Stack spacing={1.5}>
                  <Button
                    variant="contained"
                    onClick={copyCode}
                    sx={{ bgcolor: '#C8A84E', color: '#111827', fontWeight: 800, '&:hover': { bgcolor: '#B08E30' } }}
                  >
                    Copiar código do convite
                  </Button>

                  <Button
                    variant="outlined"
                    component="a"
                    href={APK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ borderColor: '#4B5563', color: '#9CA3AF', fontWeight: 700, '&:hover': { borderColor: '#C8A84E', color: '#C8A84E' } }}
                  >
                    Baixar app passageiro
                  </Button>

                  <Button disabled variant="contained" sx={{ bgcolor: '#334155', color: '#CBD5E1', fontWeight: 700 }}>
                    Em breve: Aceitar pelo app KAVIAR Passageiro
                  </Button>
                </Stack>

                <Typography sx={{ color: '#9CA3AF', fontSize: 13, mt: 2 }}>
                  A aceitação do Convite de Responsável do Grupo será concluída pelo app passageiro na próxima etapa.
                </Typography>

                <Typography sx={{ color: '#9CA3AF', fontSize: 13, mt: 0.75 }}>
                  Expira em: {invite?.expires_at ? new Date(invite.expires_at).toLocaleString('pt-BR') : '-'}
                </Typography>
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
