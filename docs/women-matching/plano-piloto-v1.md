# PLANO DE PILOTO — Preferência por Motorista Mulher

**Versão 1.0 — Junho 2026**
**Status: PROPOSTA — Não ativado**

*KAVIAR — Produto da KAVIAR TECNOLOGIA E SERVICOS DIGITAIS LTDA*
*CNPJ 67.783.601/0001-99*

---

## 1. Objetivo do piloto

Validar a funcionalidade "Preferência por Motorista Mulher" em ambiente controlado, com território limitado, antes de expansão.

## 2. Território do piloto

- **1 território apenas** (a definir com base em disponibilidade de motoristas mulheres)
- Critério: território com pelo menos 3 motoristas mulheres ativas e aprovadas

## 3. Pré-requisitos de entrada

| Requisito | Status necessário |
|---|---|
| Feature flag `WOMEN_DRIVER_PREFERENCE_ENABLED` | OFF (antes); ON apenas para território piloto |
| Migration aplicada | Campos existem no banco |
| Análise jurídica/LGPD | Concluída e aprovada |
| Texto de transparência | Publicado no app |
| Modelo de consentimento | Funcional no app |
| Fluxo de revogação | Testado e funcional |
| Motoristas mulheres participantes | Mínimo 3 no território |
| Passageiras informadas | Comunicação prévia sobre o programa |
| Suporte operacional | Disponível durante o piloto |
| Timeout/fallback | Testado em staging |

## 4. Métricas de monitoramento

| Métrica | Frequência | Alerta |
|---|---|---|
| Tempo médio de espera (com preferência vs sem) | Diário | Se > 3x o tempo normal |
| Taxa de match com motorista mulher | Diário | Se < 20% das tentativas |
| Taxa de fallback autorizado | Diário | Informativo |
| Taxa de cancelamento por timeout | Diário | Se > 30% |
| Reclamações relacionadas | Contínuo | Qualquer reclamação |
| Incidentes de fraude/abuso | Contínuo | Qualquer ocorrência |
| Satisfação da passageira (NPS/feedback) | Semanal | Se negativo |
| Satisfação da motorista participante | Semanal | Se negativo |

## 5. Critérios de sucesso (para expansão)

- Tempo de espera adicional < 2 minutos em média
- Taxa de match com motorista mulher > 40% (quando disponível)
- Zero incidentes de segurança
- Zero fraudes comprovadas
- Feedback positivo de passageiras e motoristas participantes
- Nenhum bloqueio jurídico identificado

## 6. Critérios de suspensão imediata

| Critério | Ação |
|---|---|
| Tempo de espera > 5x normal | Desligar feature flag |
| Incidente de segurança | Desligar + investigar |
| Fraude comprovada | Desligar + rever modelo |
| Reclamação formal antidiscriminação | Desligar + consulta jurídica |
| Corrida presa > 3 minutos sem resposta | Ajustar timeout |
| Bug no dispatch | Desligar + hotfix |

## 7. Duração do piloto

- **Mínimo:** 2 semanas
- **Máximo:** 4 semanas (antes de decisão de expansão)
- **Revisão:** semanal com métricas

## 8. Participantes do piloto

### Passageiras
- Recrutadas voluntariamente no território
- Comunicação clara sobre ser piloto
- Aceite do termo de participação
- Podem desistir a qualquer momento

### Motoristas
- Autodeclaração voluntária
- Mínimo 3 participantes no território
- Comunicação clara sobre o programa
- Podem desistir a qualquer momento

## 9. Suporte operacional

- Canal de atendimento dedicado durante o piloto
- SUPER_ADMIN monitora métricas diariamente
- Possibilidade de desligamento em < 5 minutos (env var)
- Log detalhado de todos os eventos de preferência

## 10. Fluxo do piloto

```
ANTES:
1. Análise jurídica aprovada
2. Migration aplicada (campos + flag OFF)
3. UI de adesão pronta no app
4. Motoristas do território piloto convidadas
5. Passageiras do território informadas
6. Flag ligada APENAS para o território

DURANTE:
7. Monitoramento diário
8. Suporte operacional ativo
9. Coleta de métricas
10. Ajustes de timeout/janela se necessário

APÓS:
11. Relatório de resultados
12. Decisão: expandir, ajustar ou descontinuar
13. Se expandir: ativar para mais territórios gradualmente
```

## 11. Desligamento emergencial

```
1. Setar WOMEN_DRIVER_PREFERENCE_ENABLED=false (env var ECS)
2. Force new deployment
3. Em ~2 min: todos containers ignoram preferência
4. Corridas em andamento não afetadas
5. Comunicar participantes sobre pausa
```

## 12. Pós-piloto

| Resultado | Ação |
|---|---|
| Sucesso | Expandir gradualmente para outros territórios |
| Parcial | Ajustar parâmetros (janela, timeout, threshold) e repetir |
| Insucesso | Documentar aprendizados, desligar, reavaliar em 3 meses |

---

## DDL PRELIMINAR (apenas documentação — não executar)

```sql
-- Somente para referência futura. NÃO criar migration agora.

ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS women_matching_opt_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prefer_woman_driver_default BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS women_matching_opt_in BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE rides_v2
  ADD COLUMN IF NOT EXISTS prefer_woman_driver BOOLEAN NOT NULL DEFAULT false;

-- ROLLBACK:
-- ALTER TABLE passengers DROP COLUMN IF EXISTS women_matching_opt_in, DROP COLUMN IF EXISTS prefer_woman_driver_default;
-- ALTER TABLE drivers DROP COLUMN IF EXISTS women_matching_opt_in;
-- ALTER TABLE rides_v2 DROP COLUMN IF EXISTS prefer_woman_driver;
```

---

## Checklist jurídico/LGPD (bloqueante)

- [ ] Base legal confirmada por especialista
- [ ] RIPD revisado e aprovado
- [ ] Texto de transparência validado
- [ ] Modelo de consentimento aprovado
- [ ] Fluxo de revogação funcional
- [ ] Análise antidiscriminação concluída
- [ ] Prazo de retenção definido
- [ ] Canal de suporte/correção definido
- [ ] DPO/responsável LGPD notificado (se aplicável)

---

*KAVIAR — KAVIAR TECNOLOGIA E SERVICOS DIGITAIS LTDA — CNPJ 67.783.601/0001-99*
