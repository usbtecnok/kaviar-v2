import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import worker, {
  buildAttachmentEntries,
  fetchJsonOrThrow,
  ingestInboundMessage,
  parseInboundEmail,
} from '../src/index.js';

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function textResponse(body, status = 200) {
  return new Response(body, { status });
}

function createMessage({ raw, subject = 'Assunto teste', forwardImpl } = {}) {
  const headers = new Map([
    ['subject', subject],
    ['message-id', '<m-1@test>'],
    ['in-reply-to', '<m-0@test>'],
    ['references', '<m-0@test> <m-1@test>'],
  ]);

  return {
    from: 'Prefeitura <noreply@cidade.gov.br>',
    to: 'Inbox <inbox@kaviar.com.br>',
    headers,
    raw: raw || 'From: Prefeitura <noreply@cidade.gov.br>\r\nTo: Inbox <inbox@kaviar.com.br>\r\nSubject: Assunto teste\r\n\r\nCorpo simples',
    forward: forwardImpl || (async () => {}),
  };
}

function createMimeWithAttachments(items) {
  const boundary = 'BOUNDARY123';
  const base = [
    'From: Prefeitura <noreply@cidade.gov.br>',
    'To: Inbox <inbox@kaviar.com.br>',
    'Subject: Documento',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    '',
    'Texto principal',
  ];

  for (const item of items) {
    const encoded = Buffer.from(item.content).toString('base64');
    base.push(`--${boundary}`);
    base.push(`Content-Type: ${item.contentType}`);
    base.push('Content-Transfer-Encoding: base64');
    base.push(`Content-Disposition: attachment; filename="${item.filename}"`);
    base.push('');
    base.push(encoded);
  }

  base.push(`--${boundary}--`);
  base.push('');
  return base.join('\r\n');
}

const env = {
  INBOUND_WEBHOOK_URL: 'https://api.test/api/inbound/email/cloudflare',
  INBOUND_EMAIL_WEBHOOK_SECRET: 'secret-123',
  GMAIL_FORWARD_TO: 'gmail@example.com',
};

function createReadableStreamFromString(value, chunkSize = 64) {
  const bytes = new TextEncoder().encode(value);
  let cursor = 0;

  return new ReadableStream({
    pull(controller) {
      if (cursor >= bytes.length) {
        controller.close();
        return;
      }
      const next = bytes.slice(cursor, cursor + chunkSize);
      cursor += chunkSize;
      controller.enqueue(next);
    },
  });
}

