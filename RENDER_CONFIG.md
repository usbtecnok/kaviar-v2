# 🚀 RENDER DEPLOY CONFIG - FINAL

## ⚙️ CONFIGURAÇÃO RENDER

### **Backend Service:**
- **Service Name:** kaviar-backend
- **Root Directory:** `backend`
- **Build Command:** `npm ci && npm run build && npx prisma generate && npx prisma migrate deploy`
- **Start Command:** `npm run start`
- **Environment:** Node.js 18+
- **Port:** 3001
- **Auto-Deploy:** Yes (main branch)

### **Frontend Service (Opcional):**
- **Service Name:** kaviar-frontend
- **Root Directory:** `frontend-app`
- **Build Command:** `npm ci && npm run build`
- **Publish Directory:** `dist`
- **Environment:** Static Site

## 🔒 VARIÁVEIS AMBIENTE PRODUÇÃO

### **Obrigatórias:**
```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
JWT_SECRET=STRONG_256_BIT_SECRET
ADMIN_DEFAULT_EMAIL=admin@yourdomain.com
ADMIN_DEFAULT_PASSWORD=STRONG_PASSWORD
SEED_DEMO=false
```

### **Feature Flags:**
```
ENABLE_PREMIUM_TOURISM=true
ENABLE_LEGACY=false
ENABLE_DRIVER_APPROVAL_GATES=true
ENABLE_GEOFENCE=true
ENABLE_RATING_SYSTEM=true
ENABLE_DIAMOND=true
ENABLE_TWILIO_WHATSAPP=true
```

## ⚠️ COMANDOS PROIBIDOS EM PRODUÇÃO

```bash
❌ npx prisma db push          # PROIBIDO - Bypass de migrations
❌ npx prisma migrate reset    # PROIBIDO - Apaga dados
❌ npx prisma db seed          # PROIBIDO - Popula dados demo
❌ DROP TABLE                  # PROIBIDO - Destrutivo
```

## ✅ COMANDOS PERMITIDOS

```bash
✅ npx prisma migrate deploy   # PERMITIDO - Migrations seguras
✅ npx prisma generate         # PERMITIDO - Gerar client
✅ npx prisma migrate status   # PERMITIDO - Verificar status
✅ npm run start              # PERMITIDO - Iniciar app
```

## 🧪 TESTES PÓS-DEPLOY

Executar após deploy:
```bash
./scripts/post-deploy-tests.sh
```

Validações obrigatórias:
1. GET /api/health → 200
2. Login admin → token válido
3. GET /api/admin/elderly/contracts → 200
4. GET /api/admin/tour-packages → 200
