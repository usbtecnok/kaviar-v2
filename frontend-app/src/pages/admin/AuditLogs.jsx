import { useState, useEffect } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Select, MenuItem, Button, Chip, Tabs, Tab } from '@mui/material';
import { API_BASE_URL } from '../../config/api';

export default function AuditLogs() {
  const [tab, setTab] = useState(0);
  const [logs, setLogs] = useState([]);
  const [logins, setLogins] = useState([]);
  const [filters, setFilters] = useState({ admin_email: '', entity_type: '', action: '' });
  const [loginFilters, setLoginFilters] = useState({ email: '', success: '' });
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('kaviar_admin_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.admin_email) params.set('admin_email', filters.admin_email);
      if (filters.entity_type) params.set('entity_type', filters.entity_type);
      if (filters.action) params.set('action', filters.action);
      params.set('limit', '50');
      const res = await fetch(`${API_BASE_URL}/api/admin/audit-logs?${params}`, { headers });
      const data = await res.json();
      setLogs(data.logs || []);
    } catch { setLogs([]); }
    setLoading(false);
  };

  const fetchLogins = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (loginFilters.email) params.set('email', loginFilters.email);
      if (loginFilters.success) params.set('success', loginFilters.success);
      params.set('limit', '50');
      const res = await fetch(`${API_BASE_URL}/api/admin/login-history?${params}`, { headers });
      const data = await res.json();
      setLogins(data.logins || []);
    } catch { setLogins([]); }
    setLoading(false);
  };

  useEffect(() => { tab === 0 ? fetchLogs() : fetchLogins(); }, [tab]);

  const fmtDate = (d) => d ? new Date(d).toLocaleString('pt-BR') : '-';

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>Auditoria</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Ações Admin" />
        <Tab label="Histórico de Login" />
      </Tabs>

      {tab === 0 && (
        <>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <TextField size="small" label="Email admin" value={filters.admin_email} onChange={e => setFilters(f => ({ ...f, admin_email: e.target.value }))} />
            <Select size="small" displayEmpty value={filters.entity_type} onChange={e => setFilters(f => ({ ...f, entity_type: e.target.value }))} sx={{ minWidth: 140 }}>
              <MenuItem value="">Todas entidades</MenuItem>
              {['admin', 'driver', 'driver_credits', 'ride', 'feature_flag', 'referral', 'referral_agent', 'community_leader', 'conversation'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
            <Button variant="contained" size="small" onClick={fetchLogs} disabled={loading}>Buscar</Button>
          </Box>
          <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Admin</TableCell>
                  <TableCell>Ação</TableCell>
                  <TableCell>Entidade</TableCell>
                  <TableCell>ID</TableCell>
                  <TableCell>Detalhes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((l, i) => (
                  <TableRow key={i} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 12 }}>{fmtDate(l.created_at)}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{l.admin_email || l.admin_name || l.admin_id?.substring(0, 8)}</TableCell>
                    <TableCell><Chip label={l.action} size="small" color={l.action?.includes('delete') ? 'error' : 'default'} /></TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{l.entity_type}</TableCell>
                    <TableCell sx={{ fontSize: 11, fontFamily: 'monospace' }}>{l.entity_id?.substring(0, 8)}...</TableCell>
                    <TableCell sx={{ fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {l.old_value && <span style={{ color: '#c62828' }}>antes: {JSON.stringify(l.old_value).substring(0, 60)}</span>}
                      {l.old_value && l.new_value && <br />}
                      {l.new_value && <span style={{ color: '#2e7d32' }}>depois: {JSON.stringify(l.new_value).substring(0, 60)}</span>}
                    </TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && <TableRow><TableCell colSpan={6} align="center">Nenhum registro</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {tab === 1 && (
        <>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField size="small" label="Email" value={loginFilters.email} onChange={e => setLoginFilters(f => ({ ...f, email: e.target.value }))} />
            <Select size="small" displayEmpty value={loginFilters.success} onChange={e => setLoginFilters(f => ({ ...f, success: e.target.value }))} sx={{ minWidth: 120 }}>
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="true">Sucesso</MenuItem>
              <MenuItem value="false">Falha</MenuItem>
            </Select>
            <Button variant="contained" size="small" onClick={fetchLogins} disabled={loading}>Buscar</Button>
          </Box>
          <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Resultado</TableCell>
                  <TableCell>Motivo</TableCell>
                  <TableCell>IP</TableCell>
                  <TableCell>User Agent</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logins.map((l, i) => (
                  <TableRow key={i} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 12 }}>{fmtDate(l.created_at)}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{l.email}</TableCell>
                    <TableCell><Chip label={l.success ? 'OK' : 'FALHA'} size="small" color={l.success ? 'success' : 'error'} /></TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{l.fail_reason || '-'}</TableCell>
                    <TableCell sx={{ fontSize: 11, fontFamily: 'monospace' }}>{l.ip_address}</TableCell>
                    <TableCell sx={{ fontSize: 11, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.user_agent?.substring(0, 40)}</TableCell>
                  </TableRow>
                ))}
                {logins.length === 0 && <TableRow><TableCell colSpan={6} align="center">Nenhum registro</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
