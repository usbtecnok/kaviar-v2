import PostalMime from 'postal-mime';

const MAX_ATTACHMENTS_PER_EMAIL = 10;
const MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_EMAIL_ATTACHMENTS_SIZE_BYTES = 25 * 1024 * 1024;

function normalizeHeaderMap(headers) {
  const raw = {};
  for (const [key, value] of headers) {
    const normalizedKey = String(key || '').toLowerCase();
    if (!normalizedKey) continue;
    if (normalizedKey === 'authorization' || normalizedKey === 'cookie' || normalizedKey === 'set-cookie') continue;
    raw[normalizedKey] = String(value || '');
  }
  return raw;
}

function parseAddress(value) {
  const raw = String(value || '').trim();
  if (!raw) return { email: '', name: null };

  const matched = raw.match(/^(.*)<([^>]+)>$/);
  if (!matched) {
    return { email: raw.toLowerCase(), name: null };
  }

  const name = matched[1].trim().replace(/^"|"$/g, '');
  const email = matched[2].trim().toLowerCase();
  return { email, name: name || null };
}

function normalizeOptionalText(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function buildNormalizedBody(textBody, htmlBody) {
  if (textBody) return textBody;
  if (!htmlBody) return null;
  return htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || null;
}

function ensureBytes(content) {
  if (!content) return null;
  if (content instanceof Uint8Array) return content;
  if (content instanceof ArrayBuffer) return new Uint8Array(content);
  if (ArrayBuffer.isView(content)) {
    return new Uint8Array(content.buffer, content.byteOffset, content.byteLength);
  }
  if (typeof content === 'string') {
    return new TextEncoder().encode(content);
  }
  return null;
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return toHex(digest);
}

export async function buildAttachmentEntries(parsedAttachments) {
  const attachments = [];
  const source = Array.isArray(parsedAttachments) ? parsedAttachments : [];
  let totalBytes = 0;

  for (let i = 0; i < source.length; i += 1) {
    const attachment = source[i];
    if (attachment?.related === true) continue;

    const bytes = ensureBytes(attachment?.content);
    if (!bytes || bytes.byteLength === 0) continue;

    const filename = safeAttachmentFilename(attachment?.filename, i);
    const contentType = String(attachment?.mimeType || attachment?.contentType || 'application/octet-stream').trim() || 'application/octet-stream';
    const sizeBytes = bytes.byteLength;

    if (attachments.length >= MAX_ATTACHMENTS_PER_EMAIL) {
      console.log(`attachment_skipped reason=max_attachments filename=${filename}`);
      continue;
    }

    if (sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
      console.log(`attachment_skipped reason=max_attachment_size filename=${filename} mime=${contentType} size_bytes=${sizeBytes}`);
      continue;
    }

    if (totalBytes + sizeBytes > MAX_EMAIL_ATTACHMENTS_SIZE_BYTES) {
      console.log(`attachment_skipped reason=max_email_attachments_size filename=${filename} mime=${contentType} size_bytes=${sizeBytes}`);
      continue;
    }

    const sha256 = await sha256Hex(bytes);
    totalBytes += sizeBytes;

    attachments.push({
      index: i,
      filename,
      contentType,
      sizeBytes,
      sha256,
      bytes,
    });
  }

  return attachments;
}

function safeAttachmentFilename(filename, index) {
  const raw = typeof filename === 'string' ? filename.trim() : '';
  if (!raw) return `attachment-${index + 1}.bin`;
  const sanitized = raw
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return sanitized || `attachment-${index + 1}.bin`;
}

function normalizeUploadHeaders(uploadHeaders) {
  if (!uploadHeaders || typeof uploadHeaders !== 'object' || Array.isArray(uploadHeaders)) {
    return {};
  }

  const normalized = {};
  for (const [key, value] of Object.entries(uploadHeaders)) {
    const headerName = String(key || '').trim();
    if (!headerName) continue;
    const lower = headerName.toLowerCase();
    if (lower === 'authorization' || lower === 'cookie' || lower === 'set-cookie' || lower === 'host') continue;
    normalized[headerName] = String(value ?? '');
  }

  return normalized;
}

export async function fetchJsonOrThrow(url, options = {}) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    throw new Error(`http_request_failed: ${(error && error.message) || 'network_error'}`);
  }

  let payload = null;
  try {
    payload = await response.clone().json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errorMessage = payload?.error || payload?.message || response.statusText || 'request_failed';
    throw new Error(`http_${response.status}: ${String(errorMessage).slice(0, 300)}`);
  }

  if (payload == null) {
    throw new Error(`invalid_json_response: status ${response.status}`);
  }

  return payload;
}

