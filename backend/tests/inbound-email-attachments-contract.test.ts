import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { reserveUploadMock, finalizeUploadMock } = vi.hoisted(() => ({
  reserveUploadMock: vi.fn(),
  finalizeUploadMock: vi.fn(),
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
    reserveUpload: reserveUploadMock,
    finalizeUpload: finalizeUploadMock,
  },
}));

import inboundEmailRoutes from '../src/routes/inbound-email';

const app = express();
app.use(express.json());
app.use('/api/inbound/email', inboundEmailRoutes);

describe('inbound attachments reserve contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INBOUND_EMAIL_WEBHOOK_SECRET = 'secret-123';
    reserveUploadMock.mockResolvedValue({
      attachmentId: 'att-1',
      storageKey: 'inbound-email-attachments/key.pdf',
      uploadUrl: null,
      uploadHeaders: null,
      expiresIn: null,
      status: 'AVAILABLE',
      reused: true,
      alreadyAvailable: true,
    });
  });

  it('expõe reused/already_available e mantém campos existentes', async () => {
    const res = await request(app)
      .post('/api/inbound/email/cloudflare/attachments/request-upload')
      .set('X-KAVIAR-INBOUND-EMAIL-SECRET', 'secret-123')
      .send({
        inbound_email_id: '14d83fd9-1672-4f4f-a6bc-34ef78f1ea48',
        filename: 'doc.pdf',
        content_type: 'application/pdf',
        size_bytes: 123,
        sha256: 'a'.repeat(64),
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      attachment_id: 'att-1',
      upload_url: null,
      upload_headers: null,
      expires_in: null,
      status: 'AVAILABLE',
      reused: true,
      already_available: true,
    });
  });

  it('expõe upload_url e upload_headers quando status é PENDING', async () => {
    reserveUploadMock.mockResolvedValueOnce({
      attachmentId: 'att-2',
      storageKey: 'inbound-email-attachments/key-2.pdf',
      uploadUrl: 'https://upload.test/signed',
      uploadHeaders: {
        'content-type': 'application/pdf',
        'x-amz-meta-sha256': 'b'.repeat(64),
      },
      expiresIn: 300,
      status: 'PENDING',
      reused: false,
      alreadyAvailable: false,
    });

    const res = await request(app)
      .post('/api/inbound/email/cloudflare/attachments/request-upload')
      .set('X-KAVIAR-INBOUND-EMAIL-SECRET', 'secret-123')
      .send({
        inbound_email_id: '14d83fd9-1672-4f4f-a6bc-34ef78f1ea48',
        filename: 'doc.pdf',
        content_type: 'application/pdf',
        size_bytes: 123,
        sha256: 'a'.repeat(64),
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      attachment_id: 'att-2',
      upload_url: 'https://upload.test/signed',
      upload_headers: {
        'content-type': 'application/pdf',
        'x-amz-meta-sha256': 'b'.repeat(64),
      },
      expires_in: 300,
      status: 'PENDING',
      reused: false,
      already_available: false,
    });
  });
});
