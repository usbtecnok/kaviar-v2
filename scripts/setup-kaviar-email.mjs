#!/usr/bin/env node

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const DOMAIN = 'kaviar.com.br';
const OFFICIAL_ADDRESSES = [
  'contato@kaviar.com.br',
  'no-reply@kaviar.com.br',
  'suporte@kaviar.com.br',
  'financeiro@kaviar.com.br',
];
const DMARC_VALUE = 'v=DMARC1; p=none; rua=mailto:contato@kaviar.com.br; adkim=s; aspf=s';
const DEFAULT_SPF = 'v=spf1 include:amazonses.com ~all';

const dryRun = process.argv.includes('--dry-run');

function logStep(message) {
  console.log(`\n[setup-kaviar-email] ${message}`);
}

function logInfo(message) {
  console.log(`[info] ${message}`);
}

function logWarn(message) {
  console.warn(`[warn] ${message}`);
}

function fail(message) {
  throw new Error(message);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    fail(`Variavel obrigatoria ausente: ${name}`);
  }
  return value.trim();
}

function runAwsJson(args) {
  const result = spawnSync('aws', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    const err = new Error(`AWS command failed: aws ${args.join(' ')}`);
    err.details = stderr;
    throw err;
  }

  const stdout = (result.stdout || '').trim();
  return stdout ? JSON.parse(stdout) : {};
}

async function cfRequest({ method = 'GET', token, endpoint, body }) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    const error = new Error(`Cloudflare request failed: ${method} ${endpoint}`);
    error.details = json.errors || json.messages || json;
    throw error;
  }

  return json.result;
}

function normalizeTxt(value) {
  return String(value || '').trim().replace(/^"|"$/g, '');
}

function mergeSpfValue(existingValue) {
  const normalized = normalizeTxt(existingValue);
  const rawParts = normalized.split(/\s+/).filter(Boolean);
  const parts = rawParts.map((part) => part.trim());

  if (!parts[0] || parts[0].toLowerCase() !== 'v=spf1') {
    return null;
  }

  if (parts.some((part) => part.toLowerCase() === 'include:amazonses.com')) {
    return normalized;
  }

  const allIndex = parts.findIndex((part) => /^(~|-|\+|\?)?all$/i.test(part));
  const insertAt = allIndex >= 0 ? allIndex : parts.length;
  const nextParts = [...parts.slice(0, insertAt), 'include:amazonses.com', ...parts.slice(insertAt)];

  return nextParts.join(' ');
}

