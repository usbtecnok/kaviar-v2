const jwt = require('jsonwebtoken');
const { supabase } = require('./supabase');

// Chave JWT (deve estar no .env em produção)
const JWT_SECRET=REDACTED

/**
 * MIDDLEWARE DE AUTENTICAÇÃO OBRIGATÓRIA
 * Verifica token JWT em todas as rotas /api/v1/*
 */
async function authenticateToken(req, res, next) {
  // Rotas que NÃO precisam de autenticação
  const publicRoutes = [
    '/health',
    '/webhooks/twilio/whatsapp',
    '/webhooks/twilio/test',
    '/webhooks/twilio/conversations'
  ];
  
  // Verificar se é rota pública
  if (publicRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }
  
  // Extrair token do header Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token de acesso obrigatório',
      code: 'MISSING_TOKEN'
    });
  }
  
  try {
    // Verificar e decodificar token JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Buscar usuário no banco para validar se ainda existe e está ativo
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, user_type, is_active, community_id')
      .eq('id', decoded.user_id)
      .eq('is_active', true)
      .single();
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido ou usuário inativo',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Adicionar dados do usuário ao request
    req.user = {
      id: user.id,
      email: user.email,
      user_type: user.user_type, // 'passenger', 'driver', 'admin'
      community_id: user.community_id,
      is_admin: user.user_type === 'admin'
    };
    
    next();
  } catch (error) {
    console.error('❌ Erro na autenticação:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(401).json({
      success: false,
      error: 'Token inválido',
      code: 'INVALID_TOKEN'
    });
  }
}

/**
 * MIDDLEWARE DE AUTORIZAÇÃO POR RECURSO
 * Verifica se usuário pode acessar o recurso específico
 */
async function authorizeResourceAccess(resourceType) {
  return async (req, res, next) => {
    try {
      const { id: resourceId } = req.params;
      const user = req.user;
      
      // Admin pode acessar tudo
      if (user.is_admin) {
        return next();
      }
      
      // Validar UUID do recurso
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(resourceId)) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          code: 'ACCESS_DENIED'
        });
      }
      
      let hasAccess = false;
      
      switch (resourceType) {
        case 'ride':
          // Verificar se usuário é dono da corrida (passageiro ou motorista)
          const { data: ride } = await supabase
            .from('rides')
            .select('passenger_id, driver_id, community_id')
            .eq('id', resourceId)
            .single();
          
          if (ride) {
            hasAccess = ride.passenger_id === user.id || ride.driver_id === user.id;
          }
          break;
          
        case 'driver':
          // Motorista só pode acessar próprios dados
          hasAccess = (user.user_type === 'driver' && resourceId === user.id);
          break;
          
        case 'passenger':
          // Passageiro só pode acessar próprios dados
          hasAccess = (user.user_type === 'passenger' && resourceId === user.id);
          break;
          
        case 'community':
          // Usuário só pode acessar própria comunidade
          hasAccess = (resourceId === user.community_id);
          break;
          
        default:
          hasAccess = false;
      }
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado',
          code: 'ACCESS_DENIED'
        });
      }
      
      next();
    } catch (error) {
      console.error('❌ Erro na autorização:', error.message);
      return res.status(403).json({
        success: false,
        error: 'Acesso negado',
        code: 'ACCESS_DENIED'
      });
    }
  };
}

/**
 * MIDDLEWARE PARA VALIDAR PROPRIEDADE DE CORRIDA
 * Usado em rotas específicas de corridas
 */
async function validateRideOwnership(req, res, next) {
  try {
    const { id: rideId } = req.params;
    const user = req.user;
    
    // Admin pode acessar tudo
    if (user.is_admin) {
      return next();
    }
    
    // Buscar corrida
    const { data: ride, error } = await supabase
      .from('rides')
      .select('passenger_id, driver_id, status, community_id')
      .eq('id', rideId)
      .single();
    
    if (error || !ride) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado',
        code: 'ACCESS_DENIED'
      });
    }
    
    // Verificar propriedade baseada no tipo de usuário e ação
    let hasAccess = false;
    const method = req.method;
    const action = req.path.split('/').pop(); // accept, start, finish, cancel
    
    if (user.user_type === 'passenger') {
      // Passageiro só pode acessar próprias corridas
      hasAccess = ride.passenger_id === user.id;
    } else if (user.user_type === 'driver') {
      // Motorista pode:
      // - Ver corridas onde é o motorista
      // - Aceitar corridas pending da sua comunidade
      if (action === 'accept' && ride.status === 'pending') {
        hasAccess = (ride.community_id === user.community_id || ride.allow_external_drivers);
      } else {
        hasAccess = ride.driver_id === user.id;
      }
    }
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado',
        code: 'ACCESS_DENIED'
      });
    }
    
    // Adicionar dados da corrida ao request para evitar nova consulta
    req.ride = ride;
    next();
  } catch (error) {
    console.error('❌ Erro na validação de propriedade:', error.message);
    return res.status(403).json({
      success: false,
      error: 'Acesso negado',
      code: 'ACCESS_DENIED'
    });
  }
}

/**
 * GERADOR DE TOKEN JWT PARA LOGIN
 */
function generateToken(user) {
  const payload = {
    user_id: user.id,
    email: user.email,
    user_type: user.user_type,
    community_id: user.community_id
  };
  
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: '24h',
    issuer: 'kaviar-api',
    audience: 'kaviar-app'
  });
}

module.exports = {
  authenticateToken,
  authorizeResourceAccess,
  validateRideOwnership,
  generateToken
};
