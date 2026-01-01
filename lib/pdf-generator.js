const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * GERADOR DE PDF PARA RELATÓRIOS EXECUTIVOS
 * 
 * Gera PDFs visuais e executivos a partir dos dados JSON dos relatórios
 * com layout simples, KPIs destacados e gráficos básicos
 */

/**
 * Gerar PDF do relatório executivo
 * @param {Object} reportData - Dados do relatório JSON
 * @param {string} outputPath - Caminho para salvar o PDF
 * @returns {Promise<string>} Caminho do arquivo gerado
 */
async function generateReportPDF(reportData, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);
      
      // Capa do relatório
      generateCoverPage(doc, reportData);
      
      // Nova página - KPIs principais
      doc.addPage();
      generateKPIsPage(doc, reportData);
      
      // Nova página - Performance das comunidades
      doc.addPage();
      generateCommunityPerformancePage(doc, reportData);
      
      // Nova página - Alertas e recomendações
      doc.addPage();
      generateAlertsAndRecommendationsPage(doc, reportData);
      
      doc.end();
      
      stream.on('finish', () => {
        console.log('✅ PDF gerado:', outputPath);
        resolve(outputPath);
      });
      
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Gerar capa do relatório
 */
function generateCoverPage(doc, reportData) {
  const { metadata, executive_summary } = reportData;
  
  // Título principal
  doc.fontSize(24)
     .font('Helvetica-Bold')
     .text('RELATÓRIO EXECUTIVO', 50, 100, { align: 'center' });
  
  doc.fontSize(18)
     .font('Helvetica')
     .text('Sistema Kaviar - Programa de Incentivos', 50, 140, { align: 'center' });
  
  // Período
  const periodText = `${formatDate(metadata.period.start)} a ${formatDate(metadata.period.end)}`;
  doc.fontSize(14)
     .text(`Período: ${periodText}`, 50, 180, { align: 'center' });
  
  // Tipo de relatório
  const reportTypeText = metadata.report_type === 'weekly' ? 'Semanal' : 
                        metadata.report_type === 'monthly' ? 'Mensal' : 'Customizado';
  doc.text(`Relatório ${reportTypeText}`, 50, 200, { align: 'center' });
  
  // Resumo executivo destacado
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .text('RESUMO EXECUTIVO', 50, 280);
  
  const summaryY = 320;
  const leftCol = 50;
  const rightCol = 300;
  
  // Coluna esquerda
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('Total de Corridas:', leftCol, summaryY)
     .font('Helvetica')
     .text(executive_summary.total_rides.toLocaleString(), leftCol + 100, summaryY);
  
  doc.font('Helvetica-Bold')
     .text('Crescimento:', leftCol, summaryY + 25)
     .font('Helvetica')
     .text(`${executive_summary.rides_growth_percent > 0 ? '+' : ''}${executive_summary.rides_growth_percent}%`, leftCol + 100, summaryY + 25);
  
  doc.font('Helvetica-Bold')
     .text('Receita Total:', leftCol, summaryY + 50)
     .font('Helvetica')
     .text(`R$ ${executive_summary.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, leftCol + 100, summaryY + 50);
  
  // Coluna direita
  doc.font('Helvetica-Bold')
     .text('ROI do Programa:', rightCol, summaryY)
     .font('Helvetica')
     .text(`${executive_summary.overall_roi_percent.toFixed(1)}%`, rightCol + 100, summaryY);
  
  doc.font('Helvetica-Bold')
     .text('Investimento Bônus:', rightCol, summaryY + 25)
     .font('Helvetica')
     .text(`R$ ${executive_summary.total_bonus_investment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, rightCol + 100, summaryY + 25);
  
  doc.font('Helvetica-Bold')
     .text('Comunidades Ativas:', rightCol, summaryY + 50)
     .font('Helvetica')
     .text(executive_summary.active_communities.toString(), rightCol + 100, summaryY + 50);
  
  // Data de geração
  doc.fontSize(10)
     .text(`Gerado em: ${formatDateTime(metadata.generated_at)}`, 50, 700, { align: 'center' });
}

/**
 * Gerar página de KPIs principais
 */
function generateKPIsPage(doc, reportData) {
  const { financial_overview } = reportData;
  
  doc.fontSize(18)
     .font('Helvetica-Bold')
     .text('INDICADORES FINANCEIROS', 50, 50);
  
  // Gráfico simples de barras para receita vs bônus
  const chartY = 120;
  const chartHeight = 200;
  const chartWidth = 400;
  
  // Título do gráfico
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .text('Receita vs Investimento em Bônus', 50, chartY - 30);
  
  // Valores para o gráfico
  const maxValue = Math.max(financial_overview.revenue.current, financial_overview.bonus_investment.current);
  const revenueHeight = (financial_overview.revenue.current / maxValue) * chartHeight;
  const bonusHeight = (financial_overview.bonus_investment.current / maxValue) * chartHeight;
  
  // Barra de receita
  doc.rect(80, chartY + chartHeight - revenueHeight, 80, revenueHeight)
     .fill('#4CAF50');
  
  // Barra de bônus
  doc.rect(200, chartY + chartHeight - bonusHeight, 80, bonusHeight)
     .fill('#FF9800');
  
  // Labels
  doc.fontSize(10)
     .fillColor('black')
     .text('Receita', 90, chartY + chartHeight + 10, { align: 'center', width: 60 })
     .text('Bônus', 210, chartY + chartHeight + 10, { align: 'center', width: 60 });
  
  // Valores
  doc.text(`R$ ${financial_overview.revenue.current.toLocaleString('pt-BR')}`, 90, chartY + chartHeight + 25, { align: 'center', width: 60 })
     .text(`R$ ${financial_overview.bonus_investment.current.toLocaleString('pt-BR')}`, 210, chartY + chartHeight + 25, { align: 'center', width: 60 });
  
  // Métricas de eficiência
  const metricsY = chartY + chartHeight + 80;
  
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .text('EFICIÊNCIA DO PROGRAMA', 50, metricsY);
  
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('ROI Atual:', 50, metricsY + 30)
     .font('Helvetica')
     .text(`${financial_overview.roi.current.toFixed(1)}%`, 150, metricsY + 30);
  
  doc.font('Helvetica-Bold')
     .text('Bônus por Corrida:', 50, metricsY + 50)
     .font('Helvetica')
     .text(`R$ ${financial_overview.cost_efficiency.bonus_per_ride.toFixed(2)}`, 150, metricsY + 50);
  
  doc.font('Helvetica-Bold')
     .text('Bônus % da Receita:', 50, metricsY + 70)
     .font('Helvetica')
     .text(`${financial_overview.cost_efficiency.bonus_as_percent_of_revenue.toFixed(1)}%`, 150, metricsY + 70);
  
  // Comparação com período anterior
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .text('COMPARAÇÃO COM PERÍODO ANTERIOR', 300, metricsY);
  
  const growthColor = financial_overview.revenue.growth_percent >= 0 ? '#4CAF50' : '#F44336';
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('Crescimento Receita:', 300, metricsY + 30)
     .fillColor(growthColor)
     .text(`${financial_overview.revenue.growth_percent > 0 ? '+' : ''}${financial_overview.revenue.growth_percent.toFixed(1)}%`, 450, metricsY + 30);
  
  const profitGrowthColor = financial_overview.net_profit.growth_percent >= 0 ? '#4CAF50' : '#F44336';
  doc.fillColor('black')
     .font('Helvetica-Bold')
     .text('Crescimento Lucro:', 300, metricsY + 50)
     .fillColor(profitGrowthColor)
     .text(`${financial_overview.net_profit.growth_percent > 0 ? '+' : ''}${financial_overview.net_profit.growth_percent.toFixed(1)}%`, 450, metricsY + 50);
}

/**
 * Gerar página de performance das comunidades
 */
function generateCommunityPerformancePage(doc, reportData) {
  const { community_performance } = reportData;
  
  doc.fillColor('black')
     .fontSize(18)
     .font('Helvetica-Bold')
     .text('PERFORMANCE DAS COMUNIDADES', 50, 50);
  
  // Top performers por ROI
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .text('TOP 5 - MELHOR ROI', 50, 100);
  
  let y = 130;
  community_performance.top_performers_by_roi.slice(0, 5).forEach((community, index) => {
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .text(`${index + 1}. ${community.name}`, 50, y)
       .font('Helvetica')
       .text(`ROI: ${community.roi_percent.toFixed(1)}%`, 200, y)
       .text(`Corridas: ${community.rides}`, 300, y)
       .text(`Bônus: R$ ${community.bonus_paid.toFixed(2)}`, 400, y);
    y += 20;
  });
  
  // Top performers por volume
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .text('TOP 5 - MAIOR VOLUME', 50, y + 30);
  
  y += 60;
  community_performance.top_performers_by_volume.slice(0, 5).forEach((community, index) => {
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .text(`${index + 1}. ${community.name}`, 50, y)
       .font('Helvetica')
       .text(`Corridas: ${community.rides}`, 200, y)
       .text(`Local: ${community.local_percentage.toFixed(1)}%`, 300, y)
       .text(`Motoristas: ${community.active_drivers}`, 400, y);
    y += 20;
  });
  
  // Comunidades com baixa performance
  if (community_performance.underperforming_communities.length > 0) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#F44336')
       .text('COMUNIDADES QUE PRECISAM DE ATENÇÃO', 50, y + 30);
    
    y += 60;
    community_performance.underperforming_communities.slice(0, 5).forEach((community, index) => {
      doc.fontSize(11)
         .fillColor('black')
         .font('Helvetica-Bold')
         .text(`${index + 1}. ${community.name}`, 50, y)
         .font('Helvetica')
         .text(`Problema: ${community.issue}`, 200, y)
         .text(`ROI: ${community.roi_percent.toFixed(1)}%`, 350, y)
         .text(`Corridas: ${community.rides}`, 450, y);
      y += 20;
    });
  }
  
  // Resumo estatístico
  doc.fontSize(14)
     .fillColor('black')
     .font('Helvetica-Bold')
     .text('RESUMO ESTATÍSTICO', 50, y + 40);
  
  y += 70;
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('Total de Comunidades:', 50, y)
     .font('Helvetica')
     .text(community_performance.summary.total_communities.toString(), 200, y);
  
  doc.font('Helvetica-Bold')
     .text('Comunidades Lucrativas:', 50, y + 20)
     .font('Helvetica')
     .text(community_performance.summary.profitable_communities.toString(), 200, y + 20);
  
  doc.font('Helvetica-Bold')
     .text('Alto ROI (>100%):', 50, y + 40)
     .font('Helvetica')
     .text(community_performance.summary.high_roi_communities.toString(), 200, y + 40);
}

