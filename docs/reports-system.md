# 📊 Sistema de Relatórios Executivos

## 📋 Visão Geral

O Sistema de Relatórios Executivos gera automaticamente relatórios focados em decisão estratégica, com métricas claras e acionáveis baseadas nos dados de analytics do programa de incentivos.

### **Princípios Fundamentais**

- **Clareza > Volume de dados** - Informações essenciais e explicáveis
- **Foco em decisão** - Insights acionáveis para gestores
- **Comparação temporal** - Evolução vs período anterior
- **Alertas integrados** - Situações que requerem atenção
- **Formato estruturado** - JSON pronto para exportação

## 🔌 APIs de Relatórios

### **Relatórios Automáticos**

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/v1/reports/weekly` | GET | Relatório dos últimos 7 dias |
| `/api/v1/reports/monthly` | GET | Relatório do mês atual |
| `/api/v1/reports/summary` | GET | Resumo rápido para dashboard |

### **Relatórios Customizados**

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/v1/reports/custom` | POST | Relatório para período específico (máx 90 dias) |
| `/api/v1/reports/types` | GET | Tipos de relatórios disponíveis |

## 📊 Estrutura do Relatório

### **1. Metadados**
```json
{
  "metadata": {
    "report_type": "weekly",
    "generated_at": "2026-01-01T13:00:00Z",
    "period": {
      "start": "2025-12-25",
      "end": "2026-01-01",
      "days": 7
    },
    "comparison_period": {
      "start": "2025-12-18", 
      "end": "2025-12-24"
    }
  }
}
```

### **2. Resumo Executivo**
```json
{
  "executive_summary": {
    "total_rides": 450,
    "rides_growth_percent": 15.5,
    "total_revenue": 6750.00,
    "revenue_growth_percent": 18.7,
    "total_bonus_investment": 225.50,
    "bonus_growth_percent": 12.3,
    "overall_roi_percent": 2893.20,
    "active_communities": 8,
    "local_rides_percentage": 80.00
  }
}
```

### **3. Visão Financeira**
```json
{
  "financial_overview": {
    "revenue": {
      "current": 6750.00,
      "previous": 5690.00,
      "growth_percent": 18.63
    },
    "bonus_investment": {
      "current": 225.50,
      "previous": 200.80,
      "growth_percent": 12.29
    },
    "net_profit": {
      "current": 6524.50,
      "previous": 5489.20,
      "growth_percent": 18.86
    },
    "roi": {
      "current": 2893.20,
      "previous": 2734.46
    },
    "cost_efficiency": {
      "bonus_per_ride": 0.63,
      "bonus_as_percent_of_revenue": 3.34
    }
  }
}
```

### **4. Performance das Comunidades**
```json
{
  "community_performance": {
    "top_performers_by_roi": [
      {
        "name": "Vila Madalena",
        "roi_percent": 3200.50,
        "rides": 150,
        "bonus_paid": 75.50
      }
    ],
    "top_performers_by_volume": [
      {
        "name": "Centro",
        "rides": 200,
        "local_percentage": 85.00,
        "active_drivers": 15
      }
    ],
    "underperforming_communities": [
      {
        "name": "Bairro X",
        "issue": "ROI baixo",
        "roi_percent": 45.20,
        "rides": 25
      }
    ],
    "summary": {
      "total_communities": 10,
      "profitable_communities": 8,
      "high_roi_communities": 6
    }
  }
}
```

### **5. Resumo de Alertas**
```json
{
  "alerts_summary": {
    "total_active_alerts": 3,
    "by_type": {
      "roi_low": 1,
      "volume_low": 2
    },
    "by_severity": {
      "medium": 2,
      "high": 1
    },
    "critical_alerts": [
      {
        "community_name": "Bairro Y",
        "alert_type": "volume_low",
        "severity": "high",
        "message": "Volume baixo: 0 corridas em 30 dias"
      }
    ],
    "requires_attention": true
  }
}
```

### **6. Insights Principais**
```json
{
  "key_insights": [
    {
      "type": "positive",
      "title": "Crescimento Acelerado",
      "description": "Volume de corridas cresceu 15% no período"
    },
    {
      "type": "warning",
      "title": "ROI Abaixo do Esperado",
      "description": "ROI de 85% sugere necessidade de otimização"
    }
  ]
}
```

### **7. Recomendações**
```json
{
  "recommendations": [
    {
      "priority": "high",
      "category": "financial",
      "title": "Otimizar Programa de Bônus",
      "description": "ROI baixo indica necessidade de revisar percentuais"
    },
    {
      "priority": "medium",
      "category": "operational",
      "title": "Revisar Comunidades com ROI Baixo",
      "description": "3 comunidades precisam de análise detalhada"
    }
  ]
}
```

## 📝 Exemplos de Uso

### **1. Relatório Semanal**
```bash
curl "http://localhost:3000/api/v1/reports/weekly"
```

### **2. Relatório Mensal**
```bash
curl "http://localhost:3000/api/v1/reports/monthly"
```