function createMultipartAlternativeWithPdf() {
  const mixedBoundary = 'MIXED-BOUNDARY';
  const altBoundary = 'ALT-BOUNDARY';
  const pdfBytes = Uint8Array.from([
    0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a,
    0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a,
  ]);
  const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

  const mime = [
    'From: Prefeitura <noreply@cidade.gov.br>',
    'To: Inbox <inbox@kaviar.com.br>',
    'Subject: Fluxo stream',
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    '',
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    '',
    `--${altBoundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    '',
    'Texto via stream',
    `--${altBoundary}`,
    'Content-Type: text/html; charset="utf-8"',
    '',
    '<p>HTML via stream</p>',
    `--${altBoundary}--`,
    '',
    `--${mixedBoundary}`,
    'Content-Type: application/pdf',
    'Content-Transfer-Encoding: base64',
    'Content-Disposition: attachment; filename="guia.pdf"',
    '',
    pdfBase64,
    `--${mixedBoundary}--`,
    '',
  ].join('\r\n');

  return { mime, pdfBytes };
}

test('fetchJsonOrThrow retorna json em 200', async () => {
  global.fetch = async () => jsonResponse({ ok: true });
  const payload = await fetchJsonOrThrow('https://api.test/resource');
  assert.deepEqual(payload, { ok: true });
});

test('fetchJsonOrThrow falha em erro de rede', async () => {
  global.fetch = async () => {
    throw new Error('network down');
  };
  await assert.rejects(() => fetchJsonOrThrow('https://api.test/resource'), /http_request_failed/);
});

test('fetchJsonOrThrow falha em status não-2xx com mensagem do payload', async () => {
  global.fetch = async () => jsonResponse({ error: 'forbidden' }, 403);
  await assert.rejects(() => fetchJsonOrThrow('https://api.test/resource'), /http_403: forbidden/);
});

test('fetchJsonOrThrow falha quando resposta 2xx não é json', async () => {
  global.fetch = async () => textResponse('ok', 200);
  await assert.rejects(() => fetchJsonOrThrow('https://api.test/resource'), /invalid_json_response/);
});

test('buildAttachmentEntries ignora related=true', async () => {
  const entries = await buildAttachmentEntries([
    { related: true, content: 'inline', filename: 'inline.png', mimeType: 'image/png' },
    { related: false, content: 'file', filename: 'doc.txt', mimeType: 'text/plain' },
  ]);

  assert.equal(entries.length, 1);
  assert.equal(entries[0].filename, 'doc.txt');
});

test('buildAttachmentEntries ignora conteúdo vazio', async () => {
  const entries = await buildAttachmentEntries([
    { content: '', filename: 'a.txt', mimeType: 'text/plain' },
    { content: null, filename: 'b.txt', mimeType: 'text/plain' },
  ]);
  assert.equal(entries.length, 0);
});

test('buildAttachmentEntries aplica defaults de filename e content-type', async () => {
  const entries = await buildAttachmentEntries([{ content: 'abc', filename: '  ' }]);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].filename, 'attachment-1.bin');
  assert.equal(entries[0].contentType, 'application/octet-stream');
});

test('parseInboundEmail parseia metadados e corpo', async () => {
  const message = createMessage({
    raw: [
      'From: Prefeitura <noreply@cidade.gov.br>',
      'To: Inbox <inbox@kaviar.com.br>',
      'Subject: Teste parser',
      'Message-ID: <id-1@test>',
      '',
      'Corpo textual',
      '',
    ].join('\r\n'),
  });

  const parsed = await parseInboundEmail(message);
  assert.equal(parsed.inboundPayload.from_email, 'noreply@cidade.gov.br');
  assert.equal(parsed.inboundPayload.to_email, 'inbox@kaviar.com.br');
  assert.equal(parsed.inboundPayload.subject, 'Teste parser');
  assert.equal(parsed.inboundPayload.normalized_body, 'Corpo textual');
});

test('parseInboundEmail computa attachment_count e has_attachments', async () => {
  const raw = createMimeWithAttachments([{ filename: 'guia.pdf', contentType: 'application/pdf', content: 'PDF-DATA' }]);
  const parsed = await parseInboundEmail(createMessage({ raw }));

  assert.equal(parsed.attachments.length, 1);
  assert.equal(parsed.inboundPayload.has_attachments, true);
  assert.equal(parsed.inboundPayload.attachment_count, 1);
  assert.equal(parsed.inboundPayload.attachments_metadata[0].filename, 'guia.pdf');
});

test('parseInboundEmail ignora anexo acima de 15 MB', async () => {
  const largeContent = 'A'.repeat(15 * 1024 * 1024 + 1);
  const raw = createMimeWithAttachments([{ filename: 'grande.pdf', contentType: 'application/pdf', content: largeContent }]);
  const parsed = await parseInboundEmail(createMessage({ raw }));

  assert.equal(parsed.attachments.length, 0);
  assert.equal(parsed.inboundPayload.attachment_count, 0);
});

test('parseInboundEmail limita a 10 anexos por mensagem', async () => {
  const items = Array.from({ length: 12 }, (_, index) => ({
    filename: `doc-${index + 1}.pdf`,
    contentType: 'application/pdf',
    content: `PDF-${index + 1}`,
  }));

  const raw = createMimeWithAttachments(items);
  const parsed = await parseInboundEmail(createMessage({ raw }));

  assert.equal(parsed.attachments.length, 10);
  assert.equal(parsed.inboundPayload.attachment_count, 10);
});

test('parseInboundEmail aceita message.raw como ReadableStream real e extrai text/html/pdf com bytes+sha corretos', async () => {
  const { mime, pdfBytes } = createMultipartAlternativeWithPdf();
  const message = createMessage({ raw: createReadableStreamFromString(mime, 17) });
  const parsed = await parseInboundEmail(message);

  assert.equal(parsed.inboundPayload.text_body, 'Texto via stream');
  assert.equal(parsed.inboundPayload.html_body, '<p>HTML via stream</p>');
  assert.equal(parsed.attachments.length, 1);
  assert.equal(parsed.attachments[0].filename, 'guia.pdf');
  assert.equal(parsed.attachments[0].contentType, 'application/pdf');

  const parsedPdf = new Uint8Array(parsed.attachments[0].bytes);
  assert.deepEqual([...parsedPdf], [...pdfBytes]);

  const expectedDigest = await crypto.subtle.digest('SHA-256', pdfBytes);
  const expectedSha = Buffer.from(new Uint8Array(expectedDigest)).toString('hex');
  assert.equal(parsed.attachments[0].sha256, expectedSha);
});

test('parseInboundEmail não usa Response(...).arrayBuffer() e mantém parse direto com PostalMime', async () => {
  const source = await readFile(new URL('../src/index.js', import.meta.url), 'utf8');
  assert.equal(source.includes('new Response(message.raw).arrayBuffer()'), false);
  assert.equal(source.includes('PostalMime.parse(message.raw'), true);
});

test('ingestInboundMessage faz inbound primeiro', async () => {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (String(url).endsWith('/cloudflare')) return jsonResponse({ data: { id: 'inbound-1' } });
    if (String(url).endsWith('/request-upload')) {
      return jsonResponse({ data: { attachment_id: 'att-1', upload_url: 'https://upload.test/1', status: 'PENDING', already_available: false } });
    }
    if (String(url).startsWith('https://upload.test/')) return new Response('', { status: 200 });
    if (String(url).includes('/finalize')) return jsonResponse({ data: { status: 'AVAILABLE' } });
    return jsonResponse({ ok: true });
  };

  const raw = createMimeWithAttachments([{ filename: 'a.pdf', contentType: 'application/pdf', content: 'A' }]);
  await ingestInboundMessage(createMessage({ raw }), env);

  assert.equal(calls[0].url, env.INBOUND_WEBHOOK_URL);
});

test('ingestInboundMessage faz reserve por attachment', async () => {
  let reserveCount = 0;
  global.fetch = async (url) => {
    if (String(url).endsWith('/cloudflare')) return jsonResponse({ data: { id: 'inbound-1' } });
    if (String(url).endsWith('/request-upload')) {
      reserveCount += 1;
      return jsonResponse({ data: { attachment_id: `att-${reserveCount}`, upload_url: `https://upload.test/${reserveCount}`, status: 'PENDING' } });
    }
    if (String(url).startsWith('https://upload.test/')) return new Response('', { status: 200 });
    if (String(url).includes('/finalize')) return jsonResponse({ data: { status: 'AVAILABLE' } });
    return jsonResponse({});
  };

  const raw = createMimeWithAttachments([
    { filename: 'a.pdf', contentType: 'application/pdf', content: 'A' },
    { filename: 'b.pdf', contentType: 'application/pdf', content: 'B' },
  ]);
  await ingestInboundMessage(createMessage({ raw }), env);
  assert.equal(reserveCount, 2);
});

