# 📦 KAVIAR - ENTREGA: SUBIDA EM PRODUÇÃO

**Data**: 2026-02-21  
**Objetivo**: Religar ECS para testar cadastro/login no app passageiro  
**Status**: ✅ Pronto para execução

---

## 📄 ARQUIVOS ENTREGUES

### 1. `SUBIDA_PRODUCAO.md` (Documentação Completa)
- 5 fases detalhadas (Religar → Validar → Configurar → Testar → Desligar)
- 14 comandos com outputs esperados
- Troubleshooting completo
- Checklist de validação
- Evidências esperadas
- Custo estimado ($0.04)

### 2. `subida-producao.sh` (Script Automatizado)
- Comandos: `up`, `down`, `status`, `health`, `logs`, `errors`, `validate`
- Cores e feedback visual
- Validação automática de AWS CLI
- Polling automático de status
- Já executável (`chmod +x`)

### 3. `GUIA_RAPIDO.md` (Execução em 5 Passos)
- Comandos copy-paste prontos
- Checklist mínimo
- Troubleshooting rápido
- Tempo estimado: 15 minutos

### 4. `COMANDOS_AWS_DIRETOS.md` (Fallback)
- Comandos AWS CLI puros (sem script)
- Comandos de emergência
- Sequência completa copy-paste

---

## ⚡ EXECUÇÃO RÁPIDA (RECOMENDADO)

### Opção A: Usando o Script (Mais Fácil)
```bash
cd /home/goes/kaviar/kaviar-app

# 1. Ligar ECS
./subida-producao.sh up

# 2. Aguardar 30s e validar
sleep 30
./subida-producao.sh health

# 3. Configurar app
cp .env .env.backup
echo "EXPO_PUBLIC_API_URL=https://api.kaviar.com.br/api" > .env

# 4. Rodar app
npx expo start --lan --clear

# 5. Testar no Expo Go (manual)

# 6. Desligar
./subida-producao.sh down
cp .env.backup .env
```

---

### Opção B: Comandos AWS Diretos
```bash
cd /home/goes/kaviar/kaviar-app

# 1. Ligar ECS
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --desired-count 1 \
  --region us-east-2

# 2. Aguardar e verificar
sleep 30
aws ecs describe-services \
  --cluster kaviar-cluster \
  --services kaviar-backend-service \
  --region us-east-2 \
  --query 'services[0].{desired:desiredCount,running:runningCount}' \
  --output table

# 3. Testar health
curl -i https://api.kaviar.com.br/api/health

# 4. Configurar app
cp .env .env.backup
echo "EXPO_PUBLIC_API_URL=https://api.kaviar.com.br/api" > .env

# 5. Rodar app
npx expo start --lan --clear

# 6. Testar no Expo Go (manual)

# 7. Desligar
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --desired-count 0 \
  --region us-east-2
```

---

## 📋 CHECKLIST DE VALIDAÇÃO

### Infraestrutura
- [ ] ECS service com `desiredCount=1`
- [ ] Task rodando (`runningCount=1`)
- [ ] Health endpoint retorna `200`
- [ ] Logs mostram `"Server running"`
- [ ] Logs mostram `"database": true`
- [ ] Sem erros críticos de offer-timeout

### App Passageiro
- [ ] `.env` configurado com `https://api.kaviar.com.br/api`
- [ ] App abre no Expo Go
- [ ] Link "Criar conta" visível
- [ ] Navegação para `/register` funciona
- [ ] Cadastro de passageiro retorna `201`
- [ ] Login de passageiro retorna `200`
- [ ] App navega para tela de mapa após login

### Governança
- [ ] Apenas 1 task rodando (não 2)
- [ ] Sem autoscaling ativo
- [ ] ECS desligado após teste (`desiredCount=0`)
- [ ] `.env` do app revertido para local

---

## 🎯 EVIDÊNCIAS ESPERADAS

### 1. Status do ECS
```
+--------------+-------+
| desiredCount | 1     |
| runningCount | 1     |
| status       | ACTIVE|
+--------------+-------+
```

### 2. Health Check
```bash
$ curl https://api.kaviar.com.br/api/health
HTTP/2 200
{"status":"ok","database":true,"timestamp":"2026-02-21T22:56:00.000Z"}
```

### 3. Logs de Startup
```
Server running on port 3000
Prisma Client initialized
Database connected: true
Offer timeout job started
```

