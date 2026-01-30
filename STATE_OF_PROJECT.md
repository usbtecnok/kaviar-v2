# 📊 KAVIAR - STATE OF THE PROJECT
**Data:** 2026-01-29 08:15 BRT  
**Repositório:** /home/goes/kaviar  
**Branch:** main (sincronizado com origin)  
**Último Commit:** `0224832 fix(driver-approval): add debug logging and improve error feedback`

---

## 1. ✅ PONTO ATUAL

### Git Status
```bash
Branch: main...origin/main (sincronizado)
Commits recentes:
- 0224832 fix(driver-approval): add debug logging and improve error feedback
- c82e26a fix(driver-approval): dedupe documents by type (prefer best status)
- f0a992d fix(driver-approval): accept SUBMITTED docs and show detailed error messages
- 83d6a69 fix(admin-ui): use absolute URL for document viewer (relative->absolute)
- f9de5ee fix(uploads): canonical path resolver + PUT/POST approve compat (404->200)
```

### Infraestrutura

#### 1️⃣ Repo/Deploy PaaS (✅ Confirmado)
**Status:** Operacional (validado via HTTP 200)

| Componente | URL/Host | Status |
|------------|----------|--------|
| Backend | `https://kaviar-v2.onrender.com` | ✅ HTTP 200 |
| Frontend | `https://kaviar-frontend.onrender.com` | ✅ HTTP 200 |
| Database | `ep-wispy-thunder-ad850l5j-pooler.c-2.us-east-1.aws.neon.tech` | ✅ Conectado |
| Deploy | Git push → branch main (auto-deploy) | ✅ Ativo |

**Última validação:** 2026-01-28 21:23 BRT

---

#### 2️⃣ AWS Migration (✅ FASE 4B COMPLETA)
**Status:** Backend operacional em ECS + ALB

**Fases Concluídas:**

| Fase | Componentes | Status |
|------|-------------|--------|
| 1 - VPC | VPC, Subnets, IGW, Route Tables | ✅ |
| 2 - RDS | PostgreSQL 15.15 + PostGIS 3.4 | ✅ |
| 3 - Storage | S3, ElastiCache Redis, SQS | ✅ |
| 4A - Docker | Build + Push para ECR | ✅ |
| 4B - ECS/ALB | Cluster, Service, ALB | ✅ **FIXED** |

**Recursos AWS (us-east-2):**

| Recurso | Identificador | Status |
|---------|---------------|--------|
| VPC | `vpc-0227695745b8467cb` | ✅ |
| RDS | `kaviar-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com` | ✅ |
| Redis | `kaviar-redis.pcbj2m.ng.0001.use2.cache.amazonaws.com` | ✅ |
| S3 | `kaviar-uploads-1769655575` | ✅ |
| ECR | `847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend` | ✅ |
| ECS Cluster | `kaviar-cluster` | ✅ |
| ECS Service | `kaviar-backend-service` (2 tasks) | ✅ |
| ALB | `kaviar-alb-1494046292.us-east-2.elb.amazonaws.com` | ✅ HTTP 200 |
| Target Group | 2 targets healthy | ✅ |

**Validação Fase 4B:**
```bash
$ ./validate-fase4b.sh
✅ FASE 4B OPERACIONAL
   • 2 target(s) healthy
   • ALB respondendo HTTP 200
   • URL: http://kaviar-alb-1494046292.us-east-2.elb.amazonaws.com
```

**Correção Aplicada:** Security Group `kaviar-ecs-sg` configurado corretamente para permitir tráfego ALB → ECS:3001

**Última validação:** 2026-01-29 08:15 BRT

---

#### 3️⃣ AWS - Próximas Fases
```bash
# 1. Validar endpoint ALB (se disponível)
export ALB_DNS="<seu-alb-dns>.us-east-2.elb.amazonaws.com"
curl -i "http://$ALB_DNS/api/health"

# 2. Validar Render.com (PaaS)
curl -i "https://kaviar-v2.onrender.com/api/health"
```

**Validação Completa (com AWS CLI):**
```bash
# Configurar credenciais
aws configure

# Executar script de validação (TEMP - não commitado)
./validate-aws-infra.sh
```

**Última tentativa:** 2026-01-28 21:23 BRT
- ❌ AWS CLI: Credenciais não configuradas
- ⏸️ ALB_DNS: Variável de ambiente não definida
- ℹ️ Evidências no repo: 0 arquivos AWS (IaC, configs, scripts)

