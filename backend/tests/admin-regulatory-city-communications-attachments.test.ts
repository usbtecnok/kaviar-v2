import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, authState } = vi.hoisted(() => ({
  prismaMock: {
    municipal_regulatory_cases: {
      findUnique: vi.fn(),
    },
    email_send_logs: {
      findMany: vi.fn(),
    },
    inbound_email_messages: {
      findMany: vi.fn(),
    },
  },
  authState: {
    admin: { id: 'admin-1', email: 'admin@test.local', role: 'SUPER_ADMIN' },
  },
}));

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('../src/middlewares/auth', () => ({
  authenticateAdmin: (req: any, _res: any, next: any) => {
    req.admin = authState.admin;
    next();
  },
  requireSuperAdmin: (_req: any, _res: any, next: any) => next(),
}));

const { default: adminRegulatoryCitiesRoutes } = await import('../src/routes/admin-regulatory-cities');

const app = express();
app.use(express.json());
app.use('/api/admin', adminRegulatoryCitiesRoutes);

describe('admin regulatory city communications attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.municipal_regulatory_cases.findUnique.mockResolvedValue({
      id: 'case-1',
      city: 'Santa Rita',
      state: 'SP',
      contact_email: 'prefeitura@test.local',
    });
    prismaMock.email_send_logs.findMany.mockResolvedValue([]);
    prismaMock.inbound_email_messages.findMany.mockResolvedValue([
      {
        id: 'email-1',
        subject: 'Documentos da prefeitura',
        from_email: 'prefeitura@test.local',
        to_email: 'contato@kaviar.com.br',
        status: 'NEW',
        received_at: new Date('2026-07-13T12:00:00.000Z'),
        normalized_body: 'Segue documentação anexa.',
        text_body: 'Segue documentação anexa.',
        has_attachments: true,
        attachment_count: 2,
        message_id: 'msg-1',
        attachments: [
          {
            id: 'attachment-available',
            filename: 'alvara.pdf',
            content_type: 'application/pdf',
            size_bytes: 12345,
          },
        ],
      },
    ]);
  });

  it('retorna somente attachments AVAILABLE em comunicações recebidas', async () => {
    const res = await request(app).get('/api/admin/regulatory/cities/case-1/communications');

    expect(res.status).toBe(200);
    expect(res.body.data.received[0].attachments).toEqual([
      {
        id: 'attachment-available',
        filename: 'alvara.pdf',
        contentType: 'application/pdf',
        sizeBytes: 12345,
      },
    ]);
  });
});