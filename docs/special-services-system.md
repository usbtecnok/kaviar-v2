# 🎯 Sistema de Serviços Especiais

## 📋 Visão Geral

Sistema modular para **serviços especiais** como modalidades diferenciadas de corrida, mantendo **100% de compatibilidade** com o sistema existente e **zero breaking changes**.

## 🏗️ Arquitetura Modular

### **Extensão Não-Invasiva**
```
SISTEMA EXISTENTE (intocado)
├─ rides (tabela base)
├─ drivers (perfis base)
└─ communities (isolamento)

EXTENSÃO MODULAR (nova)
├─ service_type_enum (tipos)
├─ special_service_configs (configurações)
├─ special_service_audit (auditoria)
└─ Colunas adicionais (não-obrigatórias)
```

## 🎯 Tipos de Serviço Implementados

### **1. STANDARD_RIDE** (Padrão)
- Corrida comum do sistema
- Sem taxa adicional
- Todos os motoristas podem aceitar

### **2. COMMUNITY_RIDE** (Comunitária)
- Corrida dentro da comunidade local
- Bônus de 20% para motorista
- Fortalece economia local

### **3. TOUR_GUIDE** (Guia Turístico)
- Motorista como guia da região
- Taxa adicional: R$ 15,00
- Bônus de 50% para motorista
- Requer habilitação específica

### **4. ELDERLY_ASSISTANCE** (Assistência a Idosos)
- Atendimento especializado para idosos
- Taxa adicional: R$ 8,00
- Bônus de 40% para motorista
- **Requer aprovação** e auditoria reforçada

### **5. SPECIAL_ASSISTANCE** (Assistência Especial)
- Pessoas com necessidades especiais
- Taxa adicional: R$ 12,00
- Bônus de 60% para motorista
- **Requer aprovação** e auditoria estrita

### **6. COMMUNITY_SERVICE** (Serviço Comunitário)
- Serviços para a comunidade local
- Taxa adicional: R$ 5,00
- Bônus de 30% para motorista
- Auditoria aprimorada

## 🔧 Habilitação de Motoristas

### **Flags de Habilitação**
```sql
-- Adicionado à tabela drivers existente
can_tour_guide           BOOLEAN DEFAULT false
can_elderly_assistance   BOOLEAN DEFAULT false  
can_special_assistance   BOOLEAN DEFAULT false
can_community_service    BOOLEAN DEFAULT false
```

### **Regras de Matching**
- ✅ **Serviços padrão**: Todos os motoristas podem aceitar
- ✅ **Serviços especiais**: Apenas motoristas habilitados
- ✅ **Isolamento por comunidade**: Mantido integralmente
- ✅ **Transparência**: Tipo de serviço mostrado antes do aceite

## 💰 Sistema de Valores

### **Cálculo Transparente**
```javascript
// Exemplo: Tour Guide
base_amount = 25.00
additional_fee = 15.00
total_amount = 40.00

// Bônus do motorista
driver_bonus = base_amount * 1.50 = 37.50
```

### **Configuração Flexível**
- Taxa adicional configurável por serviço
- Multiplicador de bônus personalizável
- Integração com sistema de incentivos existente

## 🛡️ Auditoria e Segurança

### **Níveis de Auditoria**
- **Standard**: Corridas padrão e comunitárias
- **Enhanced**: Tour guide e serviços comunitários
- **Strict**: Assistência a idosos e especiais

### **Registro Completo**
```sql
special_service_audit
├─ ride_id (corrida)
├─ service_type (tipo)
├─ driver_was_enabled (habilitação)
├─ driver_accepted_at (aceite explícito)
├─ additional_fee_charged (taxa cobrada)
└─ audit_notes (observações)
```

## 🌐 API REST Implementada

### **Endpoints Principais**

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/v1/special-services/configs` | Configurações de serviços |
| GET | `/api/v1/special-services/drivers/:id/eligibility/:type` | Verificar habilitação |
| GET | `/api/v1/special-services/drivers/eligible/:type` | Motoristas habilitados |
| POST | `/api/v1/special-services/drivers/:id/enable` | Habilitar motorista |
| POST | `/api/v1/special-services/calculate-total` | Calcular valor total |
| POST | `/api/v1/special-services/rides` | Criar corrida especial |
| POST | `/api/v1/special-services/rides/:id/accept` | Registrar aceite |
| GET | `/api/v1/special-services/drivers/:id/history` | Histórico do motorista |
| GET | `/api/v1/special-services/stats` | Estatísticas |

## 📝 Exemplos de Uso

### **1. Habilitar Motorista para Tour Guide**
```bash
curl -X POST http://localhost:3000/api/v1/special-services/drivers/driver-uuid/enable \
  -H "Content-Type: application/json" \
  -d '{
    "can_tour_guide": true,
    "can_elderly_assistance": false,
    "can_special_assistance": false,
    "can_community_service": true,
    "enabled_by": "admin@kaviar.com"
  }'
```

### **2. Calcular Valor de Serviço Especial**
```bash
curl -X POST http://localhost:3000/api/v1/special-services/calculate-total \
  -H "Content-Type: application/json" \
  -d '{
    "base_amount": 25.50,
    "service_type": "TOUR_GUIDE",
    "custom_fee": 20.00
  }'
