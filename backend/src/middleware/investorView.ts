// Middleware para bloquear ações de investidores (read-only)

const investorView = (req, res, next) => {
  const user = req.admin || req.user;
  
  if (!user) {
    return next(); // Sem usuário, deixar outros middlewares tratarem
  }

  // Verificar se é INVESTOR_VIEW
  if (user.role !== 'INVESTOR_VIEW') {
    return next(); // Não é investidor, permitir
  }

  // Bloquear métodos que modificam dados
  const blockedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  
  if (blockedMethods.includes(req.method)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Ação não permitida para visualização de investidor',
      role: 'INVESTOR_VIEW',
    });
  }

  // Bloquear endpoints sensíveis mesmo em GET
  const blockedPaths = [
    '/api/admin/drivers/approve',
    '/api/admin/drivers/reject',
    '/api/admin/payments',
    '/api/admin/notifications',
    '/api/admin/feature-flags', // Permitir GET, bloquear PUT/POST
    '/api/admin/beta-monitor', // Permitir GET, bloquear POST
  ];

  const isBlocked = blockedPaths.some(path => req.path.startsWith(path));
  
  if (isBlocked && req.method !== 'GET') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Endpoint não disponível para visualização de investidor',
      role: 'INVESTOR_VIEW',
    });
  }

  // Adicionar flag no request para outros middlewares saberem
  req.isInvestorView = true;
  
  next();
};

module.exports = investorView;