function extractXmlTag(xml, tagName) {
  const safeName = String(tagName || '').replace(/[^a-zA-Z0-9]/g, '');
  if (!safeName) return null;
  const regex = new RegExp(`<${safeName}>([\\s\\S]*?)<\\/${safeName}>`, 'i');
  const match = String(xml || '').match(regex);
  if (!match || !match[1]) return null;
  return match[1].trim() || null;
}

export async function buildSafeUploadErrorMessage(response) {
  const status = Number(response?.status || 0);
  let bodyText = '';

  try {
    bodyText = await response.text();
  } catch {
    bodyText = '';
  }

  const clipped = String(bodyText || '').slice(0, 1000);
  const code = extractXmlTag(clipped, 'Code') || 'Unknown';
  const message = extractXmlTag(clipped, 'Message') || null;

  const pieces = [`upload_failed: status=${status || 'unknown'}`, `code=${code}`];
  if (message) {
    pieces.push(`msg=${message.replace(/\s+/g, ' ').slice(0, 180)}`);
  }

  return pieces.join(' ');
}

export async function parseInboundEmail(message) {
  const parsed = await PostalMime.parse(message.raw, {
    attachmentEncoding: 'arraybuffer',
  });

  const fromAddress = parseAddress(message.from);
  const toAddress = parseAddress(message.to);
  const rawHeaders = normalizeHeaderMap(message.headers || []);

  const subject = normalizeOptionalText(parsed.subject)
    || normalizeOptionalText(message.headers?.get('subject'))
    || null;
  const textBody = normalizeOptionalText(parsed.text);
  const htmlBody = normalizeOptionalText(parsed.html);
  const normalizedBody = buildNormalizedBody(textBody, htmlBody);
  const messageId = normalizeOptionalText(parsed.messageId)
    || normalizeOptionalText(message.headers?.get('message-id'));
  const inReplyTo = normalizeOptionalText(parsed.inReplyTo)
    || normalizeOptionalText(message.headers?.get('in-reply-to'));
  const referencesHeader = normalizeOptionalText(parsed.references)
    || normalizeOptionalText(message.headers?.get('references'));

  const attachments = await buildAttachmentEntries(parsed.attachments);

  console.log(`inbound_email_parsed message_id=${messageId || 'none'} attachments=${attachments.length}`);

  return {
    inboundPayload: {
      received_at: new Date().toISOString(),
      from_email: fromAddress.email,
      from_name: fromAddress.name,
      to_email: toAddress.email,
      subject,
      text_body: textBody,
      html_body: htmlBody,
      normalized_body: normalizedBody,
      message_id: messageId,
      in_reply_to: inReplyTo,
      references_header: referencesHeader,
      has_attachments: attachments.length > 0,
      attachment_count: attachments.length,
      attachments_metadata: attachments.map((item) => ({
        filename: item.filename,
        contentType: item.contentType,
        size: item.sizeBytes,
      })),
      raw_headers: rawHeaders,
    },
    attachments,
  };
}

