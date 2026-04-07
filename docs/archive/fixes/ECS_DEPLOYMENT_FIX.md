# ECS Deployment Fix - investorView Middleware

**Data:** 03/02/2026 21:20 BRT  
**Commit:** 6a56cfa  
**Status:** ✅ Fix aplicado, aguardando GitHub Actions

---

## 🐛 Problema Identificado

**Sintoma:**
- ECS deployment :24 falhou (4 tasks com exitCode 1)
- Tasks não conseguem iniciar
- Versão :22 continua rodando (CORS antigo sem CloudFront)

**Causa Raiz:**
```
Error: Cannot find module './middleware/investorView'
```

**Análise:**
- Arquivo `src/middleware/investorView.ts` existe
- `tsconfig.build.json` NÃO incluía `src/middleware/**/*`
- Build não compilava o arquivo para `dist/`
- Runtime não encontrava o módulo

---

## ✅ Solução Aplicada

**Arquivo:** `backend/tsconfig.build.json`

**Mudança:**
```json
"include": [
  "src/app.ts",
  "src/server.ts",
  "src/config/**/*",
  "src/routes/auth.ts",
  "src/routes/passenger-auth.ts",
  "src/routes/rides.ts",
  "src/routes/geo.ts",
  "src/middleware/**/*",        // ✅ ADICIONADO
  "src/middlewares/error.ts",
  "src/modules/auth/**/*",
  "src/modules/rides/**/*",
  "src/modules/geo/**/*"
],
```

---

## 🚀 Próximos Passos

### 1. GitHub Actions (automático)
- Build da imagem Docker com middleware compilado
- Push para ECR
- Criar task definition :25
- Update ECS service

### 2. Aguardar Deployment
```bash
# Monitorar
aws ecs describe-services \
  --cluster kaviar-cluster \
  --services kaviar-backend-service \
  --region us-east-2
```

**Esperado:**
- Task definition :25 com 2 tasks RUNNING
- Deployment :24 removido
- Service em steady state

### 3. Validar CORS
```bash
curl -i -X OPTIONS https://api.kaviar.com.br/api/admin/auth/forgot-password \
  -H "Origin: https://d29p7cirgjqbxl.cloudfront.net" \
  -H "Access-Control-Request-Method: POST"
```

**Esperado:**
```
HTTP/2 204
access-control-allow-origin: https://d29p7cirgjqbxl.cloudfront.net ✅
access-control-allow-credentials: true
access-control-allow-methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
```

### 4. Testar no Navegador
```
https://d29p7cirgjqbxl.cloudfront.net/admin/forgot-password
```

**Esperado:**
- ✅ Sem "Erro de conexão"
- ✅ POST funciona
- ✅ Mensagem de sucesso/erro apropriada

---

## 📊 Timeline

| Hora | Evento |
|------|--------|
| 20:59 | Deploy :24 iniciado (CORS fix) |
| 21:00 | Tasks falhando (MODULE_NOT_FOUND) |
| 21:16 | Investigação (logs CloudWatch) |
| 21:18 | Causa identificada (tsconfig) |
| 21:19 | Fix aplicado (commit 6a56cfa) |
| 21:20 | Aguardando GitHub Actions |
| 21:2X | Deploy :25 esperado |

---

## 🔍 Logs do Erro

```
📍 Mounting core routes...
node:internal/modules/cjs/loader:1210
  throw err;
  ^
Error: Cannot find module './middleware/investorView'
Require stack:
- /app/dist/app.js
- /app/dist/server.js
    at Module._resolveFilename (node:internal/modules/cjs/loader:1207:15)
    ...
  code: 'MODULE_NOT_FOUND',
  requireStack: [ '/app/dist/app.js', '/app/dist/server.js' ]
}
Node.js v20.20.0
```

---

## ✅ Checklist

- [x] Problema identificado (MODULE_NOT_FOUND)
- [x] Causa raiz encontrada (tsconfig.build.json)
- [x] Fix aplicado (adicionar src/middleware/**/*) 
- [x] Commit feito (6a56cfa)
- [x] Push feito
- [ ] GitHub Actions build (em progresso)
- [ ] ECS deployment :25 (aguardando)
- [ ] Service estabilizado (aguardando)
- [ ] CORS validado (aguardando)
- [ ] Teste no navegador (aguardando)

---

## 📝 Commits Relacionados

1. **675525d** - CORS fix (CloudFront origin)
2. **6a56cfa** - tsconfig fix (middleware include)

---

**Status:** ✅ Fix aplicado, aguardando CI/CD  
**ETA:** ~5 minutos para deployment completo

---

**Versão:** 1.0  
**Preparado por:** Kiro (AWS AI Assistant)  
**Data:** 03/02/2026 21:20 BRT
