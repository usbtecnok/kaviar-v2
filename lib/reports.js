const { supabase } = require('./supabase');
const { getCommunityMetricsRealtime, getAlertStats } = require('./analytics');
const { getActiveAlerts } = require('./alerts');
const { 
  saveReportToHistory, 
  generateAndSavePDF, 
  distributeReportByEmail, 
  evaluateReportAlerts 
} = require('./report-distribution');

/**
 * SISTEMA DE RELATÓRIOS EXECUTIVOS
 * 
 * Gera relatórios automatizados focados em decisão estratégica
 * com métricas claras e acionáveis
 */

/**
 * Gerar relatório executivo semanal
 * @returns {Promise<Object>} Relatório semanal
 */
async function generateWeeklyReport() {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return await generateExecutiveReport('weekly', startDate, endDate);
  } catch (error) {
    console.error('Error generating weekly report:', error);
    throw error;
  }
}

/**
 * Gerar relatório executivo mensal
 * @returns {Promise<Object>} Relatório mensal
 */
async function generateMonthlyReport() {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    
    return await generateExecutiveReport('monthly', startDate, endDate);
  } catch (error) {
    console.error('Error generating monthly report:', error);
    throw error;
  }
}

/**
 * Gerar relatório executivo completo com distribuição
 * @param {string} reportType - Tipo do relatório (weekly, monthly)
 * @param {Date} startDate - Data de início
 * @param {Date} endDate - Data de fim
 * @param {boolean} autoDistribute - Se deve distribuir automaticamente
 * @returns {Promise<Object>} Relatório executivo
 */
async function generateExecutiveReport(reportType, startDate, endDate, autoDistribute = false) {
  try {
    console.log(`📊 Gerando relatório ${reportType}:`, {
      period: `${startDate.toISOString().split('T')[0]} a ${endDate.toISOString().split('T')[0]}`
    });
    
    // Buscar dados do período atual
    const currentPeriodData = await getReportData(startDate, endDate);
    
    // Buscar dados do período anterior para comparação
    const periodDays = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
    const prevStartDate = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const prevEndDate = new Date(startDate.getTime() - 1);
    const previousPeriodData = await getReportData(prevStartDate, prevEndDate);
    
    // Buscar alertas ativos
    const activeAlerts = await getActiveAlerts({ limit: 100 });
    
    // Montar relatório
    const report = {
      metadata: {
        report_type: reportType,
        generated_at: new Date().toISOString(),
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          days: periodDays
        },
        comparison_period: {
          start: prevStartDate.toISOString().split('T')[0],
          end: prevEndDate.toISOString().split('T')[0]
        }
      },
      
      executive_summary: generateExecutiveSummary(currentPeriodData, previousPeriodData),
      
      financial_overview: generateFinancialOverview(currentPeriodData, previousPeriodData),
      
      community_performance: generateCommunityPerformance(currentPeriodData),
      
      alerts_summary: generateAlertsSummary(activeAlerts),
      
      key_insights: generateKeyInsights(currentPeriodData, previousPeriodData, activeAlerts),
      
      recommendations: generateRecommendations(currentPeriodData, activeAlerts)
    };
    
    console.log('✅ Relatório executivo gerado:', {
      type: reportType,
      communities: currentPeriodData.communities.length,
      totalRides: currentPeriodData.summary.total_rides,
      totalBonus: currentPeriodData.summary.total_bonus
    });
    
    // Salvar no histórico
    const historyRecord = await saveReportToHistory(report, reportType);
    
    // Avaliar alertas baseados no relatório
    await evaluateReportAlerts(report);
    
    // Distribuição automática se solicitada
    if (autoDistribute) {
      try {
        // Gerar PDF
        const pdfUrl = await generateAndSavePDF(historyRecord.id, report);
        
        // Distribuir por email
        await distributeReportByEmail(historyRecord.id, report, pdfUrl);
      } catch (distError) {
        console.error('Erro na distribuição automática:', distError);
        // Não falhar o relatório por erro de distribuição
      }
    }
    
    return report;
  } catch (error) {
    console.error('Error generating executive report:', error);
    throw error;
  }
}

