# SPEC_RIDE_FLOW_V1 - Análise de Inconsistência de Métricas

**Data:** 2026-02-18 08:19 BRT  
**Status:** 🔍 INCONSISTÊNCIA IDENTIFICADA

---

## 📊 Evidência da Inconsistência

### Script reportou:
```
Total de corridas: 20
Aceitas (simulado): 12
Sem motorista: 0
Erros: 0
```

### Logs do backend mostram:
```
[DISPATCHER] No candidates for ride <id>, setting no_driver
[DISPATCHER] No candidates for ride <id>, setting no_driver
...
```

**Conclusão:** Há corridas com `status='no_driver'` no banco, mas o script reporta `Sem motorista: 0`

---

## 🔍 Análise do Script

### Localização do Cálculo de Métricas

**Arquivo:** `scripts/test-ride-flow-v1.sh`

**Linhas 127-133:** Inicialização dos contadores
```bash
# Contador de resultados
TOTAL=20
ACCEPTED=0
NO_DRIVER=0
ERRORS=0
```

**Linhas 154-161:** Lógica de contabilização
```bash
# Verificar status final (simular aceite em 70% dos casos)
if [ $((RANDOM % 10)) -lt 7 ]; then
  # Simular aceite (em produção, viria do motorista via SSE)
  # Por enquanto, apenas contabilizar
  ACCEPTED=$((ACCEPTED + 1))
fi
```

**Linhas 169-173:** Exibição dos resultados
```bash
echo "Total de corridas: $TOTAL"
echo -e "${GREEN}Aceitas (simulado): $ACCEPTED${NC}"
echo -e "${YELLOW}Sem motorista: $NO_DRIVER${NC}"
echo -e "${RED}Erros: $ERRORS${NC}"
```

---

## 🐛 Problema Identificado

### 1. Script NÃO consulta status real do banco

**O que o script faz:**
- ✅ Cria corrida via POST `/api/v2/rides`
- ✅ Verifica se resposta tem `"success":true`
- ✅ Extrai `ride_id` e `status` da resposta
- ❌ **Usa RANDOM (70% de chance) para simular aceite**
- ❌ **Nunca consulta o status final em `rides_v2`**
- ❌ **Nunca incrementa `NO_DRIVER`**

**Código problemático (linhas 154-161):**
```bash
# Aguardar um pouco para dispatcher processar
sleep 0.5

# Verificar status final (simular aceite em 70% dos casos)
if [ $((RANDOM % 10)) -lt 7 ]; then
  # Simular aceite (em produção, viria do motorista via SSE)
  # Por enquanto, apenas contabilizar
  ACCEPTED=$((ACCEPTED + 1))
fi
```

**Problemas:**
1. `sleep 0.5` não é suficiente para dispatcher processar
2. `RANDOM % 10 < 7` é uma simulação fake, não reflete realidade
3. Não consulta banco para ver status real
4. `NO_DRIVER` nunca é incrementado (sempre fica 0)

### 2. Dispatcher PERSISTE corretamente

**Arquivo:** `src/services/dispatcher.service.ts`

**Linhas 35-40:** Quando atinge max tentativas
```typescript
if (attemptCount >= this.MAX_ATTEMPTS) {
  console.log(`[DISPATCHER] Ride ${rideId} reached max attempts (${this.MAX_ATTEMPTS}), setting no_driver`);
  await prisma.rides_v2.update({
    where: { id: rideId },
    data: { status: 'no_driver' }
  });
  return;
}
```

**Linhas 49-54:** Quando não há candidatos
```typescript
if (candidates.length === 0) {
  console.log(`[DISPATCHER] No candidates for ride ${rideId}, setting no_driver`);
  await prisma.rides_v2.update({
    where: { id: rideId },
    data: { status: 'no_driver' }
  });
  return;
}
```

✅ **Dispatcher persiste corretamente `status='no_driver'` em `rides_v2`**

---

## 📋 Respostas às Perguntas

### 1. Qual é o critério do script para contar métricas?

**Resposta:** O script usa **simulação fake com RANDOM**, não consulta status real.

