# 🚀 CHECKLIST DE PRODUÇÃO - KAVIAR

**Última atualização:** 2026-02-17  
**Status Geral:** 🔴 NÃO PRONTO PARA PRODUÇÃO

---

## 📍 ACESSO RÁPIDO

```bash
# Abrir checklist
cd /home/goes/kaviar && cat PRODUCAO-CHECKLIST.md

# Editar checklist (marcar itens concluídos)
cd /home/goes/kaviar && nano PRODUCAO-CHECKLIST.md
```

---

## 🚨 BLOQUEANTES CRÍTICOS (Sem isso, NÃO LANÇAR)

### 1. MATCHING EM TEMPO REAL ✅ IMPLEMENTADO
- [x] WebSocket ou SSE implementado no backend (SSE)
- [x] Endpoint POST /api/v2/rides (passageiro solicita corrida)
- [x] Fila de corridas pendentes (em memória + dispatcher)
- [x] Algoritmo de matching (distância + disponibilidade)
- [x] Notificação push para motorista (SSE real-time)
- [x] Timeout de 15s para aceitar corrida
- [x] Redistribuição automática se motorista rejeitar
- [x] Teste: Script de 20 corridas criado

**Status:** ✅ SPEC_RIDE_FLOW_V1 implementada completa  
**Documentação:** `backend/docs/SPEC_RIDE_FLOW_V1.md`  
**README:** `backend/scripts/README-RIDE-FLOW-V1.md`

**Validação:**
```bash
# Rodar migration
cd backend && npx prisma migrate dev --name ride_flow_v1

# Seed de teste
npx tsx prisma/seed-ride-flow-v1.ts

# Testar 20 corridas
./scripts/test-ride-flow-v1.sh
```

**Próximo passo:** Testar em staging e coletar evidências (logs CloudWatch)

---

### 2. PAGAMENTO INTEGRADO
- [ ] Escolher gateway (Mercado Pago, Stripe ou PagSeguro)
- [ ] Criar conta no gateway escolhido
- [ ] Implementar endpoint POST /api/payments/create
- [ ] Implementar webhook de confirmação de pagamento
- [ ] Calcular split (motorista 70%, plataforma 20%, comunidade 10%)
- [ ] Armazenar transaction_id na tabela rides
- [ ] Sistema de reembolso (cancelamento)
- [ ] Teste: Pagamento real de R$ 1,00

**Validação:**
```bash
# Testar pagamento
curl -X POST http://localhost:3003/api/payments/create \
  -H "Authorization: Bearer <passenger_token>" \
  -d '{"ride_id":"<ride_id>","amount":1500,"method":"credit_card"}'
# Deve retornar payment_url ou payment_id
```

---

### 3. TRACKING EM TEMPO REAL
- [ ] WebSocket server configurado (socket.io ou ws)
- [ ] Endpoint PATCH /api/drivers/location (atualizar lat/lng a cada 5s)
- [ ] Broadcast de localização para passageiro conectado
- [ ] Eventos: driver_assigned, driver_arriving, ride_started, ride_completed
- [ ] Histórico de rota (salvar pontos GPS)
- [ ] Teste: Abrir 2 navegadores e ver atualização em tempo real

**Validação:**
```bash
# Conectar WebSocket (passageiro)
wscat -c ws://localhost:3003/rides/<ride_id>
# Deve receber updates de localização do motorista
```

---

### 4. APP MOBILE MOTORISTA
- [ ] Projeto React Native ou Flutter criado
- [ ] Tela de login/cadastro
- [ ] Tela de corridas disponíveis (lista)
- [ ] Botão "Aceitar Corrida"
- [ ] Navegação GPS (Google Maps ou Waze)
- [ ] Botão "Iniciar Corrida" (chegou no passageiro)
- [ ] Botão "Finalizar Corrida" (chegou no destino)
- [ ] Histórico de ganhos do dia
- [ ] Notificações push funcionando
- [ ] Build APK/IPA gerado
- [ ] Teste: Instalar em 2 celulares e fazer corrida completa

**Validação:**
```bash
# Build Android
cd kaviar-driver-app
npx react-native run-android
# Testar fluxo completo: login → aceitar corrida → finalizar
```

---

### 5. APP MOBILE PASSAGEIRO (VALIDAR)
- [ ] Validar se kaviar-app está funcional
- [ ] Tela de solicitar corrida funciona?
- [ ] Mapa mostra motorista em tempo real?
- [ ] Pagamento integrado funciona?
- [ ] Avaliação pós-corrida funciona?
- [ ] Histórico de corridas funciona?
- [ ] Build APK/IPA atualizado
- [ ] Teste: Fazer corrida completa end-to-end

**Validação:**
```bash
# Build Android
cd kaviar-app
npx react-native run-android
# Testar fluxo completo: login → solicitar corrida → pagar → avaliar
```

---

