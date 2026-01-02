// =====================================================
// INTEGRAÇÃO COM SERVER.JS - ROTAS E MIDDLEWARE
// =====================================================

// Adicionar ao server.js existente

const bonusMetricsRoutes = require('./api/bonus_metrics_routes');
const bonusAdminRoutes = require('./api/bonus_admin_routes');
const BonusMetricsService = require('./lib/BonusMetricsService');

// Middleware para métricas (apenas analytics)
app.use('/api/analytics', bonusMetricsRoutes);

// Middleware para admin (controle A/B test)
app.use('/api/admin', bonusAdminRoutes);

// 🎯 INTEGRAÇÃO COM ROTA EXISTENTE DE CRIAÇÃO DE CORRIDA
app.post('/api/rides', async (req, res) => {
  try {
    // Usar serviço de bônus para criar corrida com A/B test
    const rideData = await BonusMetricsService.createRideWithBonus(req.body);
    
    res.json({
      success: true,
      data: rideData
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📱 INTEGRAÇÃO COM ROTA EXISTENTE DE ACEITE
app.post('/api/rides/:rideId/accept', async (req, res) => {
  try {
    const { rideId } = req.params;
    const { driver_id } = req.body;
    
    // Usar serviço de bônus para processar aceite
    const result = await BonusMetricsService.processRideAcceptance(rideId, driver_id);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📊 ENDPOINT PARA DASHBOARD RÁPIDO
app.get('/api/dashboard/bonus-summary', async (req, res) => {
  try {
    const { period = 7, community_id } = req.query;
    
    const [metrics, abStatus] = await Promise.all([
      BonusMetricsService.getQuickMetrics(period, community_id),
      BonusMetricsService.getABTestStatus()
    ]);
    
    res.json({
      success: true,
      data: {
        metrics,
        ab_test_status: abStatus,
        period_days: period
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
