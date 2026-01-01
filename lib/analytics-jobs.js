const cron = require('node-cron');
const { calculateDailyMetrics, refreshMetricsView } = require('../lib/analytics');
const { evaluateAllCommunityAlerts } = require('../lib/alerts');
const { generateWeeklyReport, generateMonthlyReport } = require('../lib/reports');

/**
 * JOBS AUTOMÁTICOS PARA ANALYTICS, ALERTAS E RELATÓRIOS
 * 
 * Implementa cálculo automático de métricas diárias, refresh de views,
 * monitoramento de alertas e geração de relatórios executivos
 */

/**
 * Job para calcular métricas diárias
 * Executa todo dia às 00:30 (após meia-noite)
 */
const dailyMetricsJob = cron.schedule('30 0 * * *', async () => {
  try {
    console.log('🕐 Iniciando cálculo de métricas diárias...');
    
    // Calcular métricas do dia anterior
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    await calculateDailyMetrics(yesterdayStr);
    
    console.log('✅ Métricas diárias calculadas com sucesso:', yesterdayStr);
  } catch (error) {
    console.error('❌ Erro no job de métricas diárias:', error);
  }
}, {
  scheduled: false, // Não iniciar automaticamente
  timezone: 'America/Sao_Paulo'
});

/**
 * Job para refresh da view materializada
 * Executa a cada 15 minutos durante horário comercial (6h-22h)
 */
const refreshMetricsJob = cron.schedule('*/15 6-22 * * *', async () => {
  try {
    console.log('🔄 Atualizando view de métricas...');
    
    await refreshMetricsView();
    
    console.log('✅ View de métricas atualizada');
  } catch (error) {
    console.error('❌ Erro no refresh de métricas:', error);
  }
}, {
  scheduled: false, // Não iniciar automaticamente
  timezone: 'America/Sao_Paulo'
});

/**
 * Job para monitoramento de alertas
 * Executa a cada 30 minutos durante horário comercial (6h-22h)
 */
const alertsMonitoringJob = cron.schedule('*/30 6-22 * * *', async () => {
  try {
    console.log('🚨 Iniciando monitoramento de alertas...');
    
    const alerts = await evaluateAllCommunityAlerts();
    
    if (alerts.length > 0) {
      console.log(`⚠️ ${alerts.length} alertas disparados no monitoramento`);
    } else {
      console.log('✅ Nenhum alerta disparado - todas as métricas dentro dos limites');
    }
  } catch (error) {
    console.error('❌ Erro no job de alertas:', error);
  }
}, {
  scheduled: false, // Não iniciar automaticamente
  timezone: 'America/Sao_Paulo'
});

/**
 * Job para geração de relatório semanal
 * Executa toda segunda-feira às 08:00
 */
const weeklyReportJob = cron.schedule('0 8 * * 1', async () => {
  try {
    console.log('📊 Gerando relatório executivo semanal...');
    
    const report = await generateWeeklyReport();
    
    // Gerar com distribuição automática
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    await generateExecutiveReport('weekly', startDate, endDate, true);
    
    // Log resumo do relatório
    console.log('✅ Relatório semanal gerado e distribuído:', {
      period: report.metadata.period,
      totalRides: report.executive_summary.total_rides,
      totalRevenue: report.executive_summary.total_revenue,
      roi: report.executive_summary.overall_roi_percent,
      activeAlerts: report.alerts_summary.total_active_alerts
    });
    
  } catch (error) {
    console.error('❌ Erro no job de relatório semanal:', error);
  }
}, {
  scheduled: false, // Não iniciar automaticamente
  timezone: 'America/Sao_Paulo'
});

/**
 * Job para geração de relatório mensal
 * Executa no primeiro dia do mês às 09:00
 */
const monthlyReportJob = cron.schedule('0 9 1 * *', async () => {
  try {
    console.log('📊 Gerando relatório executivo mensal...');
    
    const report = await generateMonthlyReport();
    
    // Gerar com distribuição automática
    const endDate = new Date();
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    await generateExecutiveReport('monthly', startDate, endDate, true);
    
    // Log resumo do relatório
    console.log('✅ Relatório mensal gerado e distribuído:', {
      period: report.metadata.period,
      totalRides: report.executive_summary.total_rides,
      totalRevenue: report.executive_summary.total_revenue,
      roi: report.executive_summary.overall_roi_percent,
      topCommunity: report.community_performance.top_performers_by_roi[0]?.name
    });
    
  } catch (error) {
    console.error('❌ Erro no job de relatório mensal:', error);
  }
}, {
  scheduled: false, // Não iniciar automaticamente
  timezone: 'America/Sao_Paulo'
});

/**
 * Job para limpeza de dados antigos
 * Executa todo domingo às 02:00
 */
