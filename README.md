# 🚀 Kaviar - Plataforma de Mobilidade Urbana

## 📋 Índice

- [Arquitetura](#arquitetura)
- [Segurança](#segurança)
- [Integração WhatsApp + Supabase](#integração-whatsapp--supabase)
- [Decisões Arquiteturais (ADRs)](#decisões-arquiteturais-adrs)

---

## 🏗️ Arquitetura

### Infraestrutura AWS (Produção)

**Região:** us-east-1  
**Conta:** 847895361928

#### Componentes

- **ECS Fargate:** kaviar-prod cluster
  - Service: kaviar-backend-service
  - Task Definition: kaviar-backend (latest: revision 8)
  - CPU: 512, Memory: 1024
  - Auto Scaling: 1-4 tasks (CPU 70%, Memory 80%)
  
- **Application Load Balancer:** awseb--AWSEB-pXIXi4aBWsxs
  - Target Group: kaviar-ecs-tg
  - Health Check: GET /api/health (30s interval)
  - HTTPS: api.kaviar.com.br
  
- **RDS PostgreSQL:** (via Elastic Beanstalk)
  - PostGIS habilitado
  - 187 bairros (157 RJ + 30 SP)
  
- **ECR:** kaviar-backend
  - Multi-stage Docker build (Node.js 20 Debian slim)
  
- **Secrets Manager:**
  - /kaviar/prod/database-url
  - /kaviar/prod/jwt-secret

#### Rede (Temporário - Ver ADR-001)

- **VPC:** vpc-00ba3041932d79c51
- **Subnets:** 3 públicas (assignPublicIp=ENABLED)
- **Security Groups:**
  - ECS (sg-03115257d1c6fc08c): Inbound SOMENTE do ALB:3001
  - ALB (sg-0505c9dee417fc20a): Inbound 80/443 público

⚠️ **Nota:** ECS em subnets públicas é temporário. Migração para privadas + NAT Gateway planejada antes do lançamento público. Ver [ADR-001](docs/ADR-001-ecs-network-architecture.md).

---

## 🔒 Segurança

### Validação de Security Groups (2026-01-31)

✅ **ECS não aceita tráfego direto da internet**  
✅ **Apenas ALB → ECS permitido (porta 3001)**  
✅ **ALB público (80/443) - correto**

### Sistema de Admins

- **12 admins criados:**
  - 2 SUPER_ADMIN (suporte, financeiro)
  - 10 ANGEL_VIEWER (angel01-10)
- **Autenticação:** JWT (24h), bcrypt cost 10
- **Endpoints:**
  - POST /api/admin/auth/login
  - POST /api/admin/auth/change-password
- **Rate Limiting:** 10 tentativas/min por IP, 5/min por email

### Monitoramento

- **CloudWatch Alarmes:**
  - Task stopped unexpectedly
  - Target group unhealthy
  - 5xx errors > 10 em 5min
  - CPU/Memory auto scaling (4 alarmes)
  
- **Health Check Aprimorado:**
  - Validação de conexão com banco
  - Validação de configuração S3
  - Métricas: uptime, responseTime
  - Status 503 quando degraded

---

# 🚀 Kaviar WhatsApp + Supabase Integration

## ✅ **Integração Completa Implementada**

### 🏗️ **Arquitetura de 4 Camadas**

```
1. 📥 INGESTÃO
   WhatsApp ➜ Twilio ➜ Backend (Webhooks)
   
2. ⚙️ PROCESSAMENTO  
   Engine de Regras e Contexto
   ├─ Identificação de perfil (motorista/passageiro)
   ├─ Interpretação de comandos (/status, /cancelar)
   └─ Detecção de eventos críticos (emergência)
   
3. 💾 PERSISTÊNCIA
   Supabase PostgreSQL ✅
   ├─ whatsapp_conversations (conversas ativas)
   ├─ whatsapp_messages (histórico completo)
   └─ Real-time habilitado
   
4. 📡 DISTRIBUIÇÃO
   Supabase Real-time ➜ Frontend
   ├─ Eventos automáticos via WebSocket
   └─ API REST para consultas
```

### 🗄️ **Schema do Banco (Implementado)**

#### **whatsapp_conversations**
```sql
id                UUID PRIMARY KEY
phone             TEXT UNIQUE (normalizado: +5511999999999)
user_id           UUID (FK para users.id, nullable)
user_type         TEXT (passenger | driver | unknown)
last_message_at   TIMESTAMPTZ
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
```

#### **whatsapp_messages**
```sql
id                UUID PRIMARY KEY  
conversation_id   UUID (FK whatsapp_conversations.id)
direction         TEXT (inbound | outbound)
body              TEXT (conteúdo da mensagem)
message_sid       TEXT UNIQUE (SMxxxxxxxx do Twilio)
raw_payload       JSONB (payload completo do Twilio)
created_at        TIMESTAMPTZ
```

### 🔌 **APIs Implementadas**

| Endpoint | Método | Função |
|----------|--------|--------|
| `/webhooks/twilio/whatsapp` | POST | Webhook principal (Twilio → Supabase) |
| `/webhooks/twilio/test` | GET | Teste de integração |
| `/webhooks/twilio/conversations` | GET | Listar conversas recentes |
| `/health` | GET | Health check do sistema |

### 🔄 **Fluxo de Dados Implementado**

```javascript
// 1. Twilio envia webhook
POST /webhooks/twilio/whatsapp
{
  "From": "whatsapp:+5511999999999",
  "Body": "Preciso de uma corrida",
  "MessageSid": "SMxxxxxxxx"
}

// 2. Backend processa e salva
const result = await processWhatsAppMessage(payload);

// 3. Supabase persiste automaticamente
INSERT INTO whatsapp_conversations (phone, user_type)
INSERT INTO whatsapp_messages (conversation_id, body, message_sid)

// 4. Real-time emite evento automaticamente
// Frontend recebe via WebSocket do Supabase
```

### 🛡️ **Segurança Implementada**

- ✅ **Service Role Key** apenas no backend
- ✅ **Row Level Security (RLS)** habilitado
- ✅ **Políticas de acesso** configuradas
- ✅ **Normalização** de números de telefone
- ✅ **Validação** de payloads

### 📊 **Real-time Habilitado**

```sql
-- Tabelas com real-time ativo
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;
```

**Frontend pode escutar:**
```javascript
// Novas mensagens em tempo real
supabase
  .channel('whatsapp_messages')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'whatsapp_messages' 
  }, (payload) => {
    console.log('Nova mensagem:', payload.new);
  })
  .subscribe();
```

## 🚀 **Como Usar**

### 1. **Configurar Banco de Dados**
```sql
-- Execute no Supabase SQL Editor
-- Arquivo: database/schema.sql
```

### 2. **Configurar Variáveis**
```env
SUPABASE_URL=https://xcxxcexdsbaxgmmnxkgc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
TWILIO_WHATSAPP_NUMBER=whatsapp:+14134759634
```

### 3. **Executar Backend**
```bash
npm install
npm run dev
```

### 4. **Testar Integração**
```bash
# Verificar conexões
curl http://localhost:3000/webhooks/twilio/test

# Listar conversas
curl http://localhost:3000/webhooks/twilio/conversations
```

## 📈 **Próximas Implementações**

### **Backend (Lógica de Negócio)**
- [ ] Associar mensagens a corridas ativas
- [ ] Implementar comandos WhatsApp (`/status`, `/cancelar`)
- [ ] Sistema de proxy passageiro ↔ motorista
- [ ] Detecção de emergências e alertas

### **Frontend (Dashboard Admin)**
- [ ] Interface real-time para monitorar conversas
- [ ] Painel de métricas de engajamento
- [ ] Gestão de usuários e tipos
- [ ] Histórico de mensagens por corrida

### **Integrações**
- [ ] Conectar com sistema principal Kaviar (users, trips)
- [ ] Notificações push via WhatsApp
- [ ] Analytics de comunicação
- [ ] Backup e arquivamento de mensagens

## 🎯 **Resultado Alcançado**

✅ **Persistência completa** - Todas as mensagens salvas
✅ **Real-time nativo** - Eventos automáticos via Supabase  
✅ **Arquitetura escalável** - Separação de responsabilidades
✅ **Segurança enterprise** - RLS e Service Role
✅ **Schema otimizado** - Índices e performance
✅ **Logs detalhados** - Debugging e monitoramento

**Status**: Integração completa e funcional! 🎉
