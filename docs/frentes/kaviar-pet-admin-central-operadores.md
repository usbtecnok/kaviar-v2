# Admin KAVIAR Pet — Central e Operadores

**Versão:** v1.0  
**Data:** Maio/2026  
**Status:** Análise técnica + plano de implementação  
**Tipo:** Documento técnico — não implementar sem aprovação

---

## 1. Estado Atual do Sistema

### Model `admins` (Prisma)

```prisma
model admins {
  id                    String    @id @default(uuid())
  name                  String
  email                 String    @unique
  password              String
  phone                 String?
  role                  String    @default("SUPER_ADMIN")  // ← String livre, NÃO enum
  is_active             Boolean   @default(true)
  must_change_password  Boolean   @default(true)
  operator_profile      operator_profiles?
  // ...
}
```

**Ponto-chave:** `role` é `String`, não enum. Podemos adicionar `PET_OPERATOR` sem migration.

### Roles em uso

| Role | Onde é usado |
|------|-------------|
| `SUPER_ADMIN` | Acesso total, default |
| `FINANCE` | Pagamentos, créditos |
| `ANGEL_VIEWER` | Visão investidor (leitura) |
| `INVESTOR_VIEW` | Visão investidor |
| `LEAD_AGENT` | Captação de leads |
| `OPERATOR` | WhatsApp, feature flags |

### Controle de acesso (frontend)

```jsx
<ProtectedAdminRoute requireSuperAdmin>       // só SUPER_ADMIN
<ProtectedAdminRoute allowedRoles={[...]}>    // lista de roles permitidas
<ProtectedAdminRoute>                          // qualquer admin autenticado
```

### CRUD de staff existente

- **Rota:** `POST/GET/PATCH /api/admin/staff`
- **Middleware:** `authenticateAdmin` + `requireSuperAdmin`
- **Cria admin com:** nome, email, senha, phone, role (hardcoded LEAD_AGENT)
- **Pode ativar/inativar:** via PATCH `is_active`

### Model `operator_profiles` (já existe)

Vinculado a `admins` via `admin_id`. Usado para operadores territoriais. Contém dados financeiros (pix, banco, CPF/CNPJ). Pode ser reutilizado ou servir de referência.

### Dashboard Admin

- Cards MUI com `OpsCard` (label, value, sub, color)
- Grid responsivo
- Fetch de dados via API com token
- Padrão consolidado e replicável

---

## 2. Arquitetura Proposta

### Roles KAVIAR Pet

| Role | Acesso | Descrição |
|------|--------|-----------|
| `PET_OPERATOR` | Central Pet (leitura + escrita) | Operadora do dia a dia |
| `PET_SUPERVISOR` | Central Pet + relatórios + gestão de operadores | Supervisora |
| `PET_ADMIN` | Tudo de Pet + configurações | Gestora da operação |
| `SUPER_ADMIN` | Acesso total (já existe) | Controle geral |

### Hierarquia de permissões

```
SUPER_ADMIN
  └── PET_ADMIN
        └── PET_SUPERVISOR
              └── PET_OPERATOR
```

### Princípio

- SUPER_ADMIN cadastra PET_ADMIN ou PET_OPERATOR
- PET_ADMIN pode cadastrar PET_OPERATOR (futuro)
- PET_OPERATOR não se cadastra sozinho
- Todos acessam apenas `/admin/pet/*`

---

## 3. Fases de Implementação

### Fase 2A — Painel visual (só frontend, sem banco novo)

**Objetivo:** Card "KAVIAR Pet" no admin com links operacionais.

**Escopo:**
- 1 página nova: `PetCentral.jsx`
- 1 rota nova: `/admin/pet`
- Card no Dashboard principal (visível para SUPER_ADMIN e PET_*)
- Links para ferramentas externas (Forms, Sheets, Drive)
- Sem API nova
- Sem migration
- Sem banco novo

