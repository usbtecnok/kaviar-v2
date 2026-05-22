import { Router, Request, Response } from 'express';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/auth';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();
router.use(authenticateAdmin, requireSuperAdmin);

const ALLOWED_DOCS = [
  { id: 'sumario', name: 'Sumário Executivo', file: 'SUMARIO_EXECUTIVO_INVESTIDORES_V2.md' },
  { id: 'pitch-deck', name: 'Pitch Deck 12 Slides', file: 'PITCH_DECK_12_SLIDES.md' },
  { id: 'pitch-visual', name: 'Pitch Deck Visual Guide', file: 'PITCH_DECK_VISUAL_GUIDE.md' },
  { id: 'script-90s', name: 'Script Pitch 90s', file: 'SCRIPT_PITCH_90S.md' },
  { id: 'faq', name: 'FAQ Investidor', file: 'FAQ_INVESTIDOR.md' },
  { id: 'relatorio-tecnico', name: 'Relatório Técnico', file: 'A_RELATORIO_TECNICO_KAVIAR.md' },
  { id: 'analise-mercado', name: 'Análise de Mercado', file: 'B_ANALISE_MERCADO_MOBILIDADE.md' },
  { id: 'due-diligence', name: 'Due Diligence Técnica', file: 'C_DUE_DILIGENCE_TECNICA.md' },
  { id: 'changelog', name: 'Changelog V2', file: 'CHANGELOG_V2.md' },
  { id: 'auditoria', name: 'Auditoria de Credibilidade', file: 'AUDITORIA_CREDIBILIDADE.md' },
];

const DOCS_DIR = path.resolve(__dirname, '../../docs/investidores');

router.get('/', (_req: Request, res: Response) => {
  res.json({ success: true, data: ALLOWED_DOCS.map(d => ({ id: d.id, name: d.name })) });
});

router.get('/:id', (req: Request, res: Response) => {
  const doc = ALLOWED_DOCS.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ success: false, error: 'Documento não encontrado' });
  const filePath = path.join(DOCS_DIR, doc.file);
  if (!filePath.startsWith(DOCS_DIR)) return res.status(403).json({ success: false, error: 'Acesso negado' });
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ success: true, data: { id: doc.id, name: doc.name, content } });
  } catch (err: any) {
    console.error(`[INVESTOR_DOCS] Failed to read: ${filePath}`, err.message);
    res.status(500).json({ success: false, error: 'Erro ao ler documento' });
  }
});

export default router;
