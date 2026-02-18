# SPEC_RIDE_FLOW_V1 - Correção do Crash (P2025)

**Data:** 2026-02-18 07:56 BRT  
**Status:** ✅ CORRIGIDO

---

## 🔍 Diagnóstico

**Erro:** Backend crash durante teste na Corrida 2

**Stacktrace:**
```
PrismaClientKnownRequestError: P2025
at src/services/dispatcher.service.ts:50
Record to update not found
```

**Sintoma:**
- Script cria Corrida 1 com sucesso
- Backend tenta fazer dispatch
- Crash em `prisma.rides.update()`
- Porta 3003 some
- Script para na Corrida 2

---

## 🔥 Causa Raiz

**Linha 50 do dispatcher.service.ts:**
```typescript
await prisma.rides.update({  // ❌ Tabela errada
  where: { id: rideId },
  data: { status: 'no_driver' }
});
```

**Problema:**
- Corridas são criadas em `rides_v2`
- Dispatcher tentava atualizar em `rides` (tabela antiga)
- Prisma não encontra o registro → P2025
- Processo cai

**Outras referências já corrigidas:**
- Linha 18: `prisma.rides_v2.findUnique()` ✅
- Linha 36: `prisma.rides_v2.update()` ✅
- Linha 76: `prisma.rides_v2.update()` ✅
- Linha 197: `prisma.rides_v2.update()` ✅

**Faltava apenas:**
- Linha 50: `prisma.rides.update()` ❌ → Corrigido para `rides_v2`

---

## ✅ Correção Aplicada

**Arquivo:** `src/services/dispatcher.service.ts`

**Mudança:**
```typescript
// Antes (linha 50)
await prisma.rides.update({
  where: { id: rideId },
  data: { status: 'no_driver' }
});

// Depois
await prisma.rides_v2.update({
  where: { id: rideId },
  data: { status: 'no_driver' }
});
```

**Verificação completa:**
- ✅ Linha 18: `prisma.rides_v2.findUnique()`
- ✅ Linha 36: `prisma.rides_v2.update()`
- ✅ Linha 50: `prisma.rides_v2.update()` (corrigido)
- ✅ Linha 76: `prisma.rides_v2.update()`
- ✅ Linha 197: `prisma.rides_v2.update()`

**Todas as operações do dispatcher agora usam `rides_v2` ✅**

---

## 🧪 Validação

### 1. Reiniciar backend

```bash
$ cd /home/goes/kaviar/backend
$ export DATABASE_URL="postgresql://postgres:dev@localhost:5433/kaviar_dev?schema=public"
$ npm run dev:3003

🚀 KAVIAR Backend running on port 3003
✅ SPEC_RIDE_FLOW_V1: /api/v2/rides/*, /api/v2/drivers/*, /api/realtime/*
[OFFER_TIMEOUT_JOB] Started (interval: 5s)
✅ Database connected successfully
```

✅ **Backend sobe sem erros**

### 2. Rodar teste completo

```bash
$ cd /home/goes/kaviar/backend
$ export DATABASE_URL="postgresql://postgres:dev@localhost:5433/kaviar_dev?schema=public"
$ ./scripts/test-ride-flow-v1.sh

🚀 SPEC_RIDE_FLOW_V1 - Teste de 20 Corridas
==========================================
API: http://localhost:3003

🔐 Autenticando passageiro...
✓ Token obtido

📍 Setup: Colocando motoristas online...
✓ Motoristas online

🚗 Criando 20 corridas...

Corrida 1/20: ✓ ride_id=... status=requested
Corrida 2/20: ✓ ride_id=... status=requested
Corrida 3/20: ✓ ride_id=... status=requested
Corrida 4/20: ✓ ride_id=... status=requested
...
Corrida 20/20: ✓ ride_id=... status=requested

==========================================
📊 RESULTADOS
==========================================
Total de corridas: 20
Aceitas (simulado): 14
Sem motorista: 6
Erros: 0

✅ Teste concluído!
```

✅ **20 corridas completadas sem crash**

### 3. Verificar logs do backend

```
[RIDE_CREATED] ride_id=... passenger_id=pass_beta_test_001
[DISPATCH_CANDIDATES] ride_id=... attempt=1 candidates=2 top3=[...]
[OFFER_SENT] ride_id=... offer_id=... driver_id=test-driver-1 expires_at=...
[RIDE_CREATED] ride_id=... passenger_id=pass_beta_test_001
[DISPATCH_CANDIDATES] ride_id=... attempt=1 candidates=2 top3=[...]
[OFFER_SENT] ride_id=... offer_id=... driver_id=test-driver-2 expires_at=...
...
```

✅ **Backend não cai, logs mostram dispatcher funcionando**

### 4. Verificar corridas no banco

```bash
$ psql postgresql://postgres:dev@localhost:5433/kaviar_dev -c \
  "SELECT id, status, passenger_id, created_at FROM rides_v2 ORDER BY created_at DESC LIMIT 5;"

       id           |  status   |    passenger_id    |         created_at
--------------------+-----------+--------------------+----------------------------
 ...                | requested | pass_beta_test_001 | 2026-02-18 07:56:39.115-03
 ...                | offered   | pass_beta_test_001 | 2026-02-18 07:56:38.892-03
 ...                | requested | pass_beta_test_001 | 2026-02-18 07:56:38.654-03
```

✅ **Corridas criadas em rides_v2 com status corretos**

---

## 📦 Arquivo Modificado

- ✅ `src/services/dispatcher.service.ts` (linha 50)

---

## 🎯 Commit Sugerido

```bash
git add src/services/dispatcher.service.ts
git commit -m "fix(dispatcher): use rides_v2 table in no_driver update

- Fix P2025 error (Record to update not found)
- Change prisma.rides.update to prisma.rides_v2.update on line 50
- All dispatcher operations now use rides_v2 table consistently

Fixes backend crash during ride dispatch when no candidates found
Resolves issue where script stopped at Corrida 2"
```

---

## ✅ Resultado Final

- ✅ Backend não cai durante dispatch
- ✅ Script completa 20 corridas
- ✅ Bloco 📊 RESULTADOS aparece (accepted/no_driver)
- ✅ Todas as operações do dispatcher usam `rides_v2`
- ✅ Logs mostram dispatcher funcionando corretamente

**Status:** CRASH CORRIGIDO - TESTES COMPLETOS FUNCIONANDO 🚀
