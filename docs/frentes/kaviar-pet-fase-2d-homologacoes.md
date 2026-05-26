# Fase 2D — Atribuição de Operadores e Auditoria da Central KAVIAR Pet

**Versão:** v1.0  
**Data:** Maio/2026  
**Status:** Proposta técnica — não implementar sem aprovação

---

## 1. Tabelas/Migrations Necessárias

### Tabela `pet_homologations`

```sql
CREATE TABLE pet_homologations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Motorista/interessado
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(255),
  region VARCHAR(100),
  vehicle_model VARCHAR(100),
  vehicle_year VARCHAR(10),
  four_doors BOOLEAN DEFAULT true,
  
  -- Controle
  status VARCHAR(30) NOT NULL DEFAULT 'NOVO',
  operator_id UUID,              -- admin.id do PET_OPERATOR responsável
  assigned_at TIMESTAMPTZ,
  assigned_by UUID,              -- quem atribuiu
  
  -- Treinamento/certificação
  videos_sent_at TIMESTAMPTZ,
  quiz_sent_at TIMESTAMPTZ,
  quiz_score INT,
  quiz_passed BOOLEAN,
  photos_sent_at TIMESTAMPTZ,
  photos_approved BOOLEAN,
  
  -- Resultado
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Meta
  notes TEXT,
  source VARCHAR(30) DEFAULT 'manual',  -- manual | forms | whatsapp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pet_homologations_status ON pet_homologations(status);
CREATE INDEX idx_pet_homologations_operator ON pet_homologations(operator_id);
```

### Tabela `pet_homologation_logs`

```sql
CREATE TABLE pet_homologation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homologation_id UUID NOT NULL REFERENCES pet_homologations(id),
  
  -- Ação
  action VARCHAR(50) NOT NULL,       -- created, assigned, status_changed, note_added, approved, rejected, suspended, reactivated
  admin_id UUID NOT NULL,            -- quem fez
  admin_name VARCHAR(255),
  
  -- Detalhes
  old_status VARCHAR(30),
  new_status VARCHAR(30),
  old_operator_id UUID,
  new_operator_id UUID,
  note TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pet_homologation_logs_homologation ON pet_homologation_logs(homologation_id);
CREATE INDEX idx_pet_homologation_logs_admin ON pet_homologation_logs(admin_id);
```

### Status possíveis

| Status | Descrição |
|--------|-----------|
| `NOVO` | Pré-cadastro recebido, sem contato |
| `EM_CONTATO` | Operador fez primeiro contato |
| `AGUARDANDO_TREINAMENTO` | Vídeos enviados, aguardando assistir |
| `AGUARDANDO_QUESTIONARIO` | Questionário enviado, aguardando nota |
| `AGUARDANDO_FOTOS` | Aprovado no questionário, aguardando fotos |
| `EM_ANALISE` | Fotos recebidas, em validação |
| `APROVADO` | Homologação completa, selo ativo |
| `REPROVADO` | Não atende requisitos |
| `SUSPENSO` | Selo suspenso temporariamente |
| `DESISTIU` | Motorista desistiu do processo |

---

## 2. Endpoints Necessários

### Fase 2D.1

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| `GET` | `/api/admin/pet/homologations` | Listar homologações (filtro por status, operador) | PET_OPERATOR+ |
| `POST` | `/api/admin/pet/homologations` | Criar homologação | PET_OPERATOR+ |
| `GET` | `/api/admin/pet/homologations/:id` | Detalhe de uma homologação | PET_OPERATOR+ |
| `PATCH` | `/api/admin/pet/homologations/:id` | Atualizar status/dados | PET_OPERATOR+ |
| `PATCH` | `/api/admin/pet/homologations/:id/assign` | Atribuir operador | SUPER_ADMIN, PET_SUPERVISOR |

**Regra de visibilidade:**
- `PET_OPERATOR` → vê apenas homologações atribuídas a ele
- `PET_SUPERVISOR` / `SUPER_ADMIN` → vê todas

### Fase 2D.2

