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
❌ TRUNCATE TABLE              # PROIBIDO - Apaga dados
❌ DELETE FROM users           # PROIBIDO - Sem WHERE específico
```

## ✅ COMANDOS PERMITIDOS

```bash
✅ npx prisma migrate deploy   # PERMITIDO - Migrations seguras
✅ npx prisma generate         # PERMITIDO - Gerar client
✅ npx prisma migrate status   # PERMITIDO - Verificar status
✅ npm run start              # PERMITIDO - Iniciar app
```

## 🔄 PROCEDIMENTO ROLLBACK

### **Em caso de falha no deploy:**

```bash
# 1. Parar serviço no Render
# Via dashboard: Stop service

# 2. Reverter código
git revert HEAD --no-edit
git push origin main

# 3. Restaurar banco (se necessário)
psql $DATABASE_URL < backup_TIMESTAMP.sql

# 4. Reiniciar serviço
# Via dashboard: Start service

# 5. Validar rollback
./scripts/post-deploy-tests.sh
```

### **Rollback de migrations:**
```bash
# CUIDADO: Apenas se migration causou problema
# 1. Backup atual
pg_dump $DATABASE_URL > rollback_backup.sql

# 2. Restaurar backup pré-migration
psql $DATABASE_URL < backup_pre_migration.sql

# 3. Reverter código para versão anterior
git checkout PREVIOUS_COMMIT
```
