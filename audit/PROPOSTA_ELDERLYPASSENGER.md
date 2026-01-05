# PROPOSTA DE MUDANÇA ESTRUTURAL - ELDERLYPASSENGER

## DIFF DO SCHEMA.PRISMA

### ANTES:
```prisma
model Passenger {
  id                        String   @id @default(cuid())
  name                      String
  email                     String   @unique
  passwordHash              String?  @map("password_hash")
  phone                     String?
  communityId               String?  @map("community_id")
  status                    String   @default("pending")
  // ... outros campos existentes
  
  // Relations
  rides     Ride[]
  community Community? @relation(fields: [communityId], references: [id])
  consents  UserConsent[]
  rideConfirmations RideConfirmation[]
  tourBookings TourBookings[]
  
  @@map("passengers")
}
```

### DEPOIS (ADIÇÕES):
```prisma
model Passenger {
  // ... campos existentes inalterados
  
  // Relations (ADICIONADO)
  elderlyProfile ElderlyProfile?
  elderlyContracts ElderlyContract[] @relation("ResponsiblePassenger")
  
  @@map("passengers")
}

// NOVO MODELO 1: Perfil do Idoso
model ElderlyProfile {
  id           String   @id @default(cuid())
  passengerId  String   @unique @map("passenger_id")
  emergencyContact String? @map("emergency_contact")
  emergencyPhone   String? @map("emergency_phone")
  medicalNotes     String? @map("medical_notes")
  careLevel        String  @default("basic") // basic, intensive, medical
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")
  
  // Relations
  passenger Passenger @relation(fields: [passengerId], references: [id], onDelete: Cascade)
  contracts ElderlyContract[]
  
  @@map("elderly_profiles")
}

// NOVO MODELO 2: Contrato de Acompanhamento
model ElderlyContract {
  id                String   @id @default(cuid())
  elderlyProfileId  String   @map("elderly_profile_id")
  responsibleId     String?  @map("responsible_id") // Passenger responsável
  communityId       String   @map("community_id")
  status            String   @default("ACTIVE") // ACTIVE, INACTIVE, CANCELLED
  serviceType       String   @default("ACOMPANHAMENTO_ATIVO") @map("service_type")
  startsAt          DateTime @map("starts_at")
  endsAt            DateTime? @map("ends_at")
  notes             String?
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  
  // Relations
  elderlyProfile ElderlyProfile @relation(fields: [elderlyProfileId], references: [id], onDelete: Cascade)
  responsible    Passenger? @relation("ResponsiblePassenger", fields: [responsibleId], references: [id])
  community      Community @relation(fields: [communityId], references: [id])
  
  @@map("elderly_contracts")
}

// ATUALIZAR Community para incluir contratos
model Community {
  // ... campos existentes inalterados
  
  // Relations (ADICIONADO)
  elderlyContracts ElderlyContract[]
  
  @@map("communities")
}
```

## RESUMO DAS MUDANÇAS:
- ✅ **ElderlyProfile:** Perfil do idoso vinculado a Passenger (1:1)
- ✅ **ElderlyContract:** Contrato separado e escalável (1:N)
- ✅ **Não duplica Passenger:** Reutiliza estrutura existente
- ✅ **Limpo e escalável:** Separação clara de responsabilidades

---

## ENDPOINTS QUE SERÃO CRIADOS

### NOVOS ENDPOINTS (Protegidos com JWT + Admin):
```typescript
// Listar contratos por bairro
GET /api/admin/elderly/contracts?communityId=xxx
GET /api/admin/elderly/contracts                    // Todos

// CRUD de contratos
POST /api/admin/elderly/contracts                   // Criar contrato
GET /api/admin/elderly/contracts/:id                // Detalhes
PATCH /api/admin/elderly/contracts/:id/status       // Ativar/Desativar
PUT /api/admin/elderly/contracts/:id                // Editar
DELETE /api/admin/elderly/contracts/:id             // Cancelar

// Perfis de idosos
GET /api/admin/elderly/profiles                     // Listar perfis
POST /api/admin/elderly/profiles                    // Criar perfil
GET /api/admin/elderly/profiles/:id                 // Detalhes
PUT /api/admin/elderly/profiles/:id                 // Editar

// Dashboard específico
GET /api/admin/elderly/dashboard                    // Métricas de acompanhamento
```

