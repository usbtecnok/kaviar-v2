# 🧪 TESTE E2E KAVIAR - EXECUÇÃO CONTROLADA

**Data**: 2026-01-16  
**Objetivo**: Validar fluxo completo motorista → passageiro → corrida → avaliação  
**Regra**: SEM alterações de schema, SEM refatoração, APENAS ativação do existente

---

## 📋 CHECKLIST PRÉ-TESTE

### ✅ O que JÁ existe no sistema:
- [x] Schema `drivers` com campo `status` (pending/approved/rejected)
- [x] Schema `passengers` 
- [x] Schema `rides` com status (requested/accepted/completed)
- [x] Schema `ratings` (entity_type, entity_id, rating, comment)
- [x] Rota `/admin/drivers/:id/approve` (admin-approval.ts)
- [x] Webhook WhatsApp `/webhooks/twilio/whatsapp` (twilio-whatsapp.js)
- [x] Integração Supabase para WhatsApp (lib/supabase.js)

### ❌ O que NÃO existe (lacunas identificadas):
- [ ] Envio automático de WhatsApp ao aprovar motorista
- [ ] Rota para motorista marcar status ONLINE
- [ ] Endpoint para passageiro solicitar corrida
- [ ] Endpoint para motorista aceitar corrida
- [ ] Endpoint para finalizar corrida
- [ ] Endpoint para passageiro avaliar motorista

---

## 🎯 PLANO DE EXECUÇÃO

### FASE 1: Criar Dados de Teste (SQL Direto)
```sql
-- 1. Criar motorista de teste
INSERT INTO drivers (id, name, email, phone, status, vehicle_model, created_at, updated_at)
VALUES (
  'drv_test_001',
  'Motorista Teste Kaviar',
  'motorista@kaviar.test',
  '+5511999999999', -- Número real do admin para WhatsApp
  'pending',
  'Teste Sedan',
  NOW(),
  NOW()
);

-- 2. Criar passageiro de teste
INSERT INTO passengers (id, name, email, password_hash, phone, created_at, updated_at)
VALUES (
  'psg_test_001',
  'Passageiro Teste Kaviar',
  'passageiro@kaviar.test',
  '$2b$10$dummyhashfortest', -- Hash simples para teste
  '+5511888888888',
  NOW(),
  NOW()
);
```

### FASE 2: Implementar Lacunas Mínimas

#### 2.1 Notificação WhatsApp ao Aprovar Motorista
**Arquivo**: `backend/src/modules/admin/approval-controller.ts`  
**Ação**: Adicionar envio de WhatsApp após aprovação

```typescript
// Após aprovar motorista, enviar WhatsApp
if (driver.phone) {
  await sendWhatsAppNotification(driver.phone, 
    `Olá ${driver.name}! Sua conta foi aprovada no Kaviar. Você já pode começar a aceitar corridas.`
  );
}
```

#### 2.2 Endpoint: Motorista Online
**Arquivo**: `backend/src/routes/driver-status.ts` (NOVO)

```typescript
router.post('/drivers/me/online', authenticateDriver, async (req, res) => {
  await prisma.drivers.update({
    where: { id: req.user.id },
    data: { 
      status: 'online',
      last_active_at: new Date()
    }
  });
  res.json({ success: true });
});
```

#### 2.3 Endpoint: Solicitar Corrida
**Arquivo**: `backend/src/routes/rides.ts` (ADICIONAR)

```typescript
router.post('/rides', authenticatePassenger, async (req, res) => {
  const { origin, destination } = req.body;
  
  // Buscar motorista online
  const driver = await prisma.drivers.findFirst({
    where: { status: 'online' }
  });
  
  if (!driver) {
    return res.status(404).json({ error: 'Nenhum motorista disponível' });
  }
  
  const ride = await prisma.rides.create({
    data: {
      id: `ride_${Date.now()}`,
      passenger_id: req.user.id,
      driver_id: driver.id,
      origin,
      destination,
      status: 'requested',
      price: 10.00,
      created_at: new Date(),
      updated_at: new Date()
    }
  });
  
  res.json({ success: true, ride });
});
```

#### 2.4 Endpoint: Aceitar Corrida
**Arquivo**: `backend/src/routes/rides.ts` (ADICIONAR)

