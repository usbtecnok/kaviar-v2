# 🔄 DIFF - Implementação Opção A (Bloqueio Suave)

**Data:** 2026-01-18 08:15 BRT  
**Arquivo:** `backend/src/services/compliance.service.ts`  
**Status:** ⚠️ NÃO APLICADO (aguardando aprovação)

---

## 📊 Resumo das Mudanças

| Tipo | Quantidade | Descrição |
|------|------------|-----------|
| ➕ Adicionado | 1 constante | `GRACE_PERIOD_DAYS = 7` |
| ➕ Adicionado | 1 método | `applyAutomaticBlocks()` |
| ✏️ Modificado | 1 método | `checkRevalidationStatus()` |
| ➕ Adicionado | 1 campo | `shouldBlock` em respostas |
| ➕ Adicionado | 2 status | `expired_grace`, `expired_blocked` |

**Total:** 68 linhas adicionadas

---

## 🔍 Mudanças Detalhadas

### 1️⃣ Nova Constante

```diff
const REVALIDATION_PERIOD_MONTHS = 12;
const WARNING_DAYS = [30, 7];
+ const GRACE_PERIOD_DAYS = 7; // Opção A: Bloqueio Suave
```

**Justificativa:** Define período de tolerância de 7 dias após vencimento

---

### 2️⃣ Método `checkRevalidationStatus()` - Lógica de Bloqueio Suave

#### Antes (Opção C - Apenas Aviso)
```typescript
if (daysUntilExpiration <= 0) {
  return {
    needsRevalidation: true,
    daysUntilExpiration: 0,
    status: 'expired',
    message: 'Documento vencido. Envie um novo atestado.'
  };
}
```

#### Depois (Opção A - Bloqueio Suave)
```typescript
// OPÇÃO A: Bloqueio Suave
if (daysUntilExpiration < -GRACE_PERIOD_DAYS) {
  // Vencido há mais de 7 dias → BLOQUEAR
  return {
    needsRevalidation: true,
    daysUntilExpiration,
    daysOverdue: Math.abs(daysUntilExpiration),
    status: 'expired_blocked',
    shouldBlock: true,
    message: `Documento vencido há ${Math.abs(daysUntilExpiration)} dias. Você está bloqueado até enviar novo atestado.`
  };
}

if (daysUntilExpiration <= 0) {
  // Vencido há 0-7 dias → WARNING (pode trabalhar)
  return {
    needsRevalidation: true,
    daysUntilExpiration,
    daysOverdue: Math.abs(daysUntilExpiration),
    status: 'expired_grace',
    shouldBlock: false,
    message: `Documento vencido há ${Math.abs(daysUntilExpiration)} dias. Você tem ${GRACE_PERIOD_DAYS + daysUntilExpiration} dias para enviar novo atestado antes de ser bloqueado.`
  };
}
```

**Mudanças:**
- ✅ Adiciona verificação de grace period
- ✅ Novo status `expired_grace` (vencido mas pode trabalhar)
- ✅ Novo status `expired_blocked` (vencido e bloqueado)
- ✅ Campo `shouldBlock` indica se deve bloquear
- ✅ Campo `daysOverdue` mostra dias de atraso
- ✅ Mensagem clara sobre tempo restante

---

### 3️⃣ Novo Método `applyAutomaticBlocks()`

```typescript
/**
 * Aplicar bloqueio automático para motoristas com documentos vencidos
 * OPÇÃO A: Bloqueia apenas após grace period (7 dias)
 * 
 * Este método deve ser executado por um cron job diário
 */
async applyAutomaticBlocks() {
  const now = new Date();
  const graceDeadline = new Date();
  graceDeadline.setDate(graceDeadline.getDate() - GRACE_PERIOD_DAYS);

  // Buscar documentos vencidos há mais de 7 dias
  const expiredDocuments = await prisma.driver_compliance_documents.findMany({
    where: {
      is_current: true,
      valid_until: {
        lt: graceDeadline
      }
    },
    include: {
      drivers: {
        select: {
          id: true,
          status: true
        }
      }
    }
  });

  const blocked = [];

  for (const doc of expiredDocuments) {
    // Bloquear apenas se não estiver já bloqueado
    if (doc.drivers.status !== 'blocked_compliance') {
      await prisma.drivers.update({
        where: { id: doc.driver_id },
        data: {
          status: 'blocked_compliance',
          updated_at: now
        }
      });

      blocked.push({
        driverId: doc.driver_id,
        documentId: doc.id,
        validUntil: doc.valid_until,
        blockedAt: now
      });
    }
  }

  return {
    totalBlocked: blocked.length,
    blocked
  };
}
```

**Funcionalidade:**
- ✅ Busca documentos vencidos há mais de 7 dias
- ✅ Bloqueia motoristas automaticamente
- ✅ Evita bloqueio duplicado
- ✅ Retorna lista de motoristas bloqueados
- ✅ Deve ser executado por cron job diário

---

### 4️⃣ Campo `shouldBlock` Adicionado

Todos os retornos de `checkRevalidationStatus()` agora incluem:

```typescript
{
  needsRevalidation: boolean,
  daysUntilExpiration: number | null,
  status: string,
  shouldBlock: boolean,  // ← NOVO
  message: string
}
```

**Valores possíveis:**
- `shouldBlock: false` → Motorista pode trabalhar
- `shouldBlock: true` → Motorista deve ser bloqueado

