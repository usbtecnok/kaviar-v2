import { describe, expect, it } from 'vitest';
import { evaluateInboundEmailSecurityRisk } from '../src/services/email/inbound-email-security-risk';

describe('evaluateInboundEmailSecurityRisk', () => {
  it('classifica HIGH quando menciona anexo sem anexo, com link externo e reply-to diferente', () => {
    const risk = evaluateInboundEmailSecurityRisk({
      from_email: 'candidato@example.com',
      subject: 'Curriculo - Joana',
      text_body: 'Segue em anexo meu curriculo',
      html_body: '<p>Veja: <a href="https://host.externo.test/path">Visualizar</a></p>',
      attachment_count: 0,
      raw_headers: { 'reply-to': 'outro@example.com' },
    });

    expect(risk.level).toBe('HIGH');
    expect(risk.suspicious).toBe(true);
    expect(risk.reasons).toEqual(expect.arrayContaining([
      'MENTIONS_ATTACHMENT_WITHOUT_ATTACHMENT',
      'EXTERNAL_LINK_PRESENT',
      'REPLY_TO_DIFFERS_FROM_FROM',
    ]));
  });

  it('classifica LOW para email normal sem link e sem sinais adicionais', () => {
    const risk = evaluateInboundEmailSecurityRisk({
      from_email: 'cliente@example.com',
      subject: 'Dúvida sobre cadastro',
      text_body: 'Bom dia, podem me ajudar?',
      attachment_count: 0,
      raw_headers: { 'reply-to': 'cliente@example.com' },
    });

    expect(risk.level).toBe('LOW');
    expect(risk.suspicious).toBe(false);
    expect(risk.reasons).toEqual([]);
  });

  it('nao gera motivo de anexo ausente quando existe attachment real', () => {
    const risk = evaluateInboundEmailSecurityRisk({
      from_email: 'candidato@example.com',
      subject: 'Segue anexo',
      text_body: 'Segue anexo meu documento',
      attachment_count: 1,
      raw_headers: { 'reply-to': 'candidato@example.com' },
    });

    expect(risk.reasons).not.toContain('MENTIONS_ATTACHMENT_WITHOUT_ATTACHMENT');
  });

  it('link isolado nao classifica automaticamente como HIGH', () => {
    const risk = evaluateInboundEmailSecurityRisk({
      from_email: 'cliente@example.com',
      subject: 'Acompanhamento',
      html_body: '<a href="https://example.com/status">Status</a>',
      attachment_count: 0,
      raw_headers: { 'reply-to': 'cliente@example.com' },
    });

    expect(risk.reasons).toContain('EXTERNAL_LINK_PRESENT');
    expect(risk.level).not.toBe('HIGH');
  });

  it('dominio .cfd isoladamente nao classifica automaticamente como HIGH', () => {
    const risk = evaluateInboundEmailSecurityRisk({
      from_email: 'pessoa@dominio.cfd',
      subject: 'Contato inicial',
      text_body: 'Ola, tudo bem?',
      attachment_count: 0,
      raw_headers: { 'reply-to': 'pessoa@dominio.cfd' },
    });

    expect(risk.level).toBe('LOW');
    expect(risk.reasons).toEqual([]);
  });

  it('link oficial da KAVIAR isolado nao gera motivo EXTERNAL_LINK_PRESENT', () => {
    const risk = evaluateInboundEmailSecurityRisk({
      from_email: 'cliente@example.com',
      subject: 'Contato institucional',
      html_body: '<a href="https://kaviar.com.br">Site oficial</a>',
      attachment_count: 0,
      raw_headers: { 'reply-to': 'cliente@example.com' },
    });

    expect(risk.reasons).not.toContain('EXTERNAL_LINK_PRESENT');
  });

  it('link externo gera motivo EXTERNAL_LINK_PRESENT', () => {
    const risk = evaluateInboundEmailSecurityRisk({
      from_email: 'cliente@example.com',
      subject: 'Contato externo',
      html_body: '<a href="https://dominio-externo.example/path">Abrir</a>',
      attachment_count: 0,
      raw_headers: { 'reply-to': 'cliente@example.com' },
    });

    expect(risk.reasons).toContain('EXTERNAL_LINK_PRESENT');
  });
});
