# Conformidade Jurídica e Operacional — KAVIAR

**Versão:** v1.0
**Data:** Maio/2026
**Status:** Documento de referência interna

---

## 1. Objetivo

Este documento consolida o estado atual de conformidade jurídica e operacional da plataforma KAVIAR, identificando documentos existentes, pendências e recomendações para redução de risco.

---

## 2. Empresa Responsável

**USB Tecnok Manutenção e Instalação de Computadores Ltda**
CNPJ: 07.710.691/0001-66
Plataforma: KAVIAR — Mobilidade urbana comunitária local

---

## 3. Documentos de Conformidade — Status

| Documento | Arquivo | Versão | Status |
|-----------|---------|--------|--------|
| Termos de Uso — Passageiro | `termos-uso-passageiro-kaviar-v1.md` | v1.0 | Minuta pronta |
| Termos de Uso — Motorista | `termos-uso-motorista-kaviar-v1.md` | v1.0 | Minuta pronta |
| Política de Privacidade | `politica-privacidade-kaviar-v1.md` | v1.0 | Minuta pronta |
| Regras de Cancelamento | `regras-cancelamento-kaviar-v1.md` | v1.0 | Minuta pronta |
| Regras de Pagamento/Créditos | `regras-pagamento-creditos-kaviar-v1.md` | v1.0 | Minuta pronta |
| Aviso de Intermediação | `aviso-plataforma-intermediacao-kaviar.md` | v1.0 | Minuta pronta |
| Termo do Operador Territorial | `termo-operador-territorial-kaviar-v1.md` | v1.0 | Minuta pronta |
| Conformidade (este documento) | `conformidade-juridica-operacional-kaviar.md` | v1.0 | Ativo |

---

## 4. Implementação no Sistema

| Item | Status | Observação |
|------|--------|------------|
| Aceite de termos — Motorista | ✅ Implementado | `driver_consents.terms_accepted_at` |
| Aceite LGPD — Passageiro | ✅ Implementado | `user_consents`, `LGPDConsent.jsx` |
| Aceite de termos — Operador Territorial | ✅ Implementado | `operator_profiles.terms_accepted_at` + checklist |
| Aceite de termos — Consultor/Agente | ✅ Implementado | `referral_agents.terms_accepted_at` |
| Página pública /privacidade | ✅ Existe | Precisa atualização de conteúdo |
| Tela admin de gestão de documentos | ❌ Não existe | Fase 2 |
| Versionamento de termos no banco | ⚠️ Parcial | `terms_version` existe em operator_profiles e drivers |
| Texto completo LGPD no app passageiro | ⚠️ Placeholder | Precisa conteúdo real |

---

## 5. Riscos Identificados

| Risco | Severidade | Mitigação |
|-------|-----------|-----------|
| Questionamento de prefeitura sobre natureza do serviço | Alta | Aviso de intermediação + documentação clara |
| Alegação de vínculo empregatício por motorista | Alta | Termos claros + ausência de subordinação |
| Reclamação LGPD por titular de dados | Média | Política de privacidade + canais de exercício de direitos |
| Parceiro territorial alegando direitos não previstos | Média | Termo do operador territorial + contrato |
| Passageiro alegando responsabilidade do KAVIAR por acidente | Média | Termos de uso + limitação de responsabilidade |
| Órgão público exigindo documentação de conformidade | Alta | Este pacote documental |

---

## 6. Recomendações

### Imediatas (sem custo)
1. ✅ Manter documentos atualizados em `docs/`.
2. Publicar política de privacidade atualizada em `/privacidade`.
3. Preencher texto real no `LGPDConsent.jsx` do passageiro.

### Curto prazo (baixo custo)
4. Criar tela `/admin/compliance` para visualização dos documentos vigentes.
5. Atualizar página pública com termos de uso acessíveis.
6. Implementar aceite versionado para passageiros (re-aceite quando versão mudar).

### Médio prazo (investimento moderado)
7. Revisão jurídica formal de todos os documentos por advogado.
8. Registro em cartório ou plataforma de assinatura digital para contratos de operadores PJ.
9. Consultoria sobre regulamentação municipal de plataformas de mobilidade.
10. Implementar DPO (Encarregado de Dados) conforme LGPD, se aplicável.

---

## 7. Posicionamento Institucional

Em caso de questionamento por autoridade pública, associação ou parceiro, a posição oficial é:

> "O KAVIAR é uma plataforma tecnológica de intermediação de mobilidade urbana local, operada pela USB Tecnok Manutenção e Instalação de Computadores Ltda. Não constitui serviço de transporte coletivo, concessão pública, cooperativa ou empresa de transporte. Motoristas são parceiros independentes sem vínculo empregatício. A plataforma opera conforme legislação aplicável a plataformas digitais de intermediação."

---

## 8. Histórico de Versões

| Versão | Data | Alteração |
|--------|------|-----------|
| v1.0 | Maio/2026 | Criação inicial do pacote de conformidade |

---

## 9. Aviso Legal

Este documento é de uso interno da USB Tecnok. Não constitui parecer jurídico. Para questões regulatórias, tributárias ou trabalhistas, consulte profissional habilitado.

---

*USB Tecnok / KAVIAR — Versão v1.0 — Maio/2026*
