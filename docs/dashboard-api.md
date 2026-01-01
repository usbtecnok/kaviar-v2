# 📋 API de Dashboard - Kaviar

## 📋 Visão Geral

A API de Dashboard fornece endpoints simples e estruturados para visualização das métricas do sistema de incentivos e comunidades, prontos para consumo por frontends simples ou ferramentas de BI.

## 🔌 Endpoints Disponíveis

### **1. Overview Geral do Sistema**

```
GET /api/v1/dashboard/overview?days=30
```

**Parâmetros:**
- `days` (opcional): Período de análise (1-365 dias, padrão: 30)

**Resposta:**
```json
{
  "success": true,
  "period_days": 30,
  "overview": {
    "rides": {
      "total": 450,
      "local": 360,
      "external": 90,
      "local_percentage": 80.00
    },
    "financial": {
      "total_bonus_paid": 225.50,
      "total_revenue": 6750.00,
      "net_profit": 6524.50,
      "roi_percentage": 2893.20,
      "avg_bonus_per_ride": 0.63
    },
    "communities": {
      "active": 8,
      "pending": 2,
      "total": 10
    },
    "drivers": {
      "total_active": 45,
      "avg_per_community": 5.63
    },
    "performance": {
      "avg_acceptance_rate": 85.50,
      "efficiency_score": 0.97
    }
  },
  "last_updated": "2026-01-01T13:00:00Z"
}
```

### **2. Métricas por Comunidade**

```
GET /api/v1/dashboard/communities?limit=20&sort_by=roi&order=desc&status=active
```

**Parâmetros:**
- `limit` (opcional): Número de comunidades (1-100, padrão: 20)
- `offset` (opcional): Paginação (padrão: 0)
- `sort_by` (opcional): Campo de ordenação (`rides`, `roi`, `bonus`, `revenue`, `drivers`, `name`)
- `order` (opcional): Ordem (`asc`, `desc`, padrão: `desc`)
- `status` (opcional): Filtro de status (`all`, `active`, `pending`, padrão: `all`)

**Resposta:**
```json
{
  "success": true,
  "communities": [
    {
      "community_id": "uuid",
      "name": "Vila Madalena",
      "status": "active",
      "rides": {
        "total": 150,
        "local": 120,
        "external": 30,
        "local_percentage": 80.00
      },
      "financial": {
        "bonus_paid": 75.50,
        "revenue": 2250.00,
        "net_profit": 2174.50,
        "roi_percentage": 2880.40
      },
      "drivers": {
        "active": 12
      },
      "performance": {
        "efficiency_score": 0.97
      }
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 8,
    "has_more": false
  },
  "filters": {
    "sort_by": "roi",
    "order": "desc",
    "status": "active"
  },
  "stats": {
    "total_communities": 8,
    "total_rides": 450,
    "total_bonus": 225.50,
    "total_revenue": 6750.00,
    "avg_roi": 2650.30
  },
  "last_updated": "2026-01-01T13:00:00Z"
}
```

## 📊 Métricas Explicadas

### **Rides (Corridas)**
- `total`: Total de corridas no período
- `local`: Corridas dentro da mesma comunidade
- `external`: Corridas com motoristas externos
- `local_percentage`: % de corridas comunitárias

### **Financial (Financeiro)**
- `total_bonus_paid`: Total gasto em bônus (R$)
- `total_revenue`: Receita total gerada (R$)
- `net_profit`: Lucro líquido (receita - bônus)
- `roi_percentage`: ROI em % ((lucro / investimento) × 100)
- `avg_bonus_per_ride`: Bônus médio por corrida local

### **Communities (Comunidades)**
- `active`: Comunidades com motoristas suficientes
- `pending`: Comunidades aguardando massa crítica
- `total`: Total de comunidades cadastradas

### **Drivers (Motoristas)**
- `total_active`: Total de motoristas ativos
- `avg_per_community`: Média de motoristas por comunidade

### **Performance (Performance)**
- `avg_acceptance_rate`: Taxa média de aceitação (%)
- `efficiency_score`: Score de eficiência (0-1)

## 📝 Exemplos de Uso

### **1. Dashboard Executivo**