/**
 * Buscar dados para o relatório em um período específico
 * @param {Date} startDate - Data de início
 * @param {Date} endDate - Data de fim
 * @returns {Promise<Object>} Dados do período
 */
async function getReportData(startDate, endDate) {
  try {
    // Buscar métricas das comunidades
    const communityMetrics = await getCommunityMetricsRealtime();
    
    // Buscar métricas diárias do período
    const { data: dailyMetrics, error } = await supabase
      .from('community_metrics_daily')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });
    
    if (error) throw error;
    
    // Agregar dados por comunidade
    const communityData = communityMetrics.map(community => {
      const communityDailyMetrics = (dailyMetrics || []).filter(
        metric => metric.community_id === community.community_id
      );
      
      const periodTotals = communityDailyMetrics.reduce((acc, metric) => ({
        rides: acc.rides + (metric.total_rides || 0),
        local_rides: acc.local_rides + (metric.local_rides || 0),
        bonus: acc.bonus + parseFloat(metric.total_bonus_paid || 0),
        revenue: acc.revenue + parseFloat(metric.total_revenue || 0)
      }), { rides: 0, local_rides: 0, bonus: 0, revenue: 0 });
      
      const roi = periodTotals.bonus > 0 ? 
        ((periodTotals.revenue - periodTotals.bonus) / periodTotals.bonus) * 100 : 0;
      
      return {
        community_id: community.community_id,
        name: community.community_name,
        status: community.community_status,
        rides: periodTotals.rides,
        local_rides: periodTotals.local_rides,
        local_percentage: periodTotals.rides > 0 ? 
          (periodTotals.local_rides / periodTotals.rides) * 100 : 0,
        bonus_paid: periodTotals.bonus,
        revenue: periodTotals.revenue,
        roi_percentage: roi,
        active_drivers: community.active_drivers || 0
      };
    });
    
    // Calcular totais agregados
    const summary = communityData.reduce((acc, community) => ({
      total_rides: acc.total_rides + community.rides,
      total_local_rides: acc.total_local_rides + community.local_rides,
      total_bonus: acc.total_bonus + community.bonus_paid,
      total_revenue: acc.total_revenue + community.revenue,
      active_communities: acc.active_communities + (community.status === 'active' ? 1 : 0),
      total_drivers: acc.total_drivers + community.active_drivers
    }), {
      total_rides: 0,
      total_local_rides: 0,
      total_bonus: 0,
      total_revenue: 0,
      active_communities: 0,
      total_drivers: 0
    });
    
    // Calcular métricas derivadas
    summary.local_rides_percentage = summary.total_rides > 0 ? 
      (summary.total_local_rides / summary.total_rides) * 100 : 0;
    summary.overall_roi = summary.total_bonus > 0 ? 
      ((summary.total_revenue - summary.total_bonus) / summary.total_bonus) * 100 : 0;
    summary.avg_bonus_per_ride = summary.total_local_rides > 0 ? 
      summary.total_bonus / summary.total_local_rides : 0;
    
    return {
      summary,
      communities: communityData,
      daily_metrics: dailyMetrics || []
    };
  } catch (error) {
    console.error('Error fetching report data:', error);
    throw error;
  }
}

/**
 * Gerar resumo executivo
 */
function generateExecutiveSummary(current, previous) {
  const ridesGrowth = previous.summary.total_rides > 0 ? 
    ((current.summary.total_rides - previous.summary.total_rides) / previous.summary.total_rides) * 100 : 0;
  
  const revenueGrowth = previous.summary.total_revenue > 0 ? 
    ((current.summary.total_revenue - previous.summary.total_revenue) / previous.summary.total_revenue) * 100 : 0;
  
  const bonusGrowth = previous.summary.total_bonus > 0 ? 
    ((current.summary.total_bonus - previous.summary.total_bonus) / previous.summary.total_bonus) * 100 : 0;
  
  return {
    total_rides: current.summary.total_rides,
    rides_growth_percent: Math.round(ridesGrowth * 100) / 100,
    total_revenue: Math.round(current.summary.total_revenue * 100) / 100,
    revenue_growth_percent: Math.round(revenueGrowth * 100) / 100,
    total_bonus_investment: Math.round(current.summary.total_bonus * 100) / 100,
    bonus_growth_percent: Math.round(bonusGrowth * 100) / 100,
    overall_roi_percent: Math.round(current.summary.overall_roi * 100) / 100,
    active_communities: current.summary.active_communities,
    local_rides_percentage: Math.round(current.summary.local_rides_percentage * 100) / 100
  };
}