---

#### 3️⃣ AWS (Confirmado via Endpoint)
**Status:** Aguardando DNS do ALB para validação HTTP

Quando disponível:
```bash
export ALB_DNS="<alb-dns>"
curl -s "http://$ALB_DNS/api/health" | jq
# Se retornar 200 + JSON válido → Confirmar como operacional
```

### Backend
- **Porta Local:** 3003 (development)
- **Status Local:** Backend ativo (tsx watch src/server.ts)
- **Health Check Local:** `http://localhost:3003/api/health` → ✅ OK
- **Database (Local):** Neon PostgreSQL (production branch, pooler mode)
- **Features Ativas:**
  - ✅ Twilio WhatsApp (`ENABLE_TWILIO_WHATSAPP=true`)
  - ✅ Premium Tourism (`ENABLE_PREMIUM_TOURISM=true`)
  - ❌ Driver Approval Gates (`ENABLE_DRIVER_APPROVAL_GATES=false`)
  - ❌ Geofence (`ENABLE_GEOFENCE=false`)
  - ❌ Driver Enforcement (`ENABLE_DRIVER_ENFORCEMENT_GATES=false`)
  - ❌ Diamond Bonus (`ENABLE_DIAMOND=false`)
  - ❌ Rating System (`ENABLE_RATING_SYSTEM=false`)
  - ❌ Legacy APIs (`ENABLE_LEGACY=false`)

### Frontend
- **Framework:** Vite + React + Material-UI
- **Build:** ✅ OK (vite build funciona)
- **Páginas Admin:** 14 páginas implementadas
- **Rotas Principais:**
  - `/admin/*` - Painel administrativo
  - `/motorista/*` - App do motorista
  - `/passageiro/*` - App do passageiro
  - `/auth/*` - Autenticação

### Problemas Conhecidos
1. **Compliance Notifications:** Log de erro em `backend/logs/compliance/compliance-notifications-error.log`
   - Último erro: `[2026-01-18T18:15:06-03:00] ERROR: ❌ Notificações falharam com exit code 1`
   - Causa provável: Twilio não configurado (tokens placeholder)

2. **WhatsApp Integration:** Implementação básica (apenas echo)
   - Webhook responde com "Recebido ✅ KAVIAR online"
   - **NÃO persiste** em Supabase (README desatualizado)
   - Schema SQL existe em `/database/schema.sql` mas **NÃO está aplicado no Prisma**

3. **Migrations Pendentes:**
   - `20260117_driver_compliance_documents.sql` - Arquivo SQL solto, **NÃO é migration Prisma**
   - Pode não estar aplicado no banco

---

## 2. 🧭 ARQUITETURA REAL

### Rotas Backend (Grupos)

#### **Autenticação** (`/api/auth/*`)
- `POST /api/auth/login` - Admin login (rate limited)
- `POST /api/auth/logout` - Admin logout
- `POST /api/auth/passenger/login` - Passageiro login
- `POST /api/auth/driver/login` - Motorista login
- `POST /api/auth/driver/set-password` - Motorista define senha
- `POST /api/auth/guide/login` - Guia turístico login

#### **Motoristas** (`/api/drivers/*`)
- `POST /api/drivers/me/complete-profile` - Completar perfil
- `POST /api/drivers/me/online` - Ficar online
- `POST /api/drivers/me/documents` - Upload de documentos (multipart)
- `GET /api/drivers/me/compliance/documents` - Listar documentos compliance

#### **Admin - Motoristas** (`/api/admin/drivers/*`)
- `GET /api/admin/drivers` - Listar motoristas
- `GET /api/admin/drivers/:id` - Detalhes do motorista
- `GET /api/admin/drivers/:id/documents` - Documentos do motorista
- `POST /api/admin/drivers/create` - Criar motorista
- `PUT /api/admin/drivers/:id/approve` - Aprovar motorista ⚠️
- `POST /api/admin/drivers/:id/approve` - Aprovar motorista (compat)
- `GET /api/admin/drivers/metrics/by-neighborhood` - Métricas por bairro

#### **Admin - Corridas** (`/api/admin/rides/*`)
- `GET /api/admin/rides` - Listar corridas
- `GET /api/admin/rides/:id` - Detalhes da corrida

#### **Corridas** (`/api/rides/*`)
- `POST /api/rides` - Criar corrida
- `POST /api/rides/resolve-location` - Resolver localização
- `GET /api/rides/:id/operational-context` - Contexto operacional

