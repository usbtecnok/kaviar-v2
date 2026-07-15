export type InboundSecurityRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type InboundSecurityRiskReason =
  | 'MENTIONS_ATTACHMENT_WITHOUT_ATTACHMENT'
  | 'EXTERNAL_LINK_PRESENT'
  | 'REPLY_TO_DIFFERS_FROM_FROM';

export interface InboundSecurityRiskAssessment {
  level: InboundSecurityRiskLevel;
  suspicious: boolean;
  reasons: InboundSecurityRiskReason[];
}

interface InboundMessageLike {
  from_email?: unknown;
  subject?: unknown;
  text_body?: unknown;
  html_body?: unknown;
  normalized_body?: unknown;
  raw_headers?: unknown;
  attachment_count?: unknown;
}

const ATTACHMENT_MENTION_PATTERN = /\b(anexo|anexado|curriculo|currículo|documento)\b/i;
const EXTERNAL_LINK_PATTERN = /https?:\/\/[^\s"'<>]+/gi;
const KAVIAR_DOMAIN = 'kaviar.com.br';

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return '';

  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function extractEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  const angleMatch = trimmed.match(/<([^>]+)>/);
  if (angleMatch && angleMatch[1]) {
    return angleMatch[1].trim();
  }

  return trimmed;
}

function safeObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getReplyTo(rawHeaders: unknown): string | null {
  const headers = safeObject(rawHeaders);
  if (!headers) return null;

  return extractEmail(headers['reply-to'] ?? headers.replyTo ?? headers.ReplyTo ?? headers['Reply-To']);
}

function hasAttachmentMention(message: InboundMessageLike): boolean {
  const joined = [
    normalizeText(message.subject),
    normalizeText(message.text_body),
    normalizeText(message.normalized_body),
    normalizeText(message.html_body),
  ].join(' ');

  return ATTACHMENT_MENTION_PATTERN.test(joined);
}

function isKaviarHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase().replace(/\.+$/, '');
  if (!normalized) return false;
  return normalized === KAVIAR_DOMAIN || normalized.endsWith(`.${KAVIAR_DOMAIN}`);
}

function hasExternalLink(message: InboundMessageLike): boolean {
  const joined = [
    typeof message.html_body === 'string' ? message.html_body : '',
    typeof message.text_body === 'string' ? message.text_body : '',
    typeof message.normalized_body === 'string' ? message.normalized_body : '',
  ].join('\n');

  const urls = joined.match(EXTERNAL_LINK_PATTERN) || [];
  if (!urls.length) return false;

  for (const rawUrl of urls) {
    try {
      const parsed = new URL(rawUrl);
      if (!isKaviarHostname(parsed.hostname)) {
        return true;
      }
    } catch {
      // If parsing fails for a matched URL-like token, keep conservative behavior.
      return true;
    }
  }

  return false;
}

function hasReplyToDifferentFromFrom(message: InboundMessageLike): boolean {
  const fromEmail = extractEmail(message.from_email);
  const replyToEmail = getReplyTo(message.raw_headers);

  if (!fromEmail || !replyToEmail) return false;
  return fromEmail !== replyToEmail;
}

function parseAttachmentCount(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

export function evaluateInboundEmailSecurityRisk(message: InboundMessageLike): InboundSecurityRiskAssessment {
  const reasons: InboundSecurityRiskReason[] = [];
  const attachmentCount = parseAttachmentCount(message.attachment_count);
  const mentionsAttachment = hasAttachmentMention(message);
  const externalLinkPresent = hasExternalLink(message);
  const replyToDiffersFromFrom = hasReplyToDifferentFromFrom(message);

  if (mentionsAttachment && attachmentCount === 0) {
    reasons.push('MENTIONS_ATTACHMENT_WITHOUT_ATTACHMENT');
  }

  if (externalLinkPresent) {
    reasons.push('EXTERNAL_LINK_PRESENT');
  }

  if (replyToDiffersFromFrom) {
    reasons.push('REPLY_TO_DIFFERS_FROM_FROM');
  }

  let score = 0;
  if (reasons.includes('MENTIONS_ATTACHMENT_WITHOUT_ATTACHMENT')) score += 2;
  if (reasons.includes('EXTERNAL_LINK_PRESENT')) score += 1;
  if (reasons.includes('REPLY_TO_DIFFERS_FROM_FROM')) score += 1;

  let level: InboundSecurityRiskLevel = 'LOW';
  if (score >= 3) {
    level = 'HIGH';
  } else if (score >= 1) {
    level = 'MEDIUM';
  }

  return {
    level,
    suspicious: level !== 'LOW',
    reasons,
  };
}