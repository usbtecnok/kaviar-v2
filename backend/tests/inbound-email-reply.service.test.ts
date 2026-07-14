import { describe, expect, it } from 'vitest';
import {
  buildInboundReplyPreview,
  buildReplyReferences,
  buildReplySubject,
} from '../src/services/email/inbound-email-reply.service';

describe('inbound email reply service', () => {
  it('adiciona prefixo Re uma unica vez e preserva assunto ja respondido', () => {
    expect(buildReplySubject('Pendencia documental')).toBe('Re: Pendencia documental');
    expect(buildReplySubject('RE: Pendencia documental')).toBe('RE: Pendencia documental');
    expect(buildReplySubject(' re: retorno ')).toBe('re: retorno');
  });

  it('gera assunto fallback para emails sem assunto', () => {
    expect(buildReplySubject('')).toBe('Re: (sem assunto)');
    expect(buildReplySubject(null)).toBe('Re: (sem assunto)');
  });

  it('deduplica references preservando a ordem e adicionando o message id atual', () => {
    expect(buildReplyReferences('<a@test> <b@test> <a@test>', '<c@test>')).toEqual([
      '<a@test>',
      '<b@test>',
      '<c@test>',
    ]);
  });

  it('permite reply para aliases oficiais suportados', () => {
    const preview = buildInboundReplyPreview({
      from_email: 'cidadao@example.com',
      to_email: 'suporte@kaviar.com.br',
      subject: 'Duvvida',
      message_id: '<orig@test>',
      references_header: '<prev@test>',
    });

    expect(preview.allowed).toBe(true);
    expect(preview.to).toBe('cidadao@example.com');
    expect(preview.from).toBe('KAVIAR Suporte <suporte@kaviar.com.br>');
    expect(preview.subject).toBe('Re: Duvvida');
    expect(preview.inReplyTo).toBe('<orig@test>');
    expect(preview.references).toEqual(['<prev@test>', '<orig@test>']);
  });

  it('bloqueia aliases no-reply e aliases nao autorizados', () => {
    const noReplyPreview = buildInboundReplyPreview({
      from_email: 'cidadao@example.com',
      to_email: 'no-reply@kaviar.com.br',
      subject: 'Teste',
      message_id: '<orig@test>',
      references_header: null,
    });
    const unauthorizedPreview = buildInboundReplyPreview({
      from_email: 'cidadao@example.com',
      to_email: 'juridico@kaviar.com.br',
      subject: 'Teste',
      message_id: '<orig@test>',
      references_header: null,
    });

    expect(noReplyPreview.allowed).toBe(false);
    expect(noReplyPreview.blockedReason).toContain('no-reply');
    expect(unauthorizedPreview.allowed).toBe(false);
    expect(unauthorizedPreview.blockedReason).toContain('nao autorizado');
  });

  it('bloqueia reply quando o email original nao possui message id', () => {
    const preview = buildInboundReplyPreview({
      from_email: 'cidadao@example.com',
      to_email: 'contato@kaviar.com.br',
      subject: 'Sem thread',
      message_id: null,
      references_header: null,
    });

    expect(preview.allowed).toBe(false);
    expect(preview.inReplyTo).toBe(null);
    expect(preview.blockedReason).toContain('Message-ID');
  });
});
