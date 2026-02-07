# 🔐 PLANO DE ROTAÇÃO DE CREDENCIAIS
**Data:** 2026-02-07  
**Responsável:** Aparecido Goes  
**Status:** PENDENTE

---

## 📋 CREDENCIAIS A ROTACIONAR

### 1. JWT_SECRET (CRÍTICO)
- **Atual:** `67197934459161cd74ab8be94c70b88df17b38d7b99c564a3662752f15249db8`
- **Novo:** `968bb2e49c1fbb0c54e708c9b1bb9fca83e0ec962152863ed5a9e29218af9d4a`
- **Impacto:** Invalida todos os tokens JWT ativos
- **Ação:** Atualizar ECS task definition + redeploy

### 2. RDS Database Password (CRÍTICO)
- **Usuário:** `kaviaradmin`
- **Host:** `kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com`
- **Senha atual:** `KaviarDB2026SecureProd` (exposta no .env)
- **Senha nova:** `uvjMpy2K70QQOmopjt74A3Om`
- **Impacto:** Quebra conexão DB até atualizar DATABASE_URL
- **Ação:** Modificar senha no RDS + atualizar ECS secrets

### 3. ADMIN_DEFAULT_PASSWORD (MÉDIO)
- **Atual:** `admin123`
- **Novo:** `UKqMLJNPx9ELEZFv5ky5`
- **Impacto:** Apenas novos admins criados via seed
- **Ação:** Atualizar .env + recriar admins de teste

---

## 🚀 SEQUÊNCIA DE EXECUÇÃO (ZERO DOWNTIME)

### FASE 1: Preparação (5 min)
```bash
# 1. Backup do .env atual
cp backend/.env backend/.env.backup.20260207

# 2. Criar novo .env com credenciais rotacionadas
# (arquivo será criado no próximo passo)
```

### FASE 2: Rotação RDS (10 min)
```bash
# 1. Modificar senha no RDS
aws rds modify-db-instance \
  --db-instance-identifier kaviar-prod-db \
  --master-user-password "uvjMpy2K70QQOmopjt74A3Om" \
  --apply-immediately \
  --region us-east-2

# 2. Aguardar status "available"
aws rds wait db-instance-available \
  --db-instance-identifier kaviar-prod-db \
  --region us-east-2
```

### FASE 3: Atualizar ECS Task Definition (5 min)
```bash
# 1. Registrar nova task definition com novos secrets
# (script será criado)

# 2. Atualizar serviço ECS
aws ecs update-service \
  --cluster kaviar-prod \
  --service kaviar-backend-service \
  --task-definition kaviar-backend:70 \
  --force-new-deployment \
  --region us-east-1
```

### FASE 4: Validação (5 min)
```bash
# 1. Aguardar nova task RUNNING
# 2. Testar /api/health
curl -s https://api.kaviar.com.br/api/health | jq

# 3. Testar login admin
curl -X POST https://api.kaviar.com.br/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"suporte@kaviar.com.br","password":"<nova_senha>"}'

# 4. Testar rota governance
curl -H "Authorization: Bearer <token>" \
  https://api.kaviar.com.br/api/governance/neighborhoods
```

---

## 🧹 LIMPEZA DE SCRIPTS (PÓS-ROTAÇÃO)

### Arquivos com senhas hardcoded para limpar:
```bash
backend/scripts/upsert-admins.js           # Remover senhas plaintext
backend/scripts/test-change-password-flow.js  # Remover TEMP_PASSWORD
backend/scripts/create_admin_sql.js        # Remover senha hardcoded
backend/prisma/seed-rbac.ts                # Usar variável de ambiente
```

### Ação:
- Substituir senhas por `process.env.ADMIN_DEFAULT_PASSWORD`
- Adicionar validação: `if (!process.env.ADMIN_DEFAULT_PASSWORD) throw new Error(...)`

---

## ⚠️ ROLLBACK PLAN

Se algo der errado:
```bash
# 1. Reverter senha RDS
aws rds modify-db-instance \
  --db-instance-identifier kaviar-prod-db \
  --master-user-password "KaviarDB2026SecureProd" \
  --apply-immediately \
  --region us-east-2

# 2. Reverter para task definition anterior
aws ecs update-service \
  --cluster kaviar-prod \
  --service kaviar-backend-service \
  --task-definition kaviar-backend:69 \
  --force-new-deployment \
  --region us-east-1
```

---

## 📝 CHECKLIST

- [ ] Backup do .env atual
- [ ] Rotacionar senha RDS
- [ ] Criar nova task definition com novos secrets
- [ ] Deploy ECS
- [ ] Validar /api/health
- [ ] Validar login admin
- [ ] Validar rotas governance
- [ ] Limpar scripts com senhas hardcoded
- [ ] Remover .env.backup após 7 dias
- [ ] Documentar novas credenciais no 1Password/Vault

---

## 🔒 ARMAZENAMENTO SEGURO

**NÃO COMMITAR** as novas credenciais no Git.

Armazenar em:
- AWS Secrets Manager (recomendado)
- AWS Systems Manager Parameter Store
- 1Password/LastPass (backup)

---

**Tempo estimado total:** 25 minutos  
**Janela de manutenção:** Não necessária (zero downtime)
