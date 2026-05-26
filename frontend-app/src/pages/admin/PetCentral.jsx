import { Box, Container, Typography, Card, CardContent, Grid, Button, Chip, Divider, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Pets, OpenInNew, CheckCircle, RadioButtonUnchecked, Info, People } from '@mui/icons-material';
import { Link } from 'react-router-dom';

const links = [
  { label: 'Landing /pet', url: 'https://kaviar.com.br/pet', desc: 'Página pública do KAVIAR Pet' },
  { label: 'Pré-cadastro (Forms)', url: 'https://forms.gle/tDHdK1bW1ckiuNrg7', desc: 'Formulário de interesse de motoristas' },
  { label: 'Questionário (Forms)', url: 'https://forms.gle/rRc5rbCSSvcnEeVc6', desc: 'Certificação — nota mínima 7/10' },
  { label: 'Planilha Central (Sheets)', url: 'https://docs.google.com/spreadsheets/d/1CqbvsZga7zXtFiDw2gVdkVF06ARrcNTWtrwgvge8nB4/edit?usp=sharing', desc: '9 abas operacionais' },
  { label: 'Pasta de Fotos (Drive)', url: 'https://drive.google.com/drive/folders/1flpwFHhBsHfmwAUET59-84r_BsMcw1tc?usp=drive_link', desc: 'Fotos de homologação dos motoristas' },
];

const checklist = [
  { text: 'WhatsApp da Central configurado', done: false },
  { text: 'Google Sheets criado e com abas', done: true },
  { text: 'Google Forms pré-cadastro publicado', done: true },
  { text: 'Google Forms questionário publicado', done: true },
  { text: 'Pasta Drive de fotos criada', done: true },
  { text: 'Landing /pet live', done: true },
  { text: 'Vídeos de treinamento gravados', done: false },
  { text: 'Primeiro motorista convidado', done: false },
];

const fluxo = [
  'Motorista acessa landing ou recebe convite',
  'Preenche pré-cadastro (Forms)',
  'Central contata via WhatsApp',
  'Envia vídeos de treinamento',
  'Motorista responde questionário (nota ≥ 7/10)',
  'Envia fotos do veículo preparado',
  'Central valida kit → aprova → emite selo',
];

export default function PetCentral() {
  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Pets sx={{ color: '#b8960c', fontSize: 32 }} />
        <Typography variant="h5" fontWeight="700" sx={{ color: '#E8E3D5' }}>Central KAVIAR Pet</Typography>
        <Chip label="Piloto" size="small" sx={{ bgcolor: '#b8960c', color: '#000', fontWeight: 600 }} />
      </Box>

      <Box sx={{ mb: 3, p: 2, bgcolor: '#1a1a2e', borderRadius: 1, border: '1px solid #333' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Info sx={{ color: '#b8960c', fontSize: 18 }} />
          <Typography variant="body2" sx={{ color: '#aaa' }}>
            Fase piloto — operação via Forms/Sheets/Drive + WhatsApp. Gestão integrada ao sistema em breve.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Button component={Link} to="/admin/pet/operators" variant="outlined" startIcon={<People />} sx={{ borderColor: '#b8960c', color: '#b8960c', textTransform: 'none', '&:hover': { borderColor: '#d4af37', bgcolor: 'rgba(184,150,12,0.08)' } }}>
          Gerenciar operadores Pet
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {links.map((link) => (
          <Grid item xs={12} sm={6} md={4} key={link.label}>
            <Card sx={{ bgcolor: '#111217', border: '1px solid #222', height: '100%' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography variant="subtitle2" fontWeight="700" sx={{ color: '#E8E3D5', mb: 0.5 }}>{link.label}</Typography>
                <Typography variant="caption" sx={{ color: '#888', mb: 2, flex: 1 }}>{link.desc}</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  endIcon={<OpenInNew sx={{ fontSize: 14 }} />}
                  href={link.url}
                  target="_blank"
                  rel="noopener"
                  sx={{ borderColor: '#b8960c', color: '#b8960c', textTransform: 'none', '&:hover': { borderColor: '#d4af37', bgcolor: 'rgba(184,150,12,0.08)' } }}
                >
                  Abrir
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" fontWeight="700" sx={{ color: '#E8E3D5', mb: 1 }}>Fluxo de Homologação</Typography>
          <Card sx={{ bgcolor: '#111217', border: '1px solid #222' }}>
            <CardContent sx={{ py: 1 }}>
              {fluxo.map((step, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                  <Chip label={i + 1} size="small" sx={{ bgcolor: '#222', color: '#b8960c', fontWeight: 700, minWidth: 24, height: 22 }} />
                  <Typography variant="body2" sx={{ color: '#ccc' }}>{step}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" fontWeight="700" sx={{ color: '#E8E3D5', mb: 1 }}>Checklist da Operadora</Typography>
          <Card sx={{ bgcolor: '#111217', border: '1px solid #222' }}>
            <CardContent sx={{ py: 0 }}>
              <List dense disablePadding>
                {checklist.map((item, i) => (
                  <ListItem key={i} disableGutters sx={{ py: 0.3 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      {item.done
                        ? <CheckCircle sx={{ color: '#4caf50', fontSize: 18 }} />
                        : <RadioButtonUnchecked sx={{ color: '#666', fontSize: 18 }} />}
                    </ListItemIcon>
                    <ListItemText primary={item.text} primaryTypographyProps={{ variant: 'body2', sx: { color: item.done ? '#ccc' : '#888' } }} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
