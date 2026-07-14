import crypto from 'crypto';
import path from 'path';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '../lib/prisma';

const DEFAULT_BUCKET = process.env.S3_UPLOADS_BUCKET || 'kaviar-uploads-847895361928';
const DEFAULT_REGION = process.env.AWS_REGION || 'us-east-2';
const DEFAULT_UPLOAD_EXPIRATION_SECONDS = 300;
const DEFAULT_DOWNLOAD_EXPIRATION_SECONDS = 300;
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_EMAIL_ATTACHMENTS_SIZE_BYTES = 25 * 1024 * 1024;

const BLOCKED_EXTENSIONS = new Set([
  '.exe',
  '.com',
  '.bat',
  '.cmd',
  '.sh',
  '.ps1',
  '.js',
  '.mjs',
  '.cjs',
  '.html',
  '.htm',
  '.svg',
]);

const STATUS_PENDING = 'PENDING';
const STATUS_AVAILABLE = 'AVAILABLE';

export interface ReserveInboundAttachmentUploadInput {
  inboundEmailId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
}

export interface FinalizeInboundAttachmentUploadInput {
  inboundEmailId: string;
  attachmentId: string;
}

type ReserveUploadResult = {
  attachmentId: string;
  storageKey: string;
  uploadUrl: string | null;
  expiresIn: number | null;
  status: string;
  reused: boolean;
  alreadyAvailable: boolean;
};

export interface InboundAttachmentStorageHeadResult {
  contentLength: number | null;
  contentType: string | null;
  metadata: Record<string, string>;
}

export interface InboundAttachmentStorage {
  createPresignedPut(params: {
    storageKey: string;
    contentType: string;
    sizeBytes: number;
    sha256: string;
  }): Promise<string>;
  createPresignedGet(params: {
    storageKey: string;
    filename: string;
    contentType: string;
  }): Promise<string>;
  headObject(storageKey: string): Promise<InboundAttachmentStorageHeadResult>;
}

export class InboundAttachmentValidationError extends Error {
  constructor(message: string, public readonly statusCode = 400) {
    super(message);
    this.name = 'InboundAttachmentValidationError';
  }
}

class S3InboundAttachmentStorage implements InboundAttachmentStorage {
  private readonly client: S3Client;

  constructor(
    private readonly bucket = DEFAULT_BUCKET,
    private readonly region = DEFAULT_REGION,
    private readonly uploadExpiresIn = DEFAULT_UPLOAD_EXPIRATION_SECONDS,
    private readonly downloadExpiresIn = DEFAULT_DOWNLOAD_EXPIRATION_SECONDS,
  ) {
    this.client = new S3Client({ region: this.region });
  }

  async createPresignedPut(params: {
    storageKey: string;
    contentType: string;
    sizeBytes: number;
    sha256: string;
  }): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.storageKey,
      ContentType: params.contentType,
      ContentLength: params.sizeBytes,
      Metadata: {
        sha256: params.sha256,
      },
    });

    return getSignedUrl(this.client, command, { expiresIn: this.uploadExpiresIn });
  }

  async createPresignedGet(params: {
    storageKey: string;
    filename: string;
    contentType: string;
  }): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: params.storageKey,
      ResponseContentType: params.contentType,
      ResponseContentDisposition: buildContentDisposition(params.filename),
    });

    return getSignedUrl(this.client, command, { expiresIn: this.downloadExpiresIn });
  }

  async headObject(storageKey: string): Promise<InboundAttachmentStorageHeadResult> {
    const response = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: storageKey }));

    return {
      contentLength: typeof response.ContentLength === 'number' ? response.ContentLength : null,
      contentType: response.ContentType || null,
      metadata: response.Metadata || {},
    };
  }
}

