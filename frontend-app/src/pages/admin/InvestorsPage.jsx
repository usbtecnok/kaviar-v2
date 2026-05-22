import { useState, useEffect } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Alert, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress } from '@mui/material';
import Markdown from 'react-markdown';
import { API_BASE_URL } from '../../config/api';

export default function InvestorsPage() {
  const [docs, setDocs] = useState([]);
  const [viewDoc, setViewDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('kaviar_admin_token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/investor-docs`, { headers })
      .then(r => r.json())
      .then(d => { if (d.success) setDocs(d.data); });
  }, []);

  const handleView = async (id) => {
    setLoading(true);
    setViewDoc(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/investor-docs/${id}`, { headers });
      const d = await res.json();
      if (d.success) setViewDoc(d.data);
      else alert(d.error || 'Erro ao carregar documento');
    } catch { alert('Erro de conexão ao carregar documento'); }
    setLoading(false);
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ color: '#C8A84E', fontWeight: 800, mb: 1 }}>📊 Pacote para Investidores</Typography>
      <Alert severity="warning" sx={{ mb: 3 }}>Material interno e confidencial. Não constitui oferta pública de investimento.</Alert>
      <TableContainer component={Paper} sx={{ border: '1px solid #E8E5DE' }}>
        <Table size="small">
          <TableHead><TableRow sx={{ bgcolor: '#FAFAF8' }}><TableCell sx={{ fontWeight: 700 }}>Documento</TableCell><TableCell>Ações</TableCell></TableRow></TableHead>
          <TableBody>
            {docs.map(doc => (
              <TableRow key={doc.id}>
                <TableCell sx={{ fontWeight: 600 }}>{doc.name}</TableCell>
                <TableCell><Button size="small" onClick={() => handleView(doc.id)} sx={{ color: '#2563EB', textTransform: 'none' }}>Visualizar</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!viewDoc || loading} onClose={() => { setViewDoc(null); setLoading(false); }} maxWidth="md" fullWidth PaperProps={{ sx: { maxHeight: '90vh' } }}>
        {loading && <DialogContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: '#B8942E' }} /></DialogContent>}
        {viewDoc && <>
          <DialogTitle sx={{ fontWeight: 700 }}>{viewDoc.name}</DialogTitle>
          <DialogContent dividers id="investor-doc-content" sx={{ '& h1': { fontSize: '1.4rem', mt: 2 }, '& h2': { fontSize: '1.1rem', mt: 2, mb: 1 }, '& h3': { fontSize: '1rem', mt: 1.5 }, '& p': { mb: 1 }, '& li': { mb: 0.3 }, '& table': { width: '100%', borderCollapse: 'collapse', mb: 2 }, '& th, & td': { border: '1px solid #ddd', padding: '6px 10px', fontSize: '0.85rem' }, '& th': { bgcolor: '#f5f5f5' } }}>
            <Markdown>{viewDoc.content}</Markdown>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => window.print()} sx={{ color: '#6B7280' }}>Imprimir</Button>
            <Button onClick={() => setViewDoc(null)}>Fechar</Button>
          </DialogActions>
        </>}
      </Dialog>

      <style>{`@media print { body * { visibility: hidden; } #investor-doc-content, #investor-doc-content * { visibility: visible; } #investor-doc-content { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; } }`}</style>
    </Box>
  );
}
