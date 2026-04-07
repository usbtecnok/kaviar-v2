# ANÁLISE CIRÚRGICA: BÔNUS FAMILIAR

**Data:** 2026-03-07  
**Status:** DIVERGÊNCIA IDENTIFICADA - Web tem, Mobile não tem

---

## DIAGNÓSTICO

### 1. FRONTEND WEB ✅ TEM BÔNUS FAMILIAR

**Arquivo:** `frontend-app/src/pages/onboarding/CompleteOnboarding.jsx`

**Campos no formulário:**
```javascript
familyProfile: 'individual', // individual | familiar
familyBonusAccepted: false
```

**Payload enviado:**
```javascript
await fetch(`${API_BASE_URL}/api/driver/onboarding`, {
  method: 'POST',
  body: JSON.stringify({
    name: clean.name,
    email: clean.email,
    phone: clean.phone,
    password: clean.password,
    neighborhoodId: clean.neighborhoodId,
    communityId: clean.communityId,
    familyBonusAccepted: clean.familyBonusAccepted,  // ✅
    familyProfile: clean.familyProfile                // ✅
  })
});
```

**Endpoint usado:** `POST /api/driver/onboarding`

**Outros arquivos que usam:**
- `frontend-app/src/pages/admin/DriverApproval.jsx` - Exibe bônus familiar
- `frontend-app/src/pages/admin/DriverDetail.jsx` - Edita bônus familiar
- `frontend-app/src/pages/driver/Home.jsx` - Card de bônus familiar
- `frontend-app/src/components/driver/FamilyBonusCard.jsx` - Componente visual

---

### 2. BACKEND ✅ SUPORTA BÔNUS FAMILIAR

**Schema Prisma:** `backend/prisma/schema.prisma`
```prisma
model drivers {
  family_bonus_accepted  Boolean?  @default(false)
  family_bonus_profile   String?
}
```

**Endpoint Web:** `POST /api/driver/onboarding`
**Arquivo:** `backend/src/routes/driver-onboarding.ts`

```typescript
const schema = z.object({
  familyBonusAccepted: z.boolean().optional(),  // ✅
  familyProfile: z.string().optional()          // ✅
});

// Persiste no banco
await prisma.drivers.create({
  data: {
    family_bonus_accepted: data.familyBonusAccepted || false,
    family_bonus_profile: data.familyProfile || null,
  }
});
```

**Endpoint Mobile:** `POST /api/auth/driver/register`
**Arquivo:** `backend/src/routes/driver-auth.ts`

```typescript
const driverRegisterSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  password: z.string(),
  document_cpf: z.string(),
  accepted_terms: z.boolean(),
  vehicle_color: z.string(),
  vehicle_model: z.string().optional(),
  vehicle_plate: z.string().optional(),
  neighborhoodId: z.string().optional(),
  // ❌ NÃO TEM familyBonusAccepted
  // ❌ NÃO TEM familyProfile
});

// Criação do driver
await prisma.drivers.create({
  data: {
    name: data.name,
    email: data.email,
    // ...
    // ❌ NÃO persiste family_bonus_accepted
    // ❌ NÃO persiste family_bonus_profile
  }
});
```

---

### 3. APP MOBILE ❌ NÃO TEM BÔNUS FAMILIAR

**Arquivo:** `app/(auth)/register.tsx`

**Payload enviado:**
```typescript
const registerPayload = {
  name,
  email,
  phone,
  password,
  document_cpf: documentCpf,
  accepted_terms: true,
  vehicle_color: vehicleColor,
  vehicle_model: vehicleModel || null,
  vehicle_plate: vehiclePlate || null,
  neighborhoodId: selectedNeighborhood?.id,
  // ❌ NÃO envia familyBonusAccepted
  // ❌ NÃO envia familyProfile
};

await fetch(`${API_URL}/api/auth/driver/register`, {
  method: 'POST',
  body: JSON.stringify(registerPayload)
});
```

**Endpoint usado:** `POST /api/auth/driver/register`

