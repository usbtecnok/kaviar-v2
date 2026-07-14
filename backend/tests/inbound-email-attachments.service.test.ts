import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    inbound_email_messages: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    inbound_email_attachments: {
      aggregate: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));

import {
  InboundAttachmentValidationError,
  InboundEmailAttachmentsService,
  sanitizeAttachmentFilename,
} from '../src/services/inbound-email-attachments.service';

describe('InboundEmailAttachmentsService', () => {
  const storage = {
    createPresignedPut: vi.fn(),
    createPresignedGet: vi.fn(),
    headObject: vi.fn(),
  };

  let service: InboundEmailAttachmentsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new InboundEmailAttachmentsService(storage);
    prismaMock.inbound_email_messages.findUnique.mockResolvedValue({ id: 'email-1' });
    prismaMock.inbound_email_messages.update.mockResolvedValue({ id: 'email-1' });
    prismaMock.inbound_email_attachments.aggregate.mockResolvedValue({ _sum: { size_bytes: 1024 } });
    prismaMock.inbound_email_attachments.count.mockResolvedValue(1);
    prismaMock.inbound_email_attachments.create.mockResolvedValue({ id: 'attachment-1' });
    prismaMock.inbound_email_attachments.findUnique.mockResolvedValue({
      id: 'attachment-1',
      inbound_email_id: 'email-1',
      storage_key: 'inbound-email-attachments/2026/07/email-1/attachment-1.pdf',
      size_bytes: 2048,
      sha256: 'a'.repeat(64),
      status: 'PENDING',
      filename: 'documento.pdf',
      content_type: 'application/pdf',
    });
    prismaMock.inbound_email_attachments.update.mockResolvedValue({
      id: 'attachment-1',
      inbound_email_id: 'email-1',
      status: 'AVAILABLE',
    });
    storage.createPresignedPut.mockResolvedValue('https://upload.test');
    storage.createPresignedGet.mockResolvedValue('https://download.test');
    storage.headObject.mockResolvedValue({
      contentLength: 2048,
      contentType: 'application/pdf',
      metadata: { sha256: 'a'.repeat(64) },
    });
  });

  it('sanitiza filename para apresentação', () => {
    expect(sanitizeAttachmentFilename('../prefeitura/ guia final .pdf')).toBe('..-prefeitura- guia final .pdf');
  });

  it('cria attachment PENDING com storage_key único e URL temporária de upload', async () => {
    const result = await service.reserveUpload({
      inboundEmailId: 'email-1',
      filename: 'guia.pdf',
      contentType: 'application/pdf',
      sizeBytes: 2048,
      sha256: 'a'.repeat(64),
    });

    expect(prismaMock.inbound_email_attachments.create).toHaveBeenCalledOnce();
    const payload = prismaMock.inbound_email_attachments.create.mock.calls[0][0].data;
    expect(payload.status).toBe('PENDING');
    expect(payload.storage_key).toMatch(/^inbound-email-attachments\//);
    expect(prismaMock.inbound_email_messages.update).toHaveBeenCalledWith({
      where: { id: 'email-1' },
      data: {
        has_attachments: true,
        attachment_count: 1,
      },
    });
    expect(result.uploadUrl).toBe('https://upload.test');
  });

  it('rejeita extensão bloqueada', async () => {
    await expect(service.reserveUpload({
      inboundEmailId: 'email-1',
      filename: 'script.js',
      contentType: 'application/javascript',
      sizeBytes: 200,
      sha256: 'a'.repeat(64),
    })).rejects.toMatchObject<Partial<InboundAttachmentValidationError>>({ message: 'Extensao de arquivo bloqueada para a primeira versao.' });
  });

  it('rejeita tamanho acima do limite individual', async () => {
    await expect(service.reserveUpload({
      inboundEmailId: 'email-1',
      filename: 'guia.pdf',
      contentType: 'application/pdf',
      sizeBytes: 11 * 1024 * 1024,
      sha256: 'a'.repeat(64),
    })).rejects.toMatchObject<Partial<InboundAttachmentValidationError>>({ message: expect.stringContaining('limite individual') });
  });

  it('faz transição PENDING para AVAILABLE no finalize', async () => {
    const result = await service.finalizeUpload({ inboundEmailId: 'email-1', attachmentId: 'attachment-1' });
    expect(storage.headObject).toHaveBeenCalledWith('inbound-email-attachments/2026/07/email-1/attachment-1.pdf');
    expect(prismaMock.inbound_email_attachments.update).toHaveBeenCalledOnce();
    expect(prismaMock.inbound_email_messages.update).toHaveBeenCalledWith({
      where: { id: 'email-1' },
      data: {
        has_attachments: true,
        attachment_count: 1,
      },
    });
    expect(result.status).toBe('AVAILABLE');
  });

  it('não gera download para attachment PENDING', async () => {
    prismaMock.inbound_email_attachments.findUnique.mockResolvedValueOnce({
      id: 'attachment-1',
      filename: 'documento.pdf',
      content_type: 'application/pdf',
      storage_key: 'inbound-email-attachments/key',
      status: 'PENDING',
    });

    await expect(service.createDownloadUrl('attachment-1')).rejects.toMatchObject<Partial<InboundAttachmentValidationError>>({ statusCode: 404 });
  });
});