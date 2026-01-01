const express = require('express');
const { supabase } = require('../lib/supabase');

const router = express.Router();

/**
 * Atualizar disponibilidade do motorista
 * POST /api/v1/drivers/availability
 * 
 * Body: {
 *   "driver_id": "uuid",
 *   "is_available": true/false
 * }
 */
router.post('/availability', async (req, res) => {
  try {
    const { driver_id, is_available } = req.body;
    
    // Validação básica
    if (!driver_id || typeof is_available !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: driver_id (UUID), is_available (boolean)'
      });
    }
    
    // Validação de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(driver_id)) {
      return res.status(400).json({
        success: false,
        error: 'ID do motorista inválido'
      });
    }
    
    // Atualizar disponibilidade
    const { data, error } = await supabase
      .from('drivers')
      .update({
        is_available,
        last_availability_change: new Date().toISOString()
      })
      .eq('id', driver_id)
      .eq('is_active', true) // Apenas motoristas ativos podem mudar disponibilidade
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Motorista não encontrado ou inativo'
        });
      }
      throw error;
    }
    
    // Verificar se motorista está realmente ativo
    if (!data.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Motorista inativo não pode alterar disponibilidade'
      });
    }
    
    console.log('🚗 Disponibilidade do motorista atualizada:', {
      driverId: driver_id,
      isAvailable: is_available,
      timestamp: new Date().toISOString()
    });
    
    res.status(200).json({
      success: true,
      data: {
        driver_id: data.id,
        is_available: data.is_available,
        last_change: data.last_availability_change
      },
      message: `Motorista ${is_available ? 'disponível' : 'indisponível'} para corridas`
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar disponibilidade:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Buscar motoristas disponíveis
 * GET /api/v1/drivers/available
 */
router.get('/available', async (req, res) => {
  try {
    const { community_id } = req.query;
    
    let query = supabase
      .from('drivers')
      .select(`
        id,
        user_id,
        community_id,
        is_available,
        last_availability_change,
        communities(name, type)
      `)
      .eq('is_active', true)
      .eq('is_available', true);
    
    if (community_id) {
      query = query.eq('community_id', community_id);
    }
    
    const { data, error } = await query.order('last_availability_change', { ascending: false });
    
    if (error) throw error;
    
    res.status(200).json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('❌ Erro ao buscar motoristas disponíveis:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
