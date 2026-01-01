# 💰 Sistema de Incentivos ao Motorista Local

## 📋 Visão Geral

O Sistema de Incentivos implementa **bônus automático** para motoristas locais e **governança de comunidades**, incentivando a mobilidade comunitária sem alterar preços para passageiros.

### **Princípios Fundamentais**

- **Bônus automático** para motoristas da mesma comunidade do passageiro
- **Valor do passageiro** permanece inalterado
- **Bônus absorvido** pela plataforma (controle interno)
- **Governança** baseada em massa crítica mínima de motoristas
- **Transparência total** no extrato do motorista

## 🏗️ Arquitetura

### **1. Bônus Automático ao Motorista Local**

```sql
-- Configuração de bônus (por comunidade ou global)
bonus_config (
  community_id UUID NULL, -- NULL = configuração global
  bonus_type ENUM('percentage', 'fixed'),
  bonus_value DECIMAL, -- 5.00 = 5% ou R$ 1,50
  is_active BOOLEAN
)

-- Extrato detalhado do motorista
driver_earnings (
  driver_id UUID,
  ride_id UUID,
  base_amount DECIMAL, -- Valor base da corrida
  bonus_amount DECIMAL, -- Bônus aplicado
  total_amount DECIMAL, -- Base + bônus
  bonus_type ENUM('community_bonus', 'none')
)
```

### **2. Governança de Comunidades**

```sql
-- Campos adicionais em communities
communities (
  min_drivers_required INTEGER DEFAULT 3,
  status ENUM('pending', 'active', 'inactive') DEFAULT 'pending'
)
```

## 🔄 Regras de Negócio

### **Aplicação de Bônus**

**Condições obrigatórias:**
- `ride.community_id == driver.community_id` (mesma comunidade)
- `ride.allow_external_drivers == false` (corrida não aberta)

**Cálculo:**
- **Percentual:** `bonus = base_amount * (bonus_value / 100)`
- **Fixo:** `bonus = bonus_value`

### **Ativação de Comunidade**

**Status `pending` → `active`:**
- Quando `count(drivers) >= min_drivers_required`

**Status `active` → `pending`:**
- Quando `count(drivers) < min_drivers_required`

**Restrições:**
- Passageiros **NÃO podem** criar corridas em comunidades `pending`
- Motoristas **podem** se cadastrar normalmente

## 🔌 APIs Implementadas

### **Incentivos**

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/v1/incentives/complete-ride` | POST | Finalizar corrida com bônus automático |
| `/api/v1/incentives/drivers/:id/earnings` | GET | Extrato detalhado do motorista |
| `/api/v1/incentives/bonus-config` | POST | Configurar bônus (global/comunidade) |
| `/api/v1/incentives/bonus-config` | GET | Buscar configuração de bônus |
| `/api/v1/incentives/communities/:id/update-status` | POST | Atualizar status da comunidade |

### **Corridas (Atualizada)**

- Validação automática de comunidade ativa antes de criar corrida
- Erro claro quando comunidade está `pending`

## 📝 Exemplos de Uso

### **1. Configurar Bônus Global (5%)**

```bash
POST /api/v1/incentives/bonus-config
{
  "bonus_type": "percentage",
  "bonus_value": 5.00
}
```

### **2. Configurar Bônus Específico (R$ 2,00)**

```bash
POST /api/v1/incentives/bonus-config
{
  "community_id": "uuid-comunidade",
  "bonus_type": "fixed", 
  "bonus_value": 2.00
}
```

### **3. Finalizar Corrida com Bônus**

```bash
POST /api/v1/incentives/complete-ride
{
  "ride_id": "uuid-corrida",
  "driver_id": "uuid-motorista",
  "base_amount": 15.50,
  "passenger_amount": 15.50
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "passenger_paid": 15.50,
    "driver_received": 16.28,
    "bonus_applied": true,
    "bonus_amount": 0.78
  }
}
```

### **4. Extrato do Motorista**

```bash
GET /api/v1/incentives/drivers/uuid-motorista/earnings?limit=10
```

**Resposta:**
```json
{
  "success": true,
  "earnings": [
    {
      "id": "uuid",
      "base_amount": 15.50,
      "bonus_amount": 0.78,
      "total_amount": 16.28,
      "bonus_type": "community_bonus",
      "created_at": "2026-01-01T12:00:00Z"
    }
  ],
  "totals": {
    "total_base": 155.00,
    "total_bonus": 7.80,
    "total_earnings": 162.80,
    "rides_count": 10,
    "bonus_rides": 8
  }
}
```

## 🔒 Fluxos Principais

### **Fluxo de Corrida com Bônus**

```
1. Passageiro cria corrida (comunidade ativa)
2. Motorista da mesma comunidade aceita
3. Corrida é finalizada via API
4. Sistema calcula bônus automaticamente:
   - Verifica: mesma comunidade + não externa
   - Aplica: configuração de bônus ativa
   - Registra: extrato detalhado
