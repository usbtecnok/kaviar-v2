/**
 * CORS centralizado do KAVIAR
 * Objetivo: permitir o frontend do Render acessar o backend em produção.
 * Mudança mínima: apenas whitelisting de origins + preflight.
 */

const ALLOWED_ORIGINS = [
  "https://kaviar-frontend.onrender.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

function originValidator(origin, callback) {
  // Permite chamadas sem Origin (curl/healthcheck/servidor-servidor)
  if (!origin) return callback(null, true);

  // Whitelist
  if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);

  return callback(new Error("CORS bloqueado para origin: " + origin));
}

const corsOptions = {
  origin: originValidator,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  // Se você NÃO usa cookies/sessão cross-site, deixe false (JWT no header não precisa)
  credentials: false,
  optionsSuccessStatus: 204,
};

// Webhook (Twilio) não depende de CORS (não é navegador).
// Mantemos permissivo para não bloquear preflight/healthchecks por engano.
const webhookCorsOptions = {
  origin: (origin, cb) => cb(null, true),
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Twilio-Signature"],
  credentials: false,
  optionsSuccessStatus: 204,
};

module.exports = {
  corsOptions,
  webhookCorsOptions,
};