---

## 📋 Novos Status

### Antes
- `no_document` - Sem documento
- `valid` - Documento válido
- `warning` - Vence em 30 dias
- `expiring_soon` - Vence em 7 dias
- `expired` - Vencido

### Depois
- `no_document` - Sem documento
- `valid` - Documento válido
- `warning` - Vence em 30 dias
- `expiring_soon` - Vence em 7 dias
- `expired_grace` - Vencido há 0-7 dias (pode trabalhar) ← NOVO
- `expired_blocked` - Vencido há 8+ dias (bloqueado) ← NOVO

---

## 🎯 Fluxo de Bloqueio Suave

### Timeline

```
Dia -30: ⚠️  Warning (vence em 30 dias)
Dia -7:  ⚠️  Expiring Soon (vence em 7 dias)
Dia 0:   🟡 VENCEU → Grace Period (pode trabalhar)
Dia +1:  🟡 Grace Period (6 dias restantes)
Dia +2:  🟡 Grace Period (5 dias restantes)
Dia +3:  🟡 Grace Period (4 dias restantes)
Dia +4:  🟡 Grace Period (3 dias restantes)
Dia +5:  🟡 Grace Period (2 dias restantes)
Dia +6:  🟡 Grace Period (1 dia restante)
Dia +7:  🟡 Grace Period (último dia)
Dia +8:  🔴 BLOQUEADO (não pode aceitar corridas)
```

---

## 🧪 Exemplos de Resposta

### Cenário 1: Documento Válido
```json
{
  "needsRevalidation": false,
  "daysUntilExpiration": 100,
  "status": "valid",
  "shouldBlock": false,
  "message": "Documento válido"
}
```

### Cenário 2: Vencendo em 25 dias
```json
{
  "needsRevalidation": false,
  "daysUntilExpiration": 25,
  "status": "warning",
  "shouldBlock": false,
  "message": "Seu atestado vence em 25 dias."
}
```

### Cenário 3: Vencido há 3 dias (Grace Period)
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

### Cenário 4: Vencido há 10 dias (Bloqueado)
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

## 🔄 Cron Job Necessário

### Implementação Recomendada

```typescript
// backend/src/jobs/compliance-check.ts
import { complianceService } from '../services/compliance.service';

export async function runComplianceCheck() {
  console.log('[CRON] Verificando compliance de motoristas...');
  
  const result = await complianceService.applyAutomaticBlocks();
  
  console.log(`[CRON] ${result.totalBlocked} motoristas bloqueados`);
  
  if (result.totalBlocked > 0) {
    console.log('[CRON] Motoristas bloqueados:', result.blocked);
    // TODO: Enviar notificações (email, WhatsApp, push)
  }
  
  return result;
}
```

### Agendamento (node-cron)

```typescript
import cron from 'node-cron';
import { runComplianceCheck } from './jobs/compliance-check';

// Executar todo dia às 00:00
cron.schedule('0 0 * * *', async () => {
  await runComplianceCheck();
});
```

---

## ✅ Checklist de Implementação

### Código
- [x] Constante `GRACE_PERIOD_DAYS` adicionada
- [x] Método `checkRevalidationStatus()` modificado
- [x] Método `applyAutomaticBlocks()` criado
- [x] Campo `shouldBlock` adicionado
- [x] Novos status criados

### Testes
- [ ] Testar grace period (0-7 dias)
- [ ] Testar bloqueio após 8 dias
- [ ] Testar `applyAutomaticBlocks()`
- [ ] Testar mensagens para motorista

### Infraestrutura
- [ ] Configurar cron job
- [ ] Configurar notificações
- [ ] Configurar logs

### Documentação
- [x] Diff gerado
- [x] Exemplos documentados
- [ ] README atualizado

---

## 🚦 Próximos Passos

### 1. Aprovar Diff
**Decisão:** Aprovar ou solicitar ajustes

### 2. Aplicar Mudanças
```bash
# Substituir arquivo original
mv backend/src/services/compliance.service.NEW.ts backend/src/services/compliance.service.ts
```

### 3. Testar em Dev
```bash
# Executar testes
npm test -- compliance.service
```

### 4. Aplicar Migration
```bash
# Staging
psql $DATABASE_URL_STAGING < backend/prisma/migrations/20260117_driver_compliance_documents.sql
```

### 5. Configurar Cron Job
```bash
# Adicionar job de compliance check
```

---

## 📊 Impacto

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Bloqueio | Manual | Automático (após 7 dias) |
| Grace Period | Não | Sim (7 dias) |
| Mensagens | Genéricas | Específicas com countdown |
| Defensabilidade | Média | Alta |
| Complexidade | Baixa | Média |

---

## ⚠️ Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Cron job falhar | Baixa | Alto | Monitoramento + alertas |
| Bloqueio indevido | Muito Baixa | Alto | Logs + rollback manual |
| Motorista não ver aviso | Média | Médio | Notificações múltiplas |

---

## 🎯 Conclusão

**Mudanças:** 68 linhas adicionadas  
**Complexidade:** Média  
**Risco:** Baixo  
**Benefício:** Alto  

**Status:** ⚠️ Aguardando aprovação do diff

**Recomendação:** Aprovar e testar em staging

---

**Aguardando decisão: Aprovar diff?** 🚦