5. Motorista recebe: valor base + bônus
6. Passageiro pagou: apenas valor base
```

### **Fluxo de Governança**

```
1. Comunidade criada (status = pending)
2. Motoristas se cadastram
3. Trigger automático verifica count >= min_required
4. Status muda para active
5. Passageiros podem criar corridas
```

## 💡 Benefícios do Sistema

### **Para Motoristas**

- **Ganho extra** automático por atender a própria comunidade
- **Transparência total** no extrato detalhado
- **Incentivo** para permanecer na comunidade local
- **Previsibilidade** de bônus por configuração clara

### **Para Passageiros**

- **Preço inalterado** - não pagam pelo bônus
- **Motoristas locais** mais motivados
- **Tempos menores** de espera
- **Qualidade** do serviço mantida

### **Para a Plataforma**

- **Retenção** de motoristas por comunidade
- **Eficiência** operacional por proximidade
- **Controle** total sobre custos de bônus
- **Escalabilidade** por isolamento geográfico

### **Para Comunidades**

- **Massa crítica** garantida antes da ativação
- **Sustentabilidade** do serviço local
- **Crescimento orgânico** controlado
- **Qualidade** do matching mantida

## 🎯 Configurações Recomendadas

### **Bônus Padrão**

- **Tipo:** Percentual
- **Valor:** 5% a 10%
- **Escopo:** Global (aplicável a todas as comunidades)

### **Massa Crítica**

- **Bairros pequenos:** 3 motoristas
- **Bairros médios:** 5 motoristas  
- **Bairros grandes:** 8 motoristas
- **Condomínios:** 2 motoristas

### **Monitoramento**

- **Métricas:** Taxa de bônus aplicado por comunidade
- **Alertas:** Comunidades próximas de desativação
- **Relatórios:** ROI do programa de incentivos

## 🔧 Funções Automáticas

### **Triggers Implementados**

- **Cadastro de motorista** → Atualiza status da comunidade
- **Mudança de comunidade** → Atualiza ambas as comunidades
- **Remoção de motorista** → Verifica desativação

### **Funções SQL**

- `count_active_drivers_in_community()` - Conta motoristas ativos
- `update_community_status()` - Atualiza status baseado em regras
- `calculate_community_bonus()` - Calcula bônus automático

## 📊 Status de Implementação

✅ **Schema de incentivos** criado  
✅ **Configuração de bônus** flexível  
✅ **Cálculo automático** implementado  
✅ **Extrato detalhado** funcional  
✅ **Governança de comunidades** ativa  
✅ **Triggers automáticos** configurados  
✅ **APIs REST** completas  
✅ **Validações** implementadas  
✅ **Compatibilidade** garantida  

**Sistema de incentivos 100% funcional e pronto para produção!** 🚀

## ⚠️ Garantias de Compatibilidade

- ✅ **Preços para passageiros** não alterados
- ✅ **Lógica de pagamentos** preservada
- ✅ **Webhooks Twilio** não afetados
- ✅ **Sistema LGPD** mantido
- ✅ **Auditoria** funcionando
- ✅ **Zero breaking changes**
