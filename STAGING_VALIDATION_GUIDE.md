# 🚀 Guia de Validação Operacional em Staging

**Data:** 2026-03-09  
**Commit:** 829d2d1  
**Status:** Pronto para execução

---

## ✅ Script Corrigido

O script `scripts/staging-validation.sh` foi corrigido para:

1. ✅ Usar variável de ambiente real (`STAGING_DB` ou `DATABASE_URL`)
2. ✅ Validar se a URL não contém placeholders
3. ✅ Abortar com erro claro se configuração inválida
4. ✅ Suportar conexão com banco real

---

## 📋 Pré-requisitos

### 1. Variáveis de Ambiente

O script usa a seguinte ordem de prioridade:

```bash
# Opção 1: Usar STAGING_DB (recomendado para staging)
export STAGING_DB="postgresql://user:pass@host:5432/kaviar"

# Opção 2: Usar DATABASE_URL (fallback)
export DATABASE_URL="postgresql://user:pass@host:5432/kaviar"
```

**Banco atual detectado:**
```
DATABASE_URL="postgresql://kaviaradmin:***@kaviar-prod-db.cxuuaq46o1o5.us-east-2.rds.amazonaws.com:5432/kaviar?sslmode=require"
```

⚠️ **ATENÇÃO:** Este é o banco de **PRODUÇÃO**. Para staging, use um banco separado.

### 2. API Endpoint

```bash
# Opcional: definir endpoint da API
export STAGING_API="http://localhost:3001"  # padrão se não definido
```

### 3. Backend Rodando

```bash
cd backend
npm run dev  # ou npm start
```

### 4. Dependências

```bash
# psql (PostgreSQL client)
which psql  # deve retornar caminho

# curl
which curl  # deve retornar caminho

# jq (JSON processor)
which jq  # deve retornar caminho
# Se não tiver: sudo apt-get install jq
```

---

## 🎯 Comando de Execução

### Opção 1: Usando DATABASE_URL Existente (⚠️ PRODUÇÃO)

```bash
cd /home/goes/kaviar

# Carregar variáveis do .env
export $(cat backend/.env | grep DATABASE_URL | xargs)

# Executar validação
./scripts/staging-validation.sh
```

### Opção 2: Usando Banco de Staging Separado (Recomendado)

```bash
cd /home/goes/kaviar

# Definir banco de staging
export STAGING_DB="postgresql://user:pass@staging-host:5432/kaviar"

# Definir API de staging
export STAGING_API="http://localhost:3001"

# Executar validação
./scripts/staging-validation.sh
```

### Opção 3: Execução Passo a Passo (Manual)

Se preferir executar manualmente sem o script:

```bash
cd /home/goes/kaviar

# 1. Aplicar migration
export DATABASE_URL="postgresql://..."
psql "$DATABASE_URL" < backend/prisma/migrations/20260309_normalize_drivers.sql

# 2. Buscar neighborhood
NEIGHBORHOOD_ID=$(psql "$DATABASE_URL" -t -c "SELECT id FROM neighborhoods WHERE is_active = true LIMIT 1;" | xargs)
echo "Neighborhood: $NEIGHBORHOOD_ID"

# 3. Testar cadastro via app
curl -X POST http://localhost:3001/api/auth/driver/register \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"João App Test\",
    \"email\": \"joao.app.$(date +%s)@test.com\",
    \"phone\": \"+5521999999999\",
    \"password\": \"senha123\",
    \"document_cpf\": \"12345678901\",
    \"vehicle_color\": \"Branco\",
    \"accepted_terms\": true,
    \"neighborhoodId\": \"$NEIGHBORHOOD_ID\",
    \"verificationMethod\": \"GPS_AUTO\"
  }"

# 4. Testar cadastro via web
curl -X POST http://localhost:3001/api/driver/onboarding \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Maria Web Test\",
    \"email\": \"maria.web.$(date +%s)@test.com\",
    \"phone\": \"+5521988888888\",
    \"password\": \"senha123\",
    \"document_cpf\": \"98765432100\",
    \"vehicle_color\": \"Preto\",
    \"accepted_terms\": true,
    \"neighborhoodId\": \"$NEIGHBORHOOD_ID\"
  }"
```

---

## 📊 O Que o Script Valida

### 1. Migration
- ✅ Cria consents LGPD faltantes
- ✅ Cria driver_verifications faltantes
- ✅ Preenche territory_type

### 2. Cadastro via App
- ✅ Endpoint `/api/auth/driver/register` funciona
- ✅ Retorna token
- ✅ Cria driver com todos os campos
- ✅ Cria consent LGPD
- ✅ Cria driver_verification
- ✅ Preenche territory_verification_method

### 3. Cadastro via Web
- ✅ Endpoint `/api/driver/onboarding` funciona
- ✅ Retorna token
- ✅ Aceita campos obrigatórios (CPF, veículo, termos)
- ✅ Cria registros auxiliares

### 4. Validação de Dados
- ✅ document_cpf preenchido
- ✅ vehicle_color preenchido
- ✅ territory_type preenchido
- ✅ territory_verification_method preenchido
- ✅ Consent LGPD criado
- ✅ Driver verification criado

---

## 🔍 Validação Manual E2E (Após Script)

### 1. Cadastro via App

