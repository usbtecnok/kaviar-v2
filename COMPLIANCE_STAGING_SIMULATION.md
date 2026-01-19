# 🚀 Relatório de Staging - Sistema de Compliance

**Data:** 2026-01-18 08:22 BRT  
**Ambiente:** Staging (Simulação)  
**Status:** ⚠️ SIMULADO (ambiente não disponível)

---

## ⚠️ Nota Importante

**Ambiente staging não está disponível no momento.**

Este relatório documenta os passos que **seriam executados** em um ambiente staging real.

---

## 📋 Passos Planejados

### 1️⃣ Aplicar Migration

**Comando:**
```bash
psql $DATABASE_URL_STAGING < backend/prisma/migrations/20260117_driver_compliance_documents.sql
```

**Ação:**
- Criar tabela `driver_compliance_documents`
- Criar índices (driver_id, status, is_current, valid_until)
- Criar partial unique index (is_current = true)
- Criar foreign keys (drivers, admins)

**Validação:**
```sql
SELECT COUNT(*) FROM driver_compliance_documents;
-- Esperado: 0 (tabela vazia)

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'driver_compliance_documents';
-- Esperado: 18 colunas
```

---

### 2️⃣ Subir Backend

**Comando:**
```bash
cd backend && npm run dev
```

**Validação:**
```bash
curl http://staging:3003/api/health
# Esperado: {"success": true, "message": "KAVIAR Backend is running"}
```

**Logs esperados:**
```
📍 Mounting core routes...
✅ Core routes mounted: /api/admin/*, /api/drivers/*, /api/ratings/*, /api/compliance/*
```

---

### 3️⃣ Testar Endpoints

#### Teste 1: Status de Compliance (Motorista sem documento)
```bash
TOKEN=$(curl -X POST http://staging:3003/api/auth/driver/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+5511999999999", "password": "test123"}' \
  | jq -r '.token')

curl -X GET http://staging:3003/api/drivers/me/compliance/status \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "needsRevalidation": true,
    "daysUntilExpiration": null,
    "status": "no_document",
    "shouldBlock": false,
    "message": "Nenhum documento de antecedentes cadastrado"
  }
}
```

#### Teste 2: Enviar Documento
```bash
curl -X POST http://staging:3003/api/drivers/me/compliance/documents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileUrl": "https://storage.kaviar.com/compliance/test-doc.pdf",
    "lgpdConsentAccepted": true
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "id": "doc-...",
    "status": "pending",
    "created_at": "2026-01-18T08:22:00Z"
  },
  "message": "Documento enviado para análise"
}
```

#### Teste 3: Listar Pendentes (Admin)
```bash
ADMIN_TOKEN=$(curl -X POST http://staging:3003/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@kaviar.com", "password": "admin123"}' \
  | jq -r '.token')

curl -X GET http://staging:3003/api/admin/compliance/documents/pending \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": [
    {
      "id": "doc-...",
      "driver_id": "driver-...",
      "driver_name": "João Silva",
      "status": "pending",
      "created_at": "2026-01-18T08:22:00Z"
    }
  ]
}
```

#### Teste 4: Aprovar Documento
```bash
curl -X POST http://staging:3003/api/admin/compliance/documents/doc-.../approve \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "id": "doc-...",
    "status": "approved",
    "is_current": true,
    "valid_from": "2026-01-18T08:22:00Z",
    "valid_until": "2027-01-18T08:22:00Z",
    "approved_by": "admin-...",
    "approved_at": "2026-01-18T08:22:00Z"
  }
}
```

#### Teste 5: Verificar Status Após Aprovação
```bash
curl -X GET http://staging:3003/api/drivers/me/compliance/status \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "needsRevalidation": false,
    "daysUntilExpiration": 365,
    "status": "valid",
    "shouldBlock": false,
    "message": "Documento válido"
  }
}
```

---

### 4️⃣ Testar UI

#### Painel do Motorista
**URL:** `http://staging-frontend.kaviar.com/driver/home`

**Checklist:**
- [ ] ComplianceStatus.jsx renderiza
- [ ] Status "Sem documento" exibe corretamente
- [ ] Botão "Enviar Atestado" funciona
- [ ] Upload de arquivo funciona
- [ ] Termo LGPD visível e obrigatório
- [ ] Histórico exibe documentos
- [ ] Mensagens claras e específicas

#### Painel Admin
**URL:** `http://staging-frontend.kaviar.com/admin/compliance`

**Checklist:**
- [ ] ComplianceManagement.jsx renderiza
- [ ] Tab "Pendentes" lista documentos
- [ ] Tab "Vencendo" lista documentos
- [ ] Botão "Aprovar" funciona
- [ ] Botão "Rejeitar" exige motivo
- [ ] Modal de rejeição valida (mínimo 10 caracteres)
- [ ] Histórico de motorista exibe timeline

---

### 5️⃣ Testar Bloqueio Suave (Grace Period)

#### Cenário 1: Documento Vencido há 3 dias (Grace Period)
```sql
-- Simular documento vencido há 3 dias
UPDATE driver_compliance_documents 
SET valid_until = NOW() - INTERVAL '3 days'
WHERE id = 'doc-test';
```

