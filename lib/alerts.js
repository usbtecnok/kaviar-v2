const { supabase } = require('./supabase');

/**
 * SISTEMA DE ALERTAS AUTOMÁTICOS
 * 
 * Monitora métricas críticas e dispara alertas quando thresholds são violados
 * sem aplicar ajustes automáticos - apenas informa para decisão humana
 */

/**
 * Avaliar alertas para todas as comunidades ativas
 * @returns {Promise<Array>} Lista de alertas disparados
 */
async function evaluateAllCommunityAlerts() {
  try {
    // Buscar todas as comunidades ativas
    const { data: communities, error: communitiesError } = await supabase
      .from('communities')
      .select('id, name')
      .eq('is_active', true);
    
    if (communitiesError) throw communitiesError;
    
    const allAlerts = [];
    
    // Avaliar cada comunidade
    for (const community of communities || []) {
      try {
        const alerts = await evaluateCommunityAlerts(community.id);
        allAlerts.push(...alerts);
      } catch (error) {
        console.error(`Erro ao avaliar comunidade ${community.name}:`, error);
      }
    }
    
    console.log(`🚨 Avaliação de alertas concluída: ${allAlerts.length} alertas disparados`);
    return allAlerts;
  } catch (error) {
    console.error('Error evaluating community alerts:', error);
    throw error;
  }
}

/**
 * Avaliar alertas para uma comunidade específica
 * @param {string} communityId - ID da comunidade
 * @returns {Promise<Array>} Lista de alertas da comunidade
 */
async function evaluateCommunityAlerts(communityId) {
  try {
    const { data, error } = await supabase
      .rpc('evaluate_community_alerts', {
        community_uuid: communityId
      });
    
    if (error) throw error;
    
    const alerts = data || [];
    
    if (alerts.length > 0) {
      console.log(`⚠️ Alertas disparados para comunidade ${communityId}:`, {
        count: alerts.length,
        types: alerts.map(a => a.alert_type)
      });
      
      // Processar cada alerta
      for (const alert of alerts) {
        await processAlert(alert);
      }
    }
    
    return alerts;
  } catch (error) {
    console.error('Error evaluating community alerts:', error);
    throw error;
  }
}

/**
 * Processar um alerta disparado
 * @param {Object} alert - Dados do alerta
 */
async function processAlert(alert) {
  try {
    // Log estruturado do alerta
    const alertLog = {
      timestamp: new Date().toISOString(),
      alert_id: alert.alert_id,
      alert_type: alert.alert_type,
      severity: alert.severity,
      message: alert.message,
      source: 'automatic_monitoring'
    };
    
    console.log('🚨 ALERTA DISPARADO:', alertLog);
    
    // Disparar webhook interno se configurado
    await triggerInternalWebhook(alert);
    
    // Enviar email se configurado
    await sendAlertEmail(alert);
    
  } catch (error) {
    console.error('Error processing alert:', error);
  }
}

/**
 * Disparar webhook interno para alerta
 * @param {Object} alert - Dados do alerta
 */
async function triggerInternalWebhook(alert) {
  try {
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    
    if (!webhookUrl) {
      return; // Webhook não configurado
    }
    
    const payload = {
      event: 'alert_triggered',
      alert_id: alert.alert_id,
      alert_type: alert.alert_type,
      severity: alert.severity,
      message: alert.message,
      timestamp: new Date().toISOString()
    };
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kaviar-Alerts/1.0'
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      console.log('📡 Webhook interno disparado:', alert.alert_type);
    } else {
      console.error('❌ Erro no webhook interno:', response.status);
    }
  } catch (error) {
    console.error('Error triggering internal webhook:', error);
  }
}

/**
 * Enviar email de alerta (se configurado)
 * @param {Object} alert - Dados do alerta
 */
async function sendAlertEmail(alert) {
  try {
    // Placeholder para integração com serviço de email
    // Pode ser implementado com SendGrid, AWS SES, etc.
    
    const emailEnabled = process.env.ALERT_EMAIL_ENABLED === 'true';
    const emailTo = process.env.ALERT_EMAIL_TO;
    
    if (!emailEnabled || !emailTo) {
      return; // Email não configurado
    }
    
    console.log('📧 Email de alerta seria enviado:', {
      to: emailTo,
      subject: `[Kaviar Alert] ${alert.alert_type} - ${alert.severity}`,
      alert_id: alert.alert_id
    });
    
    // TODO: Implementar envio real de email quando necessário
    
  } catch (error) {
    console.error('Error sending alert email:', error);
  }
}

/**
 * Buscar alertas ativos
 * @param {Object} filters - Filtros (community_id, alert_type, severity)
 * @returns {Promise<Array>} Lista de alertas ativos
 */
