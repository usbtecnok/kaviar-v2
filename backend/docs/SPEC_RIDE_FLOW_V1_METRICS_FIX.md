# SPEC_RIDE_FLOW_V1 - Correção de Métricas Fake

**Data:** 2026-02-18 08:24 BRT  
**Status:** ✅ CORRIGIDO

---

## 🔍 Problema

Script usava **simulação FAKE com RANDOM** para contar métricas:
- `ACCEPTED`: Incrementado se `RANDOM % 10 < 7` (70% aleatório)
- `NO_DRIVER`: Nunca incrementado (sempre 0)
- Não consultava banco de dados

**Resultado:** Métricas não refletiam realidade do dispatcher

---

## ✅ Correção Aplicada

**Arquivo:** `scripts/test-ride-flow-v1.sh`

### 1. DATABASE_URL obrigatório

```bash
# Forçar DATABASE_URL obrigatório
: "${DATABASE_URL:?❌ DATABASE_URL não configurado. Ex: export DATABASE_URL='postgresql://postgres:dev@localhost:5433/kaviar_dev?schema=public'}"
```

### 2. Removida simulação fake

**Antes:**
```bash
# Aguardar um pouco para dispatcher processar
sleep 0.5

# Verificar status final (simular aceite em 70% dos casos)
if [ $((RANDOM % 10)) -lt 7 ]; then
  ACCEPTED=$((ACCEPTED + 1))
fi
```

**Depois:**
```bash
# Pequeno delay entre corridas
sleep 0.2
```

### 3. Adicionada consulta real ao banco

```bash
echo ""
echo "⏳ Aguardando dispatcher processar..."
sleep 3

echo "🔍 Consultando métricas reais no banco..."

# Extrair credenciais do DATABASE_URL
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Contar métricas reais (últimos 10 minutos)
ACCEPTED=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
  "SELECT COUNT(*) FROM rides_v2 WHERE passenger_id='${PASSENGER_ID}' AND created_at > NOW() - INTERVAL '10 minutes' AND status='accepted';" 2>/dev/null | xargs || echo "0")

NO_DRIVER=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
  "SELECT COUNT(*) FROM rides_v2 WHERE passenger_id='${PASSENGER_ID}' AND created_at > NOW() - INTERVAL '10 minutes' AND status='no_driver';" 2>/dev/null | xargs || echo "0")

OFFERED=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
  "SELECT COUNT(*) FROM rides_v2 WHERE passenger_id='${PASSENGER_ID}' AND created_at > NOW() - INTERVAL '10 minutes' AND status='offered';" 2>/dev/null | xargs || echo "0")

REQUESTED=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
  "SELECT COUNT(*) FROM rides_v2 WHERE passenger_id='${PASSENGER_ID}' AND created_at > NOW() - INTERVAL '10 minutes' AND status='requested';" 2>/dev/null | xargs || echo "0")
```

### 4. Atualizado bloco de resultados

**Antes:**
```bash
echo "📊 RESULTADOS"
echo "Total de corridas: $TOTAL"
echo "Aceitas (simulado): $ACCEPTED"
echo "Sem motorista: $NO_DRIVER"
echo "Erros: $ERRORS"
```

**Depois:**
```bash
echo "📊 RESULTADOS (do banco)"
echo "Total de corridas: $TOTAL"
echo "Aceitas: $ACCEPTED"
echo "Sem motorista: $NO_DRIVER"
echo "Oferecidas: $OFFERED"
echo "Aguardando: $REQUESTED"
echo "Erros HTTP: $ERRORS"
```

---

## 🧪 Validação

### Executar teste

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
...
Corrida 20/20: ✓ ride_id=... status=requested

⏳ Aguardando dispatcher processar...
🔍 Consultando métricas reais no banco...

==========================================
📊 RESULTADOS (do banco)
==========================================
Total de corridas: 20
Aceitas: 0
Sem motorista: 18
Oferecidas: 2
Aguardando: 0
Erros HTTP: 0

✅ Teste concluído!
```

### Verificar logs do backend

```bash
$ grep "setting no_driver" /tmp/kaviar-dev-3003.log | wc -l
18
```

✅ **Métricas batem:** 18 no banco = 18 nos logs

### Verificar banco diretamente

```bash
$ PGPASSWORD=dev psql -h localhost -p 5433 -U postgres -d kaviar_dev -c \
  "SELECT status, COUNT(*) FROM rides_v2 WHERE passenger_id='pass_beta_test_001' AND created_at > NOW() - INTERVAL '10 minutes' GROUP BY status;"

  status   | count
-----------+-------
 no_driver |    18
 offered   |     2
(2 rows)
```

✅ **Confirmado:** Métricas reais do banco

---

## 📦 Arquivo Modificado

- ✅ `scripts/test-ride-flow-v1.sh`

---

## 🎯 Commit Sugerido

```bash
git add scripts/test-ride-flow-v1.sh
git commit -m "fix(test): query real ride status from database instead of random simulation

- Force DATABASE_URL to be set (exit if not configured)
- Remove RANDOM-based fake simulation
- Add sleep 3 after creating rides to let dispatcher process
- Query rides_v2 table for real status counts (accepted, no_driver, offered, requested)
- Update results block to show real metrics from database
- Add colors for better readability (BLUE for offered, CYAN for requested)

Fixes inconsistency where script showed 'Sem motorista: 0' 
but logs and database showed multiple 'no_driver' rides"
```

---

## ✅ Resultado Final

- ✅ DATABASE_URL obrigatório (não pode esquecer de configurar)
- ✅ Métricas reais consultadas do banco
- ✅ Resultados batem com logs do dispatcher
- ✅ Mostra 4 status: accepted, no_driver, offered, requested
- ✅ Sem simulação fake (RANDOM removido)

**Status:** MÉTRICAS REAIS IMPLEMENTADAS 🚀
