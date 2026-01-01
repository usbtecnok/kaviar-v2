const express = require('express');
const {
  getAllCommunities,
  getCommunityById,
  createCommunity
} = require('../lib/communities');

const router = express.Router();

/**
 * Listar todas as comunidades ativas
 * GET /api/v1/communities
 */
router.get('/', async (req, res) => {
  try {
    const communities = await getAllCommunities();
    
    res.status(200).json({
      success: true,
      data: communities,
      count: communities.length
    });
  } catch (error) {
    console.error('❌ Erro ao listar comunidades:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Buscar comunidade por ID
 * GET /api/v1/communities/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validação básica de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID da comunidade inválido'
      });
    }
    
    const community = await getCommunityById(id);
    
    if (!community) {
      return res.status(404).json({
        success: false,
        error: 'Comunidade não encontrada'
      });
    }
    
    res.status(200).json({
      success: true,
      data: community
    });
  } catch (error) {
    console.error('❌ Erro ao buscar comunidade:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Criar nova comunidade
 * POST /api/v1/communities
 * 
 * Body: {
 *   "name": "Vila Madalena",
 *   "type": "bairro"
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { name, type } = req.body;
    
    // Validação de entrada
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: name, type'
      });
    }
    
    const validTypes = ['bairro', 'vila', 'comunidade', 'condominio'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo inválido. Use: bairro, vila, comunidade, condominio'
      });
    }
    
    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Nome deve ter pelo menos 2 caracteres'
      });
    }
    
    const community = await createCommunity({ name, type });
    
    res.status(201).json({
      success: true,
      data: community,
      message: 'Comunidade criada com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao criar comunidade:', error);
    
    // Tratar erro de duplicação (se houver constraint unique)
    if (error.message?.includes('duplicate') || error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Já existe uma comunidade com este nome'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
