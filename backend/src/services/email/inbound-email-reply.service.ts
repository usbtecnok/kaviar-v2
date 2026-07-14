type ReplyAliasConfig = {
  from: string;
  blockedReason?: string;
};

const REPLY_ALIAS_CONFIG: Record<string, ReplyAliasConfig> = {
  'contato@kaviar.com.br': { from: 'KAVIAR <contato@kaviar.com.br>' },
  'suporte@kaviar.com.br': { from: 'KAVIAR Suporte <suporte@kaviar.com.br>' },
  'financeiro@kaviar.com.br': { from: 'KAVIAR Financeiro <financeiro@kaviar.com.br>' },
  'no-reply@kaviar.com.br': {
    from: 'KAVIAR <no-reply@kaviar.com.br>',
    blockedReason: 'Replies para no-reply@kaviar.com.br nao sao permitidos.',
  },
};

export type InboundReplyPreview = {
  allowed: boolean;
  to: string;
  from: string | null;
  subject: string;
  inReplyTo: string | null;
  references: string[];
  blockedReason: string | null;
};

function extractEmailAddress(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/<([^>]+)>/);
  const value = (match ? match[1] : trimmed).trim().toLowerCase();
  return value.includes('@') ? value : null;
}

export function buildReplySubject(subject: string | null | undefined): string {
  const normalized = typeof subject === 'string' ? subject.trim() : '';
  if (!normalized) return 'Re: (sem assunto)';
  return /^re\s*:/i.test(normalized) ? normalized : `Re: ${normalized}`;
}

function extractReferenceTokens(raw: string | null | undefined): string[] {
  if (!raw || typeof raw !== 'string') return [];

  const angleBracketMatches = raw.match(/<[^>]+>/g);
  if (angleBracketMatches?.length) {
    return angleBracketMatches.map((item) => item.trim()).filter(Boolean);
  }

  return raw
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildReplyReferences(referencesHeader: string | null | undefined, messageId: string): string[] {
  const ordered = [...extractReferenceTokens(referencesHeader), messageId.trim()];
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const token of ordered) {
    const normalized = token.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(normalized);
  }

  return deduped;
}

export function buildInboundReplyPreview(email: {
  from_email: string;
  to_email: string | null;
  subject?: string | null;
  message_id?: string | null;
  references_header?: string | null;
}): InboundReplyPreview {
  const replyTo = extractEmailAddress(email.from_email) || (email.from_email || '').trim().toLowerCase();
  const inboundAlias = extractEmailAddress(email.to_email);
  const aliasConfig = inboundAlias ? REPLY_ALIAS_CONFIG[inboundAlias] : null;
  const subject = buildReplySubject(email.subject);

  if (!email.message_id || !email.message_id.trim()) {
    return {
      allowed: false,
      to: replyTo,
      from: aliasConfig?.from || null,
      subject,
      inReplyTo: null,
      references: [],
      blockedReason: 'Reply indisponivel: email original sem Message-ID valido.',
    };
  }

  if (!aliasConfig) {
    return {
      allowed: false,
      to: replyTo,
      from: null,
      subject,
      inReplyTo: email.message_id.trim(),
      references: buildReplyReferences(email.references_header, email.message_id.trim()),
      blockedReason: 'Reply indisponivel: alias de destino nao autorizado para resposta institucional.',
    };
  }

  if (aliasConfig.blockedReason) {
    return {
      allowed: false,
      to: replyTo,
      from: aliasConfig.from,
      subject,
      inReplyTo: email.message_id.trim(),
      references: buildReplyReferences(email.references_header, email.message_id.trim()),
      blockedReason: aliasConfig.blockedReason,
    };
  }

  return {
    allowed: true,
    to: replyTo,
    from: aliasConfig.from,
    subject,
    inReplyTo: email.message_id.trim(),
    references: buildReplyReferences(email.references_header, email.message_id.trim()),
    blockedReason: null,
  };
}