## ⚠️ IMPORTANTES (Lançar sem, mas implementar em 1 semana)

### 6. MONITORAMENTO E ALERTAS
- [ ] Dashboard CloudWatch criado
- [ ] Alarme: HTTPCode_Target_5XX_Count > 10 em 5min
- [ ] Alarme: TargetResponseTime p99 > 2000ms
- [ ] Alarme: HealthyHostCount < 1
- [ ] Alarme: Corridas sem match > 5min
- [ ] Integração Slack ou email para alertas
- [ ] Runbook para incidentes comuns
- [ ] Teste: Simular erro 500 e verificar alerta

**Validação:**
```bash
# Criar dashboard
aws cloudwatch put-dashboard \
  --dashboard-name KAVIAR-Production \
  --dashboard-body file://backend/docs/ops/dashboard-config.json \
  --region us-east-2
```

---

### 7. SISTEMA DE AVALIAÇÕES
- [ ] Habilitar ENABLE_RATING_SYSTEM=true no .env
- [ ] Endpoint POST /api/rides/:id/rate implementado
- [ ] Passageiro avalia motorista (1-5 estrelas + comentário)
- [ ] Motorista avalia passageiro (1-5 estrelas)
- [ ] Bloquear motorista com média < 3.5 estrelas
- [ ] Dashboard de reputação para motorista
- [ ] Teste: Avaliar 10 corridas e verificar média

**Validação:**
```bash
# Avaliar corrida
curl -X POST http://localhost:3003/api/rides/<ride_id>/rate \
  -H "Authorization: Bearer <passenger_token>" \
  -d '{"rating":5,"comment":"Ótimo motorista!"}'
```

---

### 8. TESTES AUTOMATIZADOS
- [ ] Testes de integração: fluxo completo de corrida
- [ ] Testes de carga: 100 corridas simultâneas (k6 ou Artillery)
- [ ] Testes de segurança: OWASP ZAP scan
- [ ] Testes de resiliência: simular queda do RDS
- [ ] CI/CD: rodar testes antes de deploy
- [ ] Cobertura de código > 70%

**Validação:**
```bash
# Rodar testes
cd backend
npm test

# Teste de carga
k6 run tests/load/ride-flow.js
# Deve suportar 100 req/s sem erros
```

---

### 9. COMPLIANCE E SEGURANÇA
- [ ] Política de privacidade (LGPD)
- [ ] Termo de uso
- [ ] Criptografia de CPF no banco (AES-256)
- [ ] Rate limiting: 100 req/min por IP
- [ ] Auditoria: log de quem acessou dados sensíveis
- [ ] Backup automático RDS (diário, retenção 7 dias)
- [ ] Plano de disaster recovery documentado
- [ ] Teste: Restaurar backup em ambiente de staging

**Validação:**
```bash
# Verificar backup RDS
aws rds describe-db-snapshots \
  --db-instance-identifier kaviar-prod-db \
  --region us-east-2
```

---

### 10. DOCUMENTAÇÃO OPERACIONAL
- [ ] Manual de suporte (como resolver problemas comuns)
- [ ] Fluxo de onboarding de motorista (passo a passo)
- [ ] Fluxo de resolução de disputas
- [ ] SLA definido (99.5% uptime, resposta < 2s)
- [ ] Processo de rollback (como reverter deploy)
- [ ] Contatos de emergência (quem chamar às 3h da manhã)

**Localização:**
```bash
# Criar documentação
mkdir -p /home/goes/kaviar/docs/operacional
nano /home/goes/kaviar/docs/operacional/MANUAL-SUPORTE.md
```

---

## 📊 PROGRESSO GERAL

**Bloqueantes:** 0/5 ✅ (0%)  
**Importantes:** 0/5 ✅ (0%)  
**Total:** 0/10 ✅ (0%)

---

## 🎯 CRITÉRIO DE GO-LIVE

✅ **PODE LANÇAR** quando:
- [ ] Todos os 5 bloqueantes estão ✅
- [ ] Pelo menos 3 dos 5 importantes estão ✅
- [ ] Teste end-to-end com 10 corridas reais funcionou
- [ ] Equipe de suporte treinada
- [ ] Plano de rollback testado

---

## 📅 CRONOGRAMA SUGERIDO

**Semana 1-2:**
- Matching em tempo real
- Tracking WebSocket
- App motorista (MVP)

**Semana 3:**
- Pagamento integrado
- Testes de carga
- Monitoramento

**Semana 4:**
- Validação app passageiro
- Sistema de avaliações
- Documentação

**Go-Live:** Semana 5 (se tudo OK)

---

## 🆘 CONTATOS DE EMERGÊNCIA

- **Tech Lead:** [PREENCHER]
- **DevOps:** [PREENCHER]
- **Suporte AWS:** [PREENCHER]
- **Gateway Pagamento:** [PREENCHER]

---

**Última revisão:** 2026-02-17 23:59
