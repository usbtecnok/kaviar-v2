# 🏘️ Sistema de Comunidades (Cerca Comunitária)

## 📋 Visão Geral

O Sistema de Comunidades implementa **isolamento geográfico** para corridas no Kaviar, onde:

- **Passageiros** e **motoristas** pertencem a uma **comunidade específica**
- **Corridas** são restritas à comunidade por padrão
- **Passageiro** pode opcionalmente permitir motoristas de outras comunidades
- **Compatibilidade total** com funcionalidades existentes

## 🏗️ Arquitetura

### **Modelo de Dados**

```sql
-- Comunidades
communities (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  type ENUM('bairro', 'vila', 'comunidade', 'condominio'),
  is_active BOOLEAN DEFAULT TRUE
)

-- Vínculos obrigatórios
drivers.community_id → communities.id (NOT NULL)
passengers.community_id → communities.id (NOT NULL)

-- Corridas com isolamento
rides (
  community_id UUID → communities.id,
  allow_external_drivers BOOLEAN DEFAULT FALSE
)
```

### **Regras de Negócio**

1. **Criação de Corrida:**
   - `ride.community_id` = `passenger.community_id` (automático)
   - `allow_external_drivers` = `false` por padrão

2. **Matching de Motorista:**
   - `allow_external_drivers = false` → Apenas motoristas da MESMA comunidade
   - `allow_external_drivers = true` → Motoristas de qualquer comunidade

3. **Validação de Aceitação:**
   - Motorista só pode aceitar se estiver na mesma comunidade OU se `allow_external_drivers = true`

## 🔌 APIs Implementadas

### **Comunidades**

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/v1/communities` | GET | Listar comunidades ativas |
| `/api/v1/communities` | POST | Criar nova comunidade |
| `/api/v1/communities/:id` | GET | Buscar comunidade por ID |

### **Corridas**

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/v1/rides` | POST | Criar corrida com isolamento |
| `/api/v1/rides/:id/allow-external` | POST | Permitir motoristas externos |
| `/api/v1/rides/:id/eligible-drivers` | GET | Listar motoristas elegíveis |
| `/api/v1/rides/:rideId/can-accept/:driverId` | GET | Verificar se motorista pode aceitar |

## 📝 Exemplos de Uso

### **1. Criar Comunidade**

```bash
POST /api/v1/communities
{
  "name": "Vila Madalena",
  "type": "bairro"
}
```

### **2. Criar Corrida (Isolada)**

```bash
POST /api/v1/rides
{
  "passenger_id": "uuid-passageiro",
  "pickup_location": "Rua A, 123",
  "destination": "Rua B, 456",
  "allow_external_drivers": false
}
```

### **3. Permitir Motoristas Externos**

```bash
POST /api/v1/rides/uuid-corrida/allow-external
{
  "passenger_id": "uuid-passageiro"
}
```

### **4. Verificar Elegibilidade**

```bash
GET /api/v1/rides/uuid-corrida/can-accept/uuid-motorista
```

## 🔒 Segurança e Isolamento

### **Row Level Security (RLS)**

- **Service Role:** Acesso total (backend)
- **Usuários autenticados:** Filtros por comunidade na aplicação
- **Políticas:** Isolamento automático por comunidade

### **Validações**

- **UUIDs:** Validação de formato em todas as APIs
- **Propriedade:** Apenas passageiro pode permitir motoristas externos
- **Comunidade:** Verificação automática de elegibilidade

## 🚀 Migração e Compatibilidade

### **Dados Existentes**

- **Comunidade padrão** criada automaticamente: `"Comunidade Geral"`
- **Registros existentes** recebem `community_id` padrão
- **Zero downtime:** Sistema funciona imediatamente

### **Funcionalidades Preservadas**

- ✅ **WhatsApp Webhooks** (não alterados)
- ✅ **Sistema LGPD** (não alterado)
- ✅ **Auditoria** (não alterada)
- ✅ **Pagamentos** (não alterados)
- ✅ **Combos** (não alterados)

## 📊 Fluxos Principais

### **Fluxo de Corrida Isolada**

```
1. Passageiro cria corrida
2. Sistema herda community_id do passageiro
3. allow_external_drivers = false (padrão)
4. Apenas motoristas da MESMA comunidade recebem
5. Motorista aceita (se elegível)
```

### **Fluxo de Abertura Externa**

```
1. Corrida criada (isolada)
2. Passageiro decide abrir: POST /allow-external
3. allow_external_drivers = true
4. Motoristas de TODAS as comunidades podem aceitar
```

## 🔧 Funções Utilitárias

### **Biblioteca `lib/communities.js`**

- `getAllCommunities()` - Listar comunidades
- `createCommunity()` - Criar comunidade
- `getPassengerCommunity()` - Comunidade do passageiro
- `getDriverCommunity()` - Comunidade do motorista
- `canDriverAcceptRide()` - Verificar elegibilidade
- `createRideWithCommunity()` - Criar corrida isolada
- `allowExternalDrivers()` - Permitir externos

### **Função SQL**

```sql
can_driver_accept_ride(driver_uuid, ride_uuid) → BOOLEAN
```

## 📈 Benefícios

### **Para o Negócio**

- **Mobilidade comunitária** focada
- **Redução de tempo** de matching
- **Maior engajamento** local
- **Flexibilidade** quando necessário

### **Para Usuários**

- **Motoristas conhecidos** da região
- **Tempos menores** de espera
- **Opção de abertura** quando necessário
- **Segurança** por proximidade

### **Para o Sistema**

- **Performance** otimizada (menos consultas)
- **Escalabilidade** por isolamento
- **Compatibilidade** total
- **Zero breaking changes**

## 🎯 Status de Implementação

✅ **Schema de banco** criado  
✅ **Biblioteca core** implementada  
✅ **APIs REST** funcionais  
✅ **Validações** implementadas  
✅ **Segurança RLS** configurada  
✅ **Migração** preparada  
✅ **Documentação** completa  

**Sistema pronto para uso em produção!** 🚀
