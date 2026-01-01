const express = require('express');
const { generateWeeklyReport, generateMonthlyReport, generateExecutiveReport } = require('../lib/reports');
const { 
  getHistoricalReports, 
  getHistoricalReport, 
  configureReportDistribution,
  generateAndSavePDF 
} = require('../lib/report-distribution');

const router = express.Router();

/**
 * Gerar relatório executivo semanal
 * GET /api/v1/reports/weekly
 */
router.get('/weekly', async (req, res) => {
  try {
    const report = await generateWeeklyReport();
    
    res.status(200).json({
      success: true,
      report
    });
  } catch (error) {
    console.error('❌ Erro ao gerar relatório semanal:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Gerar relatório executivo mensal
 * GET /api/v1/reports/monthly
 */
router.get('/monthly', async (req, res) => {
  try {
    const report = await generateMonthlyReport();
    
    res.status(200).json({
      success: true,
      report
    });
  } catch (error) {
    console.error('❌ Erro ao gerar relatório mensal:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Gerar relatório executivo para período customizado
 * POST /api/v1/reports/custom
 */
router.post('/custom', async (req, res) => {
  try {
    const { start_date, end_date, report_type = 'custom', auto_distribute = false } = req.body;
    
    // Validação de datas
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: start_date, end_date'
      });
    }
    
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Formato de data inválido. Use YYYY-MM-DD'
      });
    }
    
    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        error: 'Data de início deve ser anterior à data de fim'
      });
    }
    
    // Limitar período máximo a 90 dias
    const daysDiff = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
    if (daysDiff > 90) {
      return res.status(400).json({
        success: false,
        error: 'Período máximo permitido: 90 dias'
      });
    }
    
    const report = await generateExecutiveReport(report_type, startDate, endDate, auto_distribute);
    
    res.status(200).json({
      success: true,
      report
    });
  } catch (error) {
    console.error('❌ Erro ao gerar relatório customizado:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Buscar histórico de relatórios
 * GET /api/v1/reports/history
 */
router.get('/history', async (req, res) => {
  try {
    const {
      report_type,
      limit = 20,
      offset = 0,
      include_data = false
    } = req.query;
    
    const reports = await getHistoricalReports({
      report_type,
      limit: Math.min(parseInt(limit) || 20, 100),
      offset: Math.max(parseInt(offset) || 0, 0),
      include_data: include_data === 'true'
    });
    
    res.status(200).json({
      success: true,
      reports,
      count: reports.length
    });
  } catch (error) {
    console.error('❌ Erro ao buscar histórico:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Buscar relatório específico do histórico
 * GET /api/v1/reports/history/:id
 */
router.get('/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validação de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID do relatório inválido'
      });
    }
    
    const report = await getHistoricalReport(id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Relatório não encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      report
    });
  } catch (error) {
    console.error('❌ Erro ao buscar relatório:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Gerar PDF de um relatório
 * POST /api/v1/reports/:id/generate-pdf
 */
router.post('/:id/generate-pdf', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validação de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID do relatório inválido'
      });
    }
    
    const report = await getHistoricalReport(id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Relatório não encontrado'
      });
    }
    
    const pdfUrl = await generateAndSavePDF(id, report.summary_data);
    
    res.status(200).json({
      success: true,
      pdf_url: pdfUrl,
      message: 'PDF gerado com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Configurar distribuição de relatórios
 * POST /api/v1/reports/distribution/config
 */
router.post('/distribution/config', async (req, res) => {
  try {
    const {
      report_type,
      email_enabled = false,
      email_recipients = [],
      email_subject_template,
      pdf_enabled = false
    } = req.body;
    
    // Validação básica
    if (!report_type) {
      return res.status(400).json({
        success: false,
        error: 'Campo obrigatório: report_type'
      });
    }
    
    const validTypes = ['weekly', 'monthly'];
    if (!validTypes.includes(report_type)) {
      return res.status(400).json({
        success: false,
        error: 'report_type inválido. Use: weekly, monthly'
      });
    }
    
    // Validação de emails
    if (email_enabled && (!email_recipients || email_recipients.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'email_recipients obrigatório quando email_enabled = true'
      });
    }
    
    const config = await configureReportDistribution({
      report_type,
      email_enabled,
      email_recipients,
      email_subject_template,
      pdf_enabled
    });
    
    res.status(200).json({
      success: true,
      config,
      message: 'Configuração de distribuição atualizada'
    });
  } catch (error) {
    console.error('❌ Erro ao configurar distribuição:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Dashboard de relatórios - dados para visualização
 * GET /api/v1/reports/dashboard
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { period = 'weekly' } = req.query;
    
    // Gerar relatório baseado no período
    let report;
    if (period === 'weekly') {
      report = await generateWeeklyReport();
    } else if (period === 'monthly') {
      report = await generateMonthlyReport();
    } else {
      return res.status(400).json({
        success: false,
        error: 'Período inválido. Use: weekly, monthly'
      });
    }
    
    // Extrair dados essenciais para dashboard
    const dashboardData = {
      period_info: {
        type: report.metadata.report_type,
        start: report.metadata.period.start,
        end: report.metadata.period.end,
        days: report.metadata.period.days
      },
      
      kpis: {
        total_rides: report.executive_summary.total_rides,
        rides_growth: report.executive_summary.rides_growth_percent,
        total_revenue: report.executive_summary.total_revenue,
        revenue_growth: report.financial_overview.revenue.growth_percent,
        roi_percent: report.executive_summary.overall_roi_percent,
        active_communities: report.executive_summary.active_communities,
        local_rides_percentage: report.executive_summary.local_rides_percentage
      },
      
      alerts_status: {
        total_active: report.alerts_summary.total_active_alerts,
        critical_count: (report.alerts_summary.by_severity?.critical || 0) + 
                       (report.alerts_summary.by_severity?.high || 0),
        status_color: report.alerts_summary.total_active_alerts === 0 ? 'green' :
                     report.alerts_summary.requires_attention ? 'red' : 'yellow'
      },
      
      top_communities: report.community_performance.top_performers_by_roi.slice(0, 5),
      
      key_insight: report.key_insights[0] || null,
      
      priority_recommendation: report.recommendations.find(r => r.priority === 'high') || 
                              report.recommendations[0] || null,
      
      financial_summary: {
        bonus_investment: report.executive_summary.total_bonus_investment,
        bonus_growth: report.financial_overview.bonus_investment.growth_percent,
        net_profit: report.financial_overview.net_profit.current,
        profit_growth: report.financial_overview.net_profit.growth_percent,
        cost_efficiency: report.financial_overview.cost_efficiency.bonus_as_percent_of_revenue
      }
    };
    
    res.status(200).json({
      success: true,
      dashboard: dashboardData,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro no dashboard de relatórios:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Resumo rápido para dashboard
 * GET /api/v1/reports/summary
 */
router.get('/summary', async (req, res) => {
  try {
    // Gerar relatório semanal simplificado
    const weeklyReport = await generateWeeklyReport();
    
    // Extrair apenas dados essenciais
    const summary = {
      period: weeklyReport.metadata.period,
      key_metrics: {
        total_rides: weeklyReport.executive_summary.total_rides,
        rides_growth: weeklyReport.executive_summary.rides_growth_percent,
        total_revenue: weeklyReport.executive_summary.total_revenue,
        roi_percent: weeklyReport.executive_summary.overall_roi_percent,
        active_communities: weeklyReport.executive_summary.active_communities
      },
      alerts: {
        total_active: weeklyReport.alerts_summary.total_active_alerts,
        critical_count: (weeklyReport.alerts_summary.by_severity.critical || 0) + 
                       (weeklyReport.alerts_summary.by_severity.high || 0)
      },
      top_community: weeklyReport.community_performance.top_performers_by_roi[0] || null,
      key_insight: weeklyReport.key_insights[0] || null,
      priority_recommendation: weeklyReport.recommendations.find(r => r.priority === 'high') || 
                              weeklyReport.recommendations[0] || null
    };
    
    res.status(200).json({
      success: true,
      summary,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao gerar resumo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Listar tipos de relatórios disponíveis
 * GET /api/v1/reports/types
 */
router.get('/types', (req, res) => {
  res.status(200).json({
    success: true,
    report_types: [
      {
        type: 'weekly',
        name: 'Relatório Semanal',
        description: 'Relatório dos últimos 7 dias',
        endpoint: 'GET /api/v1/reports/weekly'
      },
      {
        type: 'monthly',
        name: 'Relatório Mensal',
        description: 'Relatório do mês atual',
        endpoint: 'GET /api/v1/reports/monthly'
      },
      {
        type: 'custom',
        name: 'Relatório Customizado',
        description: 'Relatório para período específico (máx 90 dias)',
        endpoint: 'POST /api/v1/reports/custom'
      }
    ]
  });
});

module.exports = router;