#### **Geo** (`/api/geo/*`)
- `GET /api/geo/resolve` - Resolver coordenadas → bairro/comunidade

#### **Governança** (`/api/governance/*`)
- `POST /api/governance/passenger` - Criar passageiro
- `POST /api/governance/consent` - Registrar consentimento LGPD
- `GET /api/governance/communities` - Listar comunidades

#### **Compliance** (`/api/drivers/me/compliance/*`)
- `POST /api/drivers/me/compliance/documents` - Submeter documento
- `GET /api/drivers/me/compliance/documents` - Listar documentos
- `GET /api/drivers/me/compliance/status` - Status de compliance

#### **Ratings** (`/api/ratings/*`) - ⚠️ DESABILITADO
- `POST /api/ratings` - Criar avaliação
- `GET /api/ratings/pending/:passengerId` - Avaliações pendentes
- `GET /api/ratings/driver/:driverId` - Resumo de avaliações

#### **Premium Tourism** (`/api/admin/tour-*`) - ✅ HABILITADO
- Pacotes turísticos, reservas, parceiros, relatórios

#### **Webhooks** (`/webhooks/*`)
- `POST /webhooks/twilio/whatsapp` - Webhook Twilio WhatsApp

#### **Legacy** (`/api/legacy/*`) - ❌ DESABILITADO
- APIs antigas (health, bonus-metrics, reports)

### Feature Flags (Config)

**Arquivo:** `/backend/src/config/index.ts`

| Flag | Valor | Impacto |
|------|-------|---------|
| `ENABLE_DRIVER_APPROVAL_GATES` | `false` | Aprovação sem validação de elegibilidade |
| `ENABLE_GEOFENCE` | `false` | Sem validação de geofence em corridas |
| `ENABLE_DRIVER_ENFORCEMENT_GATES` | `false` | Sem enforcement de suspensões |
| `ENABLE_DIAMOND` | `false` | Sem bônus Diamond |
| `ENABLE_RATING_SYSTEM` | `false` | Sem sistema de avaliações |
| `ENABLE_PREMIUM_TOURISM` | `true` | Premium Tourism ativo |
| `ENABLE_TWILIO_WHATSAPP` | `true` | WhatsApp webhook ativo |
| `ENABLE_LEGACY` | `false` | APIs legacy desabilitadas |

### Banco de Dados (Prisma)

**Migrations Aplicadas:**
1. `20260102223054_init` - Inicialização
2. `20260104190032_baseline` - Baseline
3. `20260108_add_postgis_geom` - PostGIS geometry
4. `20260109114812_add_community_geofence` - Geofences de comunidade

**Migrations Pendentes/Soltas:**
- `20260117_driver_compliance_documents.sql` - ⚠️ Arquivo SQL solto (não é migration Prisma)

**Modelos (30 total):**
- `admins`, `communities`, `community_geofences`, `community_status_history`
- `consents`, `diamond_audit_logs`, `driver_documents`, `driver_enforcement_history`
- `driver_verifications`, `drivers`, `elderly_contracts`, `elderly_profiles`
- `neighborhood_geofences`, `neighborhoods`, `passengers`, `rating_stats`, `ratings`
- `ride_admin_actions`, `ride_confirmations`, `ride_status_history`, `rides`
- `roles`, `tour_bookings`, `tour_packages`, `tour_partners`, `tour_settings`
- `tourist_guides`, `user_consents`, `driver_consents`, `driver_compliance_documents`

**Tabelas WhatsApp (Supabase):** ⚠️ **NÃO estão no Prisma**
- `whatsapp_conversations` - Schema existe em `/database/schema.sql`
- `whatsapp_messages` - Schema existe em `/database/schema.sql`
- **Status:** Não integrado ao backend principal (apenas documentação)

---

## 3. 🚦 FLUXOS E2E

### Passageiro
- ✅ **Cadastro/Login:** `POST /api/governance/passenger` + `POST /api/auth/passenger/login`
- ✅ **Solicitar Corrida:** `POST /api/rides` (com `resolve-location` antes)
- ⚠️ **Acompanhamento:** Depende de polling ou WebSocket (não implementado)
- ❌ **Avaliação:** Sistema desabilitado (`ENABLE_RATING_SYSTEM=false`)

