// =====================================================
// ETAPA 3: EXPOSIÇÃO VIA API - ENDPOINTS READ-ONLY
// =====================================================

const express = require('express');
const { authenticateToken, requireRole } = require('../lib/auth');
const { supabase } = require('../lib/supabase');
const router = express.Router();

// Database query helper
const db = {
  query: async (text, params) => {
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: text, 
      params: params || [] 
    });
    if (error) throw error;
    return { rows: data || [] };
  }
};

// Middleware de autenticação para todos os endpoints de métricas
router.use(authenticateToken);
router.use(requireRole(['admin', 'analytics']));

// 📊 ENDPOINT 1: Resumo Executivo de ROI
router.get('/bonus-roi-summary', async (req, res) => {
  try {
    const { period = 30, community_id } = req.query;
    
    // Validação de entrada
    const periodInt = parseInt(period);
    if (isNaN(periodInt) || periodInt < 1 || periodInt > 365) {
      return res.status(400).json({ success: false, error: 'Period deve ser entre 1 e 365 dias' });
    }
    
    // Validação UUID se community_id fornecido
    if (community_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(community_id)) {
        return res.status(400).json({ success: false, error: 'community_id deve ser UUID válido' });
      }
    }
    
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE has_first_accept_bonus = TRUE) as rides_with_bonus,
        COUNT(*) FILTER (WHERE has_first_accept_bonus = FALSE) as rides_without_bonus,
        ROUND(AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = TRUE), 1) as avg_time_bonus,
        ROUND(AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = FALSE), 1) as avg_time_regular,
        ROUND(SUM(bonus_amount), 2) as total_bonus_cost,
        ROUND(
          (AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = FALSE) - 
           AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = TRUE)) / 
           NULLIF(AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = FALSE), 0) * 100, 2
        ) as improvement_percentage
      FROM rides 
      WHERE accepted_at >= CURRENT_DATE - INTERVAL '1 DAY' * $1
        AND status = 'accepted'
        AND accept_time_seconds IS NOT NULL
        ${community_id ? 'AND community_id = $2' : ''}
    `;
    
    const params = community_id ? [periodInt, community_id] : [periodInt];
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: {
        period: `Últimos ${periodInt} dias`,
        summary: result.rows[0]
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📈 ENDPOINT 2: Tendência Diária
router.get('/bonus-daily-trend', async (req, res) => {
  try {
    const { days = 7, community_id } = req.query;
    
    // Validação de entrada
    const daysInt = parseInt(days);
    if (isNaN(daysInt) || daysInt < 1 || daysInt > 90) {
      return res.status(400).json({ success: false, error: 'Days deve ser entre 1 e 90' });
    }
    
    // Validação UUID se community_id fornecido
    if (community_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(community_id)) {
        return res.status(400).json({ success: false, error: 'community_id deve ser UUID válido' });
      }
    }
    
    const query = `
      SELECT 
        DATE(accepted_at) as date,
        COUNT(*) FILTER (WHERE has_first_accept_bonus = TRUE) as rides_with_bonus,
        COUNT(*) FILTER (WHERE has_first_accept_bonus = FALSE) as rides_without_bonus,
        ROUND(AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = TRUE), 1) as avg_time_bonus,
        ROUND(AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = FALSE), 1) as avg_time_regular,
        ROUND(SUM(bonus_amount), 2) as daily_bonus_cost
      FROM rides 
      WHERE accepted_at >= CURRENT_DATE - INTERVAL '1 DAY' * $1
        AND status = 'accepted'
        AND accept_time_seconds IS NOT NULL
        ${community_id ? 'AND community_id = $2' : ''}
      GROUP BY DATE(accepted_at)
      ORDER BY date DESC
      LIMIT 100
    `;
    
    const params = community_id ? [daysInt, community_id] : [daysInt];
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: {
        daily_metrics: result.rows,
        period_days: daysInt
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🏘️ ENDPOINT 3: Performance por Comunidade
router.get('/bonus-by-community', async (req, res) => {
  try {
    const { period = 30 } = req.query;
    
    // Validação de entrada
    const periodInt = parseInt(period);
    if (isNaN(periodInt) || periodInt < 1 || periodInt > 365) {
      return res.status(400).json({ success: false, error: 'Period deve ser entre 1 e 365 dias' });
    }
    
    const query = `
      SELECT 
        c.id as community_id,
        c.name as community_name,
        COUNT(*) as total_rides,
        COUNT(*) FILTER (WHERE r.has_first_accept_bonus = TRUE) as rides_with_bonus,
        ROUND(AVG(r.accept_time_seconds) FILTER (WHERE r.has_first_accept_bonus = TRUE), 1) as avg_time_bonus,
        ROUND(AVG(r.accept_time_seconds) FILTER (WHERE r.has_first_accept_bonus = FALSE), 1) as avg_time_regular,
        ROUND(
          (AVG(r.accept_time_seconds) FILTER (WHERE r.has_first_accept_bonus = FALSE) - 
           AVG(r.accept_time_seconds) FILTER (WHERE r.has_first_accept_bonus = TRUE)) / 
           NULLIF(AVG(r.accept_time_seconds) FILTER (WHERE r.has_first_accept_bonus = FALSE), 0) * 100, 1
        ) as improvement_percentage,
        ROUND(SUM(r.bonus_amount), 2) as total_cost
      FROM rides r
      JOIN communities c ON r.community_id = c.id
      WHERE r.accepted_at >= CURRENT_DATE - INTERVAL '1 DAY' * $1
        AND r.status = 'accepted'
        AND r.accept_time_seconds IS NOT NULL
      GROUP BY c.id, c.name
      HAVING COUNT(*) >= 5
      ORDER BY improvement_percentage DESC NULLS LAST
      LIMIT 50
    `;
    
    const result = await db.query(query, [periodInt]);
    
    res.json({
      success: true,
      data: {
        communities: result.rows,
        period: `Últimos ${periodInt} dias`
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ⚡ ENDPOINT 4: Status do A/B Test
router.get('/ab-test-status', async (req, res) => {
  try {
    // Configuração atual
    const configQuery = `
      SELECT feature_name, is_enabled, group_a_percentage, updated_at
      FROM ab_test_config 
      WHERE feature_name = 'first_accept_bonus'
    `;
    
    // Distribuição atual (últimos 7 dias)
    const distributionQuery = `
      SELECT 
        ab_test_group,
        COUNT(*) as rides_count,
        ROUND(AVG(accept_time_seconds), 1) as avg_accept_time
      FROM rides 
      WHERE accepted_at >= CURRENT_DATE - INTERVAL '7 days'
        AND status = 'accepted'
        AND ab_test_group IS NOT NULL
      GROUP BY ab_test_group
      ORDER BY ab_test_group
    `;
    
    const [configResult, distributionResult] = await Promise.all([
      db.query(configQuery),
      db.query(distributionQuery)
    ]);
    
    res.json({
      success: true,
      data: {
        config: configResult.rows[0],
        current_distribution: distributionResult.rows,
        last_7_days: true
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 💰 ENDPOINT 5: ROI Detalhado (View)
router.get('/bonus-roi-detailed', async (req, res) => {
  try {
    const { start_date, end_date, community_id } = req.query;
    
    let query = `
      SELECT 
        date,
        community_id,
        rides_with_bonus_count,
        rides_without_bonus_count,
        avg_accept_time_with_bonus,
        avg_accept_time_without_bonus,
        time_reduction_percentage,
        total_bonus_paid,
        seconds_saved_per_real,
        roi_percentage
      FROM bonus_roi_metrics
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (start_date) {
      query += ` AND date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      query += ` AND date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }
    
    if (community_id) {
      query += ` AND community_id = $${paramIndex}`;
      params.push(community_id);
    }
    
    query += ` ORDER BY date DESC, roi_percentage DESC NULLS LAST LIMIT 1000`;
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: {
        roi_metrics: result.rows,
        filters: { start_date, end_date, community_id }
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
