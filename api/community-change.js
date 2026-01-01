const express = require('express');
const {
  createCommunityChangeRequest,
  approveCommunityChange,
  rejectCommunityChange,
  adminChangeCommunity,
  getCommunityChangeRequests,
  getUserCommunityHistory,
  getCommunityChangeRequest,
  getCommunityChangeStats
} = require('../lib/community-change');

const router = express.Router();

/**
 * Criar solicitação de mudança de comunidade
 * POST /api/v1/community-change/request
 * 
 * Body: {
 *   "user_id": "uuid",
 *   "user_type": "driver|passenger",
 *   "requested_community_id": "uuid",
 *   "reason": "Motivo da mudança",
 *   "document_url": "https://..." (opcional)
 * }
 */
router.post('/request', async (req, res) => {
  try {
    const {
      user_id,
      user_type,
      requested_community_id,
      reason,
      document_url
    } = req.body;
    
    // Validação básica
    if (!user_id || !user_type || !requested_community_id || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: user_id, user_type, requested_community_id, reason'
      });
    }
    
    // Validação de UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user_id) || !uuidRegex.test(requested_community_id)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }
    
    // Validação de tipo de usuário
    if (!['driver', 'passenger'].includes(user_type)) {
      return res.status(400).json({
        success: false,
        error: 'user_type deve ser driver ou passenger'
      });
    }
    
    // Validação de motivo
    if (reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Motivo deve ter pelo menos 10 caracteres'
      });
    }
    
    const request = await createCommunityChangeRequest({
      user_id,
      user_type,
      requested_community_id,
      reason,
      document_url
    });
    
    res.status(201).json({
      success: true,
      request,
      message: 'Solicitação de mudança criada com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao criar solicitação:', error);
    
    if (error.message?.includes('já existe') || error.message?.includes('pendente')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }
    
    if (error.message?.includes('não encontrado') || error.message?.includes('inválido')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Aprovar solicitação de mudança
 * POST /api/v1/community-change/:id/approve
 * 
 * Body: {
 *   "reviewed_by": "admin@kaviar.com",
 *   "review_notes": "Aprovado conforme documentação" (opcional)
 * }
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewed_by, review_notes } = req.body;
    
    // Validação de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID da solicitação inválido'
      });
    }
    
    if (!reviewed_by) {
      return res.status(400).json({
        success: false,
        error: 'Campo obrigatório: reviewed_by'
      });
    }
    
    const result = await approveCommunityChange(id, reviewed_by, review_notes);
    
    res.status(200).json({
      success: true,
      result,
      message: 'Mudança de comunidade aprovada com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao aprovar mudança:', error);
    
    if (error.message?.includes('não encontrada') || error.message?.includes('processada')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Rejeitar solicitação de mudança
 * POST /api/v1/community-change/:id/reject
 * 
 * Body: {
 *   "reviewed_by": "admin@kaviar.com",
 *   "review_notes": "Documentação insuficiente"
 * }
 */
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewed_by, review_notes } = req.body;
    
    // Validação de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID da solicitação inválido'
      });
    }
    
    if (!reviewed_by || !review_notes) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: reviewed_by, review_notes'
      });
    }
    
    const result = await rejectCommunityChange(id, reviewed_by, review_notes);
    
    res.status(200).json({
      success: true,
      result,
      message: 'Mudança de comunidade rejeitada'
    });
  } catch (error) {
    console.error('❌ Erro ao rejeitar mudança:', error);
    
    if (error.message?.includes('não encontrada') || error.message?.includes('processada')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Mudança administrativa (override)
 * POST /api/v1/community-change/admin-change
 * 
 * Body: {
 *   "user_id": "uuid",
 *   "user_type": "driver|passenger",
 *   "new_community_id": "uuid",
 *   "changed_by": "admin@kaviar.com",
 *   "reason": "Motivo da mudança administrativa"
 * }
 */
router.post('/admin-change', async (req, res) => {
  try {
    const {
      user_id,
      user_type,
      new_community_id,
      changed_by,
      reason
    } = req.body;
    
    // Validação básica
    if (!user_id || !user_type || !new_community_id || !changed_by) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: user_id, user_type, new_community_id, changed_by'
      });
    }
    
    // Validação de UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user_id) || !uuidRegex.test(new_community_id)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }
    
    // Validação de tipo de usuário
    if (!['driver', 'passenger'].includes(user_type)) {
      return res.status(400).json({
        success: false,
        error: 'user_type deve ser driver ou passenger'
      });
    }
    
    const result = await adminChangeCommunity({
      user_id,
      user_type,
      new_community_id,
      changed_by,
      reason
    });
    
    res.status(200).json({
      success: true,
      result,
      message: 'Mudança administrativa realizada com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro na mudança administrativa:', error);
    
    if (error.message?.includes('inválido') || error.message?.includes('não encontrado')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Listar solicitações de mudança
 * GET /api/v1/community-change/requests
 */
router.get('/requests', async (req, res) => {
  try {
    const {
      status,
      user_type,
      community_id,
      limit = 50,
      offset = 0
    } = req.query;
    
    // Validação de parâmetros
    const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const offsetNum = Math.max(parseInt(offset) || 0, 0);
    
    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status inválido. Use: pending, approved, rejected'
      });
    }
    
    if (user_type && !['driver', 'passenger'].includes(user_type)) {
      return res.status(400).json({
        success: false,
        error: 'user_type inválido. Use: driver, passenger'
      });
    }
    
    const requests = await getCommunityChangeRequests({
      status,
      user_type,
      community_id,
      limit: limitNum,
      offset: offsetNum
    });
    
    res.status(200).json({
      success: true,
      requests,
      count: requests.length,
      pagination: {
        limit: limitNum,
        offset: offsetNum
      }
    });
  } catch (error) {
    console.error('❌ Erro ao listar solicitações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Buscar solicitação específica
 * GET /api/v1/community-change/requests/:id
 */
router.get('/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validação de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID da solicitação inválido'
      });
    }
    
    const request = await getCommunityChangeRequest(id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Solicitação não encontrada'
      });
    }
    
    res.status(200).json({
      success: true,
      request
    });
  } catch (error) {
    console.error('❌ Erro ao buscar solicitação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Histórico de mudanças de um usuário
 * GET /api/v1/community-change/history/:user_id/:user_type
 */
router.get('/history/:user_id/:user_type', async (req, res) => {
  try {
    const { user_id, user_type } = req.params;
    
    // Validação de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user_id)) {
      return res.status(400).json({
        success: false,
        error: 'ID do usuário inválido'
      });
    }
    
    if (!['driver', 'passenger'].includes(user_type)) {
      return res.status(400).json({
        success: false,
        error: 'user_type deve ser driver ou passenger'
      });
    }
    
    const history = await getUserCommunityHistory(user_id, user_type);
    
    res.status(200).json({
      success: true,
      history,
      count: history.length
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
 * Estatísticas de mudanças
 * GET /api/v1/community-change/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { days_back = 30, community_id } = req.query;
    
    const daysNum = Math.min(Math.max(parseInt(days_back) || 30, 1), 365);
    
    const stats = await getCommunityChangeStats({
      days_back: daysNum,
      community_id
    });
    
    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
