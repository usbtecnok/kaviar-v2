# 🚀 CHECKLIST DE DEPLOY - KAVIAR PRODUCTION

## 📋 PRÉ-DEPLOY

### 1. VARIÁVEIS DE AMBIENTE (.env)

**Backend (.env):**
```bash
# Environment
NODE_ENV=production
PORT=3001

# Database - PostgreSQL Production
DATABASE_URL=REDACTED

# JWT Security
JWT_SECRET=REDACTED
JWT_EXPIRES_IN=24h

# Admin Credentials
ADMIN_DEFAULT_EMAIL=admin@yourdomain.com
ADMIN_DEFAULT_PASSWORD=STRONG_ADMIN_PASSWORD

# Rate Limiting
ADMIN_LOGIN_RATE_LIMIT=5
ADMIN_LOGIN_RATE_LIMIT_PER_EMAIL=3

# Feature Flags - PRODUCTION
ENABLE_DRIVER_APPROVAL_GATES=true
ENABLE_GEOFENCE=true
ENABLE_DRIVER_ENFORCEMENT_GATES=true
ENABLE_DIAMOND=true
ENABLE_RATING_SYSTEM=true
ENABLE_PREMIUM_TOURISM=true
ENABLE_TWILIO_WHATSAPP=true
ENABLE_LEGACY=false

# Demo Data - DISABLE IN PRODUCTION
SEED_DEMO=false

# Premium Tourism Settings
MIN_RATING_PREMIUM=4.7
MIN_RATINGS_COUNT_PREMIUM=20

# Diamond System
DIAMOND_BONUS_FIXED=5.00
DIAMOND_BONUS_DAILY_CAP=25.00

# Geofence
FALLBACK_WAIT_SECONDS=30
GEOFENCE_LOCATION_VALIDITY=5

# Rating System
RATING_WINDOW_DAYS=7
RATING_COMMENT_MAX_LENGTH=200
```

**Frontend (.env):**
```bash
VITE_API_BASE_URL=https://api.yourdomain.com/api
VITE_APP_NAME=KAVIAR
VITE_APP_VERSION=1.0.0
```

### 2. COMANDOS DE BUILD

**Backend:**
```bash
# Install dependencies
npm ci --only=production

# Build TypeScript
npm run build

# Generate Prisma Client
npx prisma generate

# Apply migrations
npx prisma migrate deploy

# Start production server
npm run start
```

**Frontend:**
```bash
# Install dependencies
npm ci

# Build for production
npm run build

# Serve static files (nginx/apache)
# Build output: dist/
```

### 3. MIGRAÇÕES (SEGURANÇA)

**Aplicar com segurança:**
```bash
# 1. Backup do banco ANTES
pg_dump DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Verificar migrações pendentes
npx prisma migrate status

# 3. Aplicar migrações
npx prisma migrate deploy

# 4. Verificar integridade
npx prisma db pull --print
```

**Rollback (se necessário):**
```bash
# Restaurar backup
psql DATABASE_URL < backup_TIMESTAMP.sql

# Reverter código para versão anterior
git checkout PREVIOUS_TAG
```

### 4. FLAGS DE PRODUÇÃO

**✅ HABILITAR:**
- `ENABLE_PREMIUM_TOURISM=true`
- `ENABLE_DRIVER_APPROVAL_GATES=true`
- `ENABLE_GEOFENCE=true`
- `ENABLE_RATING_SYSTEM=true`
- `ENABLE_DIAMOND=true`
- `ENABLE_TWILIO_WHATSAPP=true`

**❌ DESABILITAR:**
- `SEED_DEMO=false` (CRÍTICO)
- `ENABLE_LEGACY=false`
- `NODE_ENV=production`

### 5. HEALTH ENDPOINTS

**Monitoramento básico:**
```bash
# Health Check Principal
GET /api/health
Response: {"success": true, "timestamp": "...", "features": {...}}

# Database Health
GET /api/health/database
Response: {"success": true, "connected": true}

# Features Status
GET /api/health/features
Response: {"premium_tourism": true, "geofence": true, ...}
```

**Alertas recomendados:**
- HTTP 500 em /api/health
- Database connection errors
- JWT secret não configurado
- Rate limit exceeded (muitas tentativas)

## 🔒 SEGURANÇA

### 1. SECRETS MANAGEMENT
- JWT_SECRET: 256 bits aleatórios
- DATABASE_URL: Credenciais seguras
- ADMIN_PASSWORD: Complexo + rotação

### 2. RATE LIMITING
- Login admin: 5 tentativas/15min
- API calls: 100 req/min por IP
- Elderly operations: 100 req/min

### 3. DATABASE
- SSL obrigatório (sslmode=require)
- Connection pooling configurado
- Backup automático diário

### 4. LOGS & AUDITORIA
- Todas ações admin logadas
- Dados sensíveis sanitizados
- Retention: 90 dias

## 📊 MONITORAMENTO

### 1. MÉTRICAS CRÍTICAS
- Response time < 500ms
- Database connections < 80%
- Error rate < 1%
- Uptime > 99.9%

### 2. LOGS IMPORTANTES
```bash
# Sucesso
✅ Database connected successfully
✅ KAVIAR Backend running on port 3001
✅ Premium Tourism: ENABLED

# Erros críticos
❌ Database connection failed
❌ JWT_SECRET not configured
❌ Rate limit exceeded
```

### 3. ALERTAS
- 5xx errors > 10/min
- Database down > 30s
- Memory usage > 80%
- Disk space < 10%

## 🚀 DEPLOY STEPS

### 1. PRÉ-DEPLOY
```bash
# Verificar testes
npm test

# Verificar build
npm run build

# Verificar migrações
npx prisma migrate status
```

### 2. DEPLOY
```bash
# Aplicar migrações
npx prisma migrate deploy

# Deploy backend
pm2 start ecosystem.config.js

# Deploy frontend
nginx -s reload
```

### 3. PÓS-DEPLOY
```bash
# Verificar health
curl https://api.yourdomain.com/api/health

# Verificar features
curl https://api.yourdomain.com/api/health/features

# Verificar logs
pm2 logs kaviar-backend
```

### 4. ROLLBACK (se necessário)
```bash
# Parar serviços
pm2 stop kaviar-backend

# Restaurar backup
psql DATABASE_URL < backup_TIMESTAMP.sql

# Reverter código
git checkout PREVIOUS_TAG

# Restart
pm2 start kaviar-backend
```

## ✅ CHECKLIST FINAL

**Antes do deploy:**
- [ ] Backup do banco criado
- [ ] Variáveis .env configuradas
- [ ] SEED_DEMO=false
- [ ] JWT_SECRET forte configurado
- [ ] Migrações testadas
- [ ] Build sem erros
- [ ] Testes passando

**Após o deploy:**
- [ ] /api/health retorna 200
- [ ] Login admin funciona
- [ ] Features habilitadas
- [ ] Logs sem erros críticos
- [ ] Monitoramento ativo
- [ ] Backup automático configurado

**Rollback preparado:**
- [ ] Backup disponível
- [ ] Procedimento documentado
- [ ] Versão anterior testada
- [ ] Equipe notificada

---

## 🎯 CONTATOS DE EMERGÊNCIA

**DevOps:** [email/slack]
**Database:** [DBA contact]
**Monitoring:** [monitoring dashboard URL]

**Última atualização:** 2026-01-05
**Versão:** 1.0.0
