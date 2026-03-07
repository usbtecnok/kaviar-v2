# DIAGNÓSTICO KAVIAR: Onboarding Motorista vs Aprovação Admin

## 1. FONTE DE VERDADE: Requisitos de Aprovação Admin

### Backend: `driver-verification.ts` - `evaluateEligibility()`

**Requisitos OBRIGATÓRIOS para aprovação:**

#### A. LGPD Consent
- Tabela: `consents`
- Tipo: `lgpd`
- Status: `accepted = true`
- **Bloqueante:** SIM

#### B. Documentos Obrigatórios (6 tipos - TODOS bloqueantes)
1. **CPF** - Cadastro de Pessoa Física
2. **RG** - Documento de identidade
3. **CNH** - Carteira de habilitação
4. **PROOF_OF_ADDRESS** - Comprovante de residência
5. **VEHICLE_PHOTO** - Foto do veículo
6. **BACKGROUND_CHECK** - Antecedentes criminais (certidão de nada consta)

- Status aceito: `SUBMITTED` ou `VERIFIED`
- **Bloqueante:** SIM - TODOS os 6 documentos são obrigatórios

#### C. Cor do Veículo
- Campo: `drivers.vehicle_color`
- **Bloqueante:** SIM

#### D. Território/Bairro
- Campo: `drivers.neighborhood_id`
- **Bloqueante:** NÃO (opcional, pode ser atribuído depois)

---

## 2. GAP ANALYSIS: App vs Admin

### O que o APP COLETA hoje:

```tsx
// app/(auth)/register.tsx
✅ name
✅ email
✅ phone
✅ password
✅ neighborhoodId (opcional)
✅ lat/lng (GPS)
✅ verificationMethod
```

### O que o APP NÃO COLETA:

```
❌ LGPD Consent (aceite de termos)
❌ CPF
❌ RG (obrigatório)
❌ CNH (obrigatório)
❌ Comprovante de residência (obrigatório)
❌ Foto do veículo (obrigatório)
❌ Antecedentes criminais - certidão de nada consta (obrigatório)
❌ vehicle_color (cor do carro)
❌ vehicle_model (modelo do carro)
❌ vehicle_plate (placa do carro)
```

### O que o BACKEND ESPERA mas não recebe:

```typescript
// backend/src/services/driver-verification.ts
requiredDocs = [
  'CPF',              // ❌ App não coleta
  'RG',               // ❌ App não coleta
  'CNH',              // ❌ App não coleta
  'PROOF_OF_ADDRESS', // ❌ App não coleta
  'VEHICLE_PHOTO',    // ❌ App não coleta
  'BACKGROUND_CHECK'  // ❌ App não coleta
];

// Validação de cor do veículo
if (!driver?.vehicle_color) {
  missingRequirements.push('VEHICLE_COLOR'); // ❌ App não coleta
}
```

---

## 3. MATRIZ DE PRIORIDADE

### 🔴 CRÍTICO - Bloqueante para aprovação

| Item | Status App | Impacto | Complexidade |
|------|-----------|---------|--------------|
| LGPD Consent | ❌ Ausente | ALTO - Compliance legal | BAIXA |
| vehicle_color | ❌ Ausente | ALTO - Bloqueante backend | BAIXA |
| CPF | ❌ Ausente | ALTO - Bloqueante backend | MÉDIA |
| RG | ❌ Ausente | ALTO - Bloqueante backend | MÉDIA |
| CNH | ❌ Ausente | ALTO - Bloqueante backend | MÉDIA |
| PROOF_OF_ADDRESS | ❌ Ausente | ALTO - Bloqueante backend | MÉDIA |
| VEHICLE_PHOTO | ❌ Ausente | ALTO - Bloqueante backend | MÉDIA |
| BACKGROUND_CHECK | ❌ Ausente | ALTO - Bloqueante backend | ALTA |

### 🟡 IMPORTANTE - Melhora UX/Operação

| Item | Status App | Impacto | Complexidade |
|------|-----------|---------|--------------|
| vehicle_model | ❌ Ausente | MÉDIO - Identificação | BAIXA |
| vehicle_plate | ❌ Ausente | MÉDIO - Identificação | BAIXA |
| neighborhoodId | ⚠️ Parcial | MÉDIO - Território | BAIXA |

