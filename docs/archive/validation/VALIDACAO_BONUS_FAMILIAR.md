# VALIDAÇÃO: BÔNUS FAMILIAR MOBILE

**Data:** 2026-03-07  
**Commit:** `43e0c28`  
**Status:** ✅ IMPLEMENTADO - AGUARDANDO VALIDAÇÃO

---

## PATCH IMPLEMENTADO

### Arquivos Alterados

**1. Backend:** `backend/src/routes/driver-auth.ts`
- ✅ Adicionado `familyBonusAccepted: z.boolean().optional()` ao schema
- ✅ Adicionado `familyProfile: z.enum(['individual', 'familiar']).optional()` ao schema
- ✅ Persistido `family_bonus_accepted: data.familyBonusAccepted || false`
- ✅ Persistido `family_bonus_profile: data.familyProfile || 'individual'`

**2. Mobile:** `app/(auth)/register.tsx`
- ✅ Adicionado state `familyBonusAccepted`
- ✅ Adicionado UI no step 2 (seção de bônus familiar)
- ✅ Adicionado checkbox com descrição
- ✅ Incluído no payload: `familyBonusAccepted` e `familyProfile`

**3. Documentação:** `ANALISE_BONUS_FAMILIAR.md`
- ✅ Análise completa da divergência
- ✅ Evidências de web, mobile e backend
- ✅ Causa raiz identificada
- ✅ Plano de correção

---

## CONTRATO ALINHADO

### Payload Mobile → Backend

```typescript
{
  name: string,
  email: string,
  phone: string,
  password: string,
  document_cpf: string,
  accepted_terms: boolean,
  vehicle_color: string,
  vehicle_model?: string,
  vehicle_plate?: string,
  neighborhoodId?: string,
  lat?: number,
  lng?: number,
  verificationMethod?: 'GPS_AUTO' | 'MANUAL_SELECTION',
  familyBonusAccepted?: boolean,        // ✅ NOVO
  familyProfile?: 'individual' | 'familiar'  // ✅ NOVO
}
```

### Backend → Banco de Dados

```sql
INSERT INTO drivers (
  ...,
  family_bonus_accepted,  -- boolean, default false
  family_bonus_profile    -- string, default 'individual'
)
```

### Semântica

- `familyBonusAccepted = false` → `familyProfile = 'individual'` (padrão)
- `familyBonusAccepted = true` → `familyProfile = 'familiar'`

---

## INSTRUÇÕES DE VALIDAÇÃO

### PRÉ-REQUISITOS

1. **Backend deployado:**
   ```bash
   # Verificar se backend está rodando com a nova versão
   curl https://api.kaviar.com.br/health
   ```

2. **App mobile atualizado:**
   - Build novo com commit `43e0c28`
   - Ou rodar localmente: `npx expo start`

---

### TESTE 1: Cadastro Mobile COM Bônus Familiar

**Objetivo:** Verificar que checkbox funciona e persiste no banco

**Passos:**
1. Abrir app mobile
2. Ir para tela de registro
3. **Step 1:** Preencher dados pessoais
   - Nome: `Teste Bonus Mobile`
   - Email: `teste.bonus.mobile@kaviar.com`
   - Telefone: `11999999999`
   - Senha: `123456`
   - CPF: `12345678901`
   - Aceitar termos LGPD

4. **Step 2:** Preencher dados do veículo
   - Cor: `Branco`
   - Modelo: `Gol` (opcional)
   - Placa: `ABC1234` (opcional)
   - **✅ MARCAR CHECKBOX "Quero participar do programa de bônus familiar"**

5. **Step 3:** Selecionar bairro
   - Escolher qualquer bairro

6. Finalizar cadastro

**Validação no Banco:**
```sql
SELECT 
  id,
  name,
  email,
  family_bonus_accepted,
  family_bonus_profile,
  status
FROM drivers
WHERE email = 'teste.bonus.mobile@kaviar.com';
```

**Resultado Esperado:**
```
family_bonus_accepted = true
family_bonus_profile = 'familiar'
status = 'pending'
```

---

### TESTE 2: Cadastro Mobile SEM Bônus Familiar

**Objetivo:** Verificar que padrão é `individual` quando não marcado

**Passos:**
1. Abrir app mobile
2. Ir para tela de registro
3. **Step 1:** Preencher dados pessoais
   - Nome: `Teste Sem Bonus Mobile`
   - Email: `teste.sem.bonus.mobile@kaviar.com`
   - Telefone: `11988888888`
   - Senha: `123456`
   - CPF: `98765432109`
   - Aceitar termos LGPD

4. **Step 2:** Preencher dados do veículo
   - Cor: `Preto`
   - **❌ NÃO MARCAR CHECKBOX de bônus familiar**

5. **Step 3:** Selecionar bairro
6. Finalizar cadastro

**Validação no Banco:**
```sql
SELECT 
  id,
  name,
  email,
  family_bonus_accepted,
  family_bonus_profile,
  status
FROM drivers
WHERE email = 'teste.sem.bonus.mobile@kaviar.com';
```

**Resultado Esperado:**
```
family_bonus_accepted = false
family_bonus_profile = 'individual'
status = 'pending'
```

---

### TESTE 3: Admin Exibe Bônus Familiar

**Objetivo:** Verificar que admin mostra bônus familiar de motoristas mobile