**Tela:**
```
┌─────────────────────────────────────────────┐
│  🐾 Central KAVIAR Pet                      │
├─────────────────────────────────────────────┤
│                                             │
│  [Card] Landing /pet          [Abrir →]     │
│  [Card] Pré-cadastro Forms    [Abrir →]     │
│  [Card] Questionário Forms    [Abrir →]     │
│  [Card] Planilha Central      [Abrir →]     │
│  [Card] Pasta de Fotos        [Abrir →]     │
│                                             │
│  ─── Status do Piloto ───                   │
│  Motoristas aprovados: 0                    │
│  Corridas realizadas: 0                     │
│  Incidentes: 0                              │
│                                             │
└─────────────────────────────────────────────┘
```

**Arquivos a criar:**
- `frontend-app/src/pages/admin/PetCentral.jsx`

**Arquivos a alterar:**
- `frontend-app/src/components/admin/AdminApp.jsx` (adicionar rota)
- `frontend-app/src/pages/admin/Dashboard.jsx` (adicionar card)

**Estimativa:** 1-2h

---

### Fase 2B — Cadastro de operadores Pet (backend + frontend)

**Objetivo:** SUPER_ADMIN cadastra operadores PET_OPERATOR no sistema.

**Escopo:**
- Reutilizar `/api/admin/staff` com role `PET_OPERATOR`
- Ou criar rota dedicada `/api/admin/pet/operators`
- Tela de gestão de operadores Pet
- Ativar/inativar operador

**Opção recomendada:** Estender o StaffManagement existente para aceitar role `PET_OPERATOR`. Menor impacto.

**Alteração no backend:**
- `admin-staff.ts`: adicionar `PET_OPERATOR` ao filtro de roles no GET
- `admin-staff.ts`: permitir criar com role `PET_OPERATOR`

**Tela nova:**
- `frontend-app/src/pages/admin/PetOperators.jsx`

**Migration:** NENHUMA (role é String)

**Estimativa:** 2-3h

---

### Fase 2C — Dados de homologação no banco

**Objetivo:** Armazenar pré-cadastros e homologações no PostgreSQL.

**Escopo:**
- Novo model `pet_driver_applications`
- Novo model `pet_certifications`
- API CRUD para homologações
- Tela de gestão no admin

**Migration necessária:**

```prisma
model pet_driver_applications {
  id              String   @id @default(uuid())
  name            String
  phone           String
  email           String?
  vehicle_model   String
  vehicle_year    String?
  four_doors      Boolean  @default(true)
  pet_experience  String?
  status          String   @default("pending") // pending, contacted, training, approved, rejected, dropped
  operator_id     String?  // admin que está acompanhando
  notes           String?
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
}

model pet_certifications {
  id                String   @id @default(uuid())
  application_id    String
  videos_sent_at    DateTime?
  videos_watched    Boolean  @default(false)
  quiz_score_1      Int?
  quiz_score_2      Int?
  quiz_status       String?  // pending, passed, failed
  photos_sent_at    DateTime?
  photos_approved   Boolean  @default(false)
  seal_status       String   @default("inactive") // inactive, active, suspended, revoked
  approved_at       DateTime?
  approved_by       String?  // admin_id
  notes             String?
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
}
```

**Estimativa:** 4-6h

---

### Fase 2D — Gestão completa no admin

**Objetivo:** Substituir Google Sheets pela Central no admin.

**Escopo:**
- Listagem de pré-cadastros com filtros
- Fluxo de homologação visual (kanban ou tabela)
- Upload/validação de fotos
- Registro de incidentes
- Registro de corridas piloto
- Dashboard com métricas Pet

**Estimativa:** 8-12h

---

## 4. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:------------:|:-------:|-----------|
| Conflito com roles existentes | Baixa | Baixo | Role é String, sem enum, sem conflito |
| Bagunçar StaffManagement | Baixa | Médio | Criar rota separada `/api/admin/pet/operators` |
| Migration quebrar prod | Baixa | Alto | Fase 2A e 2B não precisam de migration |
| Operador acessar telas indevidas | Média | Médio | `allowedRoles` no ProtectedAdminRoute |
| Complexidade prematura | Média | Médio | Começar pela Fase 2A (só links) |

