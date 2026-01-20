import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import api from '../../api';

export default function DriverDocuments() {
  const [formData, setFormData] = useState({
    documentCpf: '',
    documentRg: '',
    documentCnh: '',
    vehiclePlate: '',
    vehicleModel: '',
    communityId: ''
  });
  const [files, setFiles] = useState({
    cpf: null,
    rg: null,
    cnh: null,
    proofOfAddress: null,
    vehiclePhoto: null,
    backgroundCheck: null
  });
  const [communities, setCommunities] = useState([]);
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Guard: verificar autenticação
    const token = localStorage.getItem('kaviar_token');
    if (!token) {
      navigate('/motorista/login');
      return;
    }
    setAuthLoading(false);
    loadCommunities();
  }, [navigate]);

  const loadCommunities = async () => {
    try {
      const response = await api.get('/api/governance/communities');
      if (response.data.success) {
        setCommunities(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar comunidades:', error);
    }
  };

  const handleFileChange = (field, event) => {
    const file = event.target.files[0];
    setFiles(prev => ({ ...prev, [field]: file }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!lgpdAccepted || !termsAccepted) {
      setError('Você deve aceitar os Termos de Uso e a Política de Privacidade LGPD para continuar');
      setLoading(false);
      return;
    }

    // Validar arquivos obrigatórios
    const requiredFiles = ['cpf', 'rg', 'cnh', 'proofOfAddress', 'vehiclePhoto', 'backgroundCheck'];
    const missingFiles = requiredFiles.filter(key => !files[key]);
    
    if (missingFiles.length > 0) {
      setError(`Documentos obrigatórios faltando: ${missingFiles.join(', ')}`);
      setLoading(false);
      return;
    }

    try {
      // Criar FormData explícito
      const fd = new FormData();

      // Arquivos obrigatórios
      fd.append('cpf', files.cpf);
      fd.append('rg', files.rg);
      fd.append('cnh', files.cnh);
      fd.append('proofOfAddress', files.proofOfAddress);
      fd.append('backgroundCheck', files.backgroundCheck);

      // vehiclePhoto: pode ser FileList ou array
      const vp = files.vehiclePhoto;
      if (vp && typeof vp.length === 'number') {
        for (let i = 0; i < vp.length; i++) {
          fd.append('vehiclePhoto', vp[i]);
        }
      } else if (Array.isArray(vp)) {
        vp.forEach((f) => fd.append('vehiclePhoto', f));
      } else {
        fd.append('vehiclePhoto', vp);
      }

      // Campos auxiliares
      if (formData.vehiclePlate) fd.append('vehiclePlate', formData.vehiclePlate);
      if (formData.vehicleModel) fd.append('vehicleModel', formData.vehicleModel);
      if (formData.communityId) fd.append('communityId', formData.communityId);

      // Consentimentos
      fd.append('lgpdAccepted', String(lgpdAccepted));
      fd.append('termsAccepted', String(termsAccepted));

      // Endpoint correto
      const response = await api.post('/api/drivers/me/documents', fd, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/motorista/status');
        }, 2000);
      }
    } catch (error) {
      console.error('Erro ao enviar documentos:', error);
      
      // Tratar erro MISSING_FILES do backend
      if (error.response?.data?.error === 'MISSING_FILES') {
        const missing = error.response.data.missingFiles || [];
        setError(`Documentos obrigatórios faltando: ${missing.join(', ')}`);
      } else {
        setError(
          error.response?.data?.message || 
          error.response?.data?.error ||
          'Erro ao enviar informações. Verifique os arquivos e tente novamente.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Carregando...</Typography>
      </Container>
    );
  }

  if (success) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h5" color="success.main" gutterBottom>
              Informações Enviadas com Sucesso!
            </Typography>
            <Typography variant="body1">
              Suas informações foram enviadas para análise. Você será notificado sobre o status da aprovação.
            </Typography>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Informações para Aprovação
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 4, textAlign: 'center' }}>
          Para ser aprovado como motorista, complete suas informações e envie os documentos obrigatórios.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {/* LGPD e Termos */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Consentimento e Termos
            </Typography>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    required
                  />
                }
                label={
                  <Typography variant="body2">
                    Li e aceito os{' '}
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => setShowTermsModal(true)}
                      sx={{ textTransform: 'none', p: 0, minWidth: 0 }}
                    >
                      Termos de Uso KAVIAR
                    </Button>
                  </Typography>
                }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={lgpdAccepted}
                    onChange={(e) => setLgpdAccepted(e.target.checked)}
                    required
                  />
                }
                label={
                  <Typography variant="body2">
                    Li e concordo com a Política de Privacidade (LGPD)
                  </Typography>
                }
              />
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Grid container spacing={3}>
            {/* Documentos Pessoais */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Documentos Pessoais
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="CPF"
                  value={formData.documentCpf}
                  onChange={(e) => setFormData(prev => ({ ...prev, documentCpf: e.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="RG"
                  value={formData.documentRg}
                  onChange={(e) => setFormData(prev => ({ ...prev, documentRg: e.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="CNH"
                  value={formData.documentCnh}
                  onChange={(e) => setFormData(prev => ({ ...prev, documentCnh: e.target.value }))}
                  required
                  fullWidth
                />
              </Box>
            </Grid>

            {/* Informações do Veículo */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Informações do Veículo
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Placa do Veículo"
                  value={formData.vehiclePlate}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehiclePlate: e.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="Modelo do Veículo"
                  value={formData.vehicleModel}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehicleModel: e.target.value }))}
                  required
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>Comunidade (opcional)</InputLabel>
                  <Select
                    value={formData.communityId}
                    onChange={(e) => setFormData(prev => ({ ...prev, communityId: e.target.value }))}
                  >
                    <MenuItem value="">
                      <em>Nenhuma</em>
                    </MenuItem>
                    {communities.map(community => (
                      <MenuItem key={community.id} value={community.id}>
                        {community.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Grid>

            {/* Uploads de Documentos */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Upload de Documentos *
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Envie fotos ou PDFs dos documentos. Formatos aceitos: JPG, PNG, PDF (máx. 5MB cada)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Button variant="outlined" component="label" fullWidth>
                    {files.cpf ? `CPF: ${files.cpf.name}` : 'Upload CPF *'}
                    <input type="file" hidden accept="image/*,.pdf" onChange={(e) => handleFileChange('cpf', e)} required />
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button variant="outlined" component="label" fullWidth>
                    {files.rg ? `RG: ${files.rg.name}` : 'Upload RG *'}
                    <input type="file" hidden accept="image/*,.pdf" onChange={(e) => handleFileChange('rg', e)} required />
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button variant="outlined" component="label" fullWidth>
                    {files.cnh ? `CNH: ${files.cnh.name}` : 'Upload CNH *'}
                    <input type="file" hidden accept="image/*,.pdf" onChange={(e) => handleFileChange('cnh', e)} required />
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button variant="outlined" component="label" fullWidth>
                    {files.proofOfAddress ? `Comprovante: ${files.proofOfAddress.name}` : 'Comprovante de Residência *'}
                    <input type="file" hidden accept="image/*,.pdf" onChange={(e) => handleFileChange('proofOfAddress', e)} required />
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button variant="outlined" component="label" fullWidth>
                    {files.vehiclePhoto ? `Veículo: ${files.vehiclePhoto.name}` : 'Foto do Veículo *'}
                    <input type="file" hidden accept="image/*" onChange={(e) => handleFileChange('vehiclePhoto', e)} required />
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button variant="outlined" component="label" fullWidth>
                    {files.backgroundCheck ? `Antecedentes: ${files.backgroundCheck.name}` : 'Antecedentes Criminais *'}
                    <input type="file" hidden accept="image/*,.pdf" onChange={(e) => handleFileChange('backgroundCheck', e)} required />
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading || !lgpdAccepted || !termsAccepted}
              sx={{ px: 6 }}
            >
              {loading ? 'Enviando...' : 'Enviar Documentos'}
            </Button>
          </Box>
        </form>
      </Paper>

      {/* Modal de Termos */}
      <Dialog open={showTermsModal} onClose={() => setShowTermsModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>Termos de Uso KAVIAR - Motoristas</DialogTitle>
        <DialogContent dividers sx={{ maxHeight: 500 }}>
          <Typography variant="caption" display="block" gutterBottom>
            Versão: 2026-01 | Última atualização: Janeiro de 2026
          </Typography>
          
          <Typography variant="body2" paragraph sx={{ mt: 2 }}>
            Ao prosseguir com o cadastro e utilizar a plataforma KAVIAR, o motorista declara que leu, compreendeu e concorda integralmente com os termos abaixo.
          </Typography>

          <Typography variant="body2" paragraph>
            <strong>1. OBJETO DA PLATAFORMA</strong><br/>
            A KAVIAR é uma plataforma tecnológica que conecta passageiros a motoristas independentes para prestação de serviços de transporte privado, não estabelecendo vínculo empregatício entre as partes.
          </Typography>

          <Typography variant="body2" paragraph>
            <strong>2. REQUISITOS PARA MOTORISTAS</strong><br/>
            Para utilizar a plataforma como motorista, o usuário declara que possui capacidade civil plena, é legalmente habilitado para dirigir, possui documentação válida exigida por lei e fornece informações verdadeiras, completas e atualizadas.
          </Typography>

          <Typography variant="body2" paragraph>
            <strong>3. OBRIGAÇÕES DO MOTORISTA</strong><br/>
            O motorista se compromete a manter comportamento respeitoso com passageiros, cumprir as leis de trânsito e normas locais, não realizar atividades ilícitas, utilizar a plataforma de boa-fé, manter seus dados atualizados, não ceder sua conta a terceiros e responder civil e criminalmente por seus atos.
          </Typography>

          <Typography variant="body2" paragraph>
            <strong>4. GEOLOCALIZAÇÃO</strong><br/>
            Ao utilizar a KAVIAR, o motorista autoriza expressamente a coleta de sua localização geográfica em tempo real para correspondência de corridas, segurança operacional, auditoria e prevenção de fraudes. Sem a localização ativa, o serviço poderá ser limitado ou indisponível.
          </Typography>

          <Typography variant="body2" paragraph>
            <strong>5. PAGAMENTOS E CHAVE PIX</strong><br/>
            A KAVIAR poderá utilizar chave PIX informada para repasses financeiros. O motorista é responsável pela veracidade da chave informada. A KAVIAR não se responsabiliza por erros decorrentes de dados incorretos.
          </Typography>

          <Typography variant="body2" paragraph>
            <strong>6. CERTIDÃO "NADA CONSTA"</strong><br/>
            A KAVIAR poderá solicitar, a qualquer momento, certidões negativas criminais ("Nada Consta") e outros documentos de idoneidade. O envio poderá ser obrigatório para continuidade na plataforma.
          </Typography>

          <Typography variant="body2" paragraph>
            <strong>7. SUSPENSÃO E CANCELAMENTO</strong><br/>
            A KAVIAR poderá suspender ou encerrar o acesso do motorista, a qualquer tempo, em caso de violação destes termos, reclamações recorrentes, suspeita de fraude, atividades ilegais ou descumprimento de políticas internas.
          </Typography>

          <Typography variant="body2" paragraph>
            <strong>8. LIMITAÇÃO DE RESPONSABILIDADE</strong><br/>
            A KAVIAR não garante volume mínimo de corridas, não se responsabiliza por conflitos entre motorista e passageiro e atua como intermediadora tecnológica.
          </Typography>

          <Typography variant="body2" paragraph>
            <strong>9. ALTERAÇÕES DOS TERMOS</strong><br/>
            Estes termos podem ser atualizados a qualquer momento. O motorista será notificado e deverá aceitar a nova versão para continuar utilizando a plataforma.
          </Typography>

          <Typography variant="body2" paragraph>
            <strong>10. FORO</strong><br/>
            Fica eleito o foro da comarca de domicílio da KAVIAR, para dirimir quaisquer controvérsias decorrentes destes termos.
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="body2" paragraph>
            <strong>POLÍTICA DE PRIVACIDADE (LGPD)</strong><br/>
            A KAVIAR coleta e trata dados pessoais conforme a Lei Geral de Proteção de Dados (LGPD). Os dados coletados incluem: nome, CPF, RG, CNH, endereço, telefone, e-mail, localização em tempo real, histórico de corridas e informações de pagamento. Estes dados são utilizados exclusivamente para operação da plataforma, segurança, auditoria e cumprimento de obrigações legais. O motorista pode solicitar acesso, correção ou exclusão de seus dados a qualquer momento através dos canais oficiais da KAVIAR.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTermsModal(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
