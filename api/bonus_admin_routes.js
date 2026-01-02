// =====================================================
// ENDPOINT ADMIN - CONTROLE A/B TEST (WRITE-ONLY)
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

// Middleware de autenticação apenas para admins
router.use(authenticateToken);
router.use(requireRole(['admin']));

// 🔧 ENDPOINT ADMIN: Controlar A/B Test
router.post('/ab-test/toggle', async (req, res) => {
  try {
    const { feature_name = 'first_accept_bonus', is_enabled, group_a_percentage = 50 } = req.body;
    
    // Validações
    if (typeof is_enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'is_enabled deve ser boolean'
      });
    }
    
    // Validar que group_a_percentage é inteiro entre 0 e 100
    const groupAPct = parseInt(group_a_percentage);
    if (isNaN(groupAPct) || groupAPct !== group_a_percentage || groupAPct < 0 || groupAPct > 100) {
      return res.status(400).json({
        success: false,
        error: 'group_a_percentage deve ser inteiro entre 0 e 100'
      });
    }
    
    // Executar função de controle
    const result = await db.query(`
      SELECT toggle_ab_test($1, $2, $3) as success
    `, [feature_name, is_enabled, groupAPct]);
    
    if (!result.rows[0].success) {
      return res.status(404).json({
        success: false,
        error: 'Feature não encontrada'
      });
    }
    
    // Buscar configuração atualizada
    const configResult = await db.query(`
      SELECT feature_name, is_enabled, group_a_percentage, updated_at
      FROM ab_test_config 
      WHERE feature_name = $1
    `, [feature_name]);
    
    res.json({
      success: true,
      message: 'Configuração A/B test atualizada com sucesso',
      data: configResult.rows[0]
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📊 ENDPOINT ADMIN: Forçar Agregação de Métricas
router.post('/metrics/aggregate', async (req, res) => {
  try {
    const { target_date } = req.body;
    const date = target_date || new Date().toISOString().split('T')[0];
    
    await db.query(`SELECT aggregate_daily_metrics($1)`, [date]);
    
    // Verificar quantos registros foram criados/atualizados
    const countResult = await db.query(`
      SELECT COUNT(*) as records_count
      FROM daily_accept_metrics 
      WHERE date = $1
    `, [date]);
    
    res.json({
      success: true,
      message: 'Agregação de métricas executada com sucesso',
      data: {
        target_date: date,
        records_processed: countResult.rows[0].records_count
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