export async function ingestInboundMessage(message, env) {
  const parsed = await parseInboundEmail(message);

  const inboundResponse = await fetchJsonOrThrow(env.INBOUND_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-KAVIAR-INBOUND-EMAIL-SECRET': env.INBOUND_EMAIL_WEBHOOK_SECRET,
    },
    body: JSON.stringify(parsed.inboundPayload),
  });

  const inboundEmailId = inboundResponse?.data?.id;
  if (!inboundEmailId) {
    throw new Error('inbound_creation_failed: missing data.id');
  }

  for (let i = 0; i < parsed.attachments.length; i += 1) {
    const attachment = parsed.attachments[i];

    try {
      console.log(`attachment_ingest_start message_id=${parsed.inboundPayload.message_id || 'none'} inbound_email_id=${inboundEmailId} idx=${i + 1} filename=${attachment.filename} mime=${attachment.contentType} size_bytes=${attachment.sizeBytes}`);

      const reserveResponse = await fetchJsonOrThrow(`${env.INBOUND_WEBHOOK_URL}/attachments/request-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-KAVIAR-INBOUND-EMAIL-SECRET': env.INBOUND_EMAIL_WEBHOOK_SECRET,
        },
        body: JSON.stringify({
          inbound_email_id: inboundEmailId,
          filename: attachment.filename,
          content_type: attachment.contentType,
          size_bytes: attachment.sizeBytes,
          sha256: attachment.sha256,
        }),
      });

      const reserveData = reserveResponse?.data || {};
      const status = String(reserveData.status || '').toUpperCase();
      const alreadyAvailable = reserveData.already_available === true || status === 'AVAILABLE';

      if (alreadyAvailable) {
        console.log(`attachment_ingest_reused message_id=${parsed.inboundPayload.message_id || 'none'} inbound_email_id=${inboundEmailId} idx=${i + 1} filename=${attachment.filename} status=${status || 'AVAILABLE'}`);
        continue;
      }

      const uploadUrl = reserveData.upload_url;
      const uploadHeaders = normalizeUploadHeaders(reserveData.upload_headers);
      const attachmentId = reserveData.attachment_id;
      if (!uploadUrl || !attachmentId) {
        throw new Error('reserve_failed: missing upload_url or attachment_id');
      }

      const putResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: uploadHeaders,
        body: attachment.bytes,
      });

      if (!putResponse.ok) {
        throw new Error(await buildSafeUploadErrorMessage(putResponse));
      }

      const finalizeResponse = await fetchJsonOrThrow(`${env.INBOUND_WEBHOOK_URL}/attachments/${attachmentId}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-KAVIAR-INBOUND-EMAIL-SECRET': env.INBOUND_EMAIL_WEBHOOK_SECRET,
        },
        body: JSON.stringify({ inbound_email_id: inboundEmailId }),
      });

      const finalizeStatus = String(finalizeResponse?.data?.status || '').toUpperCase();
      if (finalizeStatus !== 'AVAILABLE') {
        throw new Error(`finalize_failed: unexpected status ${finalizeStatus || 'unknown'}`);
      }

      console.log(`attachment_ingest_success message_id=${parsed.inboundPayload.message_id || 'none'} inbound_email_id=${inboundEmailId} idx=${i + 1} filename=${attachment.filename} mime=${attachment.contentType} size_bytes=${attachment.sizeBytes}`);
    } catch (error) {
      const reason = (error && error.message) || 'unknown_error';
      console.log(`attachment_ingest_failed message_id=${parsed.inboundPayload.message_id || 'none'} inbound_email_id=${inboundEmailId} idx=${i + 1} filename=${attachment.filename} mime=${attachment.contentType} size_bytes=${attachment.sizeBytes} reason=${reason.slice(0, 180)}`);
    }
  }
}

export default {
  async email(message, env) {
    try {
      await ingestInboundMessage(message, env);
    } catch (error) {
      console.log(`inbound_webhook_failed reason=${((error && error.message) || 'unknown_error').slice(0, 220)}`);
    }

    try {
      await message.forward(env.GMAIL_FORWARD_TO);
    } catch (forwardError) {
      console.log(`gmail_forward_failed reason=${((forwardError && forwardError.message) || 'unknown_error').slice(0, 220)}`);
      throw forwardError;
    }
  },
};
