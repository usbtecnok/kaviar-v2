import { useState, useEffect } from 'react';
import { Box, Typography, Button, Chip, Table, TableBody, TableCell, TableHead, TableRow, TextField, Select, MenuItem, FormControl, InputLabel, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { API_BASE_URL } from '../../config/api';

const STATUS_MAP = { new: { label: 'Nova', color: 'info' }, analyzing: { label: 'Em análise', color: 'warning' }, confirmed: { label: 'Confirmada', color: 'success' }, completed: { label: 'Concluída', color: 'default' }, canceled: { label: 'Cancelada', color: 'error' } };
const SERVICE_LABELS = { consulta: '🏥 Consulta', mercado: '🛒 Mercado', escola: '🎒 Escola', aeroporto: '✈️ Aeroporto', evento: '🎉 Evento', idoso: '👴 Familiar', compromisso: '📋 Compromisso', outro: '🚗 Outro' };

export default function PrivateRides() {
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({ new: 0, analyzing: 0, confirmed: 0 });
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState(null);
  const [driverName, setDriverName] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const token = localStorage.getItem('kaviar_admin_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = async () => {
    const res = await fetch(`${API_BASE_URL}/api/admin/private-rides?status=${filter}`, { headers });
    const data = await res.json();
    if (data.success) { setRequests(data.data); setCounts(data.counts); }
  };

  useEffect(() => { fetchData(); }, [filter]);

  const updateStatus = async (id, status) => {
    const body = { status, assigned_driver: driverName || undefined, admin_notes: adminNotes || undefined };
    const res = await fetch(`${API_BASE_URL}/api/admin/private-rides/${id}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.success) {
      if (data.whatsapp_link) window.open(data.whatsapp_link, '_blank');
      setDetail(null); fetchData();
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>KAVIAR Particular</Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Chip label={`Novas (${counts.new})`} color="info" variant={filter === 'new' ? 'filled' : 'outlined'} onClick={() => setFilter('new')} />
        <Chip label={`Em análise (${counts.analyzing})`} color="warning" variant={filter === 'analyzing' ? 'filled' : 'outlined'} onClick={() => setFilter('analyzing')} />
        <Chip label={`Confirmadas (${counts.confirmed})`} color="success" variant={filter === 'confirmed' ? 'filled' : 'outlined'} onClick={() => setFilter('confirmed')} />
        <Chip label="Todas" variant={filter === 'all' ? 'filled' : 'outlined'} onClick={() => setFilter('all')} />
      </Box>

      <Table size="small">
        <TableHead><TableRow>
          <TableCell>Data/Hora</TableCell><TableCell>Cliente</TableCell><TableCell>Serviço</TableCell><TableCell>Trajeto</TableCell><TableCell>Status</TableCell><TableCell>Ações</TableCell>
        </TableRow></TableHead>
        <TableBody>
          {requests.map(r => (
            <TableRow key={r.id} hover>
              <TableCell><Typography sx={{ fontSize: 13, fontWeight: 600 }}>{r.scheduled_date}</Typography><Typography sx={{ fontSize: 11, color: '#888' }}>{r.scheduled_time}</Typography></TableCell>
              <TableCell><Typography sx={{ fontSize: 13 }}>{r.name}</Typography><Typography sx={{ fontSize: 11, color: '#888' }}>{r.phone}</Typography></TableCell>
              <TableCell><Typography sx={{ fontSize: 12 }}>{SERVICE_LABELS[r.service_type] || r.service_type}</Typography></TableCell>
              <TableCell><Typography sx={{ fontSize: 12 }}>{r.origin} → {r.destination}</Typography>{r.round_trip && <Chip label="Ida+volta" size="small" sx={{ fontSize: 9 }} />}{r.wait_at_destination && <Chip label="Aguardar" size="small" sx={{ fontSize: 9, ml: 0.5 }} />}</TableCell>
              <TableCell><Chip label={STATUS_MAP[r.status]?.label || r.status} color={STATUS_MAP[r.status]?.color || 'default'} size="small" /></TableCell>
              <TableCell><Button size="small" onClick={() => { setDetail(r); setDriverName(r.assigned_driver || ''); setAdminNotes(r.admin_notes || ''); }}>Gerenciar</Button></TableCell>
            </TableRow>
          ))}
          {requests.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ color: '#888', py: 4 }}>Nenhuma solicitação</TableCell></TableRow>}
        </TableBody>
      </Table>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        {detail && (<>
          <DialogTitle>Solicitação — {detail.name}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: '8px !important' }}>
            <Typography><strong>Telefone:</strong> {detail.phone}</Typography>
            <Typography><strong>Serviço:</strong> {SERVICE_LABELS[detail.service_type]}</Typography>
            <Typography><strong>Data:</strong> {detail.scheduled_date} às {detail.scheduled_time}</Typography>
            <Typography><strong>Origem:</strong> {detail.origin}</Typography>
            <Typography><strong>Destino:</strong> {detail.destination}</Typography>
            {detail.round_trip && <Typography><strong>Ida e volta:</strong> Sim</Typography>}
            {detail.wait_at_destination && <Typography><strong>Aguardar no local:</strong> Sim</Typography>}
            {detail.notes && <Typography><strong>Observações:</strong> {detail.notes}</Typography>}
            <TextField size="small" label="Motorista designado" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
            <TextField size="small" label="Notas internas" multiline rows={2} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
          </DialogContent>
          <DialogActions sx={{ flexWrap: 'wrap', gap: 0.5, p: 2 }}>
            {detail.status === 'new' && <Button variant="contained" color="warning" onClick={() => updateStatus(detail.id, 'analyzing')}>Em análise</Button>}
            {(detail.status === 'new' || detail.status === 'analyzing') && <Button variant="contained" color="success" onClick={() => updateStatus(detail.id, 'confirmed')}>Confirmar + WhatsApp</Button>}
            {detail.status === 'confirmed' && <Button variant="contained" onClick={() => updateStatus(detail.id, 'completed')}>Concluída</Button>}
            {detail.status !== 'canceled' && detail.status !== 'completed' && <Button variant="outlined" color="error" onClick={() => updateStatus(detail.id, 'canceled')}>Cancelar</Button>}
            <Button onClick={() => setDetail(null)}>Fechar</Button>
          </DialogActions>
        </>)}
      </Dialog>
    </Box>
  );
}