---

## 5. Arquivos Prováveis

### Fase 2A (só frontend)

| Arquivo | Ação |
|---------|------|
| `frontend-app/src/pages/admin/PetCentral.jsx` | Criar |
| `frontend-app/src/components/admin/AdminApp.jsx` | Alterar (adicionar rota) |
| `frontend-app/src/pages/admin/Dashboard.jsx` | Alterar (adicionar card) |

### Fase 2B (operadores)

| Arquivo | Ação |
|---------|------|
| `frontend-app/src/pages/admin/PetOperators.jsx` | Criar |
| `backend/src/routes/admin-pet.ts` | Criar |
| `backend/src/index.ts` | Alterar (registrar rota) |
| `frontend-app/src/components/admin/AdminApp.jsx` | Alterar |

### Fase 2C (banco)

| Arquivo | Ação |
|---------|------|
| `backend/prisma/schema.prisma` | Alterar (novos models) |
| `backend/src/routes/admin-pet.ts` | Alterar (CRUD) |
| `frontend-app/src/pages/admin/PetHomologations.jsx` | Criar |
| `frontend-app/src/pages/admin/PetDrivers.jsx` | Criar |

---

## 6. Telas Futuras

| Rota admin | Tela | Role mínimo |
|------------|------|-------------|
| `/admin/pet` | Central KAVIAR Pet (links + status) | PET_OPERATOR |
| `/admin/pet/operators` | Gestão de operadores | SUPER_ADMIN |
| `/admin/pet/applications` | Pré-cadastros | PET_OPERATOR |
| `/admin/pet/homologations` | Homologações em andamento | PET_OPERATOR |
| `/admin/pet/drivers` | Motoristas aprovados | PET_OPERATOR |
| `/admin/pet/rides` | Corridas piloto | PET_OPERATOR |
| `/admin/pet/incidents` | Incidentes | PET_OPERATOR |
| `/admin/pet/finance` | Financeiro Pet | PET_SUPERVISOR |
| `/admin/pet/settings` | Configurações | PET_ADMIN |

---

## 7. Recomendação — Menor Passo Seguro

### Implementar primeiro: Fase 2A

**Por quê:**
- Zero risco (só frontend, sem banco, sem migration)
- Dá visibilidade imediata no admin
- Centraliza links operacionais
- Pode ser feito em 1-2h
- Não mexe em dispatcher, pricing, rides_v2, app mobile
- Validável visualmente antes de avançar

**O que entrega:**
- Card "KAVIAR Pet" no Dashboard admin
- Página `/admin/pet` com links para Forms, Sheets, Drive
- Acesso controlado por role (SUPER_ADMIN + PET_*)
- Base para as fases seguintes

**Depois de validar 2A:**
- Fase 2B: cadastrar operadores (sem migration)
- Fase 2C: banco de homologações (com migration)
- Fase 2D: gestão completa (substituir Sheets)

---

## 8. Estimativa de Tempo

| Fase | Escopo | Tempo | Migration | Deploy |
|------|--------|:-----:|:---------:|:------:|
| 2A | Painel visual + links | 1-2h | ❌ | Frontend |
| 2B | Operadores Pet | 2-3h | ❌ | Frontend + Backend |
| 2C | Banco homologações | 4-6h | ✅ | Frontend + Backend + DB |
| 2D | Gestão completa | 8-12h | ✅ | Frontend + Backend |

**Total para operação completa no admin:** ~15-23h  
**Mínimo para começar (2A):** ~1-2h

---

## 9. Restrições Confirmadas

❌ Não mexer em: dispatcher, rides_v2, pricing engine, app motorista, app passageiro, map.tsx, APK, fluxo real de corrida.

✅ Pode mexer em: frontend-app (admin), backend (rotas admin), schema Prisma (models novos isolados).

---

*Admin KAVIAR Pet — Central e Operadores v1.0 — Maio/2026*
