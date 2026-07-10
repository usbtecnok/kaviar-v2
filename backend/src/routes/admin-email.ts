import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/auth';
import { emailService } from '../services/email/email.service';
import { buildKaviarTestEmailTemplate, buildOperationalNoticeTemplate } from '../services/email/templates/kaviar-defaults';

const router = Router();

const sendTestEmailSchema = z.object({
  to: z.string().email('Email de destino invalido'),
  template: z.enum(['test', 'operational']).default('test'),
  from: z.enum([
    'KAVIAR <no-reply@kaviar.com.br>',
    'KAVIAR <contato@kaviar.com.br>',
    'KAVIAR <suporte@kaviar.com.br>',
    'KAVIAR <financeiro@kaviar.com.br>',
    'no-reply@kaviar.com.br',
    'contato@kaviar.com.br',
    'suporte@kaviar.com.br',
    'financeiro@kaviar.com.br',
  ]).optional(),
  title: z.string().min(3).max(120).optional(),
  message: z.string().min(3).max(4000).optional(),
});

function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isAllowedTestRecipient(email: string): boolean {
  const requested = email.trim().toLowerCase();

  const explicitAllowlist = parseAllowlist(process.env.EMAIL_TEST_ALLOWED_TO);
  if (explicitAllowlist.size > 0) {
    return explicitAllowlist.has(requested);
  }

  const forwardTo = process.env.FORWARD_TO_EMAIL?.trim().toLowerCase();
  if (forwardTo) {
    return requested === forwardTo;
  }

  return false;
}

router.use(authenticateAdmin);
router.use(requireSuperAdmin);

// POST /api/admin/email/test
router.post('/test', async (req: Request, res: Response) => {
  try {
    const parsed = sendTestEmailSchema.parse(req.body);

    if (!isAllowedTestRecipient(parsed.to)) {
      return res.status(403).json({
        success: false,
        error: 'Envio de teste nao autorizado para este destinatario.',
      });
    }

    const template = parsed.template === 'operational'
      ? buildOperationalNoticeTemplate({
          title: parsed.title || 'Aviso Operacional',
          message: parsed.message || 'Mensagem operacional de teste do KAVIAR.',
        })
      : buildKaviarTestEmailTemplate();

    const result = await emailService.sendMail({
      to: parsed.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      from: parsed.from || 'KAVIAR <no-reply@kaviar.com.br>',
    });

    if (!result.ok) {
      return res.status(502).json({
        success: false,
        error: 'Falha no envio SMTP. Verifique configuracao do provider e conectividade.',
        data: {
          provider: result.provider,
          from: result.from,
        },
      });
    }

    const runtime = emailService.getRuntimeInfo();

    return res.json({
      success: true,
      message: 'Solicitacao de envio processada.',
      data: {
        to: parsed.to,
        template: parsed.template,
        from: result.from,
        provider: result.provider,
        providerDefault: runtime.provider,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }

    return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

export default router;