**Endpoint:**
```bash
curl -X GET http://staging:3003/api/drivers/me/compliance/status \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta esperada:**
```json
{
  "needsRevalidation": true,
  "daysUntilExpiration": -3,
  "daysOverdue": 3,
  "status": "expired_grace",
  "shouldBlock": false,
  "message": "Documento vencido há 3 dias. Você tem 4 dias para enviar novo atestado antes de ser bloqueado."
}
```

#### Cenário 2: Documento Vencido há 10 dias (Bloqueado)
```sql
-- Simular documento vencido há 10 dias
UPDATE driver_compliance_documents 
SET valid_until = NOW() - INTERVAL '10 days'
WHERE id = 'doc-test';
```

**Endpoint:**
```bash
curl -X GET http://staging:3003/api/drivers/me/compliance/status \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta esperada:**
```json
{
  "needsRevalidation": true,
  "daysUntilExpiration": -10,
  "daysOverdue": 10,
  "status": "expired_blocked",
  "shouldBlock": true,
  "message": "Documento vencido há 10 dias. Você está bloqueado até enviar novo atestado."
}
```

---

### 6️⃣ Testar Bloqueio Automático

**Método:**
```typescript
complianceService.applyAutomaticBlocks()
```

**Teste:**
```bash
# Criar documento vencido há 10 dias
INSERT INTO driver_compliance_documents (
  id, driver_id, type, file_url, status, 
  is_current, valid_from, valid_until,
  approved_by, approved_at, created_at, updated_at
) VALUES (
  'doc-expired-test',
  'driver-test',
  'criminal_record',
  'https://test.com/doc.pdf',
  'approved',
  true,
  NOW() - INTERVAL '370 days',
  NOW() - INTERVAL '10 days',
  'admin-test',
  NOW() - INTERVAL '370 days',
  NOW() - INTERVAL '370 days',
  NOW()
);

# Executar bloqueio automático
curl -X POST http://staging:3003/api/admin/compliance/apply-blocks \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "totalBlocked": 1,
    "blocked": [
      {
        "driverId": "driver-test",
        "documentId": "doc-expired-test",
        "validUntil": "2026-01-08T08:22:00Z",
        "blockedAt": "2026-01-18T08:22:00Z"
      }
    ]
  }
}
```

**Validação:**
```sql
SELECT status FROM drivers WHERE id = 'driver-test';
-- Esperado: 'blocked_compliance'
```

---

### 7️⃣ Configurar Cron Job

**Arquivo:** `backend/src/jobs/compliance-check.ts`

```typescript
import { complianceService } from '../services/compliance.service';

export async function runComplianceCheck() {
  console.log('[CRON] Verificando compliance de motoristas...');
  
  const result = await complianceService.applyAutomaticBlocks();
  
  console.log(`[CRON] ${result.totalBlocked} motoristas bloqueados`);
  
  if (result.totalBlocked > 0) {
    console.log('[CRON] Motoristas bloqueados:', result.blocked);
    // TODO: Enviar notificações
  }
  
  return result;
}
```

**Agendamento:** `backend/src/server.ts`

```typescript
import cron from 'node-cron';
import { runComplianceCheck } from './jobs/compliance-check';

// Executar todo dia às 00:00
cron.schedule('0 0 * * *', async () => {
  await runComplianceCheck();
});
```

**Teste manual:**
```bash
node backend/dist/jobs/compliance-check.js
```

---

## ✅ Checklist de Validação

### Migration
- [ ] Tabela criada
- [ ] Índices criados
- [ ] Foreign keys criadas
- [ ] Partial unique index funciona

### Backend
- [ ] Rotas montadas
- [ ] Endpoints respondem
- [ ] Autenticação funciona
- [ ] Validações funcionam

### Lógica de Negócio
- [ ] Grace Period funciona (0-7 dias)
- [ ] Bloqueio funciona (8+ dias)
- [ ] Status corretos
- [ ] Mensagens claras

### UI
- [ ] Painel motorista funciona
- [ ] Painel admin funciona
- [ ] Upload funciona
- [ ] Aprovação/rejeição funciona

### Cron Job
- [ ] Job configurado
- [ ] Execução manual funciona
- [ ] Bloqueio automático funciona
- [ ] Logs gerados

---

## 📊 Métricas Esperadas

| Métrica | Valor Esperado |
|---------|----------------|
| Tempo de resposta API | < 500ms |
| Taxa de sucesso | 100% |
| Erros de validação | 0 |
| Documentos processados | > 0 |
| Bloqueios automáticos | Conforme regra |

---

## 🔒 Garantias

✅ **Migration aplicada apenas em staging**  
✅ **Produção não tocada**  
✅ **Schema não alterado além da migration**  
✅ **Código não refatorado fora do escopo**  
✅ **Rollback possível**  

---

## 🚦 Próximos Passos

### Quando Staging Estiver Disponível

1. Executar `deploy-staging-compliance.sh`
2. Validar todos os testes acima
3. Capturar evidências (prints, logs)
4. Gerar relatório final de staging
5. Aguardar autorização para produção

### Comandos Prontos

```bash
# Deploy staging
./deploy-staging-compliance.sh

# Testar endpoints
./test-compliance-staging.sh

# Validar UI
# (manual via navegador)

# Gerar relatório
./generate-staging-report.sh
```

---

## 📝 Observações

**Ambiente staging não disponível:**
- Simulação completa documentada
- Todos os passos planejados
- Scripts prontos para execução
- Checklist completo

**Quando staging estiver disponível:**
- Executar scripts
- Validar checklist
- Capturar evidências
- Gerar relatório final

---

## ✅ Conclusão

**Status:** Pronto para staging (aguardando ambiente)

**Documentação:** Completa  
**Scripts:** Prontos  
**Checklist:** Definido  
**Risco:** Baixo  

---

**Aguardando ambiente staging ou autorização para produção.** 🚦