```

**Resposta:**
```json
{
  "success": true,
  "calculation": {
    "base_amount": 25.50,
    "additional_fee": 20.00,
    "total_amount": 45.50,
    "service_type": "TOUR_GUIDE"
  }
}
```

### **3. Criar Corrida com Serviço Especial**
```bash
curl -X POST http://localhost:3000/api/v1/special-services/rides \
  -H "Content-Type: application/json" \
  -d '{
    "passenger_id": "passenger-uuid",
    "driver_id": "driver-uuid",
    "community_id": "community-uuid",
    "pickup_location": "Hotel Copacabana Palace",
    "destination_location": "Cristo Redentor",
    "service_type": "TOUR_GUIDE",
    "base_amount": 35.00,
    "service_notes": "Tour pelos pontos turísticos do Rio"
  }'
```

### **4. Buscar Motoristas Habilitados**
```bash
curl "http://localhost:3000/api/v1/special-services/drivers/eligible/ELDERLY_ASSISTANCE?community_id=community-uuid"
```

**Resposta:**
```json
{
  "success": true,
  "service_type": "ELDERLY_ASSISTANCE",
  "community_id": "community-uuid",
  "drivers": [
    {
      "id": "driver-uuid-1",
      "user_id": "user-uuid-1",
      "community_id": "community-uuid",
      "can_elderly_assistance": true,
      "communities": {
        "name": "Copacabana",
        "type": "neighborhood"
      }
    }
  ],
  "count": 1
}
```

## 🔄 Integração com Sistema Existente

### **API de Corridas Estendida**
A API `/api/v1/rides` foi **estendida** para suportar serviços especiais:

```javascript
// Criar corrida com serviço especial
POST /api/v1/rides
{
  "passenger_id": "uuid",
  "pickup_location": "Local A",
  "destination": "Local B",
  "service_type": "TOUR_GUIDE",        // NOVO
  "base_amount": 30.00,                // NOVO
  "additional_fee": 15.00,             // NOVO
  "service_notes": "Tour pela cidade"  // NOVO
}
```

### **Compatibilidade Total**
- ✅ Corridas existentes continuam funcionando
- ✅ `service_type` padrão é `STANDARD_RIDE`
- ✅ Campos novos são opcionais
- ✅ Zero breaking changes

## 📊 Benefícios Implementados

### **Para Passageiros**
- ✅ **Mais opções de serviço** - Diferentes modalidades
- ✅ **Transparência total** - Valor final antes de confirmar
- ✅ **Qualidade garantida** - Motoristas habilitados
- ✅ **Segurança reforçada** - Auditoria para serviços sensíveis

### **Para Motoristas**
- ✅ **Renda adicional** - Taxas extras e bônus diferenciados
- ✅ **Especialização** - Habilitação para serviços específicos
- ✅ **Transparência** - Extrato detalhado de ganhos
- ✅ **Flexibilidade** - Escolha de serviços a oferecer

### **Para Comunidades**
- ✅ **Economia fortalecida** - Serviços locais valorizados
- ✅ **Turismo impulsionado** - Guias locais capacitados
- ✅ **Inclusão social** - Assistência especializada
- ✅ **Governança** - Controle sobre habilitações

### **Para o Sistema**
- ✅ **Modularidade** - Extensão sem impacto
- ✅ **Escalabilidade** - Novos serviços facilmente adicionáveis
- ✅ **Auditoria completa** - Rastreabilidade total
- ✅ **Performance** - Índices otimizados

## 🔒 Segurança e Compliance

### **Validações Rigorosas**
- ✅ Motorista deve estar habilitado para serviço especial
- ✅ Aceite explícito registrado em auditoria
- ✅ Valores transparentes e auditáveis
- ✅ Histórico imutável de transações

### **Proteção para Serviços Sensíveis**
- ✅ **Assistência a idosos**: Requer aprovação prévia
- ✅ **Necessidades especiais**: Auditoria estrita
- ✅ **Registro completo**: Quem, quando, como
- ✅ **Não automatização**: Aceite manual obrigatório

## 🚀 Próximas Evoluções

### **Funcionalidades Futuras**
- [ ] **Certificações**: Sistema de certificação para motoristas
- [ ] **Avaliações**: Rating específico por tipo de serviço
- [ ] **Agendamento**: Serviços especiais com hora marcada
- [ ] **Pacotes**: Combos de serviços turísticos
- [ ] **Parcerias**: Integração com hotéis e pontos turísticos

### **Melhorias Operacionais**
- [ ] **Dashboard**: Interface para gestão de habilitações
- [ ] **Relatórios**: Analytics específicos por serviço
- [ ] **Notificações**: Alertas para oportunidades de serviço
- [ ] **Treinamento**: Sistema de capacitação online

## ✅ Status de Implementação

**SISTEMA COMPLETO E FUNCIONAL** 🎉

### **Implementado:**
- ✅ Schema de banco com extensões modulares
- ✅ Biblioteca de funções completa
- ✅ API REST com 9 endpoints
- ✅ Integração com sistema de corridas existente
- ✅ Auditoria e segurança implementadas
- ✅ Validações robustas
- ✅ Documentação completa

### **Características Técnicas:**
- ✅ **Zero Breaking Changes** - Sistema existente intocado
- ✅ **Modularidade** - Extensão limpa e organizada
- ✅ **Performance** - Índices otimizados
- ✅ **Escalabilidade** - Preparado para crescimento
- ✅ **Auditoria** - Rastreabilidade completa
- ✅ **Segurança** - Validações e controles rigorosos

**O sistema está pronto para produção e oferece uma base sólida para a evolução dos serviços especiais no Kaviar!** 🚀
