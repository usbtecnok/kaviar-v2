# RIPD PRELIMINAR — Preferência por Motorista Mulher

**Relatório de Impacto à Proteção de Dados Pessoais (Preliminar)**
**Versão 1.0 — Junho 2026**
**Status: PRELIMINAR — Requer validação jurídica antes de ativação**

*Controlador: KAVIAR TECNOLOGIA E SERVICOS DIGITAIS LTDA*
*CNPJ 67.783.601/0001-99*

---

## 1. Controlador

| Campo | Valor |
|---|---|
| Razão social | KAVIAR TECNOLOGIA E SERVICOS DIGITAIS LTDA |
| CNPJ | 67.783.601/0001-99 |
| Produto | KAVIAR |
| Responsável | Administração KAVIAR |

## 2. Finalidade do tratamento

Permitir que passageiras expressem preferência por motoristas mulheres, e que motoristas mulheres optem por participar, visando conforto, confiança e segurança percebida no atendimento.

## 3. Titulares envolvidos

| Titular | Dados tratados |
|---|---|
| Passageira | Flag de participação (`women_matching_opt_in`), preferência padrão |
| Motorista | Flag de participação (`women_matching_opt_in`) |

## 4. Dados utilizados

| Dado | Tipo | Sensibilidade | Justificativa |
|---|---|---|---|
| `women_matching_opt_in` (passageira) | Boolean | Permite inferência de gênero | Necessário para funcionalidade |
| `prefer_woman_driver_default` (passageira) | Boolean | Operacional | Preferência de atendimento |
| `women_matching_opt_in` (motorista) | Boolean | Permite inferência de gênero | Necessário para elegibilidade |
| `prefer_woman_driver` (corrida) | Boolean | Operacional | Registro per-ride |

**Nota:** Os campos são flags booleanas de participação voluntária. Não armazenam "gênero" como dado textual, mas permitem inferência.

## 5. Fluxo do dado

```
1. Pessoa opta por participar (autodeclaração no app)
2. Flag salva no banco (boolean)
3. Ao criar corrida: flag copiada para a ride se passageira opt-in
4. Dispatch: filtra candidatos por flag da motorista
5. Se match: oferta normal (sem exposição da preferência)
6. Se sem match: pergunta à passageira (continuar/ampliar/cancelar)
7. Auditoria: alterações de opt-in registradas
```

## 6. Acessos

| Função | Acesso | Justificativa |
|---|---|---|
| App da própria pessoa | Leitura/escrita do próprio status | Autodeclaração e revogação |
| SUPER_ADMIN | Leitura de todos, escrita em caso de fraude | Gestão e segurança |
| Dispatch (sistema) | Leitura da flag para filtro | Funcionalidade operacional |
| Outros usuários | ❌ Nenhum | Privacidade |
| Suporte | Leitura mediante solicitação do titular | Atendimento |

## 7. Riscos identificados

### 7.1. Risco de fraude
| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Pessoa declara falsamente para obter preferência | Médio | Baixo | Revisão administrativa em caso de denúncia; não há benefício financeiro |
| API manipulada para forçar preferência | Baixo | Baixo | Backend ignora payload de não-participantes |

### 7.2. Risco de discriminação
| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Motorista homem alega exclusão | Médio | Médio | Funcionalidade é preferência, não exclusão. Motorista continua recebendo corridas. |
| Passageiro homem alega desigualdade | Baixo | Baixo | Funcionalidade baseada em segurança percebida; referências de mercado (Uber, 99) |

### 7.3. Risco de exposição
| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Flag exposta a terceiros | Baixo | Alto | Acesso restrito; não aparece na oferta nem no perfil público |
| Inferência por padrão de corridas | Muito baixo | Médio | Motorista recebe corridas normais também |

### 7.4. Risco de classificação incorreta
| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Autodeclaração incorreta (acidental) | Baixo | Baixo | Possibilidade de correção imediata |
| Classificação por admin sem autodeclaração | ❌ Vedado | ❌ | Proibição documentada; somente autodeclaração |

### 7.5. Risco de corrida presa
| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Nenhuma motorista disponível + passageira não responde | Médio | Alto | Timeout de 60s → cancelamento automático |
| Ampliação sem consentimento | ❌ Vedado | ❌ | Só amplia com autorização explícita |

## 8. Medidas de mitigação consolidadas

- Autodeclaração voluntária (sem inferência)
- Revogação instantânea
- Não exposição a terceiros
- Feature flag para desligamento emergencial
- Timeout para prevenir corrida presa
- Auditoria de alterações
- Acesso restrito por role
- Proibição de classificação visual
- Revisão administrativa apenas em caso de fraude/denúncia

## 9. Retenção

- Campos mantidos enquanto necessários para a funcionalidade e conta ativa
- Remoção/revisão imediata após revogação pela pessoa
- Remoção completa no encerramento da conta (respeitando prazos legais)
- Auditoria com prazo mínimo necessário

## 10. Desligamento emergencial

```
WOMEN_DRIVER_PREFERENCE_ENABLED=false (env var ECS)
→ Nova task/deployment (~2 min)
→ Dispatch ignora preferência
→ Corridas em andamento não afetadas
→ Campos existem mas ficam inertes
```

## 11. Necessidade de revisão jurídica

**Este RIPD é PRELIMINAR.** Antes da ativação:

- [ ] Confirmação da base legal por especialista LGPD
- [ ] Revisão do texto de transparência
- [ ] Validação do modelo de consentimento
- [ ] Aprovação do fluxo de revogação
- [ ] Análise de proporcionalidade e necessidade
- [ ] Verificação de conformidade com antidiscriminação

---

*KAVIAR TECNOLOGIA E SERVICOS DIGITAIS LTDA — CNPJ 67.783.601/0001-99*
