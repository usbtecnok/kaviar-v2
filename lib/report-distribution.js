const { supabase } = require('./supabase');
const { generateReportPDF } = require('./pdf-generator');
const path = require('path');
const fs = require('fs');

/**
 * SISTEMA DE DISTRIBUIÇÃO E HISTÓRICO DE RELATÓRIOS
 * 
 * Gerencia armazenamento histórico, geração de PDFs e distribuição
 * automática de relatórios executivos
 */

/**
 * Salvar relatório no histórico
 * @param {Object} reportData - Dados do relatório
 * @param {string} reportType - Tipo do relatório (weekly, monthly, custom)
 * @returns {Promise<Object>} Registro do histórico
 */
async function saveReportToHistory(reportData, reportType) {
  try {
    const { metadata } = reportData;
    
    const { data, error } = await supabase
      .from('reports_history')
      .upsert({
        report_type: reportType,
        period_start: metadata.period.start,
        period_end: metadata.period.end,
        summary_data: reportData,
        generated_at: new Date().toISOString()
      }, {
        onConflict: 'report_type,period_start,period_end'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('📊 Relatório salvo no histórico:', {
      id: data.id,
      type: reportType,
      period: `${metadata.period.start} a ${metadata.period.end}`
    });
    
    return data;
  } catch (error) {
    console.error('Error saving report to history:', error);
    throw error;
  }
}

/**
 * Gerar PDF do relatório e atualizar histórico
 * @param {string} reportHistoryId - ID do registro no histórico
 * @param {Object} reportData - Dados do relatório
 * @returns {Promise<string>} URL do PDF gerado
 */
async function generateAndSavePDF(reportHistoryId, reportData) {
  try {
    // Criar diretório de PDFs se não existir
    const pdfDir = path.join(__dirname, '..', 'storage', 'reports');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }
    
    // Nome do arquivo PDF
    const { metadata } = reportData;
    const filename = `report_${metadata.report_type}_${metadata.period.start}_${metadata.period.end}.pdf`;
    const pdfPath = path.join(pdfDir, filename);
    
    // Gerar PDF
    await generateReportPDF(reportData, pdfPath);
    
    // URL relativa para armazenar no banco
    const pdfUrl = `/storage/reports/${filename}`;
    
    // Atualizar registro no histórico
    const { error } = await supabase
      .from('reports_history')
      .update({
        pdf_url: pdfUrl,
        pdf_generated: true
      })
      .eq('id', reportHistoryId);
    
    if (error) throw error;
    
    console.log('📄 PDF gerado e salvo:', {
      reportId: reportHistoryId,
      pdfUrl,
      filePath: pdfPath
    });
    
    return pdfUrl;
  } catch (error) {
    console.error('Error generating and saving PDF:', error);
    throw error;
  }
}

/**
 * Distribuir relatório por email
 * @param {string} reportHistoryId - ID do registro no histórico
 * @param {Object} reportData - Dados do relatório
 * @param {string} pdfUrl - URL do PDF (opcional)
 * @returns {Promise<boolean>} Sucesso do envio
 */
async function distributeReportByEmail(reportHistoryId, reportData, pdfUrl = null) {
  try {
    const { metadata } = reportData;
    
    // Buscar configuração de distribuição
    const { data: config, error: configError } = await supabase
      .from('report_distribution_config')
      .select('*')
      .eq('report_type', metadata.report_type)
      .eq('is_active', true)
      .single();
    
    if (configError || !config || !config.email_enabled || config.email_recipients.length === 0) {
      console.log('📧 Email não configurado ou desabilitado para:', metadata.report_type);
      return false;
    }
    
    // Preparar dados do email
    const emailData = {
      recipients: config.email_recipients,
      subject: config.email_subject_template.replace('{period}', 
        `${formatDate(metadata.period.start)} a ${formatDate(metadata.period.end)}`),
      reportData,
      pdfUrl
    };
    
    // Enviar email (implementação placeholder)
    const emailSent = await sendReportEmail(emailData);
    
    if (emailSent) {
      // Atualizar registro no histórico
      await supabase
        .from('reports_history')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
          email_recipients: config.email_recipients
        })
        .eq('id', reportHistoryId);
      
      console.log('📧 Relatório enviado por email:', {
        reportId: reportHistoryId,
        recipients: config.email_recipients.length,
        hasPDF: !!pdfUrl
      });
    }
    
    return emailSent;
  } catch (error) {
    console.error('Error distributing report by email:', error);
    return false;
  }
}

/**
 * Enviar email do relatório (implementação placeholder)
 * @param {Object} emailData - Dados do email
 * @returns {Promise<boolean>} Sucesso do envio
 */