**Busca no código:**
```bash
grep -r "family.*bonus\|familyBonus" app/
# Resultado: 0 matches
```

---

## CAUSA RAIZ

### DIVERGÊNCIA ENTRE WEB E MOBILE

**Frontend Web:**
- ✅ Usa endpoint `/api/driver/onboarding`
- ✅ Envia `familyBonusAccepted` e `familyProfile`
- ✅ Backend persiste no banco

**App Mobile:**
- ❌ Usa endpoint `/api/auth/driver/register`
- ❌ NÃO envia `familyBonusAccepted` e `familyProfile`
- ❌ Backend NÃO persiste (campos ficam `null`)

**Resultado:**
- Motoristas cadastrados via **web** → têm bônus familiar
- Motoristas cadastrados via **mobile** → NÃO têm bônus familiar

---

## ANÁLISE DO PROBLEMA

### Por que existem 2 endpoints diferentes?

**`/api/driver/onboarding`** (Web):
- Endpoint mais completo
- Aceita `familyBonusAccepted`, `familyProfile`
- Usado pelo frontend web

**`/api/auth/driver/register`** (Mobile):
- Endpoint mais simples
- Focado em campos básicos + CPF + veículo + território
- Usado pelo app mobile
- Criado para Sprint 1 (CPF, veículo, território)

### É campo descontinuado?

❌ **NÃO**. O campo está ativo e sendo usado:
- Admin exibe bônus familiar
- Frontend web coleta bônus familiar
- Backend persiste e retorna bônus familiar
- Componente `FamilyBonusCard` existe no frontend web

---

## CORREÇÃO

### OPÇÃO A: Adicionar bônus familiar ao endpoint mobile (RECOMENDADA)

**Vantagens:**
- Mantém paridade entre web e mobile
- Motoristas mobile terão mesma experiência que web
- Não quebra nada (campos são opcionais)

**Desvantagens:**
- Precisa adicionar UI no mobile
- Aumenta complexidade do onboarding mobile

### OPÇÃO B: Remover bônus familiar do web

**Vantagens:**
- Simplifica produto
- Remove divergência

**Desvantagens:**
- Perde funcionalidade existente
- Pode impactar motoristas que já usam

### OPÇÃO C: Deixar como está (divergente)

**Vantagens:**
- Não precisa fazer nada

**Desvantagens:**
- Motoristas web e mobile têm experiências diferentes
- Confusão no admin (alguns têm, outros não)
- Produto inconsistente

---

## IMPLEMENTAÇÃO - OPÇÃO A (RECOMENDADA)

### 1. Backend: Adicionar campos ao schema de registro mobile

**Arquivo:** `backend/src/routes/driver-auth.ts`

```typescript
const driverRegisterSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  document_cpf: z.string().min(11, 'CPF deve ter 11 dígitos').max(11, 'CPF deve ter 11 dígitos'),
  accepted_terms: z.boolean().refine(val => val === true, {
    message: 'Você deve aceitar os termos de uso'
  }),
  vehicle_color: z.string().min(2, 'Cor do veículo é obrigatória'),
  vehicle_model: z.string().optional(),
  vehicle_plate: z.string().optional(),
  neighborhoodId: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  verificationMethod: z.enum(['GPS_AUTO', 'MANUAL_SELECTION']).optional(),
  // ✅ ADICIONAR
  familyBonusAccepted: z.boolean().optional(),
  familyProfile: z.enum(['individual', 'familiar']).optional()
});
```