/**
 * Gerar visão financeira
 */
function generateFinancialOverview(current, previous) {
  const netProfit = current.summary.total_revenue - current.summary.total_bonus;
  const prevNetProfit = previous.summary.total_revenue - previous.summary.total_bonus;
  const profitGrowth = prevNetProfit > 0 ? ((netProfit - prevNetProfit) / prevNetProfit) * 100 : 0;
  
  return {
    revenue: {
      current: Math.round(current.summary.total_revenue * 100) / 100,
      previous: Math.round(previous.summary.total_revenue * 100) / 100,
      growth_percent: Math.round(((current.summary.total_revenue - previous.summary.total_revenue) / Math.max(previous.summary.total_revenue, 1)) * 100 * 100) / 100
    },
    bonus_investment: {
      current: Math.round(current.summary.total_bonus * 100) / 100,
      previous: Math.round(previous.summary.total_bonus * 100) / 100,
      growth_percent: Math.round(((current.summary.total_bonus - previous.summary.total_bonus) / Math.max(previous.summary.total_bonus, 1)) * 100 * 100) / 100
    },
    net_profit: {
      current: Math.round(netProfit * 100) / 100,
      previous: Math.round(prevNetProfit * 100) / 100,
      growth_percent: Math.round(profitGrowth * 100) / 100
    },
    roi: {
      current: Math.round(current.summary.overall_roi * 100) / 100,
      previous: Math.round(previous.summary.overall_roi * 100) / 100
    },
    cost_efficiency: {
      bonus_per_ride: Math.round(current.summary.avg_bonus_per_ride * 100) / 100,
      bonus_as_percent_of_revenue: current.summary.total_revenue > 0 ? 
        Math.round((current.summary.total_bonus / current.summary.total_revenue) * 100 * 100) / 100 : 0
    }
  };
}

/**
 * Gerar performance das comunidades
 */
function generateCommunityPerformance(current) {
  // Top 5 por ROI
  const topByROI = [...current.communities]
    .filter(c => c.roi_percentage > 0)
    .sort((a, b) => b.roi_percentage - a.roi_percentage)
    .slice(0, 5)
    .map(c => ({
      name: c.name,
      roi_percent: Math.round(c.roi_percentage * 100) / 100,
      rides: c.rides,
      bonus_paid: Math.round(c.bonus_paid * 100) / 100
    }));
  
  // Top 5 por volume
  const topByVolume = [...current.communities]
    .sort((a, b) => b.rides - a.rides)
    .slice(0, 5)
    .map(c => ({
      name: c.name,
      rides: c.rides,
      local_percentage: Math.round(c.local_percentage * 100) / 100,
      active_drivers: c.active_drivers
    }));
  
  // Comunidades com baixa performance
  const underperforming = current.communities
    .filter(c => c.roi_percentage < 50 || c.rides < 5)
    .map(c => ({
      name: c.name,
      issue: c.roi_percentage < 50 ? 'ROI baixo' : 'Volume baixo',
      roi_percent: Math.round(c.roi_percentage * 100) / 100,
      rides: c.rides
    }));
  
  return {
    top_performers_by_roi: topByROI,
    top_performers_by_volume: topByVolume,
    underperforming_communities: underperforming,
    summary: {
      total_communities: current.communities.length,
      profitable_communities: current.communities.filter(c => c.roi_percentage > 0).length,
      high_roi_communities: current.communities.filter(c => c.roi_percentage > 100).length
    }
  };
}

/**
 * Gerar resumo de alertas
 */