/**
 * Gerar página de alertas e recomendações
 */
function generateAlertsAndRecommendationsPage(doc, reportData) {
  const { alerts_summary, key_insights, recommendations } = reportData;
  
  doc.fontSize(18)
     .font('Helvetica-Bold')
     .text('ALERTAS E RECOMENDAÇÕES', 50, 50);
  
  // Alertas ativos
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .text('ALERTAS ATIVOS', 50, 100);
  
  if (alerts_summary.total_active_alerts > 0) {
    doc.fontSize(12)
       .font('Helvetica')
       .text(`Total de alertas: ${alerts_summary.total_active_alerts}`, 50, 130);
    
    let y = 160;
    if (alerts_summary.critical_alerts && alerts_summary.critical_alerts.length > 0) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#F44336')
         .text('ALERTAS CRÍTICOS:', 50, y);
      
      y += 25;
      alerts_summary.critical_alerts.slice(0, 3).forEach((alert, index) => {
        doc.fontSize(10)
           .fillColor('black')
           .font('Helvetica-Bold')
           .text(`• ${alert.community_name}:`, 50, y)
           .font('Helvetica')
           .text(alert.message, 150, y, { width: 350 });
        y += 20;
      });
    }
  } else {
    doc.fontSize(12)
       .fillColor('#4CAF50')
       .font('Helvetica')
       .text('✓ Nenhum alerta ativo - todas as métricas dentro dos limites', 50, 130);
  }
  
  // Insights principais
  doc.fontSize(14)
     .fillColor('black')
     .font('Helvetica-Bold')
     .text('INSIGHTS PRINCIPAIS', 50, y + 40);
  
  y += 70;
  if (key_insights && key_insights.length > 0) {
    key_insights.slice(0, 3).forEach((insight, index) => {
      const color = insight.type === 'positive' ? '#4CAF50' : 
                   insight.type === 'warning' ? '#FF9800' : '#F44336';
      
      doc.fontSize(11)
         .fillColor(color)
         .font('Helvetica-Bold')
         .text(`${index + 1}. ${insight.title}`, 50, y)
         .fillColor('black')
         .font('Helvetica')
         .text(insight.description, 70, y + 15, { width: 450 });
      y += 40;
    });
  }
  
  // Recomendações
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .text('RECOMENDAÇÕES PRIORITÁRIAS', 50, y + 20);
  
  y += 50;
  if (recommendations && recommendations.length > 0) {
    recommendations.slice(0, 4).forEach((rec, index) => {
      const priorityColor = rec.priority === 'high' ? '#F44336' : 
                           rec.priority === 'medium' ? '#FF9800' : '#4CAF50';
      
      doc.fontSize(11)
         .fillColor(priorityColor)
         .font('Helvetica-Bold')
         .text(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`, 50, y)
         .fillColor('black')
         .font('Helvetica')
         .text(rec.description, 70, y + 15, { width: 450 });
      y += 35;
    });
  }
}

/**
 * Utilitários de formatação
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR');
}

module.exports = {
  generateReportPDF
};