function buildContentDisposition(filename: string): string {
  const sanitized = sanitizeAttachmentFilename(filename);
  const encoded = encodeURIComponent(sanitized).replace(/['()]/g, escape).replace(/\*/g, '%2A');
  return `attachment; filename="${sanitized}"; filename*=UTF-8''${encoded}`;
}

export function sanitizeAttachmentFilename(filename: string): string {
  const normalized = filename
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  const collapsed = normalized || 'attachment';
  return collapsed.slice(0, 255);
}

function assertHexSha256(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new InboundAttachmentValidationError('sha256 invalido. Informe 64 caracteres hexadecimais.');
  }
  return normalized;
}

function assertAllowedContentType(contentType: string): string {
  const normalized = contentType.trim().toLowerCase();
  if (!normalized || normalized.length > 255) {
    throw new InboundAttachmentValidationError('content_type invalido.');
  }
  if (normalized.includes('svg') || normalized.includes('javascript') || normalized.includes('html')) {
    throw new InboundAttachmentValidationError('Tipo de arquivo bloqueado para a primeira versao.');
  }
  return normalized;
}

function assertAllowedFilename(filename: string): { sanitizedFilename: string; extension: string } {
  const sanitizedFilename = sanitizeAttachmentFilename(filename);
  const extension = path.extname(sanitizedFilename).toLowerCase();

  if (!sanitizedFilename) {
    throw new InboundAttachmentValidationError('filename invalido.');
  }

  if (!extension) {
    throw new InboundAttachmentValidationError('Extensao do anexo obrigatoria.');
  }

  if (BLOCKED_EXTENSIONS.has(extension)) {
    throw new InboundAttachmentValidationError('Extensao de arquivo bloqueada para a primeira versao.');
  }

  return { sanitizedFilename, extension };
}

function assertAllowedSize(sizeBytes: number): number {
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    throw new InboundAttachmentValidationError('size_bytes deve ser inteiro positivo.');
  }
  if (sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new InboundAttachmentValidationError(`Anexo excede o limite individual de ${MAX_ATTACHMENT_SIZE_BYTES} bytes.`);
  }
  return sizeBytes;
}

function buildStorageKey(inboundEmailId: string, attachmentId: string, extension: string): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const nonce = crypto.randomBytes(8).toString('hex');
  return `inbound-email-attachments/${year}/${month}/${inboundEmailId}/${attachmentId}-${nonce}${extension}`;
}

export class InboundEmailAttachmentsService {
  constructor(private readonly storage: InboundAttachmentStorage = new S3InboundAttachmentStorage()) {}

  private async syncInboundEmailAttachmentState(inboundEmailId: string): Promise<void> {
    const count = await prisma.inbound_email_attachments.count({
      where: { inbound_email_id: inboundEmailId },
    });

    await prisma.inbound_email_messages.update({
      where: { id: inboundEmailId },
      data: {
        has_attachments: count > 0,
        attachment_count: count,
      },
    });
  }

  private async buildReserveResponse(params: {
    attachmentId: string;
    storageKey: string;
    contentType: string;
    sizeBytes: number;
    sha256: string;
    status: string;
    reused: boolean;
    alreadyAvailable: boolean;
  }): Promise<ReserveUploadResult> {
    if (params.alreadyAvailable || params.status === STATUS_AVAILABLE) {
      return {
        attachmentId: params.attachmentId,
        storageKey: params.storageKey,
        uploadUrl: null,
        expiresIn: null,
        status: STATUS_AVAILABLE,
        reused: params.reused,
        alreadyAvailable: true,
      };
    }

    const uploadUrl = await this.storage.createPresignedPut({
      storageKey: params.storageKey,
      contentType: params.contentType,
      sizeBytes: params.sizeBytes,
      sha256: params.sha256,
    });

    return {
      attachmentId: params.attachmentId,
      storageKey: params.storageKey,
      uploadUrl,
      expiresIn: DEFAULT_UPLOAD_EXPIRATION_SECONDS,
      status: STATUS_PENDING,
      reused: params.reused,
      alreadyAvailable: false,
    };
  }