```typescript
router.put('/rides/:id/accept', authenticateDriver, async (req, res) => {
  const ride = await prisma.rides.update({
    where: { id: req.params.id },
    data: { 
      status: 'accepted',
      updated_at: new Date()
    }
  });
  res.json({ success: true, ride });
});
```

#### 2.5 Endpoint: Finalizar Corrida
**Arquivo**: `backend/src/routes/rides.ts` (ADICIONAR)

```typescript
router.put('/rides/:id/complete', authenticateDriver, async (req, res) => {
  const ride = await prisma.rides.update({
    where: { id: req.params.id },
    data: { 
      status: 'completed',
      updated_at: new Date()
    }
  });
  res.json({ success: true, ride });
});
```

#### 2.6 Endpoint: Avaliar Motorista
**Arquivo**: `backend/src/routes/ratings.ts` (ADICIONAR)

```typescript
router.post('/ratings', authenticatePassenger, async (req, res) => {
  const { ride_id, rating, comment } = req.body;
  
  const ratingRecord = await prisma.ratings.create({
    data: {
      id: `rat_${Date.now()}`,
      entity_type: 'driver',
      entity_id: req.body.driver_id,
      user_id: req.user.id,
      ride_id,
      rating,
      score: rating,
      comment,
      created_at: new Date()
    }
  });
  
  // Atualizar média do motorista (se existir campo)
  // TODO: Calcular média de ratings
  
  res.json({ success: true, rating: ratingRecord });
});
```

---

## 🧪 EXECUÇÃO DO TESTE

### Passo 1: Criar Motorista
```bash
curl -X POST http://localhost:3000/admin/drivers \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Motorista Teste Kaviar",
    "email": "motorista@kaviar.test",
    "phone": "+5511999999999",
    "vehicle_model": "Teste Sedan"
  }'
```

### Passo 2: Admin Aprova Motorista
```bash
curl -X PUT http://localhost:3000/admin/drivers/drv_test_001/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Evidência esperada**: WhatsApp enviado para +5511999999999

### Passo 3: Motorista Marca Online
```bash
curl -X POST http://localhost:3000/drivers/me/online \
  -H "Authorization: Bearer $DRIVER_TOKEN"
```

### Passo 4: Passageiro Solicita Corrida
```bash
curl -X POST http://localhost:3000/rides \
  -H "Authorization: Bearer $PASSENGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "Rua A, 123",
    "destination": "Rua B, 456"
  }'
```

### Passo 5: Motorista Aceita Corrida
```bash
curl -X PUT http://localhost:3000/rides/ride_123/accept \
  -H "Authorization: Bearer $DRIVER_TOKEN"
```

### Passo 6: Motorista Finaliza Corrida
```bash
curl -X PUT http://localhost:3000/rides/ride_123/complete \
  -H "Authorization: Bearer $DRIVER_TOKEN"
```

### Passo 7: Passageiro Avalia Motorista
```bash
curl -X POST http://localhost:3000/ratings \
  -H "Authorization: Bearer $PASSENGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ride_id": "ride_123",
    "driver_id": "drv_test_001",
    "rating": 5,
    "comment": "Motorista educado e veículo limpo"
  }'
```

---

## 📊 EVIDÊNCIAS OBRIGATÓRIAS

- [ ] Screenshot do WhatsApp recebido pelo motorista
- [ ] Log do backend mostrando cada transição de status
- [ ] Query SQL mostrando registro da avaliação
- [ ] Verificação de que a média do motorista foi atualizada

---

## 🛑 CRITÉRIOS DE PARADA

Se qualquer etapa falhar:
1. **PARAR** imediatamente
2. **DOCUMENTAR** o erro exato
3. **NÃO** tentar corrigir sem aprovação
4. **RELATAR** ao owner

---

## 📝 RELATÓRIO FINAL

### O que funcionou:
- [ ] Criação de motorista
- [ ] Aprovação por admin
- [ ] Notificação WhatsApp
- [ ] Motorista online
- [ ] Solicitação de corrida
- [ ] Aceite de corrida
- [ ] Finalização de corrida
- [ ] Avaliação do motorista

### O que NÃO funcionou:
- [ ] (listar aqui)

### O que NÃO foi implementado por segurança:
- [ ] (listar aqui)

---

**Status**: AGUARDANDO EXECUÇÃO  
**Próxima ação**: Aprovação do owner para iniciar