### **3. Relatório Customizado**
```bash
curl -X POST http://localhost:3000/api/v1/reports/custom \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2026-01-01",
    "end_date": "2026-01-15",
    "report_type": "quinzenal"
  }'
```

### **4. Resumo Rápido**
```bash
curl "http://localhost:3000/api/v1/reports/summary"
```

**Resposta do Summary:**
```json
{
  "success": true,
  "summary": {
    "period": {
      "start": "2025-12-25",
      "end": "2026-01-01"
    },
    "key_metrics": {
      "total_rides": 450,
      "rides_growth": 15.5,
      "total_revenue": 6750.00,
      "roi_percent": 2893.20,
      "active_communities": 8
    },
    "alerts": {
      "total_active": 3,
      "critical_count": 1
    },
    "top_community": {
      "name": "Vila Madalena",
      "roi_percent": 3200.50
    },
    "key_insight": {
      "type": "positive",
      "title": "Crescimento Acelerado"
    },
    "priority_recommendation": {
      "priority": "high",
      "title": "Otimizar Programa de Bônus"
    }
  }
}
```

## ⏰ Geração Automática

### **Jobs Configurados**

**Relatório Semanal:**
- **Frequência:** Toda segunda-feira às 08:00
- **Conteúdo:** Análise dos últimos 7 dias
- **Comparação:** Com semana anterior

**Relatório Mensal:**
- **Frequência:** Primeiro dia do mês às 09:00
- **Conteúdo:** Análise do mês anterior completo
- **Comparação:** Com mês anterior

### **Logs Automáticos**
```
📊 Gerando relatório executivo semanal...
✅ Relatório semanal gerado: {
  period: { start: '2025-12-25', end: '2026-01-01' },
  totalRides: 450,
  totalRevenue: 6750.00,
  roi: 2893.20,
  activeAlerts: 3
}
```

## 🎯 Casos de Uso

### **Para CEOs/Diretores**
- **Resumo executivo:** KPIs principais em uma visão
- **ROI do programa:** Retorno real do investimento em incentivos
- **Crescimento:** Evolução temporal do negócio
- **Alertas críticos:** Situações que requerem atenção imediata

### **Para Gestores Operacionais**
- **Performance por comunidade:** Onde focar esforços
- **Alertas ativos:** Problemas operacionais em tempo real
- **Recomendações:** Ações específicas sugeridas
- **Comparação temporal:** Tendências e padrões

### **Para Equipe Financeira**
- **Custo-benefício:** Análise detalhada de ROI
- **Controle de custos:** Monitoramento de bônus
- **Eficiência:** Métricas de custo por corrida
- **Projeções:** Base para planejamento financeiro

### **Para Análise Estratégica**
- **Insights acionáveis:** Descobertas baseadas em dados
- **Benchmarking:** Comparação entre comunidades
- **Oportunidades:** Identificação de potencial de crescimento
- **Riscos:** Detecção precoce de problemas

## 📈 Métricas Explicadas

### **ROI (Return on Investment)**
```
ROI = ((Receita - Investimento em Bônus) / Investimento em Bônus) × 100
```
- **> 200%:** Excelente eficiência
- **100-200%:** Boa performance
- **< 100%:** Necessita otimização

### **Crescimento Percentual**
```
Crescimento = ((Valor Atual - Valor Anterior) / Valor Anterior) × 100
```
- **> 10%:** Crescimento acelerado
- **0-10%:** Crescimento estável
- **< 0%:** Declínio (requer atenção)

### **Eficiência de Custos**
```
Bônus como % da Receita = (Total Bônus / Total Receita) × 100
```
- **< 10%:** Muito eficiente
- **10-15%:** Eficiência adequada
- **> 15%:** Custos elevados

## 🔧 Integração e Exportação

### **Formato JSON Estruturado**
- Pronto para consumo por dashboards
- Compatível com ferramentas de BI
- Estrutura consistente entre relatórios

### **Futuras Integrações**
- **PDF:** Geração automática de relatórios em PDF
- **CSV:** Exportação de dados tabulares
- **Email:** Envio automático para stakeholders
- **Slack/Teams:** Notificações de relatórios

### **Webhook de Relatórios**
```bash
# Configurar webhook para relatórios (futuro)
export REPORTS_WEBHOOK_URL="http://localhost:3000/internal/reports"
```

## 🚀 Status de Implementação

✅ **Biblioteca de relatórios** implementada  
✅ **APIs REST** completas  
✅ **Jobs automáticos** configurados  
✅ **Estrutura JSON** padronizada  
✅ **Comparação temporal** funcional  
✅ **Integração com alertas** ativa  
✅ **Insights automáticos** gerados  
✅ **Recomendações** baseadas em dados  

**Sistema de Relatórios 100% funcional e pronto para produção!** 🎉

## ⚠️ Garantias de Qualidade

- ✅ **Métricas explicáveis** - Sem complexidade desnecessária
- ✅ **Dados confiáveis** - Baseado em analytics validados
- ✅ **Formato consistente** - Estrutura padronizada
- ✅ **Performance otimizada** - Consultas eficientes
- ✅ **Comparação temporal** - Contexto para decisões
- ✅ **Foco executivo** - Informações acionáveis