function maskEmail(email) {
  const [local, domain] = String(email || '').split('@');
  if (!local || !domain) return '***@***';
  if (local.length <= 2) return `***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

async function main() {
  const region = requireEnv('AWS_REGION');
  const cloudflareApiToken = requireEnv('CLOUDFLARE_API_TOKEN');
  const cloudflareZoneId = requireEnv('CLOUDFLARE_ZONE_ID');
  const cloudflareAccountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
  const forwardToEmail = requireEnv('FORWARD_TO_EMAIL');
  const noReplyRouteMode = (process.env.NO_REPLY_ROUTE_MODE || 'forward').trim().toLowerCase();

  if (noReplyRouteMode !== 'forward' && noReplyRouteMode !== 'drop') {
    fail('NO_REPLY_ROUTE_MODE deve ser forward ou drop');
  }

  if (region !== 'us-east-2') {
    logWarn(`AWS_REGION diferente de us-east-2 (${region}). Prosseguindo com o valor informado.`);
  }

  const report = {
    timestamp: new Date().toISOString(),
    domain: DOMAIN,
    awsRegion: region,
    dryRun,
    officialAddresses: OFFICIAL_ADDRESSES,
    ses: {
      identityExisted: false,
      identityStatus: 'unknown',
      dkimConfigured: false,
      dkimRecords: [],
    },
    cloudflare: {
      zoneId: cloudflareZoneId,
      dkim: { created: [], existing: [], pendingManual: [] },
      spf: { action: 'none', value: null, note: null },
      dmarc: { action: 'none', value: DMARC_VALUE },
      emailRouting: { attempted: false, configured: false, details: [], pendingManual: [] },
    },
    pending: [],
  };

  logStep('Validando binarios necessarios');
  const awsAvailable = spawnSync('aws', ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (awsAvailable.status !== 0) {
    fail('AWS CLI nao encontrado. Instale e configure credenciais (IAM Role ou profile).');
  }

  logStep('Consultando identidade SES do dominio');
  let emailIdentity;
  try {
    emailIdentity = runAwsJson([
      'sesv2',
      'get-email-identity',
      '--email-identity',
      DOMAIN,
      '--region',
      region,
      '--output',
      'json',
    ]);
    report.ses.identityExisted = true;
    logInfo('Identidade SES ja existente.');
  } catch (error) {
    const details = String(error.details || '');
    if (!details.includes('NotFoundException')) {
      throw error;
    }

    report.ses.identityExisted = false;
    if (dryRun) {
      logInfo('Modo dry-run: identidade SES seria criada.');
    } else {
      logInfo('Criando identidade SES do dominio.');
      runAwsJson([
        'sesv2',
        'create-email-identity',
        '--email-identity',
        DOMAIN,
        '--region',
        region,
        '--output',
        'json',
      ]);
    }

    emailIdentity = runAwsJson([
      'sesv2',
      'get-email-identity',
      '--email-identity',
      DOMAIN,
      '--region',
      region,
      '--output',
      'json',
    ]);
  }

  report.ses.identityStatus = emailIdentity.VerifiedForSendingStatus ? 'verified' : 'pending_dns';

  const dkimTokens = emailIdentity?.DkimAttributes?.Tokens || [];
  report.ses.dkimConfigured = dkimTokens.length > 0;
  report.ses.dkimRecords = dkimTokens.map((token) => ({
    name: `${token}._domainkey.${DOMAIN}`,
    type: 'CNAME',
    content: `${token}.dkim.amazonses.com`,
  }));

  logStep('Consultando registros DNS atuais na Cloudflare');
  const existingTxtRoot = await cfRequest({
    token: cloudflareApiToken,
    endpoint: `/zones/${cloudflareZoneId}/dns_records?type=TXT&name=${encodeURIComponent(DOMAIN)}&per_page=100`,
  });
  const existingDmarc = await cfRequest({
    token: cloudflareApiToken,
    endpoint: `/zones/${cloudflareZoneId}/dns_records?type=TXT&name=${encodeURIComponent(`_dmarc.${DOMAIN}`)}&per_page=100`,
  });

  for (const desired of report.ses.dkimRecords) {
    const existingByName = await cfRequest({
      token: cloudflareApiToken,
      endpoint: `/zones/${cloudflareZoneId}/dns_records?type=CNAME&name=${encodeURIComponent(desired.name)}&per_page=100`,
    });

    const foundExact = existingByName.find(
      (record) => record.type === 'CNAME' && String(record.content || '').toLowerCase() === desired.content.toLowerCase(),
    );

    if (foundExact) {
      report.cloudflare.dkim.existing.push(desired.name);
      continue;
    }

    if (existingByName.length > 0) {
      report.cloudflare.dkim.pendingManual.push({
        name: desired.name,
        reason: 'Ja existe CNAME com conteudo diferente. Revisao manual necessaria.',
      });
      report.pending.push(`DKIM pendente: revisar CNAME existente em ${desired.name}`);
      continue;
    }

    if (dryRun) {
      report.cloudflare.dkim.created.push(`${desired.name} (dry-run)`);
      continue;
    }

    await cfRequest({
      method: 'POST',
      token: cloudflareApiToken,
      endpoint: `/zones/${cloudflareZoneId}/dns_records`,
      body: {
        type: 'CNAME',
        name: desired.name,
        content: desired.content,
        proxied: false,
        ttl: 1,
      },
    });

    report.cloudflare.dkim.created.push(desired.name);
  }

  logStep('Validando SPF sem duplicar entradas');
  const spfTxtRecords = existingTxtRoot.filter((record) => normalizeTxt(record.content).toLowerCase().startsWith('v=spf1'));

  if (spfTxtRecords.length === 0) {
    if (dryRun) {
      report.cloudflare.spf.action = 'create_dry_run';
      report.cloudflare.spf.value = DEFAULT_SPF;
    } else {
      await cfRequest({
        method: 'POST',
        token: cloudflareApiToken,
        endpoint: `/zones/${cloudflareZoneId}/dns_records`,
        body: {
          type: 'TXT',
          name: DOMAIN,
          content: DEFAULT_SPF,
          ttl: 1,
        },
      });
      report.cloudflare.spf.action = 'created';
      report.cloudflare.spf.value = DEFAULT_SPF;
    }
  } else if (spfTxtRecords.length === 1) {
    const current = normalizeTxt(spfTxtRecords[0].content);
    const merged = mergeSpfValue(current);

    if (!merged) {
      report.cloudflare.spf.action = 'manual_required';
      report.cloudflare.spf.note = 'Registro SPF existente invalido para merge automatico.';
      report.pending.push('SPF pendente: registro atual invalido para merge automatico.');
    } else if (merged === current) {
      report.cloudflare.spf.action = 'already_ok';
      report.cloudflare.spf.value = current;
    } else if (dryRun) {
      report.cloudflare.spf.action = 'update_dry_run';
      report.cloudflare.spf.value = merged;
    } else {
      await cfRequest({
        method: 'PUT',
        token: cloudflareApiToken,
        endpoint: `/zones/${cloudflareZoneId}/dns_records/${spfTxtRecords[0].id}`,
        body: {
          type: 'TXT',
          name: spfTxtRecords[0].name,
          content: merged,
          ttl: spfTxtRecords[0].ttl || 1,
        },
      });
      report.cloudflare.spf.action = 'updated';
      report.cloudflare.spf.value = merged;
    }
  } else {
    report.cloudflare.spf.action = 'manual_required';
    report.cloudflare.spf.note = 'Mais de um registro SPF encontrado. Nao foi feita alteracao automatica.';
    report.pending.push('SPF pendente: existem multiplos registros SPF no dominio raiz.');
  }

  logStep('Validando DMARC em modo monitoramento');
  const dmarcExact = existingDmarc.find((record) => normalizeTxt(record.content) === DMARC_VALUE);

  if (dmarcExact) {
    report.cloudflare.dmarc.action = 'already_ok';
  } else if (existingDmarc.length > 0) {
    report.cloudflare.dmarc.action = 'manual_required';
    report.pending.push('DMARC pendente: ja existe registro com valor diferente em _dmarc.');
  } else if (dryRun) {
    report.cloudflare.dmarc.action = 'create_dry_run';
  } else {
    await cfRequest({
      method: 'POST',
      token: cloudflareApiToken,
      endpoint: `/zones/${cloudflareZoneId}/dns_records`,
      body: {
        type: 'TXT',
        name: `_dmarc.${DOMAIN}`,
        content: DMARC_VALUE,
        ttl: 1,
      },
    });
    report.cloudflare.dmarc.action = 'created';
  }

  logStep('Tentando configurar Cloudflare Email Routing');
  report.cloudflare.emailRouting.attempted = true;

  try {
    if (!dryRun) {
      await cfRequest({
        method: 'POST',
        token: cloudflareApiToken,
        endpoint: `/zones/${cloudflareZoneId}/email/routing/enable`,
      });
    }

    report.cloudflare.emailRouting.details.push('Email Routing habilitado (ou ja ativo).');

    const destinationPayload = { email: forwardToEmail };
    if (!dryRun) {
      await cfRequest({
        method: 'POST',
        token: cloudflareApiToken,
        endpoint: `/accounts/${cloudflareAccountId}/email/routing/addresses`,
        body: destinationPayload,
      });
      report.cloudflare.emailRouting.details.push(`Destino de encaminhamento registrado para ${maskEmail(forwardToEmail)}.`);
    } else {
      report.cloudflare.emailRouting.details.push(`Destino de encaminhamento seria registrado para ${maskEmail(forwardToEmail)}.`);
    }

    const rulesByAddress = [
      { local: 'contato', action: 'forward' },
      { local: 'suporte', action: 'forward' },
      { local: 'financeiro', action: 'forward' },
      { local: 'no-reply', action: noReplyRouteMode },
    ];

    const existingRules = dryRun
      ? []
      : await cfRequest({
          token: cloudflareApiToken,
          endpoint: `/zones/${cloudflareZoneId}/email/routing/rules`,
        });

    for (const item of rulesByAddress) {
      const address = `${item.local}@${DOMAIN}`;
      const expectedName = `kaviar-${item.local}-${item.action}`;
      const alreadyExists = existingRules.find((rule) => rule.name === expectedName);

      if (alreadyExists) {
        report.cloudflare.emailRouting.details.push(`Regra existente: ${expectedName}`);
        continue;
      }

      const actions = item.action === 'drop'
        ? [{ type: 'drop' }]
        : [{ type: 'forward', value: [forwardToEmail] }];

      const payload = {
        name: expectedName,
        enabled: true,
        priority: 0,
        matcher: {
          type: 'literal',
          field: 'to',
          value: address,
        },
        actions,
      };

      if (!dryRun) {
        await cfRequest({
          method: 'POST',
          token: cloudflareApiToken,
          endpoint: `/zones/${cloudflareZoneId}/email/routing/rules`,
          body: payload,
        });
        report.cloudflare.emailRouting.details.push(`Regra criada: ${expectedName}`);
      } else {
        report.cloudflare.emailRouting.details.push(`Regra seria criada: ${expectedName}`);
      }
    }

    report.cloudflare.emailRouting.configured = true;
  } catch (error) {
    report.cloudflare.emailRouting.configured = false;
    report.cloudflare.emailRouting.pendingManual.push(
      'Automacao de Email Routing nao concluida (permissao/API indisponivel).',
      'Configurar manualmente inbox destination e regras para contato, suporte, financeiro e no-reply.',
    );
    report.pending.push('Email Routing pendente: verificar permissao Cloudflare (Email Routing Write).');

    logWarn('Nao foi possivel configurar Email Routing automaticamente. O relatorio inclui passos manuais.');
    if (error?.details) {
      logWarn(`Detalhe tecnico resumido: ${JSON.stringify(error.details).slice(0, 280)}`);
    }
  }

  const outputDir = path.join(process.cwd(), 'artifacts');
  const outputPath = path.join(outputDir, 'email-ses-cloudflare-report.json');
  if (!existsSync(outputDir)) {
    await fs.mkdir(outputDir, { recursive: true });
  }
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  logStep('Resumo final');
  logInfo(`Identidade SES: ${report.ses.identityStatus}`);
  logInfo(`DKIM: criados=${report.cloudflare.dkim.created.length} existentes=${report.cloudflare.dkim.existing.length} pendentes=${report.cloudflare.dkim.pendingManual.length}`);
  logInfo(`SPF: ${report.cloudflare.spf.action}`);
  logInfo(`DMARC: ${report.cloudflare.dmarc.action}`);
  logInfo(`Email Routing: ${report.cloudflare.emailRouting.configured ? 'configurado' : 'pendente'}`);
  logInfo(`Relatorio completo salvo em artifacts/email-ses-cloudflare-report.json`);
}

main().catch((error) => {
  console.error(`\n[setup-kaviar-email] Falha: ${error.message}`);
  if (error.details) {
    console.error(`[setup-kaviar-email] Detalhe tecnico: ${JSON.stringify(error.details).slice(0, 300)}`);
  }
  process.exit(1);
});