test('ingestInboundMessage pula PUT/finalize quando already_available=true', async () => {
  let putCount = 0;
  let finalizeCount = 0;

  global.fetch = async (url) => {
    if (String(url).endsWith('/cloudflare')) return jsonResponse({ data: { id: 'inbound-1' } });
    if (String(url).endsWith('/request-upload')) {
      return jsonResponse({ data: { attachment_id: 'att-1', upload_url: null, status: 'AVAILABLE', already_available: true } });
    }
    if (String(url).startsWith('https://upload.test/')) {
      putCount += 1;
      return new Response('', { status: 200 });
    }
    if (String(url).includes('/finalize')) {
      finalizeCount += 1;
      return jsonResponse({ data: { status: 'AVAILABLE' } });
    }
    return jsonResponse({});
  };

  const raw = createMimeWithAttachments([{ filename: 'a.pdf', contentType: 'application/pdf', content: 'A' }]);
  await ingestInboundMessage(createMessage({ raw }), env);

  assert.equal(putCount, 0);
  assert.equal(finalizeCount, 0);
});

test('ingestInboundMessage pula PUT/finalize quando status=AVAILABLE', async () => {
  let putCount = 0;
  let finalizeCount = 0;

  global.fetch = async (url) => {
    if (String(url).endsWith('/cloudflare')) return jsonResponse({ data: { id: 'inbound-1' } });
    if (String(url).endsWith('/request-upload')) {
      return jsonResponse({ data: { attachment_id: 'att-1', upload_url: null, status: 'AVAILABLE' } });
    }
    if (String(url).startsWith('https://upload.test/')) {
      putCount += 1;
      return new Response('', { status: 200 });
    }
    if (String(url).includes('/finalize')) {
      finalizeCount += 1;
      return jsonResponse({ data: { status: 'AVAILABLE' } });
    }
    return jsonResponse({});
  };

  const raw = createMimeWithAttachments([{ filename: 'a.pdf', contentType: 'application/pdf', content: 'A' }]);
  await ingestInboundMessage(createMessage({ raw }), env);

  assert.equal(putCount, 0);
  assert.equal(finalizeCount, 0);
});

