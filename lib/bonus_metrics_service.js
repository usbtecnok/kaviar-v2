// =====================================================
// IMPLEMENTAÇÃO BACKEND - INTEGRAÇÃO COM LÓGICA EXISTENTE
// =====================================================

// 🎯 FUNÇÃO: Aplicar A/B Test ao Criar Corrida
async function createRideWithBonusTest(rideData) {
  const { passenger_id, driver_id, community_id, base_fare = 15.00 } = rideData;
  
  try {
    // 1. Criar corrida básica
    const ride = await db.query(`
      INSERT INTO rides (passenger_id, driver_id, community_id, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING id
    `, [passenger_id, driver_id, community_id]);
    
    const rideId = ride.rows[0].id;
    
    // 2. Aplicar A/B test e bônus (se aplicável)
    const bonusResult = await db.query(`
      SELECT * FROM apply_first_accept_bonus($1, $2)
    `, [rideId, base_fare]);
    
    const { has_bonus, ab_group, bonus_amount } = bonusResult.rows[0];
    
    // 3. Retornar dados para o frontend
    return {
      ride_id: rideId,
      has_first_accept_bonus: has_bonus,
      ab_test_group: ab_group,
      bonus_amount: bonus_amount,
      offer_sent_at: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Erro ao criar corrida com A/B test:', error);
    throw error;
  }
}

// 📊 FUNÇÃO: Obter Métricas para Dashboard
async function getBonusMetrics(period = 30, communityId = null) {
  try {
    const metricsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE has_first_accept_bonus = TRUE) as rides_with_bonus,
        COUNT(*) FILTER (WHERE has_first_accept_bonus = FALSE) as rides_without_bonus,
        ROUND(AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = TRUE), 1) as avg_time_bonus,
        ROUND(AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = FALSE), 1) as avg_time_regular,
        ROUND(SUM(bonus_amount), 2) as total_bonus_cost,
        ROUND(
          (AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = FALSE) - 
           AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = TRUE)) / 
           AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = FALSE) * 100, 2
        ) as improvement_percentage
      FROM rides 
      WHERE accepted_at >= CURRENT_DATE - INTERVAL '${period} days'
        AND status = 'accepted'
        AND accept_time_seconds IS NOT NULL
        ${communityId ? 'AND community_id = $1' : ''}
    `;
    
    const params = communityId ? [communityId] : [];
    const result = await db.query(metricsQuery, params);
    
    return result.rows[0];
    
  } catch (error) {
    console.error('Erro ao obter métricas:', error);
    throw error;
  }
}

// ⚙️ FUNÇÃO: Controlar A/B Test (Admin)
async function toggleABTest(isEnabled, groupAPercentage = 50) {
  try {
    const result = await db.query(`
      SELECT toggle_ab_test('first_accept_bonus', $1, $2)
    `, [isEnabled, groupAPercentage]);
    
    return {
      success: true,
      enabled: isEnabled,
      group_a_percentage: groupAPercentage,
      updated_at: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Erro ao alterar A/B test:', error);
    throw error;
  }
}

// 📈 FUNÇÃO: Processar Aceite de Corrida (Integração Existente)
async function processRideAcceptance(rideId, driverId) {
  try {
    // 1. Atualizar status da corrida (trigger calculará tempo automaticamente)
    await db.query(`
      UPDATE rides 
      SET status = 'accepted', driver_id = $2
      WHERE id = $1 AND status = 'pending'
    `, [rideId, driverId]);
    
    // 2. Verificar se tem bônus para processar pagamento
    const rideInfo = await db.query(`
      SELECT has_first_accept_bonus, bonus_amount, accept_time_seconds
      FROM rides 
      WHERE id = $1
    `, [rideId]);
    
    const ride = rideInfo.rows[0];
    
    // 3. Se tem bônus, processar pagamento extra
    if (ride.has_first_accept_bonus && ride.bonus_amount > 0) {
      await processDriverBonus(driverId, ride.bonus_amount, rideId);
    }
    
    // 4. Retornar dados para confirmação
    return {
      ride_id: rideId,
      accepted: true,
      accept_time_seconds: ride.accept_time_seconds,
      bonus_earned: ride.has_first_accept_bonus ? ride.bonus_amount : 0
    };
    
  } catch (error) {
    console.error('Erro ao processar aceite:', error);
    throw error;
  }
}

// 💳 FUNÇÃO: Processar Bônus do Motorista
async function processDriverBonus(driverId, bonusAmount, rideId) {
  try {
    // Registrar bônus na carteira do motorista
    await db.query(`
      INSERT INTO driver_earnings (driver_id, ride_id, amount, type, description)
      VALUES ($1, $2, $3, 'first_accept_bonus', 'Bônus por aceite imediato')
    `, [driverId, rideId, bonusAmount]);
    
    console.log(`Bônus de R$ ${bonusAmount} creditado para motorista ${driverId}`);
    
  } catch (error) {
    console.error('Erro ao processar bônus:', error);
    throw error;
  }
}

// 🔄 FUNÇÃO: Agregação Diária Automática (Cron Job)
async function runDailyMetricsAggregation() {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const targetDate = yesterday.toISOString().split('T')[0];
    
    await db.query(`SELECT aggregate_daily_metrics($1)`, [targetDate]);
    
    console.log(`Métricas agregadas para ${targetDate}`);
    
  } catch (error) {
    console.error('Erro na agregação diária:', error);
    throw error;
  }
}

// 📋 EXEMPLO DE USO NAS ROTAS EXPRESS
/*
// Rota para criar corrida com A/B test
app.post('/api/rides', async (req, res) => {
  try {
    const rideData = await createRideWithBonusTest(req.body);
    res.json({ success: true, data: rideData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rota para métricas do dashboard
app.get('/api/analytics/bonus-metrics', async (req, res) => {
  try {
    const { period = 30, community_id } = req.query;
    const metrics = await getBonusMetrics(period, community_id);
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rota admin para controlar A/B test
app.post('/api/admin/ab-test/toggle', async (req, res) => {
  try {
    const { is_enabled, group_a_percentage } = req.body;
    const result = await toggleABTest(is_enabled, group_a_percentage);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
*/

module.exports = {
  createRideWithBonusTest,
  getBonusMetrics,
  toggleABTest,
  processRideAcceptance,
  runDailyMetricsAggregation
};