---

## 4. PLANO DE CORREÇÃO ÚNICO

### FASE 1: Dados Básicos + Compliance (CRÍTICO)

**Objetivo:** Coletar dados mínimos para permitir aprovação manual posterior

#### Frontend (app/(auth)/register.tsx)

**Step 1: Dados Pessoais**
```tsx
- name ✅ (já existe)
- email ✅ (já existe)
- phone ✅ (já existe)
- password ✅ (já existe)
+ document_cpf (novo - obrigatório)
+ acceptedTerms (novo - obrigatório)
```

**Step 2: Dados do Veículo**
```tsx
+ vehicle_color (novo - obrigatório)
+ vehicle_model (novo - opcional)
+ vehicle_plate (novo - opcional)
```

**Step 3: Território**
```tsx
- neighborhoodId ✅ (já existe - opcional)
```

#### Backend (driver-auth.ts)

```typescript
const driverRegisterSchema = z.object({
  // Existentes
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(6),
  neighborhoodId: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  verificationMethod: z.enum(['GPS_AUTO', 'MANUAL_SELECTION']).optional(),
  
  // NOVOS - CRÍTICOS
  document_cpf: z.string().min(11).max(14), // CPF com ou sem formatação
  acceptedTerms: z.boolean().refine(val => val === true),
  vehicle_color: z.string().min(2),
  
  // NOVOS - OPCIONAIS
  vehicle_model: z.string().optional(),
  vehicle_plate: z.string().optional()
});

// No create do driver
data: {
  // ... campos existentes
  document_cpf: data.document_cpf,
  vehicle_color: data.vehicle_color,
  vehicle_model: data.vehicle_model || null,
  vehicle_plate: data.vehicle_plate || null
}

// Registrar consent LGPD
await prisma.consents.create({
  data: {
    id: `consent_${driver.id}_lgpd_${Date.now()}`,
    user_id: driver.id,
    subject_type: 'DRIVER',
    subject_id: driver.id,
    type: 'lgpd',
    accepted: true,
    accepted_at: new Date(),
    ip_address: req.ip,
    user_agent: req.headers['user-agent']
  }
});
```

#### Migration

```sql
-- Campos já existem no schema, apenas garantir que estão no banco
ALTER TABLE drivers 
  ALTER COLUMN vehicle_color TYPE VARCHAR(50),
  ALTER COLUMN vehicle_model TYPE VARCHAR(100),
  ALTER COLUMN vehicle_plate TYPE VARCHAR(20);

-- Consent já existe na tabela consents
```

---

### FASE 2: Upload de Documentos (CRÍTICO - 6 documentos obrigatórios)

**Estratégia:** Motorista cadastra → status `pending` → Envia documentos → Admin verifica → Admin aprova

**Documentos obrigatórios (bloqueantes para aprovação):**
1. RG (frente e verso)
2. CNH (frente e verso)
3. Comprovante de residência
4. Foto do veículo (4 ângulos)
5. Antecedentes criminais (certidão de nada consta)
6. CPF (✅ já coletado na Sprint 1)

**Opção A - Processo Manual (MVP):**
- Admin solicita documentos via WhatsApp
- Motorista envia fotos
- Admin faz upload no painel
- Admin verifica e aprova

**Opção B - Upload no App (automatizado):**
- Implementar tela de upload
- Integração com S3
- Preview e validação
- Envio direto para análise

**IMPORTANTE:** Sem os 6 documentos completos, o backend **rejeita a aprovação** com erro "Documentos obrigatórios pendentes".

---

## 5. PATCH MÍNIMO POR BLOCO

### BLOCO 1: Frontend - Adicionar campos obrigatórios

**Arquivo:** `app/(auth)/register.tsx`