test('ingestInboundMessage faz PUT e finalize quando PENDING', async () => {
  let putCount = 0;
  let finalizeCount = 0;
  let lastPutHeaders = null;

  global.fetch = async (url, options = {}) => {
    if (String(url).endsWith('/cloudflare')) return jsonResponse({ data: { id: 'inbound-1' } });
    if (String(url).endsWith('/request-upload')) {
      return jsonResponse({
        data: {
          attachment_id: 'att-1',
          upload_url: 'https://upload.test/1',
          upload_headers: {
            'content-type': 'application/pdf',
          },
          status: 'PENDING',
        },
      });
    }
    if (String(url).startsWith('https://upload.test/')) {
      putCount += 1;
      lastPutHeaders = options.headers;
      return new Response('', { status: 200 });
    }
    if (String(url).includes('/finalize')) {
      finalizeCount += 1;
      return jsonResponse({ data: { status: 'AVAILABLE' } });
    }
    return jsonResponse({});
  };

  const raw = createMimeWithAttachments([{ filename: 'a.pdf', contentType: 'application/pdf', content: 'A' }]);
  await ingestInboundMessage(createMessage({ raw }), env);

  assert.equal(putCount, 1);
  assert.equal(finalizeCount, 1);
  assert.deepEqual(lastPutHeaders, {
    'content-type': 'application/pdf',
  });
  assert.equal(Object.prototype.hasOwnProperty.call(lastPutHeaders, 'x-amz-meta-sha256'), false);
});

test('ingestInboundMessage não inventa x-amz-meta-sha256 quando backend não retornar', async () => {
  let lastPutHeaders = null;

  global.fetch = async (url, options = {}) => {
    if (String(url).endsWith('/cloudflare')) return jsonResponse({ data: { id: 'inbound-1' } });
    if (String(url).endsWith('/request-upload')) {
      return jsonResponse({
        data: {
          attachment_id: 'att-1',
          upload_url: 'https://upload.test/1',
          upload_headers: { 'content-type': 'application/pdf' },
          status: 'PENDING',
        },
      });
    }
    if (String(url).startsWith('https://upload.test/')) {
      lastPutHeaders = options.headers;
      return new Response('', { status: 200 });
    }
    if (String(url).includes('/finalize')) return jsonResponse({ data: { status: 'AVAILABLE' } });
    return jsonResponse({});
  };

  const raw = createMimeWithAttachments([{ filename: 'a.pdf', contentType: 'application/pdf', content: 'A' }]);
  await ingestInboundMessage(createMessage({ raw }), env);

  assert.deepEqual(lastPutHeaders, { 'content-type': 'application/pdf' });
  assert.equal(Object.prototype.hasOwnProperty.call(lastPutHeaders, 'x-amz-meta-sha256'), false);
});

test('ingestInboundMessage não chama finalize quando upload retorna 403', async () => {
  let finalizeCount = 0;

  global.fetch = async (url) => {
    if (String(url).endsWith('/cloudflare')) return jsonResponse({ data: { id: 'inbound-1' } });
    if (String(url).endsWith('/request-upload')) {
      return jsonResponse({
        data: {
          attachment_id: 'att-1',
          upload_url: 'https://upload.test/1',
          upload_headers: {},
          status: 'PENDING',
        },
      });
    }
    if (String(url).startsWith('https://upload.test/')) {
      return new Response('<Error><Code>AccessDenied</Code><Message>There were headers present in the request which were not signed</Message></Error>', {
        status: 403,
        headers: { 'Content-Type': 'application/xml' },
      });
    }
    if (String(url).includes('/finalize')) {
      finalizeCount += 1;
      return jsonResponse({ data: { status: 'AVAILABLE' } });
    }
    return jsonResponse({});
  };

  const raw = createMimeWithAttachments([{ filename: 'a.pdf', contentType: 'application/pdf', content: 'A' }]);
  await ingestInboundMessage(createMessage({ raw }), env);

  assert.equal(finalizeCount, 0);
});

