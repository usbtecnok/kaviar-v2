import { useState, useEffect } from 'react';
import { Container, Typography, Box, Card, CardContent, Grid, Chip, IconButton, TextField, CircularProgress, Alert, Button, Tooltip } from '@mui/material';
import { Phone, CheckCircle, Close, ChatBubble, ContentCopy, Share } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const STATUS_MAP = {
  new: { label: 'Novo', color: 'warning' },
  contacted: { label: 'Contatado', color: 'info' },
  converted: { label: 'Convertido', color: 'success' },
  dismissed: { label: 'Descartado', color: 'default' },
};

export default function ConsultantLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLeads = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const res = await fetch(`${API_BASE_URL}/api/admin/consultant-leads`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setLeads(data.data);
      else setError('Erro ao carregar leads');
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, []);

  const updateLead = async (id, updates) => {
    const token = localStorage.getItem('kaviar_admin_token');
    await fetch(`${API_BASE_URL}/api/admin/consultant-leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    });
    fetchLeads();
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress sx={{ color: '#FFD700' }} /></Box>;

  const newLeads = leads.filter(l => l.status === 'new');

  return (
    <Box>
      <Typography variant="h5" sx={{ color: '#FFD700', fontWeight: 'bold', mb: 3 }}>
        🤝 Interessados em ser Consultor Kaviar
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {newLeads.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {newLeads.length} novo(s) interessado(s) aguardando contato!
        </Alert>
      )}

      {leads.length === 0 ? (
        <Typography sx={{ color: '#aaa' }}>Nenhum interessado registrado ainda.</Typography>
      ) : (
        <Grid container spacing={2}>
          {leads.map(lead => {
            const st = STATUS_MAP[lead.status] || STATUS_MAP.new;
            return (
              <Grid item xs={12} sm={6} md={4} key={lead.id}>
                <Card sx={{ bgcolor: '#1a1a1a', border: lead.status === 'new' ? '2px solid #FFD700' : '1px solid #333' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography sx={{ color: '#FFD700', fontWeight: 'bold' }}>{lead.name}</Typography>
                      <Chip label={st.label} color={st.color} size="small" />
                    </Box>
                    <Typography sx={{ color: '#ccc', mb: 1 }}>📱 {lead.phone}</Typography>
                    <Typography variant="caption" sx={{ color: '#888' }}>
                      {new Date(lead.created_at).toLocaleString('pt-BR')} · via {lead.source}
                    </Typography>
                    {lead.referral_agent?.referral_code && (
                      <Box sx={{ bgcolor: '#111', borderRadius: 2, p: 1.5, mt: 1.5, border: '1px solid #FFD700', textAlign: 'center' }}>
                        <Chip label={lead.referral_agent.referral_code} size="small" sx={{ bgcolor: '#FFD700', color: '#000', fontWeight: 800, fontFamily: 'monospace', fontSize: 13 }} />
                        {lead.referral_agent.welcome_sent_status && (
                          <Typography sx={{ fontSize: 10, mt: 0.5, color:
                            lead.referral_agent.welcome_sent_status === 'sent' ? '#66BB6A' :
                            lead.referral_agent.welcome_sent_status === 'failed' ? '#f44336' : '#888' }}>
                            {lead.referral_agent.welcome_sent_status === 'sent' ? '✅ Link enviado automaticamente' :
                             lead.referral_agent.welcome_sent_status === 'failed' ? '❌ Falha no envio automático' :
                             '⏳ Envio automático indisponível'}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', mt: 1 }}>
                          <Tooltip title="Copiar link do consultor">
                            <IconButton size="small" sx={{ color: '#FFD700' }}
                              onClick={() => navigator.clipboard.writeText(`https://kaviar.com.br/consultor/${lead.referral_agent.referral_code}`)}>
                              <ContentCopy sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Compartilhar via WhatsApp">
                            <IconButton size="small" sx={{ color: '#25D366' }}
                              onClick={() => {
                                const text = `Bem-vindo ao programa de indicação KAVIAR! 🚗\n\nAcesse seu painel de consultor:\nhttps://kaviar.com.br/consultor/${lead.referral_agent.referral_code}\n\nLá você encontra seu código, link de indicação e pode completar seu cadastro.`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                              }}>
                              <Share sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      <IconButton size="small" title="Marcar contatado" sx={{ color: '#4FC3F7' }}
                        onClick={() => updateLead(lead.id, { status: 'contacted' })}>
                        <ChatBubble fontSize="small" />
                      </IconButton>
                      <IconButton size="small" title="Convertido" sx={{ color: '#66BB6A' }}
                        onClick={() => updateLead(lead.id, { status: 'converted' })}>
                        <CheckCircle fontSize="small" />
                      </IconButton>
                      <IconButton size="small" title="Descartar" sx={{ color: '#999' }}
                        onClick={() => updateLead(lead.id, { status: 'dismissed' })}>
                        <Close fontSize="small" />
                      </IconButton>
                      <IconButton size="small" title="Abrir WhatsApp" sx={{ color: '#25D366' }}
                        onClick={() => window.open(`https://wa.me/55${lead.phone.replace(/\D/g, '')}`, '_blank')}>
                        <Phone fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