```bash
# Abrir app Expo
cd /home/goes/kaviar
npx expo start

# No dispositivo/emulador:
# 1. Ir para tela de registro
# 2. Preencher dados
# 3. Selecionar bairro
# 4. Selecionar comunidade (opcional)
# 5. Cadastrar
# 6. Verificar auto-login
```

### 2. Cadastro via Web

```bash
# Abrir frontend web
cd /home/goes/kaviar/frontend-app
npm start

# No navegador:
# 1. Ir para /onboarding?type=driver
# 2. Preencher dados (incluindo CPF, veículo, termos)
# 3. Selecionar bairro
# 4. Selecionar comunidade (opcional)
# 5. Cadastrar
# 6. Verificar auto-login
```

### 3. Validar no Admin

```bash
# Abrir admin
# Ir para /admin/drivers

# Verificar:
# - Motorista aparece na lista
# - Status: pending
# - CPF preenchido
# - Veículo preenchido
# - Território preenchido
```

### 4. Upload de Documentos

```bash
# Como motorista (app ou web):
# 1. Ir para área de documentos
# 2. Upload CNH
# 3. Upload Comprovante de Residência
# 4. Upload Foto do Veículo
```

### 5. Aprovação no Admin

```bash
# Como admin:
# 1. Ir para /admin/drivers/{id}
# 2. Revisar documentos
# 3. Aprovar motorista
# 4. Verificar status muda para: approved
```

### 6. Motorista Ficar Online

```bash
# Como motorista (app):
# 1. Ir para tela "Online"
# 2. Ativar disponibilidade
# 3. Verificar status: available = true
```

---

## 📸 Evidências Esperadas

### 1. Migration

```
📦 1. Executando migration de normalização...
INSERT 0 X  (consents criados)
INSERT 0 Y  (verifications criados)
UPDATE Z    (territory_type preenchido)
✅ Migration executada com sucesso
```

### 2. Cadastro App

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "driver_1234567890_abc123",
    "name": "João App Test",
    "email": "joao.app.1234567890@test.com",
    "status": "pending",
    "user_type": "DRIVER",
    "isPending": true
  }
}
```

### 3. Cadastro Web

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "id": "driver_1234567890_xyz789",
    "name": "Maria Web Test",
    "email": "maria.web.1234567890@test.com",
    "status": "pending"
  }
}
```

### 4. Validação de Registros

```
driver_id | has_cpf | has_vehicle | has_territory | territory_verification_method | consent_type | verification_status
----------+---------+-------------+---------------+-------------------------------+--------------+--------------------
driver_... | t       | t           | t             | GPS_AUTO                      | lgpd         | PENDING
driver_... | t       | t           | t             | MANUAL_SELECTION              | lgpd         | PENDING
```

### 5. Aprovação

```sql
SELECT id, name, status, approved_at, approved_by
FROM drivers
WHERE id = 'driver_...';

-- Antes:
-- status: pending, approved_at: NULL

-- Depois:
-- status: approved, approved_at: 2026-03-09 19:45:00
```

### 6. Online

```sql
SELECT id, name, available, available_updated_at
FROM drivers
WHERE id = 'driver_...';

-- available: true
-- available_updated_at: 2026-03-09 19:46:00
```

---

## ⚠️ Troubleshooting

### Erro: "could not translate host name"

```bash
# Verificar se DATABASE_URL está definida
echo $DATABASE_URL

# Se vazia, carregar do .env
export $(cat backend/.env | grep DATABASE_URL | xargs)
```

### Erro: "jq: command not found"

```bash
# Instalar jq
sudo apt-get update
sudo apt-get install jq
```

### Erro: "Connection refused"

```bash
# Verificar se backend está rodando
curl http://localhost:3001/health

# Se não estiver, iniciar:
cd backend
npm run dev
```

### Erro: "Neighborhood not found"

```bash
# Verificar se há neighborhoods ativos
psql "$DATABASE_URL" -c "SELECT id, name, is_active FROM neighborhoods LIMIT 5;"

# Se não houver, criar um:
psql "$DATABASE_URL" -c "
  INSERT INTO neighborhoods (id, name, city, is_active, created_at, updated_at)
  VALUES ('test-neighborhood-1', 'Copacabana', 'Rio de Janeiro', true, NOW(), NOW());
"
```

---

## ✅ Checklist de Validação

- [ ] Script corrigido e testado
- [ ] Migration aplicada com sucesso
- [ ] Cadastro via app funcionando
- [ ] Cadastro via web funcionando
- [ ] Consents LGPD criados
- [ ] Driver verifications criados
- [ ] Campos obrigatórios preenchidos
- [ ] territory_verification_method presente
- [ ] Motorista aparece no admin
- [ ] Documentos podem ser enviados
- [ ] Aprovação funciona (pending → approved)
- [ ] Motorista consegue ficar online

---

## 🚀 Próximos Passos

Após validação completa em staging:

1. ✅ Coletar evidências (screenshots, logs, queries)
2. ✅ Documentar resultados
3. ✅ Criar relatório de validação
4. ⏳ Planejar deploy em produção
5. ⏳ Executar migration em produção
6. ⏳ Monitorar por 48h

---

**Commit:** 829d2d1  
**Branch:** main  
**Pronto para:** Validação operacional em staging