test('ingestInboundMessage isola falha de reserve e continua próximo anexo', async () => {
  let reserveAttempt = 0;
  let finalizeCount = 0;

  global.fetch = async (url) => {
    if (String(url).endsWith('/cloudflare')) return jsonResponse({ data: { id: 'inbound-1' } });
    if (String(url).endsWith('/request-upload')) {
      reserveAttempt += 1;
      if (reserveAttempt === 1) return jsonResponse({ error: 'boom' }, 500);
      return jsonResponse({ data: { attachment_id: 'att-2', upload_url: 'https://upload.test/2', status: 'PENDING' } });
    }
    if (String(url).startsWith('https://upload.test/')) return new Response('', { status: 200 });
    if (String(url).includes('/finalize')) {
      finalizeCount += 1;
      return jsonResponse({ data: { status: 'AVAILABLE' } });
    }
    return jsonResponse({});
  };

  const raw = createMimeWithAttachments([
    { filename: 'a.pdf', contentType: 'application/pdf', content: 'A' },
    { filename: 'b.pdf', contentType: 'application/pdf', content: 'B' },
  ]);
  await ingestInboundMessage(createMessage({ raw }), env);

  assert.equal(finalizeCount, 1);
});

test('ingestInboundMessage isola falha de upload e continua próximo anexo', async () => {
  let uploadAttempt = 0;
  let finalizeCount = 0;

  global.fetch = async (url) => {
    if (String(url).endsWith('/cloudflare')) return jsonResponse({ data: { id: 'inbound-1' } });
    if (String(url).endsWith('/request-upload')) {
      const idx = uploadAttempt + 1;
      return jsonResponse({ data: { attachment_id: `att-${idx}`, upload_url: `https://upload.test/${idx}`, status: 'PENDING' } });
    }
    if (String(url).startsWith('https://upload.test/')) {
      uploadAttempt += 1;
      if (uploadAttempt === 1) return new Response('', { status: 500 });
      return new Response('', { status: 200 });
    }
    if (String(url).includes('/finalize')) {
      finalizeCount += 1;
      return jsonResponse({ data: { status: 'AVAILABLE' } });
    }
    return jsonResponse({});
  };

  const raw = createMimeWithAttachments([
    { filename: 'a.pdf', contentType: 'application/pdf', content: 'A' },
    { filename: 'b.pdf', contentType: 'application/pdf', content: 'B' },
  ]);
  await ingestInboundMessage(createMessage({ raw }), env);

  assert.equal(finalizeCount, 1);
});

test('worker.email gera diagnóstico seguro em PUT 403 SignatureDoesNotMatch sem vazar URL/segredo e continua próximo attachment', async () => {
  let reserveAttempt = 0;
  let finalizeCount = 0;
  let forwarded = false;
  const logs = [];
  const originalConsoleLog = console.log;
  console.log = (...args) => logs.push(args.map((v) => String(v)).join(' '));

  try {
    global.fetch = async (url) => {
      if (String(url).endsWith('/cloudflare')) return jsonResponse({ data: { id: 'inbound-1' } });
      if (String(url).endsWith('/request-upload')) {
        reserveAttempt += 1;
        return jsonResponse({
          data: {
            attachment_id: `att-${reserveAttempt}`,
            upload_url: `https://upload.test/${reserveAttempt}?X-Amz-Signature=SENSITIVE123&X-Amz-Credential=FAKE`,
            status: 'PENDING',
          },
        });
      }
      if (String(url).startsWith('https://upload.test/1')) {
        return new Response('<Error><Code>SignatureDoesNotMatch</Code><Message>Signature mismatch for request</Message></Error>', {
          status: 403,
          headers: { 'Content-Type': 'application/xml' },
        });
      }
      if (String(url).startsWith('https://upload.test/2')) {
        return new Response('', { status: 200 });
      }
      if (String(url).includes('/finalize')) {
        finalizeCount += 1;
        return jsonResponse({ data: { status: 'AVAILABLE' } });
      }
      return jsonResponse({});
    };

    const message = createMessage({
      raw: createMimeWithAttachments([
        { filename: 'a.pdf', contentType: 'application/pdf', content: 'A' },
        { filename: 'b.pdf', contentType: 'application/pdf', content: 'B' },
      ]),
      forwardImpl: async () => { forwarded = true; },
    });

    await worker.email(message, env);
  } finally {
    console.log = originalConsoleLog;
  }

  const combinedLogs = logs.join('\n');
  assert.match(combinedLogs, /upload_failed: status=403 code=SignatureDoesNotMatch/);
  assert.equal(combinedLogs.includes('https://upload.test/'), false);
  assert.equal(combinedLogs.includes('X-Amz-Signature'), false);
  assert.equal(combinedLogs.includes('secret-123'), false);
  assert.equal(finalizeCount, 1);
  assert.equal(forwarded, true);
});

