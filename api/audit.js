const express = require('express');
const { logAdminAction } = require('../lib/supabase');

const router = express.Router();

/**
 * Registrar ação de auditoria
 * POST /api/audit/log
 * 
 * Body: { action, emergencyId?, adminId, adminEmail }
 */
router.post('/log', async (req, res) => {
  try {
    const { action, emergencyId, adminId, adminEmail } = req.body;
    
    if (!action || !adminId || !adminEmail) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: action, adminId, adminEmail'
      });
    }
    
    await logAdminAction(adminId, adminEmail, action, emergencyId, {
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });
    
    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('❌ Erro ao registrar auditoria:', error);
    res.status(200).json({
      success: false,
      error: 'Erro interno'
    });
  }
});

module.exports = router;