async function sendReportEmail(emailData) {
  try {
    // Placeholder para integração com serviço de email
    // Pode ser implementado com SendGrid, AWS SES, Nodemailer, etc.
    
    const emailEnabled = process.env.REPORT_EMAIL_ENABLED === 'true';
    const emailService = process.env.REPORT_EMAIL_SERVICE; // 'sendgrid', 'ses', 'smtp'
    
    if (!emailEnabled) {
      console.log('📧 Email desabilitado via configuração');
      return false;
    }
    
    console.log('📧 Simulando envio de email:', {
      to: emailData.recipients,
      subject: emailData.subject,
      hasPDF: !!emailData.pdfUrl,
      service: emailService || 'not_configured'
    });
    
    // TODO: Implementar envio real baseado no emailService configurado
    // if (emailService === 'sendgrid') {
    //   return await sendViaSendGrid(emailData);
    // } else if (emailService === 'ses') {
    //   return await sendViaSES(emailData);
    // } else if (emailService === 'smtp') {
    //   return await sendViaSMTP(emailData);
    // }
    
    return true; // Simular sucesso por enquanto
  } catch (error) {
    console.error('Error sending report email:', error);
    return false;
  }
}

/**
 * Avaliar alertas baseados no relatório
 * @param {Object} reportData - Dados do relatório
 * @returns {Promise<Array>} Lista de alertas disparados
 */
async function evaluateReportAlerts(reportData) {
  try {
    const { data: alerts, error } = await supabase
      .rpc('evaluate_report_alerts', {
        report_data: reportData
      });
    
    if (error) throw error;
    
    if (alerts && alerts.length > 0) {
      console.log('🚨 Alertas baseados em relatório disparados:', {
        count: alerts.length,
        alerts: alerts.map(a => a.alert_name)
      });
      
      // Processar cada alerta
      for (const alert of alerts) {
        await processReportAlert(alert, reportData);
      }
    }
    
    return alerts || [];
  } catch (error) {
    console.error('Error evaluating report alerts:', error);
    return [];
  }
}

/**
 * Processar alerta baseado em relatório
 * @param {Object} alert - Dados do alerta
 * @param {Object} reportData - Dados do relatório
 */
async function processReportAlert(alert, reportData) {
  try {
    // Criar alerta no sistema principal de alertas
    const { createAlertEvent } = require('./alerts');
    
    // Log estruturado do alerta
    const alertLog = {
      timestamp: new Date().toISOString(),
      alert_name: alert.alert_name,
      metric_value: alert.metric_value,
      threshold_value: alert.threshold_value,
      message: alert.alert_message,
      source: 'report_analysis',
      report_period: reportData.metadata.period
    };
    
    console.log('🚨 ALERTA DE RELATÓRIO:', alertLog);
    
    // TODO: Integrar com sistema de alertas existente se necessário
    // await createAlertEvent(...);
    
  } catch (error) {
    console.error('Error processing report alert:', error);
  }
}

/**
 * Buscar relatórios históricos
 * @param {Object} filters - Filtros (report_type, limit, offset)
 * @returns {Promise<Array>} Lista de relatórios históricos
 */
async function getHistoricalReports(filters = {}) {
  try {
    const {
      report_type,
      limit = 20,
      offset = 0,
      include_data = false
    } = filters;
    
    let query = supabase
      .from('reports_history')
      .select(include_data ? '*' : 'id, report_type, period_start, period_end, pdf_url, pdf_generated, email_sent, generated_at')
      .order('generated_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (report_type) {
      query = query.eq('report_type', report_type);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching historical reports:', error);
    throw error;
  }
}

/**
 * Buscar relatório específico do histórico
 * @param {string} reportId - ID do relatório
 * @returns {Promise<Object>} Dados do relatório
 */
async function getHistoricalReport(reportId) {
  try {
    const { data, error } = await supabase
      .from('reports_history')
      .select('*')
      .eq('id', reportId)
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching historical report:', error);
    throw error;
  }
}

/**
 * Configurar distribuição de relatórios
 * @param {Object} configData - Dados da configuração
 * @returns {Promise<Object>} Configuração atualizada
 */
async function configureReportDistribution(configData) {
  try {
    const {
      report_type,
      email_enabled = false,
      email_recipients = [],
      email_subject_template,
      pdf_enabled = false
    } = configData;
    
    const { data, error } = await supabase
      .from('report_distribution_config')
      .upsert({
        report_type,
        email_enabled,
        email_recipients,
        email_subject_template: email_subject_template || `Relatório Executivo Kaviar - {period}`,
        pdf_enabled,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'report_type'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('⚙️ Configuração de distribuição atualizada:', {
      reportType: report_type,
      emailEnabled: email_enabled,
      recipients: email_recipients.length
    });
    
    return data;
  } catch (error) {
    console.error('Error configuring report distribution:', error);
    throw error;
  }
}

/**
 * Utilitário de formatação de data
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
}

module.exports = {
  saveReportToHistory,
  generateAndSavePDF,
  distributeReportByEmail,
  evaluateReportAlerts,
  getHistoricalReports,
  getHistoricalReport,
  configureReportDistribution
};