- `ACCEPTED`: Incrementado se `RANDOM % 10 < 7` (70% de chance aleatória)
- `NO_DRIVER`: **Nunca é incrementado** (sempre fica 0)
- `ERRORS`: Incrementado se POST retorna erro (não `"success":true`)

**Não lê status final de `rides_v2`**

### 2. Quando dispatcher loga "setting no_driver", ele persiste?

**Resposta:** ✅ **SIM, persiste corretamente**

O dispatcher faz `await prisma.rides_v2.update({ data: { status: 'no_driver' } })`

---

## ✅ Correção Necessária

### Opção 1: Script consulta status real (Recomendado)

Substituir simulação fake por consulta real ao banco:

```bash
# Após criar corrida, aguardar dispatcher processar
sleep 2

# Consultar status real no banco
FINAL_STATUS=$(psql $DATABASE_URL -t -c \
  "SELECT status FROM rides_v2 WHERE id='$RIDE_ID';" | xargs)

case "$FINAL_STATUS" in
  "accepted")
    ACCEPTED=$((ACCEPTED + 1))
    ;;
  "no_driver")
    NO_DRIVER=$((NO_DRIVER + 1))
    ;;
  "offered"|"requested")
    # Ainda processando
    ;;
esac
```

### Opção 2: Consulta final após todas as corridas

Adicionar no final do script:

```bash
echo ""
echo "🔍 Verificando status real no banco..."

ACCEPTED=$(psql $DATABASE_URL -t -c \
  "SELECT COUNT(*) FROM rides_v2 WHERE status='accepted' AND passenger_id='$PASSENGER_ID' AND created_at > NOW() - INTERVAL '5 minutes';" | xargs)

NO_DRIVER=$(psql $DATABASE_URL -t -c \
  "SELECT COUNT(*) FROM rides_v2 WHERE status='no_driver' AND passenger_id='$PASSENGER_ID' AND created_at > NOW() - INTERVAL '5 minutes';" | xargs)

OFFERED=$(psql $DATABASE_URL -t -c \
  "SELECT COUNT(*) FROM rides_v2 WHERE status='offered' AND passenger_id='$PASSENGER_ID' AND created_at > NOW() - INTERVAL '5 minutes';" | xargs)

REQUESTED=$(psql $DATABASE_URL -t -c \
  "SELECT COUNT(*) FROM rides_v2 WHERE status='requested' AND passenger_id='$PASSENGER_ID' AND created_at > NOW() - INTERVAL '5 minutes';" | xargs)

echo ""
echo "=========================================="
echo "📊 RESULTADOS REAIS (do banco)"
echo "=========================================="
echo "Total de corridas: $TOTAL"
echo -e "${GREEN}Aceitas: $ACCEPTED${NC}"
echo -e "${YELLOW}Sem motorista: $NO_DRIVER${NC}"
echo -e "${BLUE}Oferecidas: $OFFERED${NC}"
echo -e "${CYAN}Aguardando: $REQUESTED${NC}"
echo -e "${RED}Erros: $ERRORS${NC}"
```

---

## 🎯 Recomendação

**Implementar Opção 2** (consulta final) porque:

1. ✅ Mais simples (não precisa psql em cada iteração)
2. ✅ Mais rápido (não adiciona 2s por corrida)
3. ✅ Mostra status real do banco
4. ✅ Mantém compatibilidade com script atual

**Adicionar após linha 173** (depois do bloco de resultados fake)

---

## 📝 Commit Sugerido

```bash
git add scripts/test-ride-flow-v1.sh
git commit -m "fix(test): query real ride status from database instead of random simulation

- Add database query to count rides by status
- Show real metrics: accepted, no_driver, offered, requested
- Remove fake RANDOM-based simulation
- Add section 'RESULTADOS REAIS (do banco)'

Fixes inconsistency where script showed 'Sem motorista: 0' 
but logs showed 'setting no_driver' messages"
```

---

## ✅ Conclusão

**Inconsistência confirmada:**
- ❌ Script usa simulação fake (RANDOM)
- ✅ Dispatcher persiste corretamente
- 🔧 Correção: Script deve consultar banco

**Status:** CORREÇÃO NECESSÁRIA NO SCRIPT