### Motorista
1. ✅ **Cadastro:** Admin cria via `POST /api/admin/drivers/create`
2. ✅ **Login:** `POST /api/auth/driver/login`
3. ✅ **LGPD:** `POST /api/governance/consent` (type: 'lgpd')
4. ✅ **Upload Documentos:** `POST /api/drivers/me/documents` (multipart)
   - Campos: `cpf`, `rg`, `cnh`, `proof_of_address`, `vehicle_photo`, `background_check`
5. ⚠️ **Status:** Documentos salvos com `status='SUBMITTED'`
6. ⚠️ **Aprovação Admin:** `PUT /api/admin/drivers/:id/approve`
   - **Problema:** Validação de elegibilidade pode bloquear se docs não estiverem `VERIFIED`
   - **Workaround:** Commit recente aceita `SUBMITTED` como suficiente (MVP)
7. ✅ **Ficar Online:** `POST /api/drivers/me/online`
8. ✅ **Receber Corrida:** Sistema de matching (não detalhado)

### Admin
1. ✅ **Login:** `POST /api/auth/login` (rate limited)
2. ✅ **Aprovação Motorista:** 
   - Listar: `GET /api/admin/drivers` (filtro `status=pending`)
   - Ver detalhes: `GET /api/admin/drivers/:id`
   - Ver documentos: `GET /api/admin/drivers/:id/documents`
   - Aprovar: `PUT /api/admin/drivers/:id/approve`
3. ✅ **Auditoria Corridas:** `GET /api/admin/rides`
4. ✅ **Gestão Bairros:** Frontend implementado (`NeighborhoodsManagement.jsx`)
5. ✅ **Gestão Comunidades:** Frontend implementado (`CommunitiesManagement.jsx`)

---

## 4. 📌 PROBLEMAS PRIORITÁRIOS

### **P1: Aprovação de Motorista Retorna DRIVER_INCOMPLETE**
- **Sintoma:** Admin clica "Aprovar" → Toast mostra erro genérico ou "Pendências: ..."
- **Causa Provável:** 
  - Validação `evaluateEligibility()` em `/backend/src/services/driver-verification.ts:18`
  - Exige documentos com `status='VERIFIED'` ou `'SUBMITTED'` (após fix recente)
  - Pode estar faltando: `VEHICLE_COLOR`, `LGPD_CONSENT`, `COMMUNITY_ASSIGNMENT`
- **Evidência:**
  ```typescript
  // backend/src/services/driver-verification.ts:82-100
  const requiredDocs = ['CPF', 'RG', 'CNH', 'PROOF_OF_ADDRESS', 'VEHICLE_PHOTO', 'BACKGROUND_CHECK'];
  const isDocValid = doc && (doc.status === 'VERIFIED' || doc.status === 'SUBMITTED');
  ```
- **Solução Recomendada:**
  1. Rodar backend com `NODE_ENV=development`
  2. Usar script `/test-approve-driver.sh <driver_id> <token>`
  3. Verificar logs: `[driver-approval] eligibility check`
  4. Identificar qual requisito está faltando (A/B/C/D):
     - **A:** Docs realmente faltando → Motorista precisa enviar
     - **B:** Mismatch de `docType` → Normalizar backend
     - **C:** `VEHICLE_COLOR` null → Garantir que formulário salva
     - **D:** `COMMUNITY_ASSIGNMENT` null → Atribuir comunidade antes de aprovar

### **P2: WhatsApp Integration Não Persiste Dados**
- **Sintoma:** Webhook responde "Recebido ✅" mas não salva no banco
- **Causa Provável:**
  - `/backend/src/routes/integrations.ts:6` apenas loga e responde TwiML
  - Tabelas `whatsapp_conversations` e `whatsapp_messages` **NÃO existem no Prisma**
  - Schema SQL em `/database/schema.sql` é para Supabase (banco separado?)
- **Evidência:**
  ```typescript
  // backend/src/routes/integrations.ts:6-18
  integrationsRoutes.post('/twilio/whatsapp', (req, res) => {
    console.log('[TWILIO_WEBHOOK] WhatsApp message received:', {...});
    // Apenas retorna TwiML, não persiste
  });
  ```
- **Solução Recomendada:**
  1. **Decisão:** Usar Neon (Prisma) ou Supabase separado?
  2. **Se Neon:** Adicionar modelos ao `schema.prisma` e criar migration
  3. **Se Supabase:** Configurar cliente Supabase no backend e usar em paralelo
  4. Implementar `processWhatsAppMessage()` para persistir dados

