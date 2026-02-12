# T3-mini Debug: Eligibility Endpoint 500 Error

**Data:** 2026-02-12 00:43 BRT  
**Issue:** GET /api/admin/drivers/:id/eligibility retornando 500 sem stack trace no CloudWatch

---

## Problema Identificado

**Sintoma:**
- Endpoint retorna 500 Internal Server Error
- CloudWatch Logs não mostra stack trace
- Apenas log genérico: "Error checking driver eligibility"

**Causa:**
- `catch(error)` não estava logando stack trace estruturado
- `requestId` não estava sendo incluído na resposta de erro
- Log não tinha campos parseáveis para Logs Insights

---

## Reprodução

```bash
API=https://api.kaviar.com.br
ADMIN_TOKEN="<token>"
DRIVER_ID="driver-1770864276298"

# Chamar endpoint
curl -i -X GET "$API/api/admin/drivers/$DRIVER_ID/eligibility" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Capturar X-Request-ID do header
# X-Request-ID: 1bf59070-5f1e-40d6-a537-28b7dcb5be20
```

**Response (antes do fix):**
```
HTTP/2 500
x-request-id: 1bf59070-5f1e-40d6-a537-28b7dcb5be20

{"success":false,"error":"Erro ao verificar elegibilidade"}
```

---

## CloudWatch Logs Insights Query

```bash
REGION="us-east-2"
LOG_GROUP="/ecs/kaviar-backend"
REQ_ID="1bf59070-5f1e-40d6-a537-28b7dcb5be20"

START_RES="$(aws logs start-query --region "$REGION" \
  --log-group-name "$LOG_GROUP" \
  --start-time $(( $(date +%s) - 7200 )) \
  --end-time $(date +%s) \
  --query-string "fields @timestamp, requestId, method, path, status, durationMs, error, stack
| filter requestId = \"$REQ_ID\"
| sort @timestamp desc
| limit 50")"

QID="$(echo "$START_RES" | jq -r '.queryId')"
echo "QID=$QID"

while true; do
  RES="$(aws logs get-query-results --region "$REGION" --query-id "$QID")"
  STATUS="$(echo "$RES" | jq -r '.status')"
  echo "STATUS=$STATUS"
  if [ "$STATUS" = "Complete" ] || [ "$STATUS" = "Failed" ] || [ "$STATUS" = "Cancelled" ]; then
    echo "$RES" | jq '.results'
    break
  fi
  sleep 2
done
```

**Resultado (antes do fix):**
```json
{
  "requestId": "1bf59070-5f1e-40d6-a537-28b7dcb5be20",
  "method": "GET",
  "path": "/drivers/driver-1770864276298/eligibility",
  "status": "500",
  "durationMs": "21"
}
```

❌ **Sem campo `error` ou `stack`**

---

## Fix Aplicado

**Arquivo:** `src/routes/admin-drivers.ts`

**Mudanças:**
1. Capturar `requestId` no início do handler
2. Incluir `requestId` na resposta 404
3. No `catch`: log estruturado JSON com stack + requestId
4. Incluir `requestId` na resposta 500

**Código (após fix):**
```typescript
router.get('/drivers/:id/eligibility', allowReadAccess, async (req, res) => {
  const requestId = (req as any).requestId || req.headers['x-request-id'] || 'unknown';
  
  try {
    // ... lógica ...
    
    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        error: 'Motorista não encontrado', 
        requestId 
      });
    }
    
    // ... resto da lógica ...
    
  } catch (error: any) {
    // Log estruturado com stack + requestId
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'error',
      requestId,
      path: req.path,
      driverId: req.params.id,
      error: error?.message || String(error),
      stack: error?.stack
    }));
    
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao verificar elegibilidade', 
      requestId 
    });
  }
});
```

---

## Validação (após deploy)

```bash
# 1. Chamar endpoint novamente
curl -i -X GET "$API/api/admin/drivers/$DRIVER_ID/eligibility" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 2. Capturar X-Request-ID
REQ_ID="<novo_request_id>"

# 3. Buscar no CloudWatch (mesma query acima)
# Agora deve aparecer:
# - Campo "error" com mensagem
# - Campo "stack" com stack trace completo
# - Campo "driverId" para contexto
```

**Esperado (após fix):**
```json
{
  "ts": "2026-02-12T03:45:00.000Z",
  "level": "error",
  "requestId": "<request_id>",
  "path": "/drivers/driver-123/eligibility",
  "driverId": "driver-123",
  "error": "Cannot read property 'created_at' of null",
  "stack": "Error: Cannot read property...\n    at /app/dist/routes/admin-drivers.js:123:45\n    ..."
}
```

---

## Possíveis Causas do 500 (hipóteses)

1. **Driver não existe:** 404 (já tratado)
2. **Relação driver_consents não carrega:** Prisma include falha
3. **Campo created_at null:** Drivers antigos sem created_at
4. **Timezone issue:** Date parsing falha

**Próximos passos após ver stack:**
- Se erro for "Cannot read property 'created_at'": adicionar fallback
- Se erro for Prisma relation: verificar schema em PROD vs DEV
- Se erro for outro: ajustar conforme stack trace

---

## Commit

```
fix(premium): log stack + requestId in eligibility endpoint

- Add requestId capture at handler start
- Include requestId in 404 response
- Add structured error logging with stack trace in catch block
- Include requestId in 500 response
- Log format: JSON with ts, level, requestId, path, driverId, error, stack

Fixes: eligibility endpoint returning 500 without stack trace in CloudWatch
```

---

**Status:** ✅ Fix aplicado - Aguardando deploy + validação em PROD