  async reserveUpload(input: ReserveInboundAttachmentUploadInput) {
    const inboundEmailId = input.inboundEmailId.trim();
    const { sanitizedFilename, extension } = assertAllowedFilename(input.filename);
    const contentType = assertAllowedContentType(input.contentType);
    const sizeBytes = assertAllowedSize(input.sizeBytes);
    const sha256 = assertHexSha256(input.sha256);

    const inboundEmail = await prisma.inbound_email_messages.findUnique({
      where: { id: inboundEmailId },
      select: { id: true },
    });

    if (!inboundEmail) {
      throw new InboundAttachmentValidationError('Email inbound nao encontrado.', 404);
    }

    const existing = await prisma.inbound_email_attachments.findFirst({
      where: {
        inbound_email_id: inboundEmailId,
        sha256,
        filename: sanitizedFilename,
      },
      select: {
        id: true,
        storage_key: true,
        status: true,
        content_type: true,
        size_bytes: true,
        sha256: true,
      },
    });

    if (existing) {
      return this.buildReserveResponse({
        attachmentId: existing.id,
        storageKey: existing.storage_key,
        contentType: existing.content_type,
        sizeBytes: existing.size_bytes,
        sha256: existing.sha256,
        status: existing.status,
        reused: true,
        alreadyAvailable: existing.status === STATUS_AVAILABLE,
      });
    }

    const aggregate = await prisma.inbound_email_attachments.aggregate({
      where: { inbound_email_id: inboundEmailId },
      _sum: { size_bytes: true },
    });

    const currentTotal = aggregate._sum.size_bytes || 0;
    if (currentTotal + sizeBytes > MAX_EMAIL_ATTACHMENTS_SIZE_BYTES) {
      throw new InboundAttachmentValidationError(`Email excede o limite total de ${MAX_EMAIL_ATTACHMENTS_SIZE_BYTES} bytes em anexos.`);
    }

    const attachmentId = crypto.randomUUID();
    const storageKey = buildStorageKey(inboundEmailId, attachmentId, extension);
    try {
      await prisma.inbound_email_attachments.create({
        data: {
          id: attachmentId,
          inbound_email_id: inboundEmailId,
          filename: sanitizedFilename,
          content_type: contentType,
          size_bytes: sizeBytes,
          storage_key: storageKey,
          sha256,
          status: STATUS_PENDING,
        },
      });

      await this.syncInboundEmailAttachmentState(inboundEmailId);

      return this.buildReserveResponse({
        attachmentId,
        storageKey,
        contentType,
        sizeBytes,
        sha256,
        status: STATUS_PENDING,
        reused: false,
        alreadyAvailable: false,
      });
    } catch (error: any) {
      const isUniqueViolation = error?.code === 'P2002';
      if (!isUniqueViolation) {
        throw error;
      }

      const winner = await prisma.inbound_email_attachments.findFirst({
        where: {
          inbound_email_id: inboundEmailId,
          sha256,
          filename: sanitizedFilename,
        },
        select: {
          id: true,
          storage_key: true,
          status: true,
          content_type: true,
          size_bytes: true,
          sha256: true,
        },
      });

      if (!winner) {
        throw new InboundAttachmentValidationError('Falha de concorrencia ao reservar anexo. Tente novamente.', 409);
      }

      return this.buildReserveResponse({
        attachmentId: winner.id,
        storageKey: winner.storage_key,
        contentType: winner.content_type,
        sizeBytes: winner.size_bytes,
        sha256: winner.sha256,
        status: winner.status,
        reused: true,
        alreadyAvailable: winner.status === STATUS_AVAILABLE,
      });
    }
  }

  async finalizeUpload(input: FinalizeInboundAttachmentUploadInput) {
    const attachment = await prisma.inbound_email_attachments.findUnique({
      where: { id: input.attachmentId },
      select: {
        id: true,
        inbound_email_id: true,
        storage_key: true,
        size_bytes: true,
        sha256: true,
        status: true,
      },
    });

    if (!attachment || attachment.inbound_email_id !== input.inboundEmailId.trim()) {
      throw new InboundAttachmentValidationError('Attachment inbound nao encontrado.', 404);
    }

    if (attachment.status !== STATUS_PENDING) {
      throw new InboundAttachmentValidationError('Attachment inbound ja finalizado.', 409);
    }

    const objectHead = await this.storage.headObject(attachment.storage_key);
    const remoteSha256 = String(objectHead.metadata.sha256 || '').trim().toLowerCase();

    if (objectHead.contentLength !== attachment.size_bytes) {
      throw new InboundAttachmentValidationError('Objeto remoto com tamanho divergente do reservado.', 409);
    }

    if (remoteSha256 !== attachment.sha256) {
      throw new InboundAttachmentValidationError('Objeto remoto com sha256 divergente do reservado.', 409);
    }

    const updated = await prisma.inbound_email_attachments.update({
      where: { id: attachment.id },
      data: { status: STATUS_AVAILABLE },
      select: {
        id: true,
        inbound_email_id: true,
        status: true,
      },
    });

    await this.syncInboundEmailAttachmentState(attachment.inbound_email_id);

    return updated;
  }

  async createDownloadUrl(attachmentId: string) {
    const attachment = await prisma.inbound_email_attachments.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        filename: true,
        content_type: true,
        storage_key: true,
        status: true,
      },
    });

    if (!attachment || attachment.status !== STATUS_AVAILABLE) {
      throw new InboundAttachmentValidationError('Attachment indisponivel para download.', 404);
    }

    const url = await this.storage.createPresignedGet({
      storageKey: attachment.storage_key,
      filename: attachment.filename,
      contentType: attachment.content_type,
    });

    return {
      id: attachment.id,
      filename: attachment.filename,
      contentType: attachment.content_type,
      url,
      expiresIn: DEFAULT_DOWNLOAD_EXPIRATION_SECONDS,
    };
  }
}

export const inboundEmailAttachmentsService = new InboundEmailAttachmentsService();
export const inboundEmailAttachmentRules = {
  maxAttachmentSizeBytes: MAX_ATTACHMENT_SIZE_BYTES,
  maxEmailAttachmentsSizeBytes: MAX_EMAIL_ATTACHMENTS_SIZE_BYTES,
  blockedExtensions: [...BLOCKED_EXTENSIONS],
  statusPending: STATUS_PENDING,
  statusAvailable: STATUS_AVAILABLE,
};