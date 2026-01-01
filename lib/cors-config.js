/**
 * CONFIGURAÇÃO CORS SEGURA
 * Restrita a domínios oficiais com fallback para desenvolvimento
 */

const corsOptions = {
  origin: function (origin, callback) {
    // Domínios permitidos em produção
    const allowedOrigins = [
      'https://kaviar.app',
      'https://www.kaviar.app',
      'https://admin.kaviar.app',
      'https://api.kaviar.app'
    ];
    
    // Em desenvolvimento, permitir localhost
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push(
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173', // Vite
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173'
      );
    }
    
    // Permitir requests sem origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked origin: ${origin}`);
      callback(new Error('Não permitido pelo CORS'), false);
    }
  },
  
  // Métodos HTTP permitidos
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  
  // Headers permitidos
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  
  // Headers expostos para o cliente
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  
  // Permitir cookies/credenciais
  credentials: true,
  
  // Cache do preflight por 24 horas
  maxAge: 86400,
  
  // Não incluir status 204 para OPTIONS
  optionsSuccessStatus: 200
};

/**
 * CORS específico para webhooks (mais restritivo)
 */
const webhookCorsOptions = {
  origin: [
    'https://webhooks.twilio.com',
    'https://api.twilio.com'
  ],
  methods: ['POST'],
  allowedHeaders: ['Content-Type', 'X-Twilio-Signature'],
  credentials: false,
  maxAge: 3600
};

module.exports = {
  corsOptions,
  webhookCorsOptions
};
