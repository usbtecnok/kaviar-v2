# 🔥 LIMPEZA FORÇADA DE CACHE - ADMIN

**Problema:** Browser usando bundle JavaScript antigo que chama `/health` e `/neighborhoods` (sem `/api`)

---

## ✅ CORREÇÕES APLICADAS

### Backend (commit 1538b35):
```typescript
// CORS allowed headers agora inclui Cache-Control
res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,Cache-Control');
```

### Deploy:
- ✅ ECR: 847895361928.dkr.ecr.us-east-1.amazonaws.com/kaviar-backend:1538b35
- ✅ Task Definition: kaviar-backend:71
- ⏳ ECS: Rolling deployment (3-5 min)

---

## 🧹 COMO LIMPAR CACHE DO BROWSER

### Firefox:
1. **Abrir DevTools** (F12)
2. **Network tab**
3. **Clicar com botão direito** em qualquer request
4. **Selecionar:** "Clear Browser Cache"
5. **OU:** Settings (engrenagem) → "Disable Cache" (checkbox)
6. **Hard Reload:** Ctrl+Shift+R (Linux/Windows) ou Cmd+Shift+R (Mac)

### Chrome:
1. **Abrir DevTools** (F12)
2. **Network tab**
3. **Checkbox:** "Disable cache"
4. **Hard Reload:** Ctrl+Shift+R (Linux/Windows) ou Cmd+Shift+R (Mac)
5. **OU:** Botão direito no reload → "Empty Cache and Hard Reload"

### Modo Privado (recomendado para teste):
1. **Firefox:** Ctrl+Shift+P
2. **Chrome:** Ctrl+Shift+N
3. **Abrir:** https://d29p7cirgjqbxl.cloudfront.net/admin/login
4. **Testar:** Deve carregar bundle novo

---

## 🧪 VALIDAÇÃO (após limpar cache)

### DevTools → Network:

**✅ CORRETO (deve aparecer):**
```
OPTIONS https://api.kaviar.com.br/api/health → 204
GET https://api.kaviar.com.br/api/health → 200

OPTIONS https://api.kaviar.com.br/api/governance/neighborhoods → 204
GET https://api.kaviar.com.br/api/governance/neighborhoods → 200
```

**❌ ERRADO (NÃO deve aparecer):**
```
OPTIONS https://api.kaviar.com.br/health
OPTIONS https://api.kaviar.com.br/neighborhoods
```

### Console:

**✅ CORRETO:**
```
[ApiClient] Request success: {method: "GET", url: "https://api.kaviar.com.br/api/health", status: 200}
[HealthProbe] ✅ Healthy
```

**❌ ERRADO:**
```
[ApiClient] Path sem /api: /health → /api/health
CORS Missing Allow Header
```

---

## 🔍 SE AINDA FALHAR

### 1. Verificar qual bundle está carregando:
```
DevTools → Sources → index-*.js
```
- Se for `index-DNL6JtcL.js` → bundle novo ✅
- Se for `index-CBqbpnNE.js` ou mais antigo → cache ainda ativo ❌

### 2. Forçar reload do CloudFront:
```bash
aws cloudfront create-invalidation \
  --distribution-id E30XJMSBHGZAGN \
  --paths "/index.html" "/assets/*" \
  --region us-east-1
```

### 3. Verificar ECS task:
```bash
aws ecs describe-services \
  --cluster kaviar-prod \
  --services kaviar-backend-service \
  --region us-east-1 \
  --query 'services[0].deployments'
```

Deve mostrar:
```json
{
  "status": "PRIMARY",
  "taskDefinition": "kaviar-backend:71",
  "runningCount": 1
}
```

---

## ⏱️ TIMELINE

- **Agora:** Backend deployando (ECS rolling)
- **+3 min:** Nova task RUNNING com CORS fix
- **+5 min:** Pode testar com cache limpo
- **+10 min:** CloudFront cache expira naturalmente

---

## 📋 CHECKLIST

- [ ] Aguardar 5 minutos (ECS deploy)
- [ ] Abrir modo privado/incognito
- [ ] Acessar: https://d29p7cirgjqbxl.cloudfront.net/admin/login
- [ ] Abrir DevTools → Network
- [ ] Verificar: requests vão para `/api/health` e `/api/governance/neighborhoods`
- [ ] Verificar: OPTIONS retornam 204 (não CORS error)
- [ ] Verificar: Banner "Configuração de API inválida" NÃO aparece

---

**Status:** ⏳ Aguardando ECS deploy (task definition :71)  
**Commit:** 1538b35  
**Tempo estimado:** 5 minutos
