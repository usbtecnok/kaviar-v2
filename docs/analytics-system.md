# 📊 Sistema de Analytics e Monitoramento

## 📋 Visão Geral

O Sistema de Analytics implementa **monitoramento data-driven** do programa de incentivos, permitindo análise de ROI, otimização baseada em dados e comparação entre comunidades sem alterar regras de negócio existentes.

### **Objetivos Principais**

- **Monitoramento** de métricas de ROI do programa de incentivos
- **Análise** comparativa entre comunidades
- **Otimização** baseada em dados reais
- **Suporte** a decisões estratégicas
- **Preparação** para expansão de tipos de incentivos

## 🏗️ Arquitetura de Dados

### **1. Métricas Diárias por Comunidade**

```sql
community_metrics_daily (
  community_id UUID,
  date DATE,
  total_rides INTEGER,
  local_rides INTEGER,
  external_rides INTEGER,
  total_bonus_paid DECIMAL,
  total_revenue DECIMAL,
  avg_acceptance_rate DECIMAL,
  active_drivers INTEGER
)
```

### **2. View Materializada em Tempo Real**

```sql
community_metrics_realtime (
  -- Métricas dos últimos 30 dias
  rides_30d, local_rides_30d, external_rides_30d,
  total_bonus_30d, total_revenue_30d,
  local_rides_percentage, roi_percentage
)
```

### **3. Eventos de Aceitação**

```sql
ride_acceptance_events (
  ride_id UUID,
  driver_id UUID,
  event_type ENUM('offered', 'accepted', 'rejected', 'timeout'),
  response_time_seconds INTEGER
)
```

### **4. Configurações Versionadas**

```sql
incentive_configs (
  community_id UUID,
  incentive_type ENUM('community_bonus', 'recurrence_bonus', 'time_window_bonus', 'rating_bonus'),
  config_data JSONB,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ
)
```

## 🔌 APIs de Analytics

### **Monitoramento**

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/v1/analytics/communities` | GET | Métricas em tempo real de todas as comunidades |
| `/api/v1/analytics/communities/:id` | GET | Analytics detalhados de uma comunidade |
| `/api/v1/analytics/communities/compare` | POST | Comparar performance entre comunidades |
| `/api/v1/analytics/communities/:id/acceptance-rate` | GET | Taxa de aceitação por comunidade |

### **Coleta de Dados**

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/v1/analytics/acceptance-events` | POST | Registrar evento de aceitação/rejeição |
| `/api/v1/analytics/calculate-metrics` | POST | Calcular métricas diárias manualmente |
| `/api/v1/analytics/refresh-metrics` | POST | Atualizar view materializada |

