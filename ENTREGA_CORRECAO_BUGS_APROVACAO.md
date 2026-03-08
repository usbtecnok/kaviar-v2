# 🚨 ENTREGA - CORREÇÃO BUGS CRÍTICOS PÓS-APROVAÇÃO

**Motorista Testado:** Burrao melancia  
**Data:** 2026-03-08  
**Status:** ✅ BUG #2 CORRIGIDO | ⏳ BUG #1 PRECISA VALIDAÇÃO SQL

---

## 🐛 BUG #2: MOTORISTA NÃO CONSEGUE FICAR ONLINE [CORRIGIDO]

### Causa Raiz
Endpoint `/drivers/me/online` estava atualizando o campo **errado**:
- ❌ Atualizava `status = 'online'` (campo de aprovação)
- ✅ Deveria atualizar `available = true` (campo de disponibilidade)

### Correção Aplicada
**Arquivo:** `/backend/src/routes/drivers.ts`

**Mudanças:**
1. Validar se `status === 'approved'` antes de permitir ficar online
2. Atualizar `available = true` em vez de `status = 'online'`
3. Retornar erro 403 se motorista não estiver aprovado

**Código corrigido:**
```typescript
// Antes:
data: {
  status: 'online',  // ❌ ERRADO
  last_active_at: new Date()
}

// Depois:
if (driver.status !== 'approved') {
  return res.status(403).json({
    error: 'Apenas motoristas aprovados podem ficar online'
  });
}

data: {
  available: true,  // ✅ CORRETO
  available_updated_at: new Date(),
  last_active_at: new Date()
}
```

### Teste de Validação
```bash
# 1. Aprovar motorista no admin
# 2. No app mobile, clicar em "Ficar Online"
# 3. Verificar no banco:
SELECT name, status, available FROM drivers WHERE name ILIKE '%Burrao%';
# Esperado: status='approved', available=true
```

---

## 🐛 BUG #1: BÔNUS FAMILIAR NÃO APARECE [PRECISA VALIDAÇÃO]

### Causa Raiz (Hipótese)
Duas possibilidades:
1. **Dados não foram persistidos** no cadastro
2. **Frontend admin lendo campo errado** (fallback confuso)

### Validação Necessária
**Rodar query SQL primeiro:**
```sql
SELECT 
  name, 
  email,
  family_bonus_accepted,
  family_bonus_profile,
  status
FROM drivers 
WHERE name ILIKE '%Burrao%melancia%';
```

**Resultado esperado:**
- `family_bonus_accepted = true`
- `family_bonus_profile = 'familiar'`

### Se dados ESTIVEREM no banco:
Problema é visual no frontend. Arquivos envolvidos:
- `/frontend-app/src/pages/admin/DriverApproval.jsx:63-64`
- `/frontend-app/src/pages/admin/DriverDetail.jsx:95-96`

Fallback desnecessário:
```typescript
// Linha confusa:
const accepted = d?.family_bonus_accepted ?? d?.familyBonusAccepted ?? d?.familyBonus?.accepted;

// Deveria ser apenas:
const accepted = d?.family_bonus_accepted;
```

### Se dados NÃO ESTIVEREM no banco:
Problema no cadastro mobile. Verificar payload enviado:
- App mobile: `/app/(auth)/register.tsx:216-217`
- Backend: `/backend/src/routes/governance.ts:320-321`

---

## 📊 QUERY SQL COMPLETA PARA INSPEÇÃO

```bash
# Query salva em:
cat /tmp/inspect_driver.sql

# Executar no banco:
psql $DATABASE_URL -f /tmp/inspect_driver.sql
```

**Queries incluídas:**
1. Dados básicos do motorista (status, bônus, disponibilidade)
2. Documentos enviados e status
3. Consentimento LGPD
4. Registro de verificação/aprovação

---

## 📁 ARQUIVOS MODIFICADOS

### ✅ Corrigidos
- `/backend/src/routes/drivers.ts` (Bug #2)

### 📄 Documentação
- `/home/goes/kaviar/ANALISE_BUGS_CRITICOS_APROVACAO.md` (análise completa)
- `/tmp/inspect_driver.sql` (queries de inspeção)

### ⏳ Aguardando validação SQL
- `/frontend-app/src/pages/admin/DriverApproval.jsx` (Bug #1 - se necessário)
- `/frontend-app/src/pages/admin/DriverDetail.jsx` (Bug #1 - se necessário)

---

## 🎯 PRÓXIMOS PASSOS

### Imediato
1. ✅ **Testar Bug #2:** Aprovar motorista e tentar ficar online
2. ⏳ **Validar Bug #1:** Rodar query SQL para verificar dados no banco

### Após validação SQL do Bug #1

**Se dados estiverem no banco:**
- Limpar fallbacks no frontend admin
- Testar listagem e detalhe

**Se dados NÃO estiverem no banco:**
- Debugar cadastro mobile
- Verificar payload enviado ao backend
- Verificar logs do backend (console.log já existe)

---

## 🔍 LOGS ÚTEIS

### Backend (governance.ts)
```typescript
// Já existem logs:
console.log('[GOV] familyBonusAccepted incoming:', data.familyBonusAccepted);
console.log('[GOV] familyProfile incoming:', data.familyProfile);
console.log('[GOV] persisted family_bonus_accepted:', driver.family_bonus_accepted);
console.log('[GOV] persisted family_bonus_profile:', driver.family_bonus_profile);
```

### Verificar logs do cadastro:
```bash
# No servidor backend:
grep -A 5 "familyBonusAccepted incoming" logs/backend.log
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

### Bug #2 (Ficar Online)
- [ ] Reiniciar backend
- [ ] Aprovar motorista "Burrao melancia" no admin
- [ ] Abrir app mobile
- [ ] Clicar em "Ficar Online"
- [ ] Verificar se funciona
- [ ] Verificar no banco: `available = true`
- [ ] Testar com motorista não aprovado (deve retornar erro 403)

### Bug #1 (Bônus Familiar)
- [ ] Rodar query SQL: `cat /tmp/inspect_driver.sql | psql $DATABASE_URL`
- [ ] Verificar se `family_bonus_accepted` e `family_bonus_profile` estão no banco
- [ ] Se SIM: corrigir frontend
- [ ] Se NÃO: debugar cadastro mobile
- [ ] Testar novo cadastro com bônus familiar
- [ ] Verificar na listagem do admin
- [ ] Verificar no detalhe do motorista

---

## 📞 SUPORTE

Se precisar de ajuda adicional:
1. Compartilhar resultado da query SQL
2. Compartilhar logs do backend (grep acima)
3. Compartilhar screenshot do admin (listagem e detalhe)
