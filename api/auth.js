const express = require('express');
const bcrypt = require('bcrypt');
const { supabase } = require('../lib/supabase');
const { generateToken } = require('../lib/auth');
const { loginRateLimit } = require('../lib/rate-limiting');
const { logger, maskSensitiveData } = require('../lib/data-privacy');

const router = express.Router();

/**
 * LOGIN SEGURO
 * POST /api/auth/login
 * SEGURANÇA: Rate limiting + Validação + Hash de senha
 */
router.post('/login', loginRateLimit, async (req, res) => {
  try {
    const { email, password, user_type } = req.body;
    
    // Validação básica
    if (!email || !password || !user_type) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: email, password, user_type',
        code: 'MISSING_FIELDS'
      });
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de email inválido',
        code: 'INVALID_EMAIL'
      });
    }
    
    // Validar user_type
    if (!['passenger', 'driver', 'admin'].includes(user_type)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de usuário inválido',
        code: 'INVALID_USER_TYPE'
      });
    }
    
    // Buscar usuário no banco
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, user_type, is_active, community_id, full_name')
      .eq('email', email.toLowerCase())
      .eq('user_type', user_type)
      .eq('is_active', true)
      .single();
    
    if (error || !user) {
      logger.warn('❌ Tentativa de login inválida:', { 
        email: maskSensitiveData({ email }).email,
        user_type,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        error: 'Credenciais inválidas',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Verificar senha
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      logger.warn('❌ Senha incorreta:', { 
        userId: user.id,
        email: maskSensitiveData({ email }).email,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        error: 'Credenciais inválidas',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Gerar token JWT
    const token = generateToken(user);
    
    // Atualizar último login
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);
    
    logger.info('✅ Login realizado com sucesso:', {
      userId: user.id,
      userType: user.user_type,
      communityId: user.community_id,
      ip: req.ip
    });
    
    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          user_type: user.user_type,
          community_id: user.community_id,
          is_admin: user.user_type === 'admin'
        }
      },
      message: 'Login realizado com sucesso'
    });
  } catch (error) {
    logger.error('❌ Erro no login:', { 
      error: error.message,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * LOGOUT SEGURO
 * POST /api/auth/logout
 */
router.post('/logout', async (req, res) => {
  try {
    // Em um sistema JWT stateless, o logout é feito no cliente
    // Aqui podemos registrar o evento para auditoria
    
    logger.info('🚪 Logout realizado:', {
      userId: req.user?.id,
      ip: req.ip
    });
    
    res.status(200).json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    logger.error('❌ Erro no logout:', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * VERIFICAR TOKEN
 * GET /api/auth/verify
 */
router.get('/verify', async (req, res) => {
  try {
    // Se chegou aqui, o token é válido (middleware de auth já validou)
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          user_type: req.user.user_type,
          community_id: req.user.community_id,
          is_admin: req.user.is_admin
        }
      },
      message: 'Token válido'
    });
  } catch (error) {
    logger.error('❌ Erro na verificação de token:', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