### **P3: Compliance Notifications Falhando**
- **Sintoma:** Log de erro em `/backend/logs/compliance/compliance-notifications-error.log`
- **Causa Provável:**
  - Twilio não configurado (tokens placeholder)
  - Service tentando enviar WhatsApp mas falha
- **Evidência:**
  ```
  [2026-01-18T18:15:06-03:00] ERROR: ❌ Notificações falharam com exit code 1
  ```
- **Solução Recomendada:**
  1. Verificar `/backend/src/services/compliance-notifications.service.ts:188`
  2. Configurar `TWILIO_ACCOUNT_SID` e `TWILIO_AUTH_TOKEN` reais
  3. Ou desabilitar notificações até Twilio estar pronto

### **P4: Migration de Compliance Não Aplicada**
- **Sintoma:** Arquivo `20260117_driver_compliance_documents.sql` existe mas não é migration Prisma
- **Causa Provável:**
  - Criado manualmente como SQL, não via `prisma migrate dev`
  - Pode não estar aplicado no banco Neon
- **Evidência:**
  ```bash
  ls backend/prisma/migrations/
  # 20260117_driver_compliance_documents.sql (sem pasta)
  ```
- **Solução Recomendada:**
  1. Verificar se tabela `driver_compliance_documents` existe no banco:
     ```sql
     SELECT * FROM information_schema.tables WHERE table_name = 'driver_compliance_documents';
     ```
  2. Se não existir: Aplicar SQL manualmente ou criar migration Prisma
  3. Se existir: Remover arquivo solto ou mover para `/database/manual-migrations/`

### **P5: Feature Flags Desabilitadas em Produção**
- **Sintoma:** Features importantes desabilitadas (Geofence, Rating, Approval Gates)
- **Causa Provável:**
  - `.env` local com flags `false`
  - Pode ser intencional (MVP) ou esquecimento
- **Evidência:**
  ```bash
  ENABLE_DRIVER_APPROVAL_GATES=false
  ENABLE_GEOFENCE=false
  ENABLE_RATING_SYSTEM=false
  ```
- **Solução Recomendada:**
  1. Definir roadmap: quais features habilitar primeiro?
  2. Testar cada feature isoladamente antes de habilitar
  3. Documentar impacto de cada flag no README

---

## 5. 🧪 COMANDOS PARA REPRODUZIR

### Subir Backend
```bash
cd /home/goes/kaviar/backend
npm run dev  # Porta 3001
# ou
npm run dev:3003  # Porta 3003
```

### Subir Frontend
```bash
cd /home/goes/kaviar/frontend-app
npm run dev  # Porta padrão Vite (5173)
```

### Health Checks
```bash
# Backend
curl http://localhost:3003/api/health | jq

# Resposta esperada:
# {
#   "success": true,
#   "message": "KAVIAR Backend is running",
#   "features": {
#     "twilio_whatsapp": true,
#     "premium_tourism": true,
#     "legacy": false
#   }
# }
```

### Testar Aprovação de Motorista
```bash
# 1. Listar motoristas pendentes
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:3003/api/admin/drivers | \
  jq '.data[] | select(.status=="pending") | {id, name, status}'

# 2. Testar aprovação (captura response completo)
./test-approve-driver.sh <driver_id> <admin_token>

# 3. Verificar logs do backend
grep "driver-approval" backend_logs.txt
```

### Testar Upload de Documentos
```bash
# Motorista faz upload
curl -X POST \
  -H "Authorization: Bearer <driver_token>" \
  -F "cpf=@/path/to/cpf.pdf" \
  -F "rg=@/path/to/rg.pdf" \
  -F "cnh=@/path/to/cnh.pdf" \
  http://localhost:3003/api/drivers/me/documents

# Verificar documentos salvos
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:3003/api/admin/drivers/<driver_id>/documents | jq
```

### Testar WhatsApp Webhook
```bash
# Simular webhook Twilio
curl -X POST http://localhost:3003/webhooks/twilio/whatsapp \
  -d "From=whatsapp:+5511999999999" \
  -d "To=whatsapp:+14134759634" \
  -d "Body=Teste" \
  -d "MessageSid=SM123456"

# Resposta esperada: TwiML com "Recebido ✅ KAVIAR online"
```