### ENDPOINTS ALTERADOS:
```typescript
// Dashboard principal (ALTERADO - adicionar métricas elderly)
GET /api/admin/dashboard
// Resposta incluirá:
{
  "elderlyContracts": {
    "active": 5,
    "inactive": 2,
    "byCommunity": {...}
  }
}

// Communities (ALTERADO - incluir contratos elderly)
GET /api/admin/communities
// Resposta incluirá:
{
  "stats": {
    "activeElderlyContracts": 1,
    // ... outras stats existentes
  }
}
```

---

## TELAS QUE SERÃO CRIADAS

### FRONTEND - NOVAS TELAS:
```
frontend-app/src/pages/admin/ElderlyManagement.jsx
├── Lista de contratos por bairro
├── Filtros: status, bairro, data
├── Ações: ativar/desativar/editar/cancelar
└── Métricas: contratos ativos por bairro

frontend-app/src/pages/admin/ElderlyContractForm.jsx
├── Formulário criar/editar contrato
├── Seleção de idoso (Passenger)
├── Seleção de responsável
├── Configuração de datas e notas

frontend-app/src/components/admin/ElderlyContractCard.jsx
├── Card individual do contrato
├── Status visual (ativo/inativo)
├── Informações do idoso e responsável
```

### FRONTEND - TELAS ALTERADAS:
```
frontend-app/src/pages/admin/Dashboard.jsx
├── ALTERADO: Adicionar card "Acompanhamento Ativo"
├── ALTERADO: Contador de contratos ativos
└── ALTERADO: Link para /admin/elderly

frontend-app/src/pages/admin/CommunitiesManagement.jsx  
├── ALTERADO: Adicionar contador de contratos elderly
└── ALTERADO: Mostrar "X contratos ativos" por bairro

frontend-app/src/components/admin/AdminApp.jsx
├── ALTERADO: Rota /elderly funcional (não mais placeholder)
└── ALTERADO: Importar ElderlyManagement
```

---

## IMPACTO NAS SEEDS EXISTENTES

### SEEDS ATUAIS (NÃO ALTERADOS):
- ✅ **Bairros:** Mantidos como estão
- ✅ **Motoristas:** Mantidos como estão  
- ✅ **Passageiros:** Mantidos como estão
- ✅ **Guias:** Mantidos como estão

### SEEDS NOVOS (ADICIONADOS):
```typescript
// Para cada bairro, adicionar:
1. Criar 1 Passenger idoso (se não existir)
2. Criar ElderlyProfile para esse Passenger
3. Criar ElderlyContract ATIVO para esse perfil
4. Vincular ao bairro correspondente

// Exemplo por bairro:
- Passenger: "Idoso João - Mata Machado"
- ElderlyProfile: emergencyContact, careLevel: "basic"
- ElderlyContract: status: "ACTIVE", serviceType: "ACOMPANHAMENTO_ATIVO"
```

### SCRIPT DE SEED ATUALIZADO:
```typescript
// Novo arquivo: seed-elderly.ts
// OU extensão do seed-bairros.ts existente
// Não quebra seeds existentes, apenas adiciona
```

---

## COMO TESTAR

### TESTES BACKEND:
```bash
# 1. Aplicar migration
cd backend && npx prisma db push

# 2. Executar seeds elderly
npx tsx src/scripts/seed-elderly.ts

# 3. Testar endpoints
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/admin/elderly/contracts

# 4. Testar dashboard atualizado
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/admin/dashboard
```

### TESTES FRONTEND:
```bash
# 1. Verificar compilação
cd frontend-app && npm run dev

# 2. Testar navegação
- Login admin → Dashboard → "Acompanhamento Ativo"
- Verificar lista de contratos
- Testar ativar/desativar contrato

# 3. Verificar integração
- Dashboard mostra contadores elderly
- Bairros mostram contratos ativos
```