```tsx
// Após campos existentes no Step 1
const [documentCpf, setDocumentCpf] = useState('');
const [acceptedTerms, setAcceptedTerms] = useState(false);

// Novo Step 1.5: Dados do Veículo
const [vehicleColor, setVehicleColor] = useState('');
const [vehicleModel, setVehicleModel] = useState('');
const [vehiclePlate, setVehiclePlate] = useState('');

// Validação Step 1
if (!documentCpf || documentCpf.length < 11) {
  Alert.alert('Erro', 'CPF inválido');
  return;
}
if (!acceptedTerms) {
  Alert.alert('Erro', 'Você deve aceitar os termos de uso');
  return;
}

// Validação Step 1.5
if (!vehicleColor) {
  Alert.alert('Erro', 'Informe a cor do veículo');
  return;
}

// No payload de registro
registerPayload.document_cpf = documentCpf.replace(/\D/g, ''); // Remove formatação
registerPayload.acceptedTerms = true;
registerPayload.vehicle_color = vehicleColor;
registerPayload.vehicle_model = vehicleModel || null;
registerPayload.vehicle_plate = vehiclePlate || null;
```

### BLOCO 2: Backend - Validar e persistir

**Arquivo:** `backend/src/routes/driver-auth.ts`

```typescript
// Atualizar schema (já mostrado acima)

// No handler de registro, após criar driver:
// Registrar consent LGPD
await prisma.consents.create({
  data: {
    id: `consent_${driver.id}_lgpd_${Date.now()}`,
    user_id: driver.id,
    subject_type: 'DRIVER',
    subject_id: driver.id,
    type: 'lgpd',
    accepted: true,
    accepted_at: new Date(),
    ip_address: req.ip,
    user_agent: req.headers['user-agent']
  }
});

// Criar registro de verificação
await prisma.driver_verifications.create({
  data: {
    id: `verification_${driver.id}`,
    driver_id: driver.id,
    community_id: null,
    status: 'PENDING',
    updated_at: new Date()
  }
});
```

### BLOCO 3: Admin - Ajustar mensagem de erro

**Arquivo:** `backend/src/modules/admin/service.ts`

```typescript
// Já existe, mas garantir mensagem clara:
private formatMissingRequirementsDetails(missing: string[]) {
  const labels: Record<string, string> = {
    'LGPD_CONSENT': 'Aceite de termos LGPD',
    'VEHICLE_COLOR': 'Cor do veículo',
    'CPF': 'Documento CPF',
    'RG': 'Documento RG',
    'CNH': 'Carteira de Habilitação',
    'PROOF_OF_ADDRESS': 'Comprovante de residência',
    'VEHICLE_PHOTO': 'Foto do veículo',
    'BACKGROUND_CHECK': 'Antecedentes criminais'
  };
  
  return missing.map(m => labels[m] || m).join(', ');
}
```

---

## 6. ORDEM DE IMPLEMENTAÇÃO

### Sprint 1: Dados Básicos (1-2 dias)

1. ✅ API_URL já corrigida (commit 8f73044)
2. Frontend: Adicionar campos CPF, termos, cor do carro
3. Backend: Atualizar schema de registro
4. Backend: Registrar consent LGPD
5. Testar cadastro completo
6. Build e deploy

### Sprint 2: Documentos (3-5 dias)

**Opção A - Manual (recomendado para MVP):**
- Admin solicita docs via WhatsApp
- Motorista envia fotos
- Admin faz upload manual no painel
- Admin aprova

**Opção B - Automatizado:**
- Implementar upload no app
- Integração com S3
- Preview de documentos
- Validação de qualidade

---

## 7. RESUMO EXECUTIVO

### Situação Atual
- App coleta apenas 30% dos dados necessários
- Backend rejeita 100% das aprovações por falta de dados
- Motoristas ficam pendentes indefinidamente

### Solução Proposta
- **Fase 1:** Coletar dados básicos + compliance (CPF, termos, cor do carro)
- **Fase 2:** Processo manual de documentos via WhatsApp
- **Fase 3:** Automatizar upload de documentos no app

### Impacto
- ✅ Motorista pode se cadastrar completamente
- ✅ Admin pode aprovar com dados mínimos
- ✅ Compliance LGPD garantido
- ⚠️ Documentos ainda precisam ser solicitados manualmente

### Próximos Passos
1. Implementar campos obrigatórios no app
2. Atualizar backend para persistir dados
3. Testar fluxo completo
4. Build e deploy
5. Validar aprovação no admin
