# 🧪 PLANO DE VALIDAÇÃO DEFINITIVA - BÔNUS FAMILIAR

**Data:** 2026-03-08 10:40  
**Objetivo:** Validar 100% que o bônus familiar funciona corretamente  
**Status:** ⏳ AGUARDANDO EXECUÇÃO

---

## 📋 CHECKLIST DE VALIDAÇÃO

### FASE 1: DEPLOY DAS MELHORIAS ⏳

- [ ] 1.1. Rodar migration no banco de produção
- [ ] 1.2. Deploy do backend com melhorias
- [ ] 1.3. Gerar novo APK do app mobile
- [ ] 1.4. Instalar APK no dispositivo de teste

### FASE 2: TESTE REAL ⏳

- [ ] 2.1. Cadastrar novo motorista de teste
- [ ] 2.2. **MARCAR** checkbox "Quero participar do programa de bônus familiar"
- [ ] 2.3. Completar cadastro até o final
- [ ] 2.4. Anotar email do motorista testado

### FASE 3: VALIDAÇÃO NO BANCO ⏳

- [ ] 3.1. Consultar motorista no banco via ECS
- [ ] 3.2. Confirmar `family_bonus_accepted = true`
- [ ] 3.3. Confirmar `family_bonus_profile = 'familiar'`

### FASE 4: DECISÃO ⏳

- [ ] ✅ Se dados corretos → Bug resolvido
- [ ] ❌ Se dados incorretos → Investigar payload real

---

## 🚀 FASE 1: DEPLOY DAS MELHORIAS

### 1.1. Rodar Migration no Banco

```bash
# Via ECS Task
aws ecs run-task \
  --cluster kaviar-cluster \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-046613642f742faa2,subnet-01a498f7b4f3fcff5],securityGroups=[sg-0a54bc7272cae4623],assignPublicIp=ENABLED}" \
  --task-definition kaviar-backend \
  --overrides '{
    "containerOverrides": [{
      "name": "kaviar-backend",
      "command": ["sh", "-c", "cat /app/prisma/migrations/20260308_add_family_bonus_profile_default.sql | psql $DATABASE_URL"]
    }]
  }' \
  --region us-east-2
```

**Verificar logs:**
```bash
# Aguardar 30s e buscar logs da task
```

**Resultado esperado:**
```
ALTER TABLE
UPDATE 1  (ou mais, dependendo de quantos motoristas têm NULL)
```

---

### 1.2. Deploy do Backend

```bash
cd /home/goes/kaviar/backend

# 1. Commit das mudanças
git add .
git commit -m "fix: adicionar default ao family_bonus_profile e usar nullish coalescing"

# 2. Build da imagem Docker
docker build -t kaviar-backend:latest .

# 3. Tag para ECR
docker tag kaviar-backend:latest 847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:latest

# 4. Login no ECR
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 847895361928.dkr.ecr.us-east-2.amazonaws.com

# 5. Push para ECR
docker push 847895361928.dkr.ecr.us-east-2.amazonaws.com/kaviar-backend:latest

# 6. Forçar novo deploy no ECS
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --force-new-deployment \
  --region us-east-2

# 7. Aguardar deploy completar (2-3 minutos)
aws ecs wait services-stable \
  --cluster kaviar-cluster \
  --services kaviar-backend-service \
  --region us-east-2

echo "✅ Backend deployado com sucesso"
```

---

### 1.3. Gerar Novo APK do App Mobile

```bash
cd /home/goes/kaviar

# 1. Verificar se código mobile está atualizado
git status

# 2. Build do APK
npx eas build --platform android --profile production

# Ou se usar expo build local:
npx expo export
npx expo build:android

# 3. Aguardar build completar (5-10 minutos)
# 4. Download do APK gerado
```

**Alternativa rápida (desenvolvimento):**
```bash
# Build local para teste
npx expo export
npx expo run:android --variant release
```

---

### 1.4. Instalar APK no Dispositivo

```bash
# Via ADB
adb install -r kaviar-driver.apk

# Ou enviar APK por email/WhatsApp e instalar manualmente
```

---

## 🧪 FASE 2: TESTE REAL

### Dados do Motorista de Teste

**Use estes dados para facilitar a busca:**

```
Nome: Teste Bonus Familiar
Email: teste.bonus.familiar@kaviar.test
Telefone: +5521999887766
CPF: 12345678901
Senha: teste123
Cor do veículo: Preto
```

### Passo a Passo no App

1. ✅ Abrir app mobile
2. ✅ Clicar em "Cadastrar"
3. ✅ Preencher dados básicos (usar dados acima)
4. ✅ Aceitar termos
5. ✅ Clicar "Continuar"
6. ✅ Preencher cor do veículo: "Preto"
7. ✅ **MARCAR** checkbox "Quero participar do programa de bônus familiar"
8. ✅ Clicar "Continuar"
9. ✅ Escolher qualquer bairro
10. ✅ Clicar "Cadastrar"
11. ✅ Aguardar confirmação

### Screenshot Obrigatório

📸 **Tirar foto da tela com o checkbox MARCADO antes de finalizar**

---

## 🔍 FASE 3: VALIDAÇÃO NO BANCO

### Query via ECS Task

```bash
# Criar script Node.js inline para query
aws ecs run-task \
  --cluster kaviar-cluster \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-046613642f742faa2,subnet-01a498f7b4f3fcff5],securityGroups=[sg-0a54bc7272cae4623],assignPublicIp=ENABLED}" \
  --task-definition kaviar-backend \
  --overrides '{
    "containerOverrides": [{
      "name": "kaviar-backend",
      "command": ["node", "-e", "const{PrismaClient}=require(\"@prisma/client\");const p=new PrismaClient();p.drivers.findMany({where:{email:\"teste.bonus.familiar@kaviar.test\"},select:{name:true,email:true,family_bonus_accepted:true,family_bonus_profile:true,created_at:true}}).then(r=>{console.log(JSON.stringify(r,null,2));process.exit(0)}).catch(e=>{console.error(e);process.exit(1)})"]
    }]
  }' \
  --region us-east-2
```