const cleanupJob = cron.schedule('0 2 * * 0', async () => {
  try {
    console.log('🧹 Iniciando limpeza de dados antigos...');
    
    const { supabase } = require('../lib/supabase');
    
    // Remover eventos de aceitação mais antigos que 90 dias
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const { error: cleanupError } = await supabase
      .from('ride_acceptance_events')
      .delete()
      .lt('created_at', ninetyDaysAgo.toISOString());
    
    if (cleanupError) {
      console.error('Erro na limpeza de eventos:', cleanupError);
    } else {
      console.log('✅ Eventos antigos removidos (>90 dias)');
    }
    
    // Remover métricas diárias mais antigas que 1 ano
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const { error: metricsCleanupError } = await supabase
      .from('community_metrics_daily')
      .delete()
      .lt('date', oneYearAgo.toISOString().split('T')[0]);
    
    if (metricsCleanupError) {
      console.error('Erro na limpeza de métricas:', metricsCleanupError);
    } else {
      console.log('✅ Métricas antigas removidas (>1 ano)');
    }
    
    // Resolver alertas antigos automaticamente (>30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { error: alertsCleanupError } = await supabase
      .from('alert_events')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString()
      })
      .eq('status', 'active')
      .lt('created_at', thirtyDaysAgo.toISOString());
    
    if (alertsCleanupError) {
      console.error('Erro na limpeza de alertas:', alertsCleanupError);
    } else {
      console.log('✅ Alertas antigos resolvidos automaticamente (>30 dias)');
    }
    
    console.log('✅ Limpeza concluída');
  } catch (error) {
    console.error('❌ Erro no job de limpeza:', error);
  }
}, {
  scheduled: false, // Não iniciar automaticamente
  timezone: 'America/Sao_Paulo'
});

/**
 * Inicializar todos os jobs
 */
function startAnalyticsJobs() {
  console.log('🚀 Iniciando jobs de analytics, alertas e relatórios...');
  
  dailyMetricsJob.start();
  refreshMetricsJob.start();
  alertsMonitoringJob.start();
  weeklyReportJob.start();
  monthlyReportJob.start();
  cleanupJob.start();
  
  console.log('✅ Jobs iniciados:');
  console.log('  - Métricas diárias: todo dia às 00:30');
  console.log('  - Refresh métricas: a cada 15min (6h-22h)');
  console.log('  - Monitoramento alertas: a cada 30min (6h-22h)');
  console.log('  - Relatório semanal: segundas às 08:00');
  console.log('  - Relatório mensal: dia 1 às 09:00');
  console.log('  - Limpeza: domingos às 02:00');
}

/**
 * Parar todos os jobs
 */
function stopAnalyticsJobs() {
  console.log('⏹️ Parando jobs de analytics, alertas e relatórios...');
  
  dailyMetricsJob.stop();
  refreshMetricsJob.stop();
  alertsMonitoringJob.stop();
  weeklyReportJob.stop();
  monthlyReportJob.stop();
  cleanupJob.stop();
  
  console.log('✅ Jobs parados');
}

/**
 * Executar cálculo de métricas manualmente (para testes)
 */
async function runDailyMetricsNow(date = null) {
  try {
    console.log('🔧 Executando cálculo manual de métricas...');
    
    const targetDate = date || new Date().toISOString().split('T')[0];
    await calculateDailyMetrics(targetDate);
    
    console.log('✅ Cálculo manual concluído:', targetDate);
    return true;
  } catch (error) {
    console.error('❌ Erro no cálculo manual:', error);
    return false;
  }
}

/**
 * Executar monitoramento de alertas manualmente
 */
async function runAlertsMonitoringNow() {
  try {
    console.log('🔧 Executando monitoramento manual de alertas...');
    
    const alerts = await evaluateAllCommunityAlerts();
    
    console.log('✅ Monitoramento manual concluído:', {
      alertsTriggered: alerts.length
    });
    
    return alerts;
  } catch (error) {
    console.error('❌ Erro no monitoramento manual:', error);
    return [];
  }
}

/**
 * Executar geração de relatórios manualmente
 */
async function runReportsNow() {
  try {
    console.log('🔧 Executando geração manual de relatórios...');
    
    const weeklyReport = await generateWeeklyReport();
    const monthlyReport = await generateMonthlyReport();
    
    console.log('✅ Relatórios gerados:', {
      weekly: {
        rides: weeklyReport.executive_summary.total_rides,
        roi: weeklyReport.executive_summary.overall_roi_percent
      },
      monthly: {
        rides: monthlyReport.executive_summary.total_rides,
        roi: monthlyReport.executive_summary.overall_roi_percent
      }
    });
    
    return { weeklyReport, monthlyReport };
  } catch (error) {
    console.error('❌ Erro na geração manual de relatórios:', error);
    return null;
  }
}

/**
 * Status dos jobs
 */
function getJobsStatus() {
  return {
    daily_metrics: {
      running: dailyMetricsJob.running,
      scheduled: dailyMetricsJob.scheduled,
      next_run: dailyMetricsJob.nextDate()?.toISOString()
    },
    refresh_metrics: {
      running: refreshMetricsJob.running,
      scheduled: refreshMetricsJob.scheduled,
      next_run: refreshMetricsJob.nextDate()?.toISOString()
    },
    alerts_monitoring: {
      running: alertsMonitoringJob.running,
      scheduled: alertsMonitoringJob.scheduled,
      next_run: alertsMonitoringJob.nextDate()?.toISOString()
    },
    weekly_report: {
      running: weeklyReportJob.running,
      scheduled: weeklyReportJob.scheduled,
      next_run: weeklyReportJob.nextDate()?.toISOString()
    },
    monthly_report: {
      running: monthlyReportJob.running,
      scheduled: monthlyReportJob.scheduled,
      next_run: monthlyReportJob.nextDate()?.toISOString()
    },
    cleanup: {
      running: cleanupJob.running,
      scheduled: cleanupJob.scheduled,
      next_run: cleanupJob.nextDate()?.toISOString()
    }
  };
}

module.exports = {
  startAnalyticsJobs,
  stopAnalyticsJobs,
  runDailyMetricsNow,
  runAlertsMonitoringNow,
  runReportsNow,
  getJobsStatus,
  dailyMetricsJob,
  refreshMetricsJob,
  alertsMonitoringJob,
  weeklyReportJob,
  monthlyReportJob,
  cleanupJob
};
