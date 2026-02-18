# SPEC_RIDE_FLOW_V1 - Correção do 403 Forbidden

**Data:** 2026-02-18 07:46 BRT  
**Status:** ✅ CORRIGIDO

---

## 🔍 Diagnóstico

**Erro:** `{"error":"Forbidden"}` (403) em todas as chamadas a `/api/v2/rides`

**Evidência:**
- Script obtém token com sucesso
- Motoristas ficam online
- Todas as 20 corridas retornam 403 Forbidden

**RequestId exemplo:** `768e5ef7-3942-4d52-a1ee-4dfb1e6a25de`

---

## 🔥 Causa Raiz

### Token Real do Sistema

Em `src/routes/passenger-auth.ts`, o JWT é assinado assim:

```typescript
jwt.sign(
  { 
    userId: passenger.id,      // ✅ userId (não id)
    userType: 'PASSENGER',     // ✅ userType (não role)
    email 
  }, 
  JWT_SECRET, 
  ...
)
```

### Middleware Antigo (Errado)

Em `src/routes/rides-v2.ts`:

```typescript
const decoded = jwt.verify(token, ...) as any;

if (decoded.role !== 'passenger') {  // ❌ role não existe
  return 403;
}

(req as any).passengerId = decoded.id;  // ❌ id não existe
```

**Resultado:**
- `decoded.role` = `undefined`
- `decoded.id` = `undefined`
- Sempre retorna 403 Forbidden

---

## ✅ Correção Aplicada

**Arquivos:** `src/routes/rides-v2.ts`, `drivers-v2.ts`, `realtime.ts`

### Middleware Compatível (Novo + Legado)

```typescript
const requirePassenger = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

    // ✅ Suporta payload novo (userType/userId) + legado (role/id)
    const userType = String(decoded.userType || decoded.user_type || decoded.role || '').toUpperCase();
    const userId = decoded.userId || decoded.id;

    if (userType !== 'PASSENGER' || !userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    (req as any).passengerId = userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

**Mudanças:**
1. ✅ Busca `userType` ou `user_type` ou `role` (fallback)
2. ✅ Busca `userId` ou `id` (fallback)
3. ✅ Converte para uppercase para comparação
4. ✅ Valida ambos (userType e userId) antes de aceitar

---

## 🧪 Validação

### 1. Testar criação de corrida

```bash
$ TOKEN=$(curl -sS -X POST http://localhost:3003/api/auth/passenger/login \
  -H "Content-Type: application/json" \
  -d '{"email":"passenger@test.com","password":"test1234"}' | jq -r '.token')

$ curl -X POST http://localhost:3003/api/v2/rides \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {"lat": -22.9668, "lng": -43.1729},
    "destination": {"lat": -22.9500, "lng": -43.1800}
  }'

{
  "success": true,
  "data": {
    "ride_id": "...",
    "status": "requested"
  }
}
```

✅ **Retorna 200 com ride_id (sem 403)**

### 2. Rodar script de 20 corridas

```bash
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
...
Corrida 20/20: ✓ ride_id=... status=requested

==========================================
📊 RESULTADOS
==========================================
Total de corridas: 20
Aceitas (simulado): 14
Sem motorista: 0
Erros: 0

✅ Teste concluído!
```

✅ **20 corridas criadas sem 403 Forbidden**

### 3. Verificar logs do backend

```
[RIDE_CREATED] ride_id=... passenger_id=pass_beta_test_001 origin=[-22.9668,-43.1729] dest=[-22.9500,-43.1800]
[DISPATCH_CANDIDATES] ride_id=... attempt=1 candidates=2 top3=[{"driver_id":"test-driver-1","distance_km":0.05,"score":0.05}]
[OFFER_SENT] ride_id=... offer_id=... driver_id=test-driver-1 expires_at=... score=0.05
```

✅ **Logs mostram corridas sendo criadas e dispatcher funcionando**

---

## 📦 Arquivos Modificados

- ✅ `src/routes/rides-v2.ts` - Middlewares compatíveis
- ✅ `src/routes/drivers-v2.ts` - Middleware compatível
- ✅ `src/routes/realtime.ts` - Middlewares compatíveis

---

## 📝 Compatibilidade

O middleware agora suporta **ambos** os formatos de token:

### Token Novo (Sistema Real)
```json
{
  "userId": "pass_beta_test_001",
  "userType": "PASSENGER",
  "email": "passenger@test.com"
}
```

### Token Legado (Se existir)
```json
{
  "id": "pass_beta_test_001",
  "role": "passenger",
  "email": "passenger@test.com"
}
```

**Fallback chain:**
- `userType` → `user_type` → `role`
- `userId` → `id`

---

## ⚠️ Nota de Segurança (TODO)

**Encontrado:** `process.env.JWT_SECRET || 'fallback-secret'`

**Ação futura:** Remover fallback antes de produção:
```typescript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}
```

**Status:** Não bloqueia testes agora, mas deve ser corrigido antes de produção.

---

## 🎯 Commit Sugerido

```bash
git add src/routes/rides-v2.ts src/routes/drivers-v2.ts src/routes/realtime.ts
git commit -m "fix(auth): support real JWT payload (userType/userId) in v2 routes

- Change middleware to read userType (not role) from token
- Change middleware to read userId (not id) from token
- Add fallback chain for compatibility: userType→user_type→role, userId→id
- Convert userType to uppercase for comparison
- Apply to rides-v2, drivers-v2, and realtime routes

Fixes 403 Forbidden error when using real passenger/driver tokens
Resolves issue where decoded.role was undefined"
```

---

## ✅ Resultado Final

- ✅ Middleware compatível com token real do sistema
- ✅ POST /api/v2/rides retorna 200 com ride_id
- ✅ Script de 20 corridas executa sem 403
- ✅ Logs mostram RIDE_CREATED, DISPATCH_CANDIDATES, OFFER_SENT
- ✅ Compatibilidade com tokens novos e legados

**Status:** 403 CORRIGIDO - TESTES COMPLETOS FUNCIONANDO 🚀
