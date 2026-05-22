import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Chip, Button, Alert, CircularProgress } from '@mui/material';
import { API_BASE_URL } from '../../config/api';

export default function MyContractPage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('kaviar_admin_token');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/my-operator-profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setProfile(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress sx={{ color: '#B8942E' }} /></Box>;

  if (!profile) return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" sx={{ color: '#C8A84E', fontWeight: 800, mb: 2 }}>📋 Meu Contrato</Typography>
      <Alert severity="info">Seu contrato ainda não foi registrado pelo KAVIAR. Entre em contato pelos canais oficiais se tiver dúvidas.</Alert>
    </Box>
  );

  return (
    <Box>
      <Typography variant="h5" sx={{ color: '#C8A84E', fontWeight: 800, mb: 2 }}>📋 Meu Contrato</Typography>
      <Card sx={{ border: '1px solid #E8E5DE', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{profile.display_name}</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {profile.territory && <Typography variant="body2"><strong>Território:</strong> {profile.territory.name}</Typography>}
            <Typography variant="body2"><strong>Status do contrato:</strong> <Chip label={profile.contract_status || 'pending'} size="small" color={profile.contract_status === 'signed' ? 'success' : profile.contract_status === 'not_required' ? 'default' : 'warning'} /></Typography>
            {profile.contract_signed_at && <Typography variant="body2"><strong>Assinado em:</strong> {new Date(profile.contract_signed_at).toLocaleDateString('pt-BR')}</Typography>}
            {profile.contract_url && (
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Button size="small" variant="outlined" onClick={() => window.open(profile.contract_url, '_blank')}>Abrir contrato</Button>
                <Button size="small" variant="outlined" sx={{ color: '#6B7280' }} onClick={() => navigator.clipboard.writeText(profile.contract_url)}>Copiar link</Button>
              </Box>
            )}
            {!profile.contract_url && profile.contract_status !== 'signed' && <Alert severity="info" sx={{ mt: 1 }}>Contrato ainda não registrado. O KAVIAR entrará em contato quando necessário.</Alert>}
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ border: '1px solid #E8E5DE' }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Termos Aceitos</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="body2" sx={{ color: '#6B7280' }}>Termo de Responsabilidade</Typography><Typography variant="body2" sx={{ color: profile.responsibility_terms_accepted_at ? '#059669' : '#D97706' }}>{profile.responsibility_terms_accepted_at ? new Date(profile.responsibility_terms_accepted_at).toLocaleString('pt-BR') : 'Pendente'}</Typography></Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="body2" sx={{ color: '#6B7280' }}>Confidencialidade / LGPD</Typography><Typography variant="body2" sx={{ color: profile.confidentiality_terms_accepted_at ? '#059669' : '#D97706' }}>{profile.confidentiality_terms_accepted_at ? new Date(profile.confidentiality_terms_accepted_at).toLocaleString('pt-BR') : 'Pendente'}</Typography></Box>
            {profile.terms_version && <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="body2" sx={{ color: '#6B7280' }}>Versão dos termos</Typography><Typography variant="body2">{profile.terms_version}</Typography></Box>}
          </Box>
        </CardContent>
      </Card>

      <Alert severity="warning" sx={{ mt: 3 }}>Este é um registro interno. Não substitui contrato jurídico formal nem orientação contábil.</Alert>
    </Box>
  );
}