| Método | Rota | Descrição | Acesso |
|--------|------|-----------|--------|
| `GET` | `/api/admin/pet/homologations/:id/logs` | Histórico de ações | PET_OPERATOR+ |
| `POST` | `/api/admin/pet/homologations/:id/notes` | Adicionar observação | PET_OPERATOR+ |

---

## 3. Telas Necessárias

### Fase 2D.1

| Rota admin | Tela | Descrição |
|------------|------|-----------|
| `/admin/pet` | Central Pet (evoluída) | Cards de resumo + lista de homologações |
| `/admin/pet/homologations` | Lista de homologações | Tabela com filtros |
| `/admin/pet/homologations/:id` | Detalhe da homologação | Status, dados, ações, atribuição |

### Fase 2D.2

| Rota admin | Tela | Descrição |
|------------|------|-----------|
| `/admin/pet/homologations/:id` | Detalhe (evoluído) | + timeline de ações + campo de observação |

---

## 4. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:------------:|:-------:|-----------|
| Migration falhar em prod | Baixa | Alto | Testar localmente, migration simples (CREATE TABLE) |
| Conflito com tabelas existentes | Muito baixa | Baixo | Nomes com prefixo `pet_` isolam |
| Operador ver dados de outro | Média | Médio | Filtro por `operator_id` no backend |
| Performance com muitos registros | Baixa | Baixo | Índices já definidos |
| Complexidade prematura | Média | Médio | Dividir em 2D.1 e 2D.2 |

---

## 5. Menor Caminho Seguro

### Fase 2D.1 — Banco + listagem + atribuição

**Escopo:**
- Migration: criar `pet_homologations` + `pet_homologation_logs`
- Backend: CRUD + assign + filtro por operador
- Frontend: lista de homologações na Central + detalhe básico
- Logs automáticos em cada ação (criação, status change, assign)

**Arquivos a criar:**
- `backend/prisma/migrations/XXXX_pet_homologations/migration.sql`
- `backend/src/routes/admin-pet-homologations.ts`
- `frontend-app/src/pages/admin/PetHomologations.jsx`
- `frontend-app/src/pages/admin/PetHomologationDetail.jsx`

**Arquivos a alterar:**
- `backend/prisma/schema.prisma` (novos models)
- `backend/src/app.ts` (registrar rota)
- `frontend-app/src/components/admin/AdminApp.jsx` (rotas)
- `frontend-app/src/pages/admin/PetCentral.jsx` (resumo + link)

**Estimativa:** 4-5h

### Fase 2D.2 — Auditoria + histórico + filtros

**Escopo:**
- Timeline visual de ações no detalhe
- Campo de observação com histórico
- Filtros avançados na lista (status, operador, data)
- Contadores no dashboard da Central

**Arquivos a criar/alterar:**
- `frontend-app/src/pages/admin/PetHomologationDetail.jsx` (evoluir)
- `frontend-app/src/pages/admin/PetHomologations.jsx` (filtros)
- `frontend-app/src/pages/admin/PetCentral.jsx` (contadores)

**Estimativa:** 3-4h

---

## 6. Resumo de Fases

| Fase | O que entrega | Migration | Backend | Frontend | Tempo |
|------|---------------|:---------:|:-------:|:--------:|:-----:|
| **2D.1** | Tabelas + CRUD + lista + atribuição + logs automáticos | ✅ | ✅ | ✅ | 4-5h |
| **2D.2** | Timeline + observações + filtros + contadores | ❌ | Mínimo | ✅ | 3-4h |

**Total:** 7-9h  
**Mínimo para começar a usar:** Fase 2D.1 (~4-5h)

---

## 7. Compatibilidade com Ferramentas Manuais

| Ferramenta | Continua? | Papel |
|------------|:---------:|-------|
| Google Forms | ✅ | Pré-cadastro público (pode alimentar banco futuramente) |
| Google Sheets | ✅ | Backup/referência (admin vira fonte primária) |
| Google Drive | ✅ | Fotos (até implementar upload S3) |
| WhatsApp | ✅ | Comunicação com motorista |
| Admin Central | ✅ | **Fonte de controle** de status e atribuição |

---

*Fase 2D — Proposta Técnica v1.0 — Maio/2026*
