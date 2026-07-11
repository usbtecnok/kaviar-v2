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

function extractBodiesFromRaw(rawText) {
  if (!rawText) {
    return { textBody: null, htmlBody: null, normalizedBody: null };
  }

  // Skeleton parser: tenta localizar blocos text/plain e text/html em mensagens multipart simples.
  const plainMatch = rawText.match(/Content-Type:\s*text\/plain[^\n]*\n[\s\S]*?\n\n([\s\S]*?)(?:\n--|$)/i);
  const htmlMatch = rawText.match(/Content-Type:\s*text\/html[^\n]*\n[\s\S]*?\n\n([\s\S]*?)(?:\n--|$)/i);

  const textBody = plainMatch ? plainMatch[1].trim() : null;
  const htmlBody = htmlMatch ? htmlMatch[1].trim() : null;
  const normalizedBody = textBody || (htmlBody ? htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null);

  return {
    textBody: textBody || null,
    htmlBody: htmlBody || null,
    normalizedBody: normalizedBody || null,
  };
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

async function postInboundToApi({ message, env }) {
  const rawHeaders = normalizeHeaderMap(message.headers || []);
  const fromAddress = parseAddress(message.from);
  const toAddress = parseAddress(message.to);

  let rawMime = '';
  try {
    rawMime = await new Response(message.raw).text();
  } catch {
    rawMime = '';
  }

  const bodies = extractBodiesFromRaw(rawMime);
  const payload = {
    received_at: new Date().toISOString(),
    from_email: fromAddress.email,
    from_name: fromAddress.name,
    to_email: toAddress.email,
    subject: String(message.headers?.get('subject') || '').slice(0, 255),
    text_body: bodies.textBody,
    html_body: bodies.htmlBody,
    normalized_body: bodies.normalizedBody,
    message_id: String(message.headers?.get('message-id') || '').trim() || null,
    in_reply_to: String(message.headers?.get('in-reply-to') || '').trim() || null,
    references_header: String(message.headers?.get('references') || '').trim() || null,
    has_attachments: false,
    attachment_count: 0,
    attachments_metadata: [],
    raw_headers: rawHeaders,
  };

  await fetch(env.INBOUND_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-KAVIAR-INBOUND-EMAIL-SECRET': env.INBOUND_EMAIL_WEBHOOK_SECRET,
    },
    body: JSON.stringify(payload),
  });
}

export default {
  async email(message, env) {
    try {
      await postInboundToApi({ message, env });
    } catch (error) {
      console.log('inbound webhook failed', error?.message || 'unknown_error');
    }

    try {
      await message.forward(env.GMAIL_FORWARD_TO);
    } catch (forwardError) {
      console.log('gmail forward failed', forwardError?.message || 'unknown_error');
      throw forwardError;
    }
  },
};
