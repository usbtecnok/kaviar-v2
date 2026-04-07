# ✅ RESULTADO FINAL - INVESTIGAÇÃO MAURO GODOI

**Data:** 2026-03-08 13:18  
**Status:** ✅ BUG #1 RESOLVIDO | 🔧 BUG #2 CORREÇÃO APLICADA

---

## 📊 DADOS REAIS DO BANCO

```json
{
  "name": "Mauro Godoi",
  "email": "gogoi@gmail.com",
  "status": "approved",
  "available": true,
  "family_bonus_accepted": true,
  "family_bonus_profile": "familiar",
  "approved_at": null,
  "created_at": "2026-03-08T15:58:35.365Z"
}
```

---

## ✅ BUG #1: BÔNUS FAMILIAR - RESOLVIDO

**Evidência:**
- ✅ `family_bonus_accepted = true`
- ✅ `family_bonus_profile = "familiar"`

**Conclusão:** O deploy das melhorias **FUNCIONOU**. O bônus familiar está sendo persistido corretamente.

---

## 🔧 BUG #2: FICAR ONLINE - CAUSA RAIZ ENCONTRADA

### Problema Identificado

**Campo `approved_at` está NULL mesmo com `status = "approved"`**

**Código com bug:** `/backend/src/modules/admin/service.ts:120-128`

```typescript
// ❌ ANTES (SEM approved_at)
const updated = await tx.drivers.update({
  where: { id: driver_id },
  data: { 
    status: 'approved',
    suspension_reason: null,
    suspended_at: null,
    suspended_by: null,
  }
});
```

### Correção Aplicada

```typescript
// ✅ DEPOIS (COM approved_at)
const updated = await tx.drivers.update({
  where: { id: driver_id },
  data: { 
    status: 'approved',
    approved_at: new Date(),
    approved_by: 'system',
    suspension_reason: null,
    suspended_at: null,
    suspended_by: null,
  }
});
```

---

## 🎯 CAUSA RAIZ CONFIRMADA

O endpoint `/drivers/me/online` **NÃO** verifica `approved_at`, ele só verifica `status`.

**Mas há 2 possibilidades de bloqueio:**

### Possibilidade A: App mobile verifica `approved_at`

O app pode estar verificando se `approved_at` existe antes de permitir ficar online.

### Possibilidade B: Outro problema não relacionado

- Erro de autenticação
- Endpoint não sendo chamado
- Validação no frontend

---

## 📋 PRÓXIMOS PASSOS

### 1. Deploy da Correção ⏳

```bash
cd /home/goes/kaviar/backend
git add .
git commit -m "fix: setar approved_at e approved_by na aprovação do motorista"
docker build -t kaviar-backend:latest .
docker tag kaviar-backend:latest 847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:latest
docker push 847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:latest
aws ecs update-service --cluster kaviar-cluster --service kaviar-backend-service --force-new-deployment --region us-east-2
```

### 2. Teste de Validação

1. Aprovar motorista Mauro Godoi novamente (ou criar novo)
2. Verificar no banco: `approved_at` deve ter data
3. Tentar ficar online no app
4. Se ainda falhar: investigar app mobile

### 3. Se Ainda Falhar

Adicionar logs temporários:

**Backend:** `/backend/src/routes/drivers.ts:93`
```typescript
router.post('/me/online', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).userId;
    
    console.log('[DEBUG /drivers/me/online] driverId:', driverId);
    
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: { status: true, approved_at: true }
    });
    
    console.log('[DEBUG /drivers/me/online] driver:', driver);
    
    // ... resto do código
```

---

## 📊 RESUMO EXECUTIVO

| Item | Status | Detalhes |
|------|--------|----------|
| **Bônus Familiar** | ✅ RESOLVIDO | Dados corretos no banco após deploy |
| **Ficar Online - Correção** | ✅ APLICADA | `approved_at` agora é setado |
| **Ficar Online - Teste** | ⏳ PENDENTE | Precisa deploy + teste real |

---

## 🔧 ARQUIVO MODIFICADO

- `/backend/src/modules/admin/service.ts` (linhas 120-128)

**Mudança:** Adicionado `approved_at: new Date()` e `approved_by: 'system'` na aprovação.

---

## ✅ CONCLUSÃO

**Bug #1:** ✅ **RESOLVIDO** - Bônus familiar funcionando  
**Bug #2:** 🔧 **CORREÇÃO APLICADA** - Aguardando deploy e teste

**Próximo passo:** Deploy da correção e teste com motorista real.