function generateAlertsSummary(alerts) {
  const alertsByType = alerts.reduce((acc, alert) => {
    acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1;
    return acc;
  }, {});
  
  const alertsBySeverity = alerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {});
  
  const criticalAlerts = alerts
    .filter(alert => alert.severity === 'critical' || alert.severity === 'high')
    .map(alert => ({
      community_name: alert.communities?.name || 'Unknown',
      alert_type: alert.alert_type,
      severity: alert.severity,
      message: alert.message
    }));
  
  return {
    total_active_alerts: alerts.length,
    by_type: alertsByType,
    by_severity: alertsBySeverity,
    critical_alerts: criticalAlerts,
    requires_attention: criticalAlerts.length > 0
  };
}

/**
 * Gerar insights principais
 */
function generateKeyInsights(current, previous, alerts) {
  const insights = [];
  
  // Insight sobre crescimento
  const ridesGrowth = previous.summary.total_rides > 0 ? 
    ((current.summary.total_rides - previous.summary.total_rides) / previous.summary.total_rides) * 100 : 0;
  
  if (ridesGrowth > 10) {
    insights.push({
      type: 'positive',
      title: 'Crescimento Acelerado',
      description: `Volume de corridas cresceu ${Math.round(ridesGrowth)}% no período`
    });
  } else if (ridesGrowth < -5) {
    insights.push({
      type: 'negative',
      title: 'Queda no Volume',
      description: `Volume de corridas caiu ${Math.round(Math.abs(ridesGrowth))}% no período`
    });
  }
  
  // Insight sobre ROI
  if (current.summary.overall_roi > 200) {
    insights.push({
      type: 'positive',
      title: 'ROI Excelente',
      description: `ROI geral de ${Math.round(current.summary.overall_roi)}% indica alta eficiência do programa`
    });
  } else if (current.summary.overall_roi < 100) {
    insights.push({
      type: 'warning',
      title: 'ROI Abaixo do Esperado',
      description: `ROI de ${Math.round(current.summary.overall_roi)}% sugere necessidade de otimização`
    });
  }
  
  // Insight sobre alertas críticos
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high');
  if (criticalAlerts.length > 0) {
    insights.push({
      type: 'alert',
      title: 'Alertas Críticos Ativos',
      description: `${criticalAlerts.length} alertas críticos requerem atenção imediata`
    });
  }
  
  return insights;
}

/**
 * Gerar recomendações
 */
function generateRecommendations(current, alerts) {
  const recommendations = [];
  
  // Recomendação baseada em ROI
  if (current.summary.overall_roi < 100) {
    recommendations.push({
      priority: 'high',
      category: 'financial',
      title: 'Otimizar Programa de Bônus',
      description: 'ROI baixo indica necessidade de revisar percentuais de bônus ou melhorar eficiência operacional'
    });
  }
  
  // Recomendação baseada em alertas
  const roiAlerts = alerts.filter(a => a.alert_type === 'roi_low');
  if (roiAlerts.length > 2) {
    recommendations.push({
      priority: 'medium',
      category: 'operational',
      title: 'Revisar Comunidades com ROI Baixo',
      description: `${roiAlerts.length} comunidades com ROI baixo precisam de análise detalhada`
    });
  }
  
  // Recomendação baseada em volume
  const lowVolumeAlerts = alerts.filter(a => a.alert_type === 'volume_low');
  if (lowVolumeAlerts.length > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'growth',
      title: 'Campanhas de Ativação',
      description: `${lowVolumeAlerts.length} comunidades com baixo volume precisam de campanhas de marketing`
    });
  }
  
  // Recomendação baseada em eficiência
  const bonusPercent = current.summary.total_revenue > 0 ? 
    (current.summary.total_bonus / current.summary.total_revenue) * 100 : 0;
  
  if (bonusPercent > 15) {
    recommendations.push({
      priority: 'high',
      category: 'financial',
      title: 'Controlar Custos de Bônus',
      description: `Bônus representam ${Math.round(bonusPercent)}% da receita, acima do recomendado (15%)`
    });
  }
  
  return recommendations;
}

module.exports = {
  generateWeeklyReport,
  generateMonthlyReport,
  generateExecutiveReport
};
