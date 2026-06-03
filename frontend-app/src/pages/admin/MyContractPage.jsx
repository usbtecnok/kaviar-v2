import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Chip, Button, Alert, CircularProgress } from '@mui/material';
import { API_BASE_URL } from '../../config/api';

const TERM_TEXT = `TERMO DE OPERADOR TERRITORIAL CAPTADOR — KAVIAR v1.0

1. PARTES
O KAVIAR é produto e plataforma de propriedade da USB Tecnok Manutenção e Instalação de Computadores Ltda, inscrita no CNPJ 07.710.691/0001-66 ("KAVIAR" ou "Plataforma").
O Operador Territorial Captador ("Operador") é a pessoa física ou jurídica que aceita este termo para atuar como parceiro/captador autônomo em território definido pela Plataforma.

2. NATUREZA DA RELAÇÃO
O Operador atua como parceiro/captador autônomo. Não há vínculo empregatício, salário fixo, obrigação de jornada, subordinação ou exclusividade automática entre o Operador e a USB Tecnok/KAVIAR.

3. TERRITÓRIO
O território vinculado define a área de atuação e acompanhamento do Operador. O território não confere propriedade, franquia, licença exclusiva nem direito real sobre a área.

4. LIMITAÇÕES
O Operador NÃO pode:
• Se apresentar como funcionário, sócio, representante legal ou procurador da USB Tecnok/KAVIAR;
• Cobrar valores em nome do KAVIAR sem autorização formal por escrito;
• Prometer aprovação de motoristas, passageiros, parceiros ou comércios;
• Alterar preços, taxas, comissões, créditos ou regras operacionais da Plataforma;
• Tomar decisões que vinculem a USB Tecnok/KAVIAR perante terceiros.

5. INDICAÇÕES
O Operador pode indicar motoristas usando seu link de indicação pessoal. Eventual bônus ou benefício por indicação segue exclusivamente as regras vigentes do sistema, podendo ser alteradas pela Plataforma a qualquer momento.

6. CONFIDENCIALIDADE E LGPD
O Operador deve manter sigilo sobre dados e informações acessadas no painel, incluindo dados pessoais de motoristas, passageiros e parceiros. O uso deve respeitar a Lei Geral de Proteção de Dados (LGPD) e as políticas de privacidade do KAVIAR.

7. SUSPENSÃO E CANCELAMENTO
A USB Tecnok/KAVIAR pode suspender ou cancelar o acesso do Operador em caso de fraude, abuso, mau uso, descumprimento deste termo, conduta incompatível ou risco à operação, sem aviso prévio quando justificado por urgência.

8. ALTERAÇÕES
Este termo pode ser atualizado pela Plataforma. Mudanças relevantes podem exigir novo aceite. A versão vigente estará sempre disponível no painel do Operador.

9. FORO
Fica eleito o foro da Comarca de Nova Iguaçu/RJ para dirimir questões deste termo.`;

export default function MyContractPage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const token = localStorage.getItem('kaviar_admin_token');

  const fetchProfile = () => {
    fetch(`${API_BASE_URL}/api/admin/my-operator-profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setProfile(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/my-operator-profile/accept-terms`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) fetchProfile();
    } catch {}
    setAccepting(false);
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress sx={{ color: '#B8942E' }} /></Box>;

  if (!profile) return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" sx={{ color: '#C8A84E', fontWeight: 800, mb: 2 }}>📋 Meu Contrato</Typography>
      <Alert severity="info">Seu perfil de operador está sendo preparado. Tente novamente em instantes.</Alert>
    </Box>
  );

  const termsAccepted = !!profile.terms_accepted_at;

  return (
    <Box>
      <Typography variant="h5" sx={{ color: '#C8A84E', fontWeight: 800, mb: 2 }}>📋 Meu Contrato</Typography>

      {/* Status */}
      <Card sx={{ border: '1px solid #E8E5DE', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{profile.display_name}</Typography>
          {profile.territory && <Typography variant="body2" sx={{ color: '#6B7280', mb: 1 }}>Território: {profile.territory.name}</Typography>}
          {profile.relationship_type === 'territorial_manager' ? (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography variant="body2"><strong>Status:</strong></Typography>
              <Chip label="Contrato específico em preparação" size="small" color="info" />
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography variant="body2"><strong>Status:</strong></Typography>
                <Chip label={termsAccepted ? 'Termos aceitos' : 'Pendente de aceite'} size="small" color={termsAccepted ? 'success' : 'warning'} />
              </Box>
              {termsAccepted && <Typography variant="body2" sx={{ color: '#059669', mt: 1 }}>Aceito em {new Date(profile.terms_accepted_at).toLocaleString('pt-BR')} • Versão: {profile.terms_version}</Typography>}
            </>
          )}
        </CardContent>
      </Card>

      {/* Termo */}
      {profile.relationship_type === 'territorial_manager' ? (
        <Card sx={{ border: '1px solid #E8E5DE', mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: '#B8942E' }}>Termo de Gestor Territorial KAVIAR</Typography>
            <Alert severity="info">O Termo de Gestor Territorial KAVIAR está em preparação. Este acesso é controlado e depende de contrato específico a ser formalizado pela central KAVIAR/USB Tecnok.</Alert>
          </CardContent>
        </Card>
      ) : (
      <Card sx={{ border: '1px solid #E8E5DE', mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: '#B8942E' }}>Termo de Operador Territorial Captador</Typography>
          <Box sx={{ maxHeight: 400, overflow: 'auto', bgcolor: '#FAFAF8', p: 2, borderRadius: 1, border: '1px solid #E8E5DE' }}>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: '#374151', fontSize: 12, lineHeight: 1.7 }}>{TERM_TEXT}</Typography>
          </Box>
        </CardContent>
      </Card>
      )}

      {/* Aceite */}
      {!termsAccepted && profile.relationship_type !== 'territorial_manager' && (
        <Card sx={{ border: '2px solid #D97706', mb: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Typography sx={{ mb: 2, fontWeight: 600, color: '#92400E' }}>Ao clicar abaixo, você declara que leu e aceita todos os termos acima.</Typography>
            <Button onClick={handleAccept} disabled={accepting} variant="contained" size="large" sx={{ bgcolor: '#B8942E', px: 4, '&:hover': { bgcolor: '#9A7B24' } }}>
              {accepting ? 'Registrando...' : 'Aceito os termos'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Alert severity="warning" sx={{ mt: 2, fontSize: 11 }}>Este é um registro interno digital. Não substitui contrato jurídico formal nem orientação contábil/tributária.</Alert>
    </Box>
  );
}
