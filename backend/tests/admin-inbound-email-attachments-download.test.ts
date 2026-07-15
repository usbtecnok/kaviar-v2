import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authState, createDownloadUrlForMessageMock } = vi.hoisted(() => ({
  authState: {
    admin: { id: 'admin-1', email: 'admin@test.local', role: 'SUPER_ADMIN' },
  },
  createDownloadUrlForMessageMock: vi.fn(),
}));

vi.mock('../src/middlewares/auth', () => ({
  authenticateAdmin: (req: any, res: any, next: any) => {
    if (!authState.admin) {
      return res.status(401).json({ success: false, error: 'Token ausente' });
    }
    req.admin = authState.admin;
    return next();
  },
  requireSuperAdmin: (req: any, res: any, next: any) => {
    if (req.admin?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Acesso negado. Permissao insuficiente.' });
    }
    return next();
  },
}));

vi.mock('../src/services/email/email.service', () => ({
  emailService: {},
}));

vi.mock('../src/utils/audit', () => ({
  audit: vi.fn(),
  auditCtx: () => ({ adminId: 'admin-1', adminEmail: 'admin@test.local', ip: '127.0.0.1', ua: 'vitest' }),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    inbound_email_messages: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    email_send_logs: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../src/services/inbound-email-attachments.service', () => ({
  InboundAttachmentValidationError: class extends Error {
    statusCode: number;
    constructor(message: string, statusCode = 400) {
      super(message);
      this.statusCode = statusCode;
    }
  },
  inboundEmailAttachmentsService: {
    createDownloadUrlForMessage: (...args: any[]) => createDownloadUrlForMessageMock(...args),
  },
}));

const { InboundAttachmentValidationError } = await import('../src/services/inbound-email-attachments.service');

const { default: adminInboundEmailsRoutes } = await import('../src/routes/admin-inbound-emails');

const app = express();
app.use(express.json());
app.use('/api/admin/inbound-emails', adminInboundEmailsRoutes);

describe('admin inbound email attachment download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.admin = { id: 'admin-1', email: 'admin@test.local', role: 'SUPER_ADMIN' };
    createDownloadUrlForMessageMock.mockResolvedValue({
      id: 'att-1',
      filename: 'arquivo.pdf',
      contentType: 'application/pdf',
      url: 'https://download.test/file.pdf',
      expiresIn: 300,
    });
  });

  it('permite download quando admin tem permissão e attachment pertence à mensagem', async () => {
    const res = await request(app)
      .get('/api/admin/inbound-emails/email-1/attachments/att-1/download')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(createDownloadUrlForMessageMock).toHaveBeenCalledWith('email-1', 'att-1');
    expect(res.body.data.url).toBe('https://download.test/file.pdf');
  });

  it('nega acesso para usuário sem permissão administrativa suficiente', async () => {
    authState.admin = { id: 'admin-2', email: 'viewer@test.local', role: 'ADMIN' } as any;

    const res = await request(app)
      .get('/api/admin/inbound-emails/email-1/attachments/att-1/download')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(403);
  });

  it('retorna 404/seguro quando attachment é de outra mensagem', async () => {
    createDownloadUrlForMessageMock.mockRejectedValueOnce(new InboundAttachmentValidationError('Attachment indisponivel para download.', 404));

    const res = await request(app)
      .get('/api/admin/inbound-emails/email-1/attachments/att-x/download')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });
});