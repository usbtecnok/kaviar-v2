import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const LEADER_ROLES = [
  { value: 'PRESIDENTE_ASSOCIACAO', label: 'Presidente de Associação' },
  { value: 'LIDER_RELIGIOSO', label: 'Líder Religioso' },
  { value: 'COMERCIANTE_ESTABELECIDO', label: 'Comerciante Estabelecido' },
  { value: 'CONSELHEIRO_COMUNITARIO', label: 'Conselheiro Comunitário' },
];

export default function CommunityLeadersPanel() {
  const [leaders, setLeaders] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    userId: '',
    communityId: '',
    name: '',
    role: '',
    validationWeight: 10,
  });
  
  useEffect(() => {
    fetchCommunities();
  }, []);
  
  useEffect(() => {
    if (selectedCommunity) {
      fetchLeaders(selectedCommunity);
    }
  }, [selectedCommunity]);
  
  const fetchCommunities = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/geo/communities`);
      setCommunities(response.data.communities || []);
    } catch (err) {
      console.error('Error fetching communities:', err);
    }
  };
  
  const fetchLeaders = async (communityId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/reputation/admin/leaders/${communityId}`);
      setLeaders(response.data.leaders || []);
    } catch (err) {
      console.error('Error fetching leaders:', err);
      setError('Erro ao carregar líderes');
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenDialog = () => {
    setFormData({
      userId: '',
      communityId: selectedCommunity,
      name: '',
      role: '',
      validationWeight: 10,
    });
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
  };
  
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      
      await axios.post(`${API_BASE_URL}/reputation/admin/leaders`, formData);
      
      setSuccess('Líder cadastrado com sucesso!');
      handleCloseDialog();
      fetchLeaders(selectedCommunity);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error creating leader:', err);
      setError(err.response?.data?.error || 'Erro ao cadastrar líder');
    } finally {
      setLoading(false);
    }
  };
  
  const handleToggleStatus = async (leaderId) => {
    try {
      await axios.patch(`${API_BASE_URL}/reputation/admin/leaders/${leaderId}/toggle`);
      fetchLeaders(selectedCommunity);
      setSuccess('Status atualizado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error toggling leader status:', err);
      setError('Erro ao atualizar status');
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Lideranças Comunitárias</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            disabled={!selectedCommunity}
          >
            Cadastrar Líder
          </Button>
        </Box>
        
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Selecione a Comunidade</InputLabel>
          <Select
            value={selectedCommunity}
            onChange={(e) => setSelectedCommunity(e.target.value)}
            label="Selecione a Comunidade"
          >
            {communities.map((community) => (
              <MenuItem key={community.id} value={community.id}>
                {community.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {selectedCommunity && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Cargo</TableCell>
                  <TableCell>Peso de Validação</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Cadastrado em</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Nenhum líder cadastrado nesta comunidade
                    </TableCell>
                  </TableRow>
                ) : (
                  leaders.map((leader) => (
                    <TableRow key={leader.id}>
                      <TableCell>{leader.name}</TableCell>
                      <TableCell>{leader.role}</TableCell>
                      <TableCell>{leader.validation_weight}</TableCell>
                      <TableCell>
                        <Chip
                          label={leader.is_active ? 'Ativo' : 'Inativo'}
                          color={leader.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(leader.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => handleToggleStatus(leader.id)}
                          color={leader.is_active ? 'error' : 'success'}
                        >
                          {leader.is_active ? <ToggleOffIcon /> : <ToggleOnIcon />}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
      
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Cadastrar Líder Comunitário</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="ID do Usuário"
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Nome Completo"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />
            <FormControl fullWidth required>
              <InputLabel>Cargo</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                label="Cargo"
              >
                {LEADER_ROLES.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Peso de Validação"
              type="number"
              value={formData.validationWeight}
              onChange={(e) => setFormData({ ...formData, validationWeight: parseInt(e.target.value) })}
              required
              fullWidth
              helperText="Peso padrão: 10 (equivale a 100 corridas)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !formData.userId || !formData.name || !formData.role}
          >
            Cadastrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
