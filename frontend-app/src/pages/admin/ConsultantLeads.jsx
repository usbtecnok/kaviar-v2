import { useState, useEffect } from 'react';
import { Container, Typography, Box, Card, CardContent, Grid, Chip, IconButton, TextField, CircularProgress, Alert } from '@mui/material';
import { Phone, CheckCircle, Close, ChatBubble } from '@mui/icons-material';
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