### VALIDAÇÃO FUNCIONAL:
1. ✅ **Admin consegue listar contratos por bairro**
2. ✅ **Admin consegue ativar/desativar contrato**  
3. ✅ **Dashboard mostra bairros com contratos ativos**
4. ✅ **Botão "Acompanhamento ativo" funcional**
5. ✅ **Texto informativo correto**

---

## ROLLBACK

### ROLLBACK COMPLETO:
```sql
-- 1. Remover tabelas (ordem importante - FK constraints)
DROP TABLE IF EXISTS elderly_contracts;
DROP TABLE IF EXISTS elderly_profiles;

-- 2. Remover colunas adicionadas (se houver)
-- (Neste caso, não há colunas adicionadas em tabelas existentes)
```

### ROLLBACK GIT:
```bash
# 1. Reverter migration
git revert <commit_hash_migration>

# 2. Reverter código
git revert <commit_hash_endpoints>
git revert <commit_hash_frontend>

# 3. Aplicar rollback no banco
cd backend && npx prisma db push
```

### ROLLBACK PARCIAL (manter estrutura, limpar dados):
```sql
-- Apenas limpar dados de teste
DELETE FROM elderly_contracts;
DELETE FROM elderly_profiles;
```

---

## PROTEÇÃO DE SEGURANÇA

### JWT + RBAC ADMIN:
```typescript
// Todos os endpoints elderly protegidos:
app.use('/api/admin/elderly', authenticateAdmin); // JWT obrigatório
app.use('/api/admin/elderly', requireAdminRole);  // Role ADMIN obrigatório

// Rate limiting específico:
app.use('/api/admin/elderly', adminRateLimit);    // 100 req/min para admin

// Validação de entrada:
const elderlyContractSchema = z.object({
  elderlyProfileId: z.string().cuid(),
  communityId: z.string().cuid(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'CANCELLED']),
  // ... outras validações Zod
});
```

### AUDITORIA:
```typescript
// Log de todas as ações elderly:
await auditLog.create({
  adminId: req.admin.id,
  action: 'ELDERLY_CONTRACT_STATUS_CHANGE',
  entityId: contractId,
  oldValue: oldStatus,
  newValue: newStatus,
  timestamp: new Date()
});
```

---

## NOMENCLATURA NO APP

### FRONTEND:
- ✅ **Botão:** "Acompanhamento ativo"
- ✅ **Texto:** "Acompanhamento completo da saída à volta com suporte total."
- ✅ **Admin módulo:** "Acompanhamento Ativo" (não "care")
- ✅ **Breadcrumbs:** "Admin > Acompanhamento Ativo"
- ✅ **URLs:** `/admin/elderly` (interno), mas labels em português

### BACKEND:
- ✅ **Rotas:** `/api/admin/elderly/*` (padrão REST)
- ✅ **Modelos:** `ElderlyProfile`, `ElderlyContract` (padrão Prisma)
- ✅ **Enums:** `ACOMPANHAMENTO_ATIVO` (português nos dados)

---

## RESUMO DA PROPOSTA

### ✅ **ESTRUTURA LIMPA:**
- Não duplica Passenger
- ElderlyProfile (1:1) + ElderlyContract (1:N)
- Escalável para outros tipos de contrato

### ✅ **FUNCIONALIDADES COMPLETAS:**
- Listar contratos por bairro
- Ativar/desativar contrato  
- Dashboard com métricas
- Seeds com 1 idoso por bairro

### ✅ **SEGURANÇA:**
- JWT + Admin role obrigatório
- Rate limiting específico
- Validação Zod completa
- Auditoria de ações

### ✅ **GOVERNANÇA:**
- Migration reversível
- Seeds não quebram existentes
- Testes definidos
- Rollback documentado

**VOCÊ AUTORIZA A IMPLEMENTAÇÃO DESTA PROPOSTA?**