### 4. Cadastro no App
```
POST /api/auth/register/passenger 201
User created: teste@kaviar.com
```

### 5. Login no App
```
POST /api/auth/login/passenger 200
Token generated for user: teste@kaviar.com
```

---

## 🔍 COMANDOS AUXILIARES

### Ver logs em tempo real
```bash
./subida-producao.sh logs
# ou
aws logs tail /ecs/kaviar-backend --region us-east-2 --since 5m --follow
```

### Verificar erros
```bash
./subida-producao.sh errors
# ou
aws logs filter-log-events \
  --log-group-name /ecs/kaviar-backend \
  --region us-east-2 \
  --start-time $(date -u -d '10 minutes ago' +%s)000 \
  --filter-pattern "ERROR" \
  --query 'events[*].message' \
  --output text
```

### Monitorar cadastro/login
```bash
aws logs filter-log-events \
  --log-group-name /ecs/kaviar-backend \
  --region us-east-2 \
  --start-time $(date -u -d '2 minutes ago' +%s)000 \
  --filter-pattern "POST /api/auth" \
  --query 'events[*].message' \
  --output text
```

---

## 🆘 TROUBLESHOOTING

### Problema: Health retorna 502/503
**Solução**:
```bash
# Aguardar mais 20s
sleep 20
./subida-producao.sh health

# Ver logs
./subida-producao.sh logs
```

### Problema: App retorna "Network Error"
**Solução**:
```bash
# Verificar .env
cat .env

# Reiniciar Expo
npx expo start --lan --clear
```

### Problema: Offer-timeout travando
**Solução**: Anotar para desabilitar depois (não bloqueia teste)

---

## 💰 CUSTO ESTIMADO

| Recurso | Custo/hora | Tempo | Total |
|---------|-----------|-------|-------|
| ECS Task (1x) | $0.05 | 30 min | $0.025 |
| ALB | $0.025 | 30 min | $0.0125 |
| **TOTAL** | - | - | **$0.04** |

**Custo negligível para teste de 30 minutos.**

---

## 📊 RESUMO TÉCNICO

| Métrica | Valor |
|---------|-------|
| Arquivos criados | 4 |
| Comandos principais | 5 |
| Comandos auxiliares | 9 |
| Tempo estimado | 15-20 min |
| Custo estimado | $0.04 |
| Risco | Baixo |
| Tasks ECS | 1 (não 2) |
| Autoscaling | Desabilitado |

---

## 🛡️ GARANTIAS CUMPRIDAS

- ✅ Plano seguro para religar ECS
- ✅ Apenas 1 task (desiredCount=1)
- ✅ Checklist de validação obrigatório
- ✅ Validação de health endpoint
- ✅ Validação de conexão com RDS
- ✅ Validação de offer-timeout job
- ✅ Configuração do app passageiro
- ✅ Comando para desligar (desiredCount=0)
- ✅ Sem migrations novas
- ✅ Evidências esperadas documentadas
- ✅ Troubleshooting completo
- ✅ Custo controlado

---

## 📝 PRÓXIMOS PASSOS

1. **Executar Fase 1**: Religar ECS
2. **Executar Fase 2**: Validar health e logs
3. **Executar Fase 3**: Configurar app
4. **Executar Fase 4**: Testar cadastro/login no Expo Go
5. **Executar Fase 5**: Desligar ECS

**Tempo total**: 15-20 minutos  
**Custo total**: $0.04

---

## 🎯 COMANDO ÚNICO (TUDO DE UMA VEZ)

```bash
cd /home/goes/kaviar/kaviar-app && \
./subida-producao.sh up && \
sleep 30 && \
./subida-producao.sh health && \
cp .env .env.backup && \
echo "EXPO_PUBLIC_API_URL=https://api.kaviar.com.br/api" > .env && \
echo "✅ ECS ligado e app configurado. Execute: npx expo start --lan --clear"
```

**Após testar no Expo Go**:
```bash
cd /home/goes/kaviar/kaviar-app && \
./subida-producao.sh down && \
cp .env.backup .env && \
echo "✅ ECS desligado e app revertido para local"
```

---

**Criado por**: Kiro  
**Data**: 2026-02-21  
**Status**: ✅ Pronto para execução  
**Autorização**: Concedida para religar ECS (desiredCount=1)  
**Próxima ação**: Executar `./subida-producao.sh up`
