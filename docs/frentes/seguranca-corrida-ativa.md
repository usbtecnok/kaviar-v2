# Frente: Segurança de Corrida Ativa — Desvio, Demora e Confirmação de Bem-estar

**Versão:** v1.0
**Data:** Maio/2026
**Status:** Fase 1 concluída em produção
**Empresa:** USB Tecnok Manutenção e Instalação de Computadores Ltda (CNPJ: 07.710.691/0001-66)
**Plataforma:** KAVIAR

---

## 1. Objetivo

Recurso de atenção operacional da central KAVIAR/USB Tecnok para acompanhamento de corridas ativas que estejam demorando mais que o esperado ou que futuramente apresentem sinais de desvio de rota ou parada prolongada.

O objetivo é permitir que a equipe operacional identifique situações que mereçam verificação, sem criar automações agressivas ou alarmes desnecessários.

---

## 2. Escopo Atual — Fase 1 (Concluída)

| Item | Valor |
|------|-------|
| Tela | `/admin/rides` (Gestão de Corridas) |
| Status ativo | `in_progress` |
| Campo usado | `started_at` (fallback `startedAt`) |
| Indicador | "Em andamento há Xmin" |
| Alerta | Badge "⚠️ Demora incomum" quando > 30 minutos |
| Tipo | Apenas visual no admin |
| Automação | Nenhuma |
| Notificação | Nenhuma |
| Alteração de status | Nenhuma |
| Commit | `c51ae61 feat(admin): show active ride duration warning` |

---

## 3. O que esta frente NÃO é

- **Não é** serviço de emergência médica.
- **Não é** serviço policial.
- **Não é** garantia absoluta de segurança.
- **Não acusa** motorista ou passageiro de qualquer irregularidade.
- **Não substitui** contato humano da central com as partes envolvidas.
- **Não aciona** autoridades automaticamente.
- **Não bloqueia** corridas automaticamente.
- **Não gera** multa, penalidade ou suspensão automática.

É uma ferramenta de atenção operacional interna para suporte da central KAVIAR/USB Tecnok.

---

## 4. Próximas Fases Planejadas

### Fase 1B — Marcar como verificado

- Permitir que admin registre que conferiu a corrida.
- Campo de observação manual.
- Horário da verificação.
- Quem verificou.
- Sem notificar apps.
- Sem alterar status da corrida.

### Fase 2 — Botão "Preciso de ajuda"

- Passageiro e motorista podem acionar suporte durante corrida ativa.
- Registrar evento para admin.
- Sem acionar emergência automaticamente.
- Sem chamar polícia ou ambulância.

### Fase 3 — Check-in de bem-estar

- Após tempo incomum, mostrar discretamente: "Está tudo bem com a corrida?"
- Opções: "Sim, está tudo bem" / "Preciso de ajuda"
- Para motorista e passageiro.
- Resposta registrada para auditoria.

### Fase 4 — Desvio de rota / GPS

- Usar `driver_locations` (lat/lng/speed/updated_at).
- Avaliar distância do destino esperado.
- Detectar parada longa ou GPS desatualizado (> 5min sem atualização).
- Apenas sinalizar no admin inicialmente.
- Não acusar motorista/passageiro.

### Fase 5 — Central de incidentes

- Usar/expandir tabela `ride_emergency_events` existente.
- Status: active / resolved / false_alarm / escalated.
- Trilha de localização (`emergency_location_trail`).
- Observações da central.
- Auditoria completa.

---

## 5. Dados Disponíveis

| Dado | Tabela/Campo | Disponível |
|------|-------------|-----------|
| Início da corrida | `rides_v2.started_at` | ✅ |
| Fim da corrida | `rides_v2.completed_at` | ✅ |
| Origem | `rides_v2.origin_lat/lng` | ✅ |
| Destino | `rides_v2.dest_lat/lng` | ✅ |
| Posição atual motorista | `driver_locations.lat/lng` | ✅ |
| Velocidade motorista | `driver_locations.speed` | ✅ |
| Última atualização GPS | `driver_locations.updated_at` | ✅ |
| Eventos de emergência | `ride_emergency_events` | ✅ |
| Trilha de localização | `emergency_location_trail` | ✅ |
| Distância estimada | — | ❌ (calcular) |
| Duração estimada | — | ❌ (calcular) |

---

## 6. Regras de Segurança

- Não criar automações agressivas sem validação humana.
- Não alarmar passageiro/motorista sem necessidade confirmada.
- Não bloquear corrida automaticamente por tempo ou GPS.
- Toda ação futura deve ser auditável (quem, quando, por quê).
- Linguagem sempre neutra: "atenção operacional", "verificar corrida", "preciso de ajuda".
- Não usar termos como "sequestro", "crime", "perigo" em interfaces ou logs sem confirmação.
- Escalar para autoridades apenas com decisão humana explícita da central.

---

## 7. Status da Frente

| Fase | Status | Observação |
|------|--------|------------|
| Fase 1 — Badge visual no admin | ✅ Concluída | Em produção |
| Fase 1B — Marcar como verificado | ⏳ Próxima recomendada | Requer frontend + possivelmente backend leve |
| Fase 2 — Botão "Preciso de ajuda" | 📋 Planejada | Requer app build |
| Fase 3 — Check-in de bem-estar | 📋 Planejada | Requer push notification |
| Fase 4 — Desvio de rota | 📋 Planejada | Requer cálculo geoespacial |
| Fase 5 — Central de incidentes | 📋 Planejada | Tabela já existe |

---

## 8. Aviso

Este documento é operacional e interno. O recurso de atenção operacional não constitui serviço de emergência, vigilância, monitoramento policial ou garantia de segurança. Para situações de emergência real, os usuários devem contatar autoridades competentes (190, 192, 193).

---

*USB Tecnok / KAVIAR — Segurança de Corrida Ativa — v1.0 — Maio/2026*
