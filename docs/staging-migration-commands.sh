# Migrations de Créditos — Comandos para Execução via ECS Exec
# PREPARAÇÃO APENAS — NÃO EXECUTAR SEM APROVAÇÃO EXPLÍCITA
# Data de preparação: 2026-04-03

# ============================================================
# PRÉ-REQUISITOS
# ============================================================
# 1. Obter o TASK_ID atual (muda a cada deploy):

aws ecs list-tasks --cluster kaviar-cluster --region us-east-2 --query 'taskArns[0]' --output text

# Extrair só o ID final (após a última /):
# Exemplo: arn:aws:ecs:..../TASK_ID → usar só o TASK_ID
# Definir variável:

export TASK_ID="<colar aqui o task id>"

# ============================================================
# MIGRATION 1/2: Sistema de Créditos (credit_balance + driver_credit_ledger)
# ============================================================

aws ecs execute-command \
  --cluster kaviar-cluster \
  --task "$TASK_ID" \
  --container kaviar-backend \
  --interactive \
  --command "node -e \"
const{Pool}=require('pg');
const p=new Pool({connectionString:process.env.DATABASE_URL.replace(/[?&]sslmode=require/,''),ssl:{rejectUnauthorized:false}});
p.query(\\\`
CREATE TABLE IF NOT EXISTS credit_balance (
  driver_id TEXT PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (balance >= 0)
);
CREATE TABLE IF NOT EXISTS driver_credit_ledger (
  id SERIAL PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  delta DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  admin_user_id TEXT,
  idempotency_key VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (delta != 0)
);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_driver ON driver_credit_ledger(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_idempotency ON driver_credit_ledger(idempotency_key) WHERE idempotency_key IS NOT NULL;
\\\`).then(()=>{console.log('M1_OK');p.end()}).catch(e=>{console.log('M1_FAIL:'+e.message);p.end()})
\"" \
  --region us-east-2

# Resultado esperado: M1_OK

# ============================================================
# VERIFICAÇÃO 1/2: Confirmar tabelas de crédito
# ============================================================

aws ecs execute-command \
  --cluster kaviar-cluster \
  --task "$TASK_ID" \
  --container kaviar-backend \
  --interactive \
  --command "node -e \"
const{Pool}=require('pg');
const p=new Pool({connectionString:process.env.DATABASE_URL.replace(/[?&]sslmode=require/,''),ssl:{rejectUnauthorized:false}});
p.query(\\\`SELECT table_name FROM information_schema.tables WHERE table_name IN ('credit_balance','driver_credit_ledger') ORDER BY table_name\\\`).then(r=>{console.log('V1:'+JSON.stringify(r.rows));p.end()}).catch(e=>{console.log('V1_FAIL:'+e.message);p.end()})
\"" \
  --region us-east-2

# Resultado esperado: V1:[{"table_name":"credit_balance"},{"table_name":"driver_credit_ledger"}]

# ============================================================
# MIGRATION 2/2: referred_by + driver_referral_log
# ============================================================

aws ecs execute-command \
  --cluster kaviar-cluster \
  --task "$TASK_ID" \
  --container kaviar-backend \
  --interactive \
  --command "node -e \"
const{Pool}=require('pg');
const p=new Pool({connectionString:process.env.DATABASE_URL.replace(/[?&]sslmode=require/,''),ssl:{rejectUnauthorized:false}});
p.query(\\\`
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS referred_at TIMESTAMP;
CREATE TABLE IF NOT EXISTS driver_referral_log (
  id SERIAL PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  referred_by TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'first_credit_purchase',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_referral_log_driver ON driver_referral_log(driver_id);
CREATE INDEX IF NOT EXISTS idx_referral_log_referred_by ON driver_referral_log(referred_by);
\\\`).then(()=>{console.log('M2_OK');p.end()}).catch(e=>{console.log('M2_FAIL:'+e.message);p.end()})
\"" \
  --region us-east-2

# Resultado esperado: M2_OK

# ============================================================
# VERIFICAÇÃO 2/2: Confirmar referred_by + referral_log
# ============================================================

aws ecs execute-command \
  --cluster kaviar-cluster \
  --task "$TASK_ID" \
  --container kaviar-backend \
  --interactive \
  --command "node -e \"
const{Pool}=require('pg');
const p=new Pool({connectionString:process.env.DATABASE_URL.replace(/[?&]sslmode=require/,''),ssl:{rejectUnauthorized:false}});
Promise.all([
  p.query(\\\`SELECT column_name FROM information_schema.columns WHERE table_name='drivers' AND column_name IN ('referred_by','referred_at') ORDER BY column_name\\\`),
  p.query(\\\`SELECT table_name FROM information_schema.tables WHERE table_name='driver_referral_log'\\\`)
]).then(([c,t])=>{console.log('V2_COLS:'+JSON.stringify(c.rows)+' V2_TABLE:'+JSON.stringify(t.rows));p.end()}).catch(e=>{console.log('V2_FAIL:'+e.message);p.end()})
\"" \
  --region us-east-2

# Resultado esperado:
# V2_COLS:[{"column_name":"referred_at"},{"column_name":"referred_by"}] V2_TABLE:[{"table_name":"driver_referral_log"}]

# ============================================================
# VERIFICAÇÃO FINAL: Contagem de motoristas ativos (pra welcome credits)
# ============================================================

aws ecs execute-command \
  --cluster kaviar-cluster \
  --task "$TASK_ID" \
  --container kaviar-backend \
  --interactive \
  --command "node -e \"
const{Pool}=require('pg');
const p=new Pool({connectionString:process.env.DATABASE_URL.replace(/[?&]sslmode=require/,''),ssl:{rejectUnauthorized:false}});
p.query(\\\`SELECT status, count(*) FROM drivers WHERE status IN ('approved','active') GROUP BY status\\\`).then(r=>{console.log('DRIVERS:'+JSON.stringify(r.rows));p.end()}).catch(e=>{console.log('ERR:'+e.message);p.end()})
\"" \
  --region us-east-2

# Resultado esperado: DRIVERS:[{"status":"approved","count":"N"},...]