### Buscar Logs

```bash
# Aguardar 30 segundos
sleep 30

# Listar streams mais recentes
aws logs describe-log-streams \
  --log-group-name /ecs/kaviar-backend \
  --order-by LastEventTime \
  --descending \
  --limit 1 \
  --region us-east-2 \
  --query 'logStreams[0].logStreamName' \
  --output text

# Buscar logs (substituir STREAM_NAME pelo resultado acima)
aws logs get-log-events \
  --log-group-name /ecs/kaviar-backend \
  --log-stream-name STREAM_NAME \
  --region us-east-2 \
  --query 'events[*].message' \
  --output text
```

---

## ✅ FASE 4: CRITÉRIOS DE SUCESSO

### Resultado Esperado

```json
[
  {
    "name": "Teste Bonus Familiar",
    "email": "teste.bonus.familiar@kaviar.test",
    "family_bonus_accepted": true,
    "family_bonus_profile": "familiar",
    "created_at": "2026-03-08T13:45:00.000Z"
  }
]
```

### Validação

- ✅ `family_bonus_accepted = true` → **SUCESSO**
- ✅ `family_bonus_profile = "familiar"` → **SUCESSO**
- ❌ Qualquer outro valor → **FALHA - INVESTIGAR**

---

## 🐛 SE FALHAR: INVESTIGAÇÃO PROFUNDA

### 1. Adicionar Logs Temporários no Backend

**Arquivo:** `/backend/src/routes/driver-auth.ts:42` (após validação do schema)

```typescript
// POST /api/auth/driver/register
router.post('/driver/register', async (req, res) => {
  try {
    const data = driverRegisterSchema.parse(req.body);

    // 🔍 LOG TEMPORÁRIO - REMOVER DEPOIS
    console.log('=== CADASTRO MOTORISTA DEBUG ===');
    console.log('Email:', data.email);
    console.log('familyBonusAccepted (recebido):', data.familyBonusAccepted);
    console.log('familyProfile (recebido):', data.familyProfile);
    console.log('familyBonusAccepted (tipo):', typeof data.familyBonusAccepted);
    console.log('familyProfile (tipo):', typeof data.familyProfile);
    console.log('================================');

    // ... resto do código
```

### 2. Adicionar Logs no App Mobile

**Arquivo:** `/app/(auth)/register.tsx:236` (antes do fetch)

```typescript
// 🔍 LOG TEMPORÁRIO - REMOVER DEPOIS
console.log('=== PAYLOAD CADASTRO ===');
console.log('Email:', registerPayload.email);
console.log('familyBonusAccepted:', registerPayload.familyBonusAccepted);
console.log('familyProfile:', registerPayload.familyProfile);
console.log('Payload completo:', JSON.stringify(registerPayload, null, 2));
console.log('========================');

const registerResponse = await fetch(`${API_URL}/api/auth/driver/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(registerPayload),
});
```

### 3. Verificar Logs do Backend

```bash
# Buscar logs do backend no momento do cadastro
aws logs filter-log-events \
  --log-group-name /ecs/kaviar-backend \
  --filter-pattern "CADASTRO MOTORISTA DEBUG" \
  --start-time $(date -d '5 minutes ago' +%s)000 \
  --region us-east-2
```

### 4. Verificar Logs do App Mobile

```bash
# Via ADB (se Android)
adb logcat | grep "PAYLOAD CADASTRO"

# Ou via Expo
npx expo start
# Ver logs no terminal
```

---

## 📊 TEMPLATE DE RELATÓRIO FINAL

Após executar todos os passos, preencher:

```markdown
# RESULTADO DA VALIDAÇÃO - BÔNUS FAMILIAR

**Data:** 2026-03-08
**Executor:** [SEU NOME]

## Dados do Teste
- Email: teste.bonus.familiar@kaviar.test
- Checkbox marcado: ✅ SIM (screenshot anexo)
- Cadastro completado: ✅ SIM

## Resultado no Banco
- family_bonus_accepted: [VALOR]
- family_bonus_profile: [VALOR]

## Status
- [ ] ✅ SUCESSO - Bug resolvido
- [ ] ❌ FALHA - Investigar logs

## Logs (se falhou)
[Colar logs do backend e mobile aqui]

## Conclusão
[Sua conclusão]
```

---

## 🎯 RESUMO DOS COMANDOS

```bash
# 1. Migration
aws ecs run-task ... (ver seção 1.1)

# 2. Deploy backend
cd backend && docker build && docker push && aws ecs update-service

# 3. Build APK
cd .. && npx eas build --platform android

# 4. Teste manual no app
# (seguir passo a passo da Fase 2)

# 5. Query no banco
aws ecs run-task ... (ver seção 3)

# 6. Buscar logs
aws logs get-log-events ...
```

---

## ⏱️ TEMPO ESTIMADO

- Migration: 2 min
- Deploy backend: 5 min
- Build APK: 10 min
- Teste manual: 3 min
- Query + validação: 2 min

**Total: ~22 minutos**

---

## 📞 PRÓXIMOS PASSOS

1. ✅ Executar Fase 1 (deploy)
2. ✅ Executar Fase 2 (teste)
3. ✅ Executar Fase 3 (validação)
4. ✅ Preencher relatório final
5. ✅ Decidir: bug resolvido ou investigar mais

**Aguardando execução para fechar o ticket definitivamente.**
