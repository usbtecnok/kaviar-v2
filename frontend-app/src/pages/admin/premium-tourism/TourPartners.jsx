import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Card, CardContent, Button, Table, TableBody, 
  TableCell, TableHead, TableRow, IconButton, Alert, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, Typography, Chip
} from '@mui/material';
import { Add, Edit, Block } from '@mui/icons-material';
import { adminApi } from '../../../services/adminApi';
import DomainHeader from '../../../components/common/DomainHeader';
import PremiumTourismNav from '../../../components/admin/premium-tourism/PremiumTourismNav';

export default function TourPartners() {
  const navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminApi.getTourPartners();
      setPartners(data.partners || []);
    } catch (err) {
      setError('Erro ao carregar parceiros');
      console.error('Error loading partners:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (partner = null) => {
    if (partner) {
      setEditingId(partner.id);
      setFormData({
        name: partner.name || '',
        contactName: partner.contact_name || '',
        phone: partner.phone || '',
        email: partner.email || ''
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', contactName: '', phone: '', email: '' });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setFormData({ name: '', contactName: '', phone: '', email: '' });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name) {
        setError('Nome é obrigatório');
        return;
      }

      if (editingId) {
        await adminApi.updateTourPartner(editingId, formData);
      } else {
        await adminApi.createTourPartner(formData);
      }

      handleCloseDialog();
      loadPartners();
    } catch (err) {
      setError(err.message || 'Erro ao salvar parceiro');
      console.error('Error saving partner:', err);
    }
  };

  const handleDeactivate = async (id, name) => {
    if (!confirm(`Desativar parceiro "${name}"?`)) return;

    try {
      await adminApi.deactivateTourPartner(id);
      loadPartners();
    } catch (err) {
      setError('Erro ao desativar parceiro');
      console.error('Error deactivating partner:', err);
    }
  };

  if (loading && partners.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 2 }}>
        <Typography>Carregando parceiros...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2 }}>
      <DomainHeader 
        domain="admin" 
        title="Parceiros Turísticos"
        breadcrumbs={["Premium/Turismo", "Parceiros"]}
        backUrl="/admin"
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <PremiumTourismNav />
        </Grid>

        <Grid item xs={12} md={9}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Card>
            <CardContent>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
                sx={{ mb: 2 }}
                color="secondary"
              >
                Novo Parceiro
              </Button>

              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Contato</TableCell>
                    <TableCell>Telefone</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {partners.map((partner) => (
                    <TableRow key={partner.id}>
                      <TableCell>{partner.name}</TableCell>
                      <TableCell>{partner.contact_name || '-'}</TableCell>
                      <TableCell>{partner.phone || '-'}</TableCell>
                      <TableCell>{partner.email || '-'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={partner.is_active ? 'Ativo' : 'Inativo'}
                          color={partner.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => handleOpenDialog(partner)}
                          size="small"
                          color="primary"
                        >
                          <Edit />
                        </IconButton>
                        {partner.is_active && (
                          <IconButton
                            onClick={() => handleDeactivate(partner.id, partner.name)}
                            size="small"
                            color="error"
                          >
                            <Block />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {partners.length === 0 && !loading && (
                <Typography sx={{ textAlign: 'center', py: 4 }} color="text.secondary">
                  Nenhum parceiro cadastrado
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Editar Parceiro' : 'Novo Parceiro'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            fullWidth
            required
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            label="Nome do Contato"
            value={formData.contactName}
            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Telefone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" color="secondary">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