async function getActiveAlerts(filters = {}) {
  try {
    const {
      community_id,
      alert_type,
      severity,
      limit = 50,
      offset = 0
    } = filters;
    
    let query = supabase
      .from('alert_events')
      .select(`
        *,
        communities (
          id,
          name,
          status
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Aplicar filtros
    if (community_id) {
      query = query.eq('community_id', community_id);
    }
    
    if (alert_type) {
      query = query.eq('alert_type', alert_type);
    }
    
    if (severity) {
      query = query.eq('severity', severity);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching active alerts:', error);
    throw error;
  }
}

/**
 * Reconhecer um alerta
 * @param {string} alertId - ID do alerta
 * @param {string} acknowledgedBy - Quem reconheceu o alerta
 * @returns {Promise<Object>} Alerta atualizado
 */
async function acknowledgeAlert(alertId, acknowledgedBy) {
  try {
    const { data, error } = await supabase
      .from('alert_events')
      .update({
        status: 'acknowledged',
        acknowledged_by: acknowledgedBy,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .eq('status', 'active')
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Alerta reconhecido:', {
      alertId,
      acknowledgedBy,
      alertType: data?.alert_type
    });
    
    return data;
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    throw error;
  }
}

/**
 * Resolver um alerta
 * @param {string} alertId - ID do alerta
 * @returns {Promise<Object>} Alerta atualizado
 */
async function resolveAlert(alertId) {
  try {
    const { data, error } = await supabase
      .from('alert_events')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .in('status', ['active', 'acknowledged'])
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Alerta resolvido:', {
      alertId,
      alertType: data?.alert_type
    });
    
    return data;
  } catch (error) {
    console.error('Error resolving alert:', error);
    throw error;
  }
}

/**
 * Configurar threshold para comunidade ou global
 * @param {Object} thresholdData - Dados do threshold
 * @returns {Promise<Object>} Threshold configurado
 */
async function setAlertThreshold(thresholdData) {
  try {
    const {
      community_id = null,
      threshold_type,
      threshold_value,
      created_by
    } = thresholdData;
    
    // Validação
    const validTypes = ['min_roi_percent', 'max_bonus_percent_of_revenue', 'min_acceptance_rate', 'min_daily_rides'];
    if (!validTypes.includes(threshold_type)) {
      throw new Error('Tipo de threshold inválido');
    }
    
    if (!threshold_value || threshold_value < 0) {
      throw new Error('Valor do threshold deve ser >= 0');
    }
    
    // Upsert do threshold
    const { data, error } = await supabase
      .from('alert_thresholds')
      .upsert({
        community_id,
        threshold_type,
        threshold_value: parseFloat(threshold_value),
        created_by,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'community_id,threshold_type'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('⚙️ Threshold configurado:', {
      communityId: community_id || 'global',
      thresholdType: threshold_type,
      thresholdValue: threshold_value
    });
    
    return data;
  } catch (error) {
    console.error('Error setting alert threshold:', error);
    throw error;
  }
}

/**
 * Buscar thresholds configurados
 * @param {string} communityId - ID da comunidade (opcional)
 * @returns {Promise<Array>} Lista de thresholds
 */
async function getAlertThresholds(communityId = null) {
  try {
    let query = supabase
      .from('alert_thresholds')
      .select('*')
      .eq('is_active', true)
      .order('threshold_type');
    
    if (communityId) {
      query = query.or(`community_id.eq.${communityId},community_id.is.null`);
    } else {
      query = query.is('community_id', null);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching alert thresholds:', error);
    throw error;
  }
}

/**
 * Estatísticas de alertas
 * @param {number} days - Período em dias
 * @returns {Promise<Object>} Estatísticas
 */
async function getAlertStats(days = 7) {
  try {
    const { data, error } = await supabase
      .from('alert_events')
      .select('alert_type, severity, status')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());
    
    if (error) throw error;
    
    const stats = (data || []).reduce((acc, alert) => {
      // Por tipo
      acc.by_type[alert.alert_type] = (acc.by_type[alert.alert_type] || 0) + 1;
      
      // Por severidade
      acc.by_severity[alert.severity] = (acc.by_severity[alert.severity] || 0) + 1;
      
      // Por status
      acc.by_status[alert.status] = (acc.by_status[alert.status] || 0) + 1;
      
      // Total
      acc.total++;
      
      return acc;
    }, {
      total: 0,
      by_type: {},
      by_severity: {},
      by_status: {}
    });
    
    return {
      period_days: days,
      ...stats
    };
  } catch (error) {
    console.error('Error fetching alert stats:', error);
    throw error;
  }
}

module.exports = {
  evaluateAllCommunityAlerts,
  evaluateCommunityAlerts,
  processAlert,
  getActiveAlerts,
  acknowledgeAlert,
  resolveAlert,
  setAlertThreshold,
  getAlertThresholds,
  getAlertStats
};
