import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Chip, Button, TextField, MenuItem, Checkbox, FormControlLabel, CircularProgress, Alert, IconButton, Tooltip } from '@mui/material';
import { ContentCopy, CheckCircle } from '@mui/icons-material';
import { API_BASE_URL } from '../config/api';

const PIX_TYPES = [
  { value: 'CPF', label: 'CPF' },
  { value: 'PHONE', label: 'Telefone' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'RANDOM', label: 'Chave aleatória' },
];

export default function ConsultorOnboarding() {
  const { code } = useParams();
  const upperCode = (code || '').toUpperCase();

  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({ name: '', phone: '', email: '', pix_key: '', pix_key_type: 'CPF', terms_accepted: false });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/public/referral-agent/${upperCode}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setAgent(d.data);
          setForm(f => ({
            ...f,
            name: d.data.name || '',
            phone: d.data.phone || '',
            email: d.data.email || '',
            pix_key: d.data.pix_key || '',
            pix_key_type: d.data.pix_key_type || 'CPF',
            terms_accepted: !!d.data.terms_accepted_at,
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [upperCode]);

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/public/referral-agent/${upperCode}/onboarding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setAgent(json.data);
        setSaved(true);
      } else {
        setError(json.error);
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  const referralLink = `https://kaviar.com.br/motorista?ref=${upperCode}`;
  const copyLink = () => { navigator.clipboard.writeText(referralLink); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const isComplete = agent?.pix_key && agent?.email;

  if (loading) return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress sx={{ color: '#FFD700' }} />
    </Box>
  );

  if (!agent) return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h4" sx={{ color: '#FFD700', fontWeight: 900, letterSpacing: 6, mb: 2 }}>KAVIAR</Typography>
        <Typography sx={{ color: '#999' }}>Código não encontrado ou inativo.</Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#111' }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', pt: 5, pb: 2 }}>
        <Typography sx={{ color: '#FFD700', fontWeight: 900, letterSpacing: 8, fontSize: 28 }}>KAVIAR</Typography>
        <Typography variant="caption" sx={{ color: '#666', letterSpacing: 3, textTransform: 'uppercase' }}>Programa de Indicação</Typography>
      </Box>

      <Box sx={{ maxWidth: 440, mx: 'auto', px: 2, pb: 6 }}>
        {/* Seção 1 — Boas-vindas */}
        <Box sx={{ bgcolor: '#1a1a1a', borderRadius: 3, p: 3, mb: 3, border: '1px solid #333', textAlign: 'center' }}>
          <Typography sx={{ color: '#999', fontSize: 13, mb: 0.5 }}>Bem-vindo</Typography>
          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>{agent.name}</Typography>

          <Chip label={upperCode} sx={{ bgcolor: '#FFD700', color: '#000', fontWeight: 800, fontFamily: 'monospace', fontSize: 18, py: 2.5, px: 1, borderRadius: 2, mb: 2 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 2 }}>
            <Typography sx={{ color: '#888', fontSize: 12, fontFamily: 'monospace' }}>{referralLink}</Typography>
            <Tooltip title={copied ? 'Copiado!' : 'Copiar link'}>
              <IconButton size="small" onClick={copyLink} sx={{ color: copied ? '#66BB6A' : '#FFD700' }}>
                {copied ? <CheckCircle sx={{ fontSize: 16 }} /> : <ContentCopy sx={{ fontSize: 16 }} />}
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ bgcolor: '#222', borderRadius: 2, p: 2, mt: 1 }}>
            <Typography sx={{ color: '#ccc', fontSize: 13, lineHeight: 1.7 }}>
              Compartilhe seu link com motoristas da sua região. Quando eles se cadastrarem e completarem corridas, você recebe por cada indicação qualificada.
            </Typography>
          </Box>
        </Box>

        {/* Status */}
        {isComplete ? (
          <Alert icon={<CheckCircle />} severity="success" sx={{ mb: 3, bgcolor: '#1b2e1b', color: '#66BB6A', border: '1px solid #2e4a2e', '& .MuiAlert-icon': { color: '#66BB6A' } }}>
            Cadastro completo — você está pronto para receber.
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mb: 3, bgcolor: '#2e2a1b', color: '#FFD700', border: '1px solid #4a3e1b', '& .MuiAlert-icon': { color: '#FFD700' } }}>
            Complete seus dados para receber por suas indicações.
          </Alert>
        )}

        {saved && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(false)}>Dados salvos com sucesso!</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        {/* Seção 2 — Formulário */}
        <Box sx={{ bgcolor: '#1a1a1a', borderRadius: 3, p: 3, border: '1px solid #333' }}>
          <Typography sx={{ color: '#fff', fontWeight: 600, mb: 2, fontSize: 15 }}>Seus dados</Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Nome completo" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} fullWidth size="small"
              sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: '#444' }, '&:hover fieldset': { borderColor: '#FFD700' } }, '& .MuiInputLabel-root': { color: '#888' } }} />

            <TextField label="Telefone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} fullWidth size="small"
              sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: '#444' }, '&:hover fieldset': { borderColor: '#FFD700' } }, '& .MuiInputLabel-root': { color: '#888' } }} />

            <TextField label="E-mail" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} fullWidth size="small" required
              sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: '#444' }, '&:hover fieldset': { borderColor: '#FFD700' } }, '& .MuiInputLabel-root': { color: '#888' } }} />

            <TextField select label="Tipo da chave PIX" value={form.pix_key_type} onChange={e => setForm({ ...form, pix_key_type: e.target.value })} fullWidth size="small" required
              sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: '#444' }, '&:hover fieldset': { borderColor: '#FFD700' } }, '& .MuiInputLabel-root': { color: '#888' }, '& .MuiSelect-icon': { color: '#888' } }}>
              {PIX_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </TextField>

            <TextField label="Chave PIX" value={form.pix_key} onChange={e => setForm({ ...form, pix_key: e.target.value })} fullWidth size="small" required
              placeholder={form.pix_key_type === 'CPF' ? '000.000.000-00' : form.pix_key_type === 'PHONE' ? '(21) 99999-9999' : form.pix_key_type === 'EMAIL' ? 'seu@email.com' : 'Chave aleatória'}
              sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: '#444' }, '&:hover fieldset': { borderColor: '#FFD700' } }, '& .MuiInputLabel-root': { color: '#888' } }} />
          </Box>

          {/* Termos */}
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #2a2a2a' }}>
            <Typography sx={{ color: '#888', fontSize: 11, lineHeight: 1.6, mb: 1.5 }}>
              Ao prosseguir, declaro que atuo como indicador independente, sem vínculo empregatício, societário ou de representação exclusiva com a KAVIAR. A remuneração por indicação é variável e condicionada ao cumprimento dos critérios do programa.
            </Typography>
            <FormControlLabel
              control={<Checkbox checked={form.terms_accepted} onChange={e => setForm({ ...form, terms_accepted: e.target.checked })} sx={{ color: '#666', '&.Mui-checked': { color: '#FFD700' } }} size="small" />}
              label={<Typography sx={{ color: '#aaa', fontSize: 12 }}>Li e concordo com os termos acima</Typography>}
            />
          </Box>

          <Button
            fullWidth variant="contained" onClick={handleSave} disabled={saving || !form.terms_accepted || !form.email || !form.pix_key}
            sx={{ mt: 3, bgcolor: '#FFD700', color: '#000', fontWeight: 700, py: 1.2, borderRadius: 2, fontSize: 14, '&:hover': { bgcolor: '#e6c200' }, '&.Mui-disabled': { bgcolor: '#333', color: '#666' } }}>
            {saving ? 'Salvando...' : 'Salvar dados'}
          </Button>
        </Box>

        {/* WhatsApp share */}
        <Button fullWidth variant="outlined" onClick={() => {
          const text = `Seja motorista KAVIAR! 🚗\n\nCadastre-se usando meu código: ${upperCode}\nLink: ${referralLink}\n\nBaixe o app e comece a dirigir na sua região.`;
          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        }} sx={{ mt: 2, color: '#25D366', borderColor: '#25D366', fontWeight: 600, borderRadius: 2, '&:hover': { borderColor: '#1da851', bgcolor: 'rgba(37,211,102,0.05)' } }}>
          Compartilhar link via WhatsApp
        </Button>
      </Box>
    </Box>
  );
}