**Passos:**
1. Abrir admin: `https://kaviar.com.br/admin`
2. Login como admin
3. Ir para "Aprovação de Motoristas"
4. Buscar motorista `Teste Bonus Mobile`

**Resultado Esperado:**
- ✅ Campo "Bônus Familiar" aparece
- ✅ Valor: "Familiar" ou "Aceito"
- ✅ Mesmo formato que motoristas cadastrados via web

**Passos (motorista sem bônus):**
1. Buscar motorista `Teste Sem Bonus Mobile`

**Resultado Esperado:**
- ✅ Campo "Bônus Familiar" aparece
- ✅ Valor: "Individual" ou "Não aceito"

---

### TESTE 4: Consistência Web vs Mobile

**Objetivo:** Verificar que web e mobile geram mesmos dados

**Passos:**
1. **Cadastrar via WEB:**
   - Ir para `https://kaviar.com.br/onboarding`
   - Preencher formulário
   - Marcar bônus familiar
   - Finalizar

2. **Cadastrar via MOBILE:**
   - Abrir app
   - Preencher formulário
   - Marcar bônus familiar
   - Finalizar

3. **Comparar no banco:**
```sql
SELECT 
  id,
  name,
  email,
  family_bonus_accepted,
  family_bonus_profile,
  created_at
FROM drivers
WHERE email IN ('motorista.web@kaviar.com', 'motorista.mobile@kaviar.com')
ORDER BY created_at DESC;
```

**Resultado Esperado:**
- ✅ Ambos têm `family_bonus_accepted = true`
- ✅ Ambos têm `family_bonus_profile = 'familiar'`
- ✅ Estrutura idêntica

---

### TESTE 5: Retrocompatibilidade

**Objetivo:** Verificar que motoristas antigos não são afetados

**Passos:**
1. **Buscar motorista antigo (antes do patch):**
```sql
SELECT 
  id,
  name,
  email,
  family_bonus_accepted,
  family_bonus_profile,
  created_at
FROM drivers
WHERE created_at < '2026-03-07'
LIMIT 5;
```

**Resultado Esperado:**
- ✅ Motoristas antigos têm `family_bonus_accepted = false` ou `null`
- ✅ Motoristas antigos têm `family_bonus_profile = 'individual'` ou `null`
- ✅ Nenhum erro ou inconsistência

2. **Verificar no admin:**
- Abrir perfil de motorista antigo
- Verificar que campo de bônus familiar aparece (mesmo que null)

---

## CHECKLIST DE VALIDAÇÃO

### Backend
- [ ] Endpoint `/api/auth/driver/register` aceita `familyBonusAccepted`
- [ ] Endpoint `/api/auth/driver/register` aceita `familyProfile`
- [ ] Campos são persistidos no banco corretamente
- [ ] Valores padrão funcionam (`false` e `'individual'`)
- [ ] Não quebra cadastros sem os campos (retrocompatibilidade)

### Mobile
- [ ] Checkbox de bônus familiar aparece no step 2
- [ ] Checkbox pode ser marcado/desmarcado
- [ ] Descrição está clara
- [ ] Payload inclui `familyBonusAccepted` e `familyProfile`
- [ ] Cadastro funciona com checkbox marcado
- [ ] Cadastro funciona com checkbox desmarcado

### Admin
- [ ] Bônus familiar aparece na lista de motoristas
- [ ] Bônus familiar aparece no detalhe do motorista
- [ ] Valor é exibido corretamente (Familiar vs Individual)
- [ ] Motoristas mobile e web aparecem iguais

### Consistência
- [ ] Web e mobile geram mesmos dados no banco
- [ ] Admin exibe igual para web e mobile
- [ ] Motoristas antigos não são afetados
- [ ] Nenhum erro de validação ou persistência

---

## QUERIES ÚTEIS

### Ver todos os motoristas com bônus familiar
```sql
SELECT 
  id,
  name,
  email,
  family_bonus_accepted,
  family_bonus_profile,
  created_at
FROM drivers
WHERE family_bonus_accepted = true
ORDER BY created_at DESC;
```

### Ver motoristas cadastrados hoje
```sql
SELECT 
  id,
  name,
  email,
  family_bonus_accepted,
  family_bonus_profile,
  created_at
FROM drivers
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;
```

### Contar por tipo de perfil
```sql
SELECT 
  family_bonus_profile,
  COUNT(*) as total
FROM drivers
GROUP BY family_bonus_profile;
```

---

## ROLLBACK (SE NECESSÁRIO)

Se houver problema, reverter commit:

```bash
cd /home/goes/kaviar
git revert 43e0c28
git push origin main
```

Ou fazer rollback manual:

**Backend:**
- Remover `familyBonusAccepted` e `familyProfile` do schema
- Remover persistência dos campos

**Mobile:**
- Remover seção de bônus familiar do step 2
- Remover campos do payload

---

## PRÓXIMOS PASSOS

Após validação bem-sucedida:

1. ✅ Marcar feature como completa
2. ✅ Atualizar documentação de onboarding
3. ✅ Comunicar time sobre nova funcionalidade
4. ✅ Monitorar uso do bônus familiar nos próximos dias

---

## CONTATO

Dúvidas ou problemas na validação:
- Verificar logs do backend
- Verificar console do app mobile
- Consultar `ANALISE_BONUS_FAMILIAR.md` para detalhes técnicos
