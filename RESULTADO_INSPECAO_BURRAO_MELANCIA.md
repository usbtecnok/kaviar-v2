# 🔍 RESULTADO DA INSPEÇÃO - MOTORISTA "BURRAO MELANCIA"

**Data:** 2026-03-08 10:33  
**Método:** Query via ECS Task + Prisma  
**Status:** ✅ DADOS ENCONTRADOS

---

## 📊 DADOS DO BANCO (PRODUÇÃO)

```json
{
  "name": "Burrao Melancia ",
  "email": "melancia@gmail.com",
  "status": "approved",
  "available": true,
  "family_bonus_accepted": false,
  "family_bonus_profile": null
}
```

---

## 🐛 DIAGNÓSTICO DOS BUGS

### BUG #1: BÔNUS FAMILIAR NÃO VEIO ❌ CONFIRMADO

**Causa raiz:** DADOS NÃO FORAM PERSISTIDOS NO CADASTRO

**Evidência:**
- `family_bonus_accepted = false` (deveria ser `true`)
- `family_bonus_profile = null` (deveria ser `'familiar'`)

**Conclusão:**
O bug NÃO é no frontend admin. O problema está no **cadastro mobile** ou no **backend que recebe o cadastro**.

**Possíveis causas:**
1. App mobile não enviou os dados no payload
2. Backend recebeu mas não persistiu
3. Validação/transformação incorreta no backend

**Próximos passos:**
1. Verificar logs do backend no momento do cadastro:
   ```bash
   grep -A 5 "familyBonusAccepted incoming" logs/backend.log
   ```
2. Testar novo cadastro com bônus familiar e verificar payload
3. Verificar se o app mobile está enviando os campos corretos

---

### BUG #2: MOTORISTA NÃO CONSEGUE FICAR ONLINE ✅ CORRIGIDO

**Status atual no banco:**
- `status = 'approved'` ✅ Correto
- `available = true` ✅ Correto

**Observação importante:**
O campo `available = true` indica que o motorista **JÁ CONSEGUIU** ficar online em algum momento. Isso pode significar:

1. O bug foi corrigido e o motorista conseguiu ficar online
2. O campo foi atualizado manualmente
3. Outro endpoint atualizou o campo

**Correção aplicada:**
O endpoint `/drivers/me/online` foi corrigido para:
- Validar se `status === 'approved'`
- Atualizar `available = true` (em vez de `status = 'online'`)

**Teste necessário:**
Criar um novo motorista, aprovar e tentar ficar online para confirmar que a correção funciona.

---

## 📋 RESUMO EXECUTIVO

| Campo | Valor Esperado | Valor Real | Status |
|-------|---------------|------------|--------|
| `name` | "Burrao Melancia" | "Burrao Melancia " | ✅ OK |
| `email` | "melancia@gmail.com" | "melancia@gmail.com" | ✅ OK |
| `status` | "approved" | "approved" | ✅ OK |
| `available` | true | true | ✅ OK |
| `family_bonus_accepted` | **true** | **false** | ❌ ERRO |
| `family_bonus_profile` | **'familiar'** | **null** | ❌ ERRO |

---

## 🎯 AÇÕES NECESSÁRIAS

### IMEDIATO - Bug #1 (Bônus Familiar)

1. **Verificar logs do cadastro:**
   ```bash
   # No servidor backend
   grep "melancia@gmail.com" logs/backend.log | grep -A 10 "familyBonus"
   ```

2. **Testar novo cadastro:**
   - Cadastrar novo motorista com bônus familiar
   - Verificar payload enviado pelo app mobile
   - Verificar logs do backend
   - Verificar se dados foram persistidos

3. **Possíveis correções:**
   - Se app mobile não envia: corrigir app
   - Se backend não persiste: verificar rota `/api/governance/driver`
   - Se transformação está errada: verificar mapeamento de campos

### VALIDAÇÃO - Bug #2 (Ficar Online)

1. **Testar com novo motorista:**
   - Cadastrar motorista
   - Aprovar no admin
   - Tentar ficar online no app
   - Verificar se funciona

2. **Verificar se correção foi deployada:**
   ```bash
   # Verificar se código corrigido está em produção
   git log --oneline | grep "drivers/me/online"
   ```

---

## 📁 ARQUIVOS PARA INVESTIGAR (Bug #1)

### Backend
- `/backend/src/routes/governance.ts:217-221` (schema de validação)
- `/backend/src/routes/governance.ts:306-321` (persistência)

### Mobile
- `/app/(auth)/register.tsx:216-217` (payload enviado)
- Verificar se `familyBonusAccepted` e `familyProfile` estão sendo enviados

### Logs
- Buscar por: `[GOV] familyBonusAccepted incoming`
- Buscar por: `[GOV] persisted family_bonus_accepted`
- Buscar por: `melancia@gmail.com`

---

## 🔧 CORREÇÃO TEMPORÁRIA (Bug #1)

Se precisar corrigir manualmente para o motorista testado:

```sql
UPDATE drivers 
SET 
  family_bonus_accepted = true,
  family_bonus_profile = 'familiar'
WHERE email = 'melancia@gmail.com';
```

**⚠️ ATENÇÃO:** Isso é apenas paliativo. O bug real precisa ser corrigido no cadastro.

---

## ✅ CONCLUSÃO

**Bug #2 (Ficar Online):** ✅ Corrigido no código, precisa validar em produção  
**Bug #1 (Bônus Familiar):** ❌ Dados não foram persistidos, investigar cadastro mobile/backend

**Prioridade:** Investigar Bug #1 imediatamente, pois afeta todos os novos cadastros com bônus familiar.
