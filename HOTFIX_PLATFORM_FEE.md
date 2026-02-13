# HOTFIX: Erro platform_fee_percentage no Admin PROD

## Problema
```
Invalid `prisma.rides.findMany()` invocation:
The column `rides.platform_fee_percentage` does not exist in the current database.
```

## Causa Raiz
A migration `add_metrics_fields.sql` que adiciona a coluna `platform_fee_percentage` não foi aplicada no RDS PROD.

## Solução Aplicada (FALLBACK TEMPORÁRIO)

### Arquivos Modificados:
1. `backend/src/modules/admin/ride-service.ts`
   - `getRides()`: Mudado de `include` para `select` explícito, comentando `platform_fee_percentage`
   - `getRideById()`: Mudado de `include` para `select` explícito, comentando `platform_fee_percentage`

2. `backend/src/modules/admin/dashboard-service.ts`
   - `getRecentRides()`: Mudado de `include` para `select` explícito, comentando `platform_fee_percentage`

### Deploy do Fallback:
```bash
cd /home/goes/kaviar/backend
npm run build
# Deploy para PROD (via CI/CD ou manual)
```

## Solução DEFINITIVA (Aplicar Migration no RDS)

### Diagnóstico Atual:
- ❌ RDS não acessível diretamente (timeout - está em VPC privada)
- ✅ Migration existe: `backend/migrations/add_metrics_fields.sql`
- ✅ Schema Prisma tem o campo definido

### Opções para Aplicar Migration:

#### OPÇÃO 1: Via ECS Task (RECOMENDADO)
```bash
aws ecs run-task \
  --cluster kaviar-prod-cluster \
  --task-definition kaviar-backend-migration \
  --launch-type FARGATE \
  --network-configuration 'awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}' \
  --overrides '{"containerOverrides":[{"name":"backend","command":["sh","-c","npx prisma migrate deploy"]}]}' \
  --region us-east-2
```

#### OPÇÃO 2: Via Bastion/Jump Host
```bash
# 1. SSH para bastion que tem acesso ao RDS
ssh -i ~/.ssh/kaviar-bastion.pem ec2-user@<bastion-ip>

# 2. Copiar migration para bastion
scp -i ~/.ssh/kaviar-bastion.pem backend/migrations/add_metrics_fields.sql ec2-user@<bastion-ip>:/tmp/

# 3. Dentro do bastion, aplicar migration
psql -h kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com \
     -U kaviaradmin \
     -d kaviar \
     -f /tmp/add_metrics_fields.sql
```

#### OPÇÃO 3: Via AWS Systems Manager Session Manager
```bash
# Se o RDS tiver Session Manager habilitado
aws ssm start-session \
  --target <rds-instance-id> \
  --region us-east-2
```

#### OPÇÃO 4: Via Lambda com VPC Access
Criar Lambda temporária na mesma VPC do RDS para executar a migration.

### Verificação Pós-Migration:
```sql
-- Verificar se coluna existe
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='rides'
  AND column_name='platform_fee_percentage';

-- Deve retornar:
-- column_name              | data_type | numeric_precision | numeric_scale
-- platform_fee_percentage  | numeric   | 5                 | 2
```

### Reverter Fallback (Após Migration Aplicada):
```bash
cd /home/goes/kaviar/backend

# Descomentar platform_fee_percentage nos arquivos:
# - src/modules/admin/ride-service.ts (2 lugares)
# - src/modules/admin/dashboard-service.ts (1 lugar)

# Rebuild e deploy
npm run build
```

## Validação Final

### 1. Testar Admin Rides List:
```bash
curl -X GET https://api.kaviar.com.br/api/admin/rides \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json"
```

### 2. Verificar Logs:
```bash
# CloudWatch Logs do backend
aws logs tail /aws/ecs/kaviar-backend --follow --region us-east-2
```

### 3. Health Check:
```bash
curl https://api.kaviar.com.br/api/health
```

## Status Atual

- ✅ Fallback aplicado localmente (código modificado)
- ⏳ Aguardando deploy do fallback para PROD
- ⏳ Aguardando aplicação da migration no RDS
- ⏳ Aguardando reversão do fallback após migration

## Próximos Passos

1. **IMEDIATO**: Fazer commit e deploy do fallback
   ```bash
   git add backend/src/modules/admin/ride-service.ts
   git add backend/src/modules/admin/dashboard-service.ts
   git commit -m "hotfix(admin): remover platform_fee_percentage até migration ser aplicada"
   git push origin main
   ```

2. **URGENTE**: Aplicar migration no RDS via uma das opções acima

3. **FINAL**: Reverter fallback e fazer deploy final
   ```bash
   git revert HEAD
   git push origin main
   ```

## Contato
- Erro reportado: 2026-02-13 09:07
- Fallback aplicado: 2026-02-13 09:15
- Status: Aguardando deploy