```bash
# Overview geral dos últimos 30 dias
curl "http://localhost:3000/api/v1/dashboard/overview?days=30"

# Top 10 comunidades por ROI
curl "http://localhost:3000/api/v1/dashboard/communities?limit=10&sort_by=roi&order=desc&status=active"
```

### **2. Monitoramento Operacional**

```bash
# Comunidades com mais corridas
curl "http://localhost:3000/api/v1/dashboard/communities?sort_by=rides&order=desc"

# Comunidades pendentes (precisam de mais motoristas)
curl "http://localhost:3000/api/v1/dashboard/communities?status=pending"
```

### **3. Análise Financeira**

```bash
# Comunidades por investimento em bônus
curl "http://localhost:3000/api/v1/dashboard/communities?sort_by=bonus&order=desc"

# Comunidades por receita gerada
curl "http://localhost:3000/api/v1/dashboard/communities?sort_by=revenue&order=desc"
```

## 🎯 Casos de Uso

### **Para Gestores**
- **ROI por comunidade**: Onde o investimento está dando melhor retorno?
- **Eficiência operacional**: Quais comunidades são mais eficientes?
- **Crescimento**: Quantas comunidades estão ativas vs pendentes?

### **Para Operações**
- **Volume de corridas**: Quais comunidades têm mais demanda?
- **Taxa de aceitação**: Onde os motoristas são mais responsivos?
- **Distribuição de motoristas**: Onde precisamos de mais motoristas?

### **Para Financeiro**
- **Custo do programa**: Quanto estamos gastando em bônus?
- **Retorno do investimento**: Qual o ROI real do programa?
- **Lucratividade**: Quais comunidades são mais lucrativas?

## 🔧 Integração com BI

### **Power BI / Tableau**
```javascript
// Configuração de fonte de dados
const apiUrl = "http://localhost:3000/api/v1/dashboard/overview";
const headers = { "Content-Type": "application/json" };

// Refresh automático a cada 15 minutos
const refreshInterval = 15 * 60 * 1000;
```

### **Excel / Google Sheets**
```
=IMPORTDATA("http://localhost:3000/api/v1/dashboard/overview")
=IMPORTDATA("http://localhost:3000/api/v1/dashboard/communities?limit=50")
```

### **Grafana / Prometheus**
```yaml
# Configuração de datasource
- name: kaviar_dashboard
  type: json
  url: http://localhost:3000/api/v1/dashboard/overview
  interval: 5m
```

## 📈 Visualizações Sugeridas

### **Gráficos Recomendados**

1. **Pizza**: Corridas locais vs externas
2. **Barras**: ROI por comunidade (top 10)
3. **Linha**: Evolução de corridas ao longo do tempo
4. **Gauge**: Taxa de aceitação média
5. **KPI Cards**: Total de corridas, bônus pagos, ROI geral
6. **Tabela**: Ranking de comunidades por performance

### **Dashboards Sugeridos**

**Dashboard Executivo:**
- Overview geral (KPIs principais)
- Top 5 comunidades por ROI
- Distribuição de corridas (local vs externa)
- Evolução mensal de métricas

**Dashboard Operacional:**
- Lista completa de comunidades
- Status de ativação (ativo/pendente)
- Distribuição de motoristas
- Taxa de aceitação por comunidade

**Dashboard Financeiro:**
- Investimento em bônus por comunidade
- ROI detalhado
- Análise de custo-benefício
- Projeções de retorno

## ✅ Características da API

### **Simplicidade**
- Apenas 2 endpoints principais
- JSON estruturado e consistente
- Parâmetros opcionais com valores padrão

### **Performance**
- Usa dados pré-calculados do sistema de analytics
- Consultas otimizadas com índices
- Cache automático via view materializada

### **Flexibilidade**
- Filtros e ordenação configuráveis
- Paginação para grandes volumes
- Períodos de análise ajustáveis

### **Confiabilidade**
- Validação de parâmetros
- Tratamento de erros
- Dados sempre atualizados

## 🚀 Status de Implementação

✅ **Endpoint de overview** implementado  
✅ **Endpoint de comunidades** implementado  
✅ **Filtros e ordenação** funcionais  
✅ **Paginação** implementada  
✅ **Validações** completas  
✅ **Documentação** detalhada  
✅ **Integração** com analytics existente  

**API de Dashboard 100% funcional e pronta para uso!** 🎉
