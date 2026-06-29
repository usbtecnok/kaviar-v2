import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { API_BASE_URL } from '../../config/api';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';

const GROUP_TYPES = [
  'private_group',
  'local_community',
  'family',
  'school',
  'company',
  'condo',
  'elderly_support',
  'other',
];

function authHeaders() {
  const token = localStorage.getItem('kaviar_admin_token');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function parseErrorMessage(data, fallback) {
  return data?.error || fallback;
}

function invitePublicLink(code) {
  return `${window.location.origin}/grupos/convite/${encodeURIComponent(code)}`;
}

export default function GroupsManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviteSaving, setInviteSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [groups, setGroups] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const [newGroup, setNewGroup] = useState({
    public_name: '',
    type: 'private_group',
    description: '',
    territory_id: '',
    neighborhood_id: '',
    community_id: '',
    responsible_name: '',
    responsible_phone: '',
    responsible_email: '',
  });

  const [newInvite, setNewInvite] = useState({
    expires_at: '',
    max_uses: '',
  });

  const selectedSummary = useMemo(() => groups.find((g) => g.id === selectedId) || null, [groups, selectedId]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_BASE_URL}/api/admin/groups?limit=200`, {
        headers: authHeaders(),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(parseErrorMessage(data, 'Erro ao carregar grupos'));
      }
      setGroups(data.data || []);
      if (!selectedId && data.data?.length) {
        setSelectedId(data.data[0].id);
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar grupos');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupDetail = async (groupId) => {
    if (!groupId) return;
    try {
      setError('');
      const response = await fetch(`${API_BASE_URL}/api/admin/groups/${groupId}`, {
        headers: authHeaders(),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(parseErrorMessage(data, 'Erro ao buscar detalhe do grupo'));
      }
      setSelectedGroup(data.data);
    } catch (err) {
      setError(err.message || 'Erro ao buscar detalhe do grupo');
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadGroupDetail(selectedId);
    }
  }, [selectedId]);

  const handleCreateGroup = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const payload = {
        ...newGroup,
        max_uses: undefined,
      };

      const response = await fetch(`${API_BASE_URL}/api/admin/groups`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(parseErrorMessage(data, 'Erro ao criar grupo'));
      }

      setSuccess('Grupo criado com sucesso.');
      setCreateOpen(false);
      setNewGroup({
        public_name: '',
        type: 'private_group',
        description: '',
        territory_id: '',
        neighborhood_id: '',
        community_id: '',
        responsible_name: '',
        responsible_phone: '',
        responsible_email: '',
      });

      await loadGroups();
      setSelectedId(data.data.id);
      await loadGroupDetail(data.data.id);
    } catch (err) {
      setError(err.message || 'Erro ao criar grupo');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!selectedId) return;
    try {
      setInviteSaving(true);
      setError('');
      setSuccess('');

      const payload = {
        expires_at: new Date(newInvite.expires_at).toISOString(),
        max_uses: newInvite.max_uses ? Number(newInvite.max_uses) : null,
      };

      const response = await fetch(`${API_BASE_URL}/api/admin/groups/${selectedId}/invites`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(parseErrorMessage(data, 'Erro ao criar convite'));
      }

      setSuccess('Convite criado com sucesso.');
      setInviteOpen(false);
      setNewInvite({ expires_at: '', max_uses: '' });
      await loadGroupDetail(selectedId);
    } catch (err) {
      setError(err.message || 'Erro ao criar convite');
    } finally {
      setInviteSaving(false);
    }
  };

  const copyText = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      setSuccess(`${label} copiado.`);
    } catch {
      setError('Nao foi possivel copiar automaticamente.');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 2, pb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#C8A84E' }}>Grupos KAVIAR</Typography>
          <Typography sx={{ color: '#9CA3AF', fontSize: 13 }}>MVP operacional: criar grupo, convite e acompanhar membros.</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => loadGroups()}>Atualizar</Button>
          <Button variant="contained" onClick={() => setCreateOpen(true)} sx={{ bgcolor: '#C8A84E', color: '#121212', '&:hover': { bgcolor: '#B08E30' } }}>
            Novo grupo
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 2, bgcolor: '#11131A', border: '1px solid #2A2E3A' }}>
            <CardContent>
              <Typography sx={{ color: '#F5F5F5', fontWeight: 700, mb: 1 }}>Lista de grupos</Typography>
              {loading ? (
                <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={26} /></Box>
              ) : groups.length === 0 ? (
                <Typography sx={{ color: '#9CA3AF' }}>Nenhum grupo encontrado no escopo.</Typography>
              ) : (
                <Stack spacing={1}>
                  {groups.map((group) => (
                    <Box
                      key={group.id}
                      onClick={() => setSelectedId(group.id)}
                      sx={{
                        borderRadius: 1.5,
                        p: 1.25,
                        cursor: 'pointer',
                        border: selectedId === group.id ? '1px solid #C8A84E' : '1px solid #2A2E3A',
                        bgcolor: selectedId === group.id ? 'rgba(200,168,78,0.12)' : '#0F1117',
                      }}
                    >
                      <Typography sx={{ color: '#F5F5F5', fontWeight: 700, fontSize: 14 }}>{group.public_name}</Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <Chip size="small" label={group.type} sx={{ bgcolor: '#222838', color: '#D3D8E2' }} />
                        <Chip size="small" label={group.status} sx={{ bgcolor: '#1F3A2E', color: '#BFF0D0' }} />
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 2, bgcolor: '#11131A', border: '1px solid #2A2E3A' }}>
            <CardContent>
              {!selectedSummary ? (
                <Typography sx={{ color: '#9CA3AF' }}>Selecione um grupo.</Typography>
              ) : (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Typography sx={{ color: '#F5F5F5', fontWeight: 800, fontSize: 18 }}>{selectedSummary.public_name}</Typography>
                      <Typography sx={{ color: '#9CA3AF', fontSize: 13 }}>{selectedSummary.description || 'Sem descricao'}</Typography>
                    </Box>
                    <Button variant="contained" onClick={() => setInviteOpen(true)} sx={{ bgcolor: '#C8A84E', color: '#121212', '&:hover': { bgcolor: '#B08E30' } }}>
                      Criar convite
                    </Button>
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip size="small" label={`Tipo: ${selectedSummary.type}`} sx={{ bgcolor: '#222838', color: '#D3D8E2' }} />
                    <Chip size="small" label={`Status: ${selectedSummary.status}`} sx={{ bgcolor: '#1F3A2E', color: '#BFF0D0' }} />
                    <Chip size="small" label={`Membros: ${selectedSummary._count?.members || 0}`} sx={{ bgcolor: '#3B2D1A', color: '#F6D497' }} />
                  </Stack>

                  <Typography sx={{ color: '#F5F5F5', fontWeight: 700, mb: 1 }}>Convites</Typography>
                  <Stack spacing={1} sx={{ mb: 2 }}>
                    {(selectedGroup?.invites || []).slice(0, 10).map((invite) => {
                      const publicLink = invitePublicLink(invite.code);
                      return (
                        <Box key={invite.id} sx={{ border: '1px solid #2A2E3A', borderRadius: 1.5, p: 1 }}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                            <Box>
                              <Typography sx={{ color: '#F5F5F5', fontWeight: 700, fontSize: 13 }}>{invite.code}</Typography>
                              <Typography sx={{ color: '#9CA3AF', fontSize: 12 }}>
                                Expira: {new Date(invite.expires_at).toLocaleString('pt-BR')} • Uso: {invite.used_count}/{invite.max_uses || '∞'}
                              </Typography>
                            </Box>
                            <Stack direction="row" spacing={0.5}>
                              <IconButton size="small" onClick={() => copyText(invite.code, 'Codigo')}>
                                <ContentCopyIcon sx={{ color: '#E5E7EB', fontSize: 16 }} />
                              </IconButton>
                              <IconButton size="small" onClick={() => copyText(publicLink, 'Link')}>
                                <ContentCopyIcon sx={{ color: '#E5E7EB', fontSize: 16 }} />
                              </IconButton>
                            </Stack>
                          </Stack>
                        </Box>
                      );
                    })}
                    {(selectedGroup?.invites || []).length === 0 && <Typography sx={{ color: '#9CA3AF', fontSize: 13 }}>Nenhum convite criado ainda.</Typography>}
                  </Stack>

                  <Typography sx={{ color: '#F5F5F5', fontWeight: 700, mb: 1 }}>Membros (basico)</Typography>
                  <Stack spacing={1}>
                    {(selectedGroup?.members || []).slice(0, 20).map((member) => (
                      <Box key={member.id} sx={{ border: '1px solid #2A2E3A', borderRadius: 1.5, p: 1 }}>
                        <Typography sx={{ color: '#F5F5F5', fontSize: 13, fontWeight: 700 }}>{member.name || 'Sem nome'}</Typography>
                        <Typography sx={{ color: '#9CA3AF', fontSize: 12 }}>
                          {member.user_type} • {member.role} • {member.status}
                        </Typography>
                      </Box>
                    ))}
                    {(selectedGroup?.members || []).length === 0 && <Typography sx={{ color: '#9CA3AF', fontSize: 13 }}>Nenhum membro listado.</Typography>}
                  </Stack>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Novo Grupo KAVIAR</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField label="Nome publico" value={newGroup.public_name} onChange={(e) => setNewGroup((p) => ({ ...p, public_name: e.target.value }))} fullWidth required />
            <TextField select SelectProps={{ native: true }} label="Tipo" value={newGroup.type} onChange={(e) => setNewGroup((p) => ({ ...p, type: e.target.value }))}>
              {GROUP_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </TextField>
            <TextField label="Descricao" value={newGroup.description} onChange={(e) => setNewGroup((p) => ({ ...p, description: e.target.value }))} multiline minRows={2} />
            <TextField label="Territorio ID" value={newGroup.territory_id} onChange={(e) => setNewGroup((p) => ({ ...p, territory_id: e.target.value }))} />
            <TextField label="Bairro ID" value={newGroup.neighborhood_id} onChange={(e) => setNewGroup((p) => ({ ...p, neighborhood_id: e.target.value }))} />
            <TextField label="Comunidade ID" value={newGroup.community_id} onChange={(e) => setNewGroup((p) => ({ ...p, community_id: e.target.value }))} />
            <TextField label="Responsavel" value={newGroup.responsible_name} onChange={(e) => setNewGroup((p) => ({ ...p, responsible_name: e.target.value }))} />
            <TextField label="Telefone" value={newGroup.responsible_phone} onChange={(e) => setNewGroup((p) => ({ ...p, responsible_phone: e.target.value }))} />
            <TextField label="E-mail" value={newGroup.responsible_email} onChange={(e) => setNewGroup((p) => ({ ...p, responsible_email: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreateGroup} disabled={saving || !newGroup.public_name} variant="contained">{saving ? 'Salvando...' : 'Criar grupo'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Novo convite</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField
              label="Expira em"
              type="datetime-local"
              value={newInvite.expires_at}
              onChange={(e) => setNewInvite((p) => ({ ...p, expires_at: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
            <TextField
              label="Limite de usos (opcional)"
              type="number"
              value={newInvite.max_uses}
              onChange={(e) => setNewInvite((p) => ({ ...p, max_uses: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreateInvite} disabled={inviteSaving || !newInvite.expires_at} variant="contained">{inviteSaving ? 'Salvando...' : 'Criar convite'}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