### Reproduzir Bug de Aprovação
```bash
# 1. Criar motorista de teste (via admin)
curl -X POST http://localhost:3003/api/admin/drivers/create \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teste Driver",
    "email": "teste@example.com",
    "phone": "+5511999999999",
    "cpf": "12345678900"
  }'

# 2. Fazer login como motorista
curl -X POST http://localhost:3003/api/auth/driver/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+5511999999999", "password": "senha123"}'

# 3. Aceitar LGPD
curl -X POST http://localhost:3003/api/governance/consent \
  -H "Authorization: Bearer <driver_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "subject_type": "DRIVER",
    "type": "lgpd",
    "accepted": true
  }'

# 4. Upload documentos (multipart)
# (usar Postman ou script com curl -F)

# 5. Tentar aprovar
./test-approve-driver.sh <driver_id> <admin_token>

# 6. Verificar erro retornado
# Esperado: 400 com missingRequirements: ["CNH", "VEHICLE_COLOR", ...]
```

### Verificar Migrations
```bash
cd /home/goes/kaviar/backend

# Ver status das migrations
npx prisma migrate status

# Aplicar migrations pendentes (CUIDADO EM PROD)
npx prisma migrate deploy

# Gerar cliente Prisma
npm run db:generate
```

### Verificar Banco de Dados
```bash
# Abrir Prisma Studio
cd /home/goes/kaviar/backend
npm run db:studio

# Ou conectar via psql
psql "postgresql://neondb_owner:npg_2xbfMWRF6hrO@ep-wispy-thunder-ad850l5j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Queries úteis:
# SELECT * FROM drivers WHERE status = 'pending';
# SELECT * FROM driver_documents WHERE driver_id = '<id>';
# SELECT * FROM driver_verifications WHERE driver_id = '<id>';
```

---

## 📝 NOTAS FINAIS

### Decisões Arquiteturais Pendentes
1. **WhatsApp:** Usar Neon (Prisma) ou Supabase separado?
2. **Feature Flags:** Quais habilitar primeiro? (Geofence? Rating?)
3. **Compliance:** Aplicar migration manual ou recriar via Prisma?

### Próximos Passos Sugeridos
1. Resolver P1 (aprovação motorista) com evidências do debug log
2. Decidir arquitetura WhatsApp e implementar persistência
3. Configurar Twilio real ou desabilitar notificações
4. Habilitar feature flags conforme roadmap
5. Documentar fluxos E2E com exemplos reais

### Arquivos Importantes
- **Config:** `/backend/src/config/index.ts`
- **Rotas:** `/backend/src/routes/*.ts`
- **Services:** `/backend/src/services/*.ts`
- **Schema:** `/backend/prisma/schema.prisma`
- **Frontend Admin:** `/frontend-app/src/pages/admin/*.jsx`
- **Deploy:** `/deploy-production-compliance.sh`

---

**Status Geral:** ✅ Backend funcional, ⚠️ Alguns bugs conhecidos, 🚧 Features em desenvolvimento


**Próximas Fases AWS:**
- [x] Fase 1: VPC + Networking ✅
- [x] Fase 2: RDS PostgreSQL + PostGIS ✅
- [x] Fase 3: S3 + Redis + SQS ✅
- [x] Fase 4: Docker + ECR + ECS + ALB ✅
- [ ] Fase 5: Frontend (S3 + CloudFront) 📝 Script pronto
- [ ] Fase 6: HTTPS (ACM + ALB 443) 📝 Script pronto
- [ ] Fase 7: DNS (Route53 + domínio customizado)
- [ ] Fase 8: Monitoring (CloudWatch Dashboards + Alarms)

**Scripts Disponíveis:**

*Fase 4B (Backend):*
- `./validate-fase4b.sh` - Validação rápida
- `./fix-ecs-sg.sh` - Correção de Security Group
- `RUNBOOK_FASE4B.md` - Troubleshooting completo
- `FASE4B_CORRECAO.md` - Resumo executivo

*Fase 5 (Frontend):*
- `./aws-phase5-frontend.sh` - Deploy S3 + CloudFront
- `./validate-phase5.sh` - Validação frontend

*Fase 6 (HTTPS):*
- `./aws-phase6-https.sh` - Certificado ACM + HTTPS
- `./validate-phase6.sh` - Validação HTTPS

*Cutover:*
- `CUTOVER_CHECKLIST.md` - Checklist completo Render → AWS
- `FASES_5_6_RESUMO.md` - Resumo executivo Fases 5 & 6

---
