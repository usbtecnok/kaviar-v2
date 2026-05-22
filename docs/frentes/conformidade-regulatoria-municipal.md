# Frente: Conformidade Regulatória Municipal / Prefeitura

**Versão:** v1.0
**Data:** Maio/2026
**Status:** Planejamento

---

## 1. Objetivo

Preparar o KAVIAR para abordagem institucional com prefeituras, secretarias municipais, associações de moradores e órgãos públicos, garantindo posicionamento claro como plataforma tecnológica de intermediação de mobilidade local.

---

## 2. Diagnóstico — O que já existe

| Item | Status |
|------|--------|
| Aviso de Plataforma de Intermediação | ✅ Criado |
| Termos de Uso (passageiro e motorista) | ✅ Criados |
| Política de Privacidade | ✅ Criada |
| Termo do Operador Territorial | ✅ Criado |
| Contrato do Parceiro Territorial | ✅ Implementado no admin |
| Tela `/admin/legal-compliance` | ✅ Publicada |
| Página pública `/associacoes` | ✅ Publicada |
| Apresentação Institucional | ✅ Criada |
| Campo de status regulatório no território | ❌ Não existe |
| Registro de contatos institucionais | ❌ Não existe |
| Texto real no LGPDConsent.jsx | ❌ Placeholder |

---

## 3. Riscos Regulatórios

| Risco | Severidade | Mitigação |
|-------|-----------|-----------|
| Confusão com transporte público coletivo | Alta | Aviso de intermediação + linguagem clara |
| Alegação de concessão municipal | Alta | Documentação institucional + posicionamento |
| Questionamento sobre vínculo empregatício | Alta | Termos claros + ausência de subordinação |
| Exigência de autorização municipal | Média | Diálogo proativo + documentação |
| Confusão com táxi | Média | Diferenciação clara no material |
| Confusão com cooperativa | Baixa | Termos individuais com motoristas |

---

## 4. Linguagem Segura

### Usar sempre:
- "Plataforma de intermediação de mobilidade local"
- "Transporte privado individual intermediado por plataforma"
- "Motoristas parceiros independentes"
- "Serviço privado de intermediação tecnológica"
- "Operação territorial da plataforma"

### Nunca usar:
- "Transporte público"
- "Concessão"
- "Cooperativa"
- "Empregador"
- "Serviço público"
- "Linha" ou "itinerário"
- "Frota"

---

## 5. Documentos Necessários

| Documento | Status | Finalidade |
|-----------|--------|-----------|
| Apresentação Institucional | ✅ | Apresentar KAVIAR a prefeitura/associação |
| Aviso de Intermediação | ✅ | Posicionamento jurídico preventivo |
| Termos de Uso | ✅ | Base contratual com usuários |
| Política de Privacidade | ✅ | Conformidade LGPD |
| Termo do Operador | ✅ | Relação com operadores territoriais |
| Contrato do Parceiro | ✅ | Relação com associações/parceiros |
| Conformidade Geral | ✅ | Consolidação de status |

---

## 6. Plano em Fases

### Fase 1 — Documentos (atual)
- [x] Criar apresentação institucional
- [x] Criar plano desta frente
- [ ] Atualizar lista em `/admin/legal-compliance`

### Fase 2 — Campos regulatórios (futuro)
- [ ] Adicionar `regulatory_status` em `operational_territories`
- [ ] Adicionar `regulatory_notes` em `operational_territories`
- [ ] Exibir no detalhe do território no admin

### Fase 3 — Contatos institucionais (futuro)
- [ ] Tabela ou campo para registrar contatos de prefeitura/secretaria por território
- [ ] Histórico de interações institucionais

### Fase 4 — Páginas públicas (futuro)
- [ ] Atualizar `/privacidade` com conteúdo completo
- [ ] Preencher texto real no `LGPDConsent.jsx`
- [ ] Considerar página pública de termos de uso

---

## 7. Checklist antes de abordar prefeitura ou associação

- [x] Apresentação institucional pronta
- [x] Aviso de intermediação pronto
- [x] Termos de uso prontos
- [x] Política de privacidade pronta
- [x] Contrato de operador/parceiro implementado
- [x] Tela de conformidade no admin
- [ ] Revisão jurídica formal (recomendado)
- [ ] CNPJ e documentação da USB Tecnok em dia
- [ ] Contato institucional definido (quem fala pela empresa)
- [ ] Material impresso ou PDF para entrega (opcional)

---

## 8. Itens Futuros

| Item | Quando | Dependência |
|------|--------|-------------|
| Status regulatório no território | Fase 2 | Migration |
| Notas regulatórias | Fase 2 | Migration |
| Contatos institucionais | Fase 3 | Migration + frontend |
| Texto LGPD no app | Fase 4 | Build app (cuidado) |
| Página pública atualizada | Fase 4 | Frontend estático |

---

## 9. Aviso

Este documento é um plano operacional interno. Não constitui parecer jurídico. Para questões regulatórias específicas por município, consulte advogado especializado.

---

*USB Tecnok / KAVIAR — Conformidade Regulatória Municipal — v1.0 — Maio/2026*
