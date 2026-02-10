# Runbook: Migrations DEV/STAGING (Anti-Frankenstein)

## Objetivo
Aplicar migrations Prisma no ambiente DEV/STAGING de forma idempotente, segura e reproduzível.

## Pré-requisitos
- AWS CLI configurado com credenciais válidas
- Acesso ao cluster ECS `kaviar-cluster`
- DATABASE_URL do ambiente alvo

## Uso Rápido

```bash
# DEV/STAGING (padrão)
./scripts/run-migrations-dev.sh

# Outro ambiente (override)
DATABASE_URL="postgresql://user:pass@host:5432/db" ./scripts/run-migrations-dev.sh
```

## O que o script faz

1. **Inicia task ECS** com imagem contendo migrations mais recentes
2. **Baseline idempotente**: marca migrations antigas como aplicadas (se já existirem no DB)
   - `20260102223054_init`
   - `20260104190032_baseline`
   - `20260109114812_add_community_geofence`
   - `20260121_add_family_bonus_fields`
3. **Aplica pendentes**: `prisma migrate deploy`
4. **Aguarda conclusão** e exibe logs
5. **Retorna exit code 0** se sucesso

## Idempotência

O script pode ser executado múltiplas vezes sem efeitos colaterais:
- Migrations já aplicadas são ignoradas
- `prisma migrate resolve --applied` falha com P3008 se já registrada (esperado, não é erro)
- `prisma migrate deploy` não aplica nada se DB está atualizado

## Troubleshooting

### P3018: relation already exists
**Causa**: Migration tenta criar tabela/coluna que já existe.  
**Solução**: Adicionar `npx prisma migrate resolve --applied <migration_name>` no baseline do script.

### P1000: Authentication failed
**Causa**: DATABASE_URL com credenciais inválidas.  
**Solução**: Verificar senha no arquivo `rds.env` ou Secrets Manager.

### Task fica PENDING
**Causa**: Subnets privadas sem NAT Gateway ou VPC endpoints.  
**Solução**: Script usa `assignPublicIp=ENABLED` para pull de imagem ECR.

### ResourceNotFoundException: log stream does not exist
**Causa**: Task falhou antes de inicializar logs (ex: pull timeout).  
**Solução**: Verificar `stoppedReason` com `aws ecs describe-tasks`.

## Estrutura de Migrations

```
backend/prisma/migrations/
├── 20260102223054_init/
├── 20260104190032_baseline/
├── 20260109114812_add_community_geofence/
├── 20260121_add_family_bonus_fields/
├── 20260202175153_add_password_reset_fields/
└── 20260210_community_geofence_geom_postgis/  ← Nova (PostGIS geom)
```

## Validação Pós-Migration

```sql
-- Verificar coluna geom criada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'community_geofences' AND column_name = 'geom';

-- Verificar índice GIST
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'community_geofences' AND indexdef LIKE '%gist%';

-- Estatísticas
SELECT 
  COUNT(*) as total,
  COUNT(geom) as with_geom,
  COUNT(CASE WHEN ST_SRID(geom) = 4326 THEN 1 END) as correct_srid
FROM community_geofences;
```

## Histórico de Baseline

| Migration | Motivo | Data |
|-----------|--------|------|
| `20260102223054_init` | Tabelas base já existiam | 2026-02-10 |
| `20260104190032_baseline` | Schema inicial | 2026-02-10 |
| `20260109114812_add_community_geofence` | Tabela já criada manualmente | 2026-02-10 |
| `20260121_add_family_bonus_fields` | Colunas já existiam | 2026-02-10 |

## Contato
Para dúvidas ou problemas, verificar logs em CloudWatch: `/ecs/kaviar-backend`