test('ingestInboundMessage isola falha de finalize e continua próximo anexo', async () => {
  let finalizeCount = 0;

  global.fetch = async (url) => {
    if (String(url).endsWith('/cloudflare')) return jsonResponse({ data: { id: 'inbound-1' } });
    if (String(url).endsWith('/request-upload')) {
      return jsonResponse({ data: { attachment_id: `att-${finalizeCount + 1}`, upload_url: 'https://upload.test/x', status: 'PENDING' } });
    }
    if (String(url).startsWith('https://upload.test/')) return new Response('', { status: 200 });
    if (String(url).includes('/finalize')) {
      finalizeCount += 1;
      if (finalizeCount === 1) return jsonResponse({ data: { status: 'PENDING' } });
      return jsonResponse({ data: { status: 'AVAILABLE' } });
    }
    return jsonResponse({});
  };

  const raw = createMimeWithAttachments([
    { filename: 'a.pdf', contentType: 'application/pdf', content: 'A' },
    { filename: 'b.pdf', contentType: 'application/pdf', content: 'B' },
  ]);
  await ingestInboundMessage(createMessage({ raw }), env);

  assert.equal(finalizeCount, 2);
});

test('ingestInboundMessage falha quando inbound não retorna data.id', async () => {
  global.fetch = async (url) => {
    if (String(url).endsWith('/cloudflare')) return jsonResponse({ data: {} });
    return jsonResponse({});
  };

  const raw = createMimeWithAttachments([{ filename: 'a.pdf', contentType: 'application/pdf', content: 'A' }]);
  await assert.rejects(() => ingestInboundMessage(createMessage({ raw }), env), /inbound_creation_failed/);
});

test('worker.email sempre tenta forward mesmo com falha de ingest', async () => {
  let forwarded = false;

  global.fetch = async (url) => {
    if (String(url).endsWith('/cloudflare')) return jsonResponse({ error: 'backend down' }, 500);
    return jsonResponse({});
  };

  const message = createMessage({
    raw: createMimeWithAttachments([{ filename: 'a.pdf', contentType: 'application/pdf', content: 'A' }]),
    forwardImpl: async () => { forwarded = true; },
  });

  await worker.email(message, env);
  assert.equal(forwarded, true);
});

test('worker.email propaga erro de forward', async () => {
  global.fetch = async (url) => {
    if (String(url).endsWith('/cloudflare')) return jsonResponse({ data: { id: 'inbound-1' } });
    if (String(url).endsWith('/request-upload')) {
      return jsonResponse({ data: { attachment_id: 'att-1', upload_url: 'https://upload.test/1', status: 'PENDING' } });
    }
    if (String(url).startsWith('https://upload.test/')) return new Response('', { status: 200 });
    if (String(url).includes('/finalize')) return jsonResponse({ data: { status: 'AVAILABLE' } });
    return jsonResponse({});
  };

  const message = createMessage({
    raw: createMimeWithAttachments([{ filename: 'a.pdf', contentType: 'application/pdf', content: 'A' }]),
    forwardImpl: async () => {
      throw new Error('smtp unavailable');
    },
  });

  await assert.rejects(() => worker.email(message, env), /smtp unavailable/);
});

test('worker.email completa ingest + forward no caminho feliz', async () => {
  let forwarded = false;
  global.fetch = async (url) => {
    if (String(url).endsWith('/cloudflare')) return jsonResponse({ data: { id: 'inbound-1' } });
    if (String(url).endsWith('/request-upload')) {
      return jsonResponse({ data: { attachment_id: 'att-1', upload_url: 'https://upload.test/1', status: 'PENDING' } });
    }
    if (String(url).startsWith('https://upload.test/')) return new Response('', { status: 200 });
    if (String(url).includes('/finalize')) return jsonResponse({ data: { status: 'AVAILABLE' } });
    return jsonResponse({});
  };

  const message = createMessage({
    raw: createMimeWithAttachments([{ filename: 'a.pdf', contentType: 'application/pdf', content: 'A' }]),
    forwardImpl: async () => { forwarded = true; },
  });

  await worker.email(message, env);
  assert.equal(forwarded, true);
});