**Persistir no banco:**
```typescript
const driver = await prisma.drivers.create({
  data: {
    id: `driver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: data.name,
    email: data.email,
    phone: data.phone,
    password_hash,
    status: 'pending',
    document_cpf: data.document_cpf,
    vehicle_color: data.vehicle_color,
    vehicle_model: data.vehicle_model || null,
    vehicle_plate: data.vehicle_plate || null,
    neighborhood_id: data.neighborhoodId || null,
    territory_type: territoryType,
    territory_verified_at: data.neighborhoodId ? new Date() : null,
    territory_verification_method: data.verificationMethod || null,
    // ✅ ADICIONAR
    family_bonus_accepted: data.familyBonusAccepted || false,
    family_bonus_profile: data.familyProfile || 'individual',
    created_at: new Date(),
    updated_at: new Date()
  }
});
```

### 2. Mobile: Adicionar UI no registro

**Arquivo:** `app/(auth)/register.tsx`

**Adicionar no Passo 2 (Dados do Veículo):**

```typescript
// Adicionar state
const [familyBonusAccepted, setFamilyBonusAccepted] = useState(false);

// Adicionar no JSX do step 2, após vehicle_plate
<View style={styles.bonusSection}>
  <Text style={styles.sectionTitle}>Bônus Familiar</Text>
  <Text style={styles.sectionDescription}>
    Compartilhe ganhos com sua família (50% para você, 50% para indicado)
  </Text>
  
  <View style={styles.checkboxRow}>
    <TouchableOpacity
      style={[styles.checkbox, familyBonusAccepted && styles.checkboxChecked]}
      onPress={() => setFamilyBonusAccepted(!familyBonusAccepted)}
    >
      {familyBonusAccepted && <Ionicons name="checkmark" size={18} color="#FFF" />}
    </TouchableOpacity>
    <Text style={styles.checkboxLabel}>
      Quero participar do programa de bônus familiar
    </Text>
  </View>
</View>
```

**Adicionar ao payload:**
```typescript
const registerPayload: any = {
  name,
  email,
  phone,
  password,
  document_cpf: documentCpf.replace(/\D/g, ''),
  accepted_terms: true,
  vehicle_color: vehicleColor,
  vehicle_model: vehicleModel || null,
  vehicle_plate: vehiclePlate || null,
  // ✅ ADICIONAR
  familyBonusAccepted: familyBonusAccepted,
  familyProfile: familyBonusAccepted ? 'familiar' : 'individual'
};
```

---

## VALIDAÇÃO

### Teste 1: Registro via Mobile
1. ✅ Cadastrar motorista no app mobile
2. ✅ Marcar checkbox "Bônus Familiar"
3. ✅ Completar cadastro
4. ✅ Verificar no banco: `family_bonus_accepted = true`, `family_bonus_profile = 'familiar'`

### Teste 2: Admin
1. ✅ Abrir admin
2. ✅ Ver motorista cadastrado via mobile
3. ✅ Verificar que bônus familiar aparece corretamente

### Teste 3: Registro via Web
1. ✅ Cadastrar motorista no frontend web
2. ✅ Marcar bônus familiar
3. ✅ Verificar que continua funcionando

---

## ARQUIVOS ENVOLVIDOS

### Frontend Web (já tem)
- `frontend-app/src/pages/onboarding/CompleteOnboarding.jsx`
- `frontend-app/src/pages/admin/DriverApproval.jsx`
- `frontend-app/src/pages/admin/DriverDetail.jsx`
- `frontend-app/src/components/driver/FamilyBonusCard.jsx`

### Backend
- `backend/src/routes/driver-auth.ts` - Adicionar campos ao schema e persist
- `backend/src/routes/driver-onboarding.ts` - Já tem (endpoint web)
- `backend/prisma/schema.prisma` - Já tem colunas

### App Mobile
- `app/(auth)/register.tsx` - Adicionar UI e payload

---

## RESUMO

**Causa Raiz:** Divergência entre endpoints web e mobile

**Web:** `/api/driver/onboarding` com bônus familiar ✅  
**Mobile:** `/api/auth/driver/register` sem bônus familiar ❌

**Correção Mínima:**
1. Backend: Adicionar 2 campos ao schema (2 linhas)
2. Backend: Persistir 2 campos (2 linhas)
3. Mobile: Adicionar checkbox (10 linhas)
4. Mobile: Adicionar ao payload (2 linhas)

**Total:** ~16 linhas de código

**Resultado:** Paridade completa entre web e mobile
