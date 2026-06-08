# Fase 4 — Registro de Preferência por Motorista Mulher na Corrida

**Data:** 2026-06-08
**Commit:** `2a8350e feat(rides): registra preferencia por motorista mulher na corrida`
**Status:** ✅ Concluída, operacional e validada em produção

---

## 1. Objetivo

Registrar a preferência por motorista mulher no momento da criação da corrida (`rides_v2.prefer_woman_driver`), sem alterar dispatch, sem filtrar motoristas e sem ligar feature flag.

Fase preparatória — coleta de dados de demanda antes de implementar priorização no dispatch (Fase 5).

---

## 2. Escopo implementado

- Backend grava `prefer_woman_driver` em `rides_v2` na criação da corrida.
- Valor resolvido a partir do perfil da passageira autenticada.
- Não aceita o campo vindo do body do app.
- Não requer alteração mobile nem novo APK.
- Não requer migration (coluna já existia no schema).

---

## 3. Arquivo alterado

```
backend/src/routes/rides-v2.ts  (+12 linhas)
```

---

## 4. Regra de negócio

Grava `prefer_woman_driver = true` somente quando:

```
passengers.prefer_woman_driver_default = true
AND passengers.women_matching_opt_in = true
AND passengers.women_preference_eligible = true
```

Caso contrário: `false`.

Trecho adicionado (antes do `prisma.rides_v2.create`):

```typescript
const passengerProfile = await prisma.passengers.findUnique({
  where: { id: passengerId },
  select: { prefer_woman_driver_default: true, women_matching_opt_in: true, women_preference_eligible: true }
});
const preferWomanDriver = Boolean(
  passengerProfile?.prefer_woman_driver_default &&
  passengerProfile?.women_matching_opt_in &&
  passengerProfile?.women_preference_eligible
);
```

---

## 5. O que NÃO foi alterado

- Dispatch (`dispatcher.service.ts`) — não lê `prefer_woman_driver`
- Mobile — nenhum arquivo alterado
- Feature flag — continua `WOMEN_DRIVER_PREFERENCE_ENABLED=false`
- Banco — nenhuma migration, coluna já existia
- APKs — nenhum novo build
- Site, R2, Cloudflare
- Pix, Asaas, créditos, wallet/ledger
- Push, som/vinheta, mapa, autocomplete

---

## 6. Validação de deploy

| Item | Resultado |
|------|-----------|
| ECS Service | ACTIVE |
| Running/Desired | 1/1 |
| Rollout state | COMPLETED |
| Versão em produção | `2a8350ea02b16a6648beba6019a1d647fb6a3240` |
| API health | 200 OK |
| Logs (erros) | Zero |
| Uptime pós-deploy | Estável |

---

## 7. Validação funcional

### Cenário TRUE (passageira com os 3 campos ativos)

| Item | Valor |
|------|-------|
| Conta | `teste.fase4.women.1780943255@kaviar.test` |
| ID | `pass_1780943258027_682w08d7l` |
| Ride ID | `bd6ab06d-951c-4ff2-804e-7f0d257e525c` |
| `prefer_woman_driver` | **`true`** ✅ |
| Status final | `no_driver` (dispatch normal) |

### Cenário FALSE (conta controle sem women preference)

| Item | Valor |
|------|-------|
| Conta | `teste.fase4.controle.1780943311@kaviar.test` |
| ID | `pass_1780943313029_npvjo9n2f` |
| Ride ID | `eac76407-2500-4a54-91a3-f839265dceb2` |
| `prefer_woman_driver` | **`false`** ✅ |
| Status final | `no_driver` (dispatch normal) |

### Pós-teste

- Nenhuma corrida pendente (`/active` = null para ambas)
- Dispatch rodou normalmente em ambos os cenários
- Zero erros nos logs

---

## 8. Evidência de não impacto no dispatch

- `grep prefer_woman_driver dispatcher.service.ts` → 0 ocorrências
- `grep women_matching dispatcher.service.ts` → 0 ocorrências
- `grep women_preference dispatcher.service.ts` → 0 ocorrências
- Ambas as corridas de teste passaram pelo dispatch normalmente (status `no_driver` = tentou, não encontrou motoristas — esperado para contas de teste)

---

## 9. Feature flag

```
WOMEN_DRIVER_PREFERENCE_ENABLED = false (OFF)
```

A feature flag não interfere na gravação do campo. Ela controla apenas os endpoints de opt-in/opt-out da passageira. O registro na corrida funciona independentemente da flag.

---

## 10. Riscos e rollback

### Riscos

| Risco | Severidade | Status |
|-------|-----------|--------|
| Campo gravado sem efeito no dispatch | Nenhum | By design — Fase 4 é registro-only |
| Passageira espera efeito imediato | Baixo | UI já comunicava "feature_enabled: false" |
| 1 SELECT extra por corrida (perfil) | Desprezível | Query simples por PK |

### Rollback

1. Remover as 12 linhas adicionadas em `rides-v2.ts`
2. O campo volta a ser sempre `false` (default do schema)
3. Sem migration reversa necessária
4. Deploy normal via ECS

---

## 11. Próximos passos recomendados

### Fase 5 — Priorização no Dispatch (NÃO implementar sem diagnóstico)

Antes de implementar:

1. **Diagnóstico técnico do dispatcher** — entender `findCandidates`, scoring, tiers territoriais
2. **Definir regra de priorização** — boost no score? filtro temporário? tier separado?
3. **Definir timeout de priorização** — quanto tempo esperar por motorista mulher antes de fallback
4. **Definir fallback** — após timeout, dispatch normal (qualquer motorista)
5. **Definir comportamento com feature flag ON** — dispatch lê `prefer_woman_driver` da ride
6. **Testes** — garantir que motorista homem nunca é excluído permanentemente
7. **Rollback da Fase 5** — flag OFF = dispatch ignora o campo (já funciona assim)

### Pré-requisitos

- Fase 4 ✅ (concluída)
- Diagnóstico do dispatcher ❌ (não iniciado)
- Definição de regras de priorização ❌ (não iniciado)
- Aprovação do desenho ❌ (não iniciado)

---

## 12. Ponto Futuro — Acompanhamento pelo Gestor Territorial

Futuramente, o KAVIAR poderá avaliar se o Gestor Territorial acompanha corridas com `prefer_woman_driver = true` dentro do território dele.

Premissas obrigatórias:

- O Gestor Territorial **não terá acesso irrestrito** a dados de corridas ou passageiras.
- Visibilidade limitada a métricas agregadas do território (ex: quantidade de corridas com preferência ativa, sem identificar passageiras).
- Qualquer acesso a dados individuais exige consentimento explícito da passageira (LGPD).
- Toda consulta do Gestor será auditável (log de acesso com timestamp, IP, escopo).
- O painel do Gestor não exibirá nome, telefone, CPF ou localização exata da passageira.
- A implementação depende de:
  - Role `TERRITORIAL_MANAGER` no sistema (não existe ainda)
  - Contrato de parceria formal com cláusula LGPD
  - Painel com permissões granulares e auditoria
  - Aprovação jurídica

Este ponto **não será implementado na Fase 4 nem na Fase 5**. Fica registrado como requisito futuro com segurança e privacidade como pré-condição.

---

## 13. Conclusão

Fase 4 concluída, operacional e segura.

O KAVIAR agora registra a preferência por motorista mulher em cada corrida criada, baseado exclusivamente no perfil validado da passageira. O dado está disponível para uso futuro pelo dispatch (Fase 5) sem nenhum impacto atual na operação.
