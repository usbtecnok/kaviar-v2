import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Alert } from '@mui/material';

const DOCUMENTS = [
  { name: 'Termos de Uso — Passageiro', file: 'docs/termos-uso-passageiro-kaviar-v1.md', version: 'v1.0', date: 'Maio/2026', status: 'Minuta interna', note: 'Cobre responsabilidades, limitações, operação territorial e privacidade.' },
  { name: 'Termos de Uso — Motorista', file: 'docs/termos-uso-motorista-kaviar-v1.md', version: 'v1.0', date: 'Maio/2026', status: 'Minuta interna', note: 'Relação sem vínculo, requisitos, remuneração por créditos, LGPD.' },
  { name: 'Política de Privacidade', file: 'docs/politica-privacidade-kaviar-v1.md', version: 'v1.0', date: 'Maio/2026', status: 'Minuta interna', note: 'LGPD, dados coletados, finalidade, direitos do titular.' },
  { name: 'Regras de Cancelamento', file: 'docs/regras-cancelamento-kaviar-v1.md', version: 'v1.0', date: 'Maio/2026', status: 'Minuta interna', note: 'Cancelamento por passageiro/motorista, penalidades, reembolso.' },
  { name: 'Regras de Pagamento, Créditos e Compensações', file: 'docs/regras-pagamento-creditos-kaviar-v1.md', version: 'v1.0', date: 'Maio/2026', status: 'Minuta interna', note: 'Modelo de créditos, taxa, repasse territorial, ausência de garantias.' },
  { name: 'Aviso de Plataforma de Intermediação', file: 'docs/aviso-plataforma-intermediacao-kaviar.md', version: 'v1.0', date: 'Maio/2026', status: 'Minuta interna', note: 'Declaração formal: não é concessão, transporte coletivo ou cooperativa.' },
  { name: 'Termo do Operador Territorial', file: 'docs/termo-operador-territorial-kaviar-v1.md', version: 'v1.0', date: 'Maio/2026', status: 'Minuta interna', note: 'Responsabilidade, confidencialidade, LGPD, repasse manual.' },
  { name: 'Conformidade Jurídica e Operacional', file: 'docs/conformidade-juridica-operacional-kaviar.md', version: 'v1.0', date: 'Maio/2026', status: 'Referência', note: 'Consolidação de status, riscos e recomendações.' },
  { name: 'Apresentação Institucional', file: 'docs/apresentacao-institucional-kaviar.md', version: 'v1.0', date: 'Maio/2026', status: 'Minuta interna', note: 'Para prefeitura, associação, órgão público ou liderança local.' },
];

export default function LegalCompliancePage() {
  return (
    <Box>
      <Typography variant="h5" sx={{ color: '#C8A84E', fontWeight: 800, mb: 1 }}>📋 Conformidade Jurídica e Operacional</Typography>
      <Alert severity="warning" sx={{ mb: 3, bgcolor: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.3)' }}>
        Estes documentos são minutas operacionais internas e não substituem revisão jurídica formal.
      </Alert>
      <TableContainer component={Paper} sx={{ border: '1px solid #E8E5DE' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#FAFAF8' }}>
              <TableCell sx={{ fontWeight: 700 }}>Documento</TableCell>
              <TableCell>Arquivo</TableCell>
              <TableCell>Versão</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Observação</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {DOCUMENTS.map((doc, i) => (
              <TableRow key={i}>
                <TableCell sx={{ fontWeight: 600 }}>{doc.name}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#6B7280' }}>{doc.file}</TableCell>
                <TableCell><Chip label={doc.version} size="small" sx={{ bgcolor: 'rgba(184,148,46,0.1)', color: '#B8942E' }} /></TableCell>
                <TableCell>{doc.date}</TableCell>
                <TableCell><Chip label={doc.status} size="small" sx={{ bgcolor: 'rgba(217,119,6,0.1)', color: '#D97706' }} /></TableCell>
                <TableCell sx={{ fontSize: '0.8rem', color: '#6B7280', maxWidth: 280 }}>{doc.note}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Alert severity="info" sx={{ mt: 3, bgcolor: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.2)' }}>
        Para revisão jurídica formal, consulte advogado especializado em direito digital e mobilidade urbana. Estes documentos servem como base para formalização.
      </Alert>
    </Box>
  );
}