### **Configuração**

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/v1/analytics/incentive-configs` | POST | Criar configuração versionada de incentivo |

## 📝 Exemplos de Uso

### **1. Métricas em Tempo Real**

```bash
GET /api/v1/analytics/communities
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "community_id": "uuid",
      "community_name": "Vila Madalena",
      "rides_30d": 150,
      "local_rides_30d": 120,
      "total_bonus_30d": 75.50,
      "total_revenue_30d": 2250.00,
      "local_rides_percentage": 80.00,
      "roi_percentage": 2880.40,
      "active_drivers": 12
    }
  ]
}
```

### **2. Analytics Detalhados**

```bash
GET /api/v1/analytics/communities/uuid?days_back=30
```

**Resposta:**
```json
{
  "success": true,
  "community_id": "uuid",
  "realtime_metrics": {...},
  "daily_metrics": [...],
  "trends": {
    "rides_trend": 15.5,
    "bonus_trend": 12.3,
    "revenue_trend": 18.7,
    "local_percentage_trend": 5.2
  },
  "roi_analysis": {
    "total_investment": 75.50,
    "total_revenue": 2250.00,
    "net_profit": 2174.50,
    "roi_percentage": 2880.40,
    "avg_bonus_per_ride": 0.63,
    "efficiency_score": 0.97
  }
}
```

### **3. Comparação entre Comunidades**

```bash
POST /api/v1/analytics/communities/compare
{
  "community_ids": ["uuid1", "uuid2", "uuid3"],
  "days_back": 30
}
```

**Resposta:**
```json
{
  "success": true,
  "communities": [...],
  "rankings": {
    "by_roi": [...],
    "by_volume": [...]
  },
  "aggregated": {
    "total_rides": 450,
    "total_bonus": 225.50,
    "total_revenue": 6750.00,
    "avg_roi": 2650.30,
    "avg_acceptance_rate": 85.5
  }
}
```

### **4. Registrar Evento de Aceitação**

```bash
POST /api/v1/analytics/acceptance-events
{
  "ride_id": "uuid-corrida",
  "driver_id": "uuid-motorista",
  "event_type": "accepted",
  "response_time_seconds": 45
}
```

## ⏰ Jobs Automáticos

### **Cálculo de Métricas Diárias**
- **Frequência:** Todo dia às 00:30
- **Função:** Calcular métricas do dia anterior
- **Dados:** Agregações por comunidade

### **Refresh de Métricas em Tempo Real**
- **Frequência:** A cada 15 minutos (6h-22h)
- **Função:** Atualizar view materializada
- **Performance:** Dados sempre atualizados

### **Limpeza de Dados**
- **Frequência:** Domingos às 02:00
- **Função:** Remover dados antigos
- **Retenção:** 90 dias (eventos), 1 ano (métricas)

## 📊 Métricas Calculadas

### **ROI (Return on Investment)**
```
ROI = ((Receita Total - Investimento em Bônus) / Investimento em Bônus) × 100
```

### **Taxa de Corridas Locais**
```
Taxa Local = (Corridas Locais / Total de Corridas) × 100
```

### **Eficiência do Programa**
```
Eficiência = min(ROI / 100, 1) → Score de 0 a 1
```

### **Custo por Aquisição**
```
CPA = Total de Bônus / Número de Corridas Locais
```

### **Tendências**
```
Tendência = ((Período Recente - Período Anterior) / Período Anterior) × 100
```

## 🎯 Análises Disponíveis

### **Performance por Comunidade**
- Volume de corridas (total, local, externa)
- Investimento em bônus vs receita gerada
- Taxa de aceitação de motoristas
- Número de motoristas ativos
- Tendências temporais

### **Comparação entre Comunidades**
- Ranking por ROI
- Ranking por volume
- Métricas agregadas
- Identificação de outliers

### **Análise Temporal**
- Evolução diária de métricas
- Detecção de tendências
- Sazonalidade e padrões
- Impacto de mudanças

### **Eficiência Operacional**
- Tempo de resposta de motoristas
- Taxa de conversão (oferta → aceitação)
- Custo-benefício por comunidade
- Otimização de recursos

## 🔧 Configurações Flexíveis

### **Tipos de Incentivo Suportados**
- `community_bonus` - Bônus por comunidade (ativo)
- `recurrence_bonus` - Bônus por recorrência (preparado)
- `time_window_bonus` - Bônus por horário (preparado)
- `rating_bonus` - Bônus por avaliação (preparado)

### **Configuração Versionada**
```json
{
  "community_id": "uuid",
  "incentive_type": "community_bonus",
  "config_data": {
    "bonus_type": "percentage",
    "bonus_value": 5.00,
    "conditions": {
      "min_rating": 4.5,
      "max_distance": 10
    }
  },
  "valid_from": "2026-01-01T00:00:00Z",
  "valid_until": null
}
```

## 📈 Benefícios do Sistema

### **Para Gestores**
- **Decisões baseadas em dados** reais
- **ROI transparente** do programa de incentivos
- **Comparação objetiva** entre comunidades
- **Identificação** de oportunidades de otimização

### **Para Operações**
- **Monitoramento automático** 24/7
- **Alertas** de performance
- **Métricas** sempre atualizadas
- **Histórico** preservado para análises

### **Para Desenvolvimento**
- **APIs** prontas para dashboards
- **Dados estruturados** para BI
- **Escalabilidade** para novos tipos de incentivo
- **Flexibilidade** de configuração

### **Para o Negócio**
- **Otimização** contínua de custos
- **Maximização** do ROI
- **Crescimento** sustentável
- **Vantagem competitiva** data-driven

## 🚀 Próximas Evoluções

### **Análises Avançadas**
- Machine Learning para previsão de demanda
- Otimização automática de bônus
- Detecção de anomalias
- Segmentação inteligente de comunidades

### **Integração com BI**
- Conectores para Tableau/Power BI
- Data warehouse dedicado
- Relatórios automatizados
- Dashboards executivos

### **Alertas Inteligentes**
- Notificações de ROI baixo
- Alertas de tendências negativas
- Sugestões de otimização
- Monitoramento proativo

## 📊 Status de Implementação

✅ **Schema de analytics** criado  
✅ **Métricas diárias** automatizadas  
✅ **View em tempo real** funcional  
✅ **APIs completas** implementadas  
✅ **Jobs automáticos** configurados  
✅ **Análise de ROI** detalhada  
✅ **Comparação** entre comunidades  
✅ **Configurações** versionadas  
✅ **Limpeza automática** de dados  

**Sistema de Analytics 100% funcional e pronto para produção!** 🎉

## ⚠️ Garantias de Compatibilidade

- ✅ **Zero breaking changes** - Funcionalidades existentes preservadas
- ✅ **Regras de negócio** não alteradas
- ✅ **Performance** otimizada com índices
- ✅ **Dados históricos** preservados
- ✅ **Escalabilidade** garantida
- ✅ **Segurança** mantida (RLS)
