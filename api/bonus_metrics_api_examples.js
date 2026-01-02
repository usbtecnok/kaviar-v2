// =====================================================
// API ENDPOINTS PARA MÉTRICAS DO BÔNUS DE ACEITE IMEDIATO
// =====================================================

// 📊 ENDPOINT 1: Resumo Executivo de ROI
// GET /api/analytics/bonus-roi-summary?period=30&community_id=uuid
{
  "success": true,
  "data": {
    "period": "Últimos 30 dias",
    "summary": {
      "total_rides_with_bonus": 245,
      "total_rides_without_bonus": 238,
      "avg_accept_time_with_bonus_seconds": 18.4,
      "avg_accept_time_without_bonus_seconds": 31.7,
      "time_reduction_seconds": 13.3,
      "time_reduction_percentage": 41.96,
      "total_bonus_cost": 735.00,
      "avg_cost_per_ride": 3.00,
      "estimated_roi_percentage": 78.23
    },
    "cost_benefit_analysis": {
      "seconds_saved_total": 3258.5,
      "cost_per_second_saved": 0.23,
      "break_even_value_per_second": 0.23,
      "roi_scenarios": {
        "conservative_10_cents": 42.15,
        "moderate_15_cents": 78.23,
        "optimistic_20_cents": 114.31
      }
    }
  }
}

// 📈 ENDPOINT 2: Tendência Diária
// GET /api/analytics/bonus-daily-trend?days=7
{
  "success": true,
  "data": {
    "daily_metrics": [
      {
        "date": "2026-01-01",
        "rides_with_bonus": 35,
        "rides_without_bonus": 32,
        "avg_time_bonus_seconds": 17.2,
        "avg_time_regular_seconds": 29.8,
        "improvement_seconds": 12.6,
        "daily_bonus_cost": 105.00
      },
      {
        "date": "2025-12-31",
        "rides_with_bonus": 41,
        "rides_without_bonus": 38,
        "avg_time_bonus_seconds": 19.1,
        "avg_time_regular_seconds": 33.4,
        "improvement_seconds": 14.3,
        "daily_bonus_cost": 123.00
      }
    ],
    "trend_analysis": {
      "avg_improvement_seconds": 13.2,
      "consistency_score": 0.87,
      "total_cost_period": 861.00
    }
  }
}

// 🏘️ ENDPOINT 3: Performance por Comunidade
// GET /api/analytics/bonus-by-community?period=30
{
  "success": true,
  "data": {
    "communities": [
      {
        "community_id": "uuid-1",
        "community_name": "Copacabana",
        "total_rides": 89,
        "rides_with_bonus": 44,
        "avg_time_with_bonus": 16.8,
        "avg_time_without_bonus": 28.9,
        "improvement_percentage": 41.87,
        "total_cost": 132.00,
        "roi_percentage": 89.45
      },
      {
        "community_id": "uuid-2", 
        "community_name": "Ipanema",
        "total_rides": 67,
        "rides_with_bonus": 33,
        "avg_time_with_bonus": 21.2,
        "avg_time_without_bonus": 35.6,
        "improvement_percentage": 40.45,
        "total_cost": 99.00,
        "roi_percentage": 72.34
      }
    ],
    "ranking": {
      "best_roi_community": "Copacabana",
      "most_consistent": "Ipanema",
      "highest_volume": "Copacabana"
    }
  }
}

// ⚡ ENDPOINT 4: Status do A/B Test
// GET /api/analytics/ab-test-status
{
  "success": true,
  "data": {
    "ab_test_config": {
      "is_enabled": true,
      "group_a_percentage": 50,
      "feature_name": "first_accept_bonus"
    },
    "current_distribution": {
      "group_a_rides": 245,
      "group_b_rides": 238,
      "actual_percentage_a": 50.7
    },
    "statistical_significance": {
      "sample_size_adequate": true,
      "confidence_level": 95,
      "p_value": 0.003,
      "significant_difference": true
    }
  }
}

// 💰 ENDPOINT 5: Análise Detalhada de Custo-Benefício
// GET /api/analytics/bonus-cost-benefit?period=30
{
  "success": true,
  "data": {
    "financial_impact": {
      "total_bonus_paid": 735.00,
      "avg_bonus_per_ride": 3.00,
      "total_seconds_saved": 3258.5,
      "cost_per_second_saved": 0.23
    },
    "operational_benefits": {
      "faster_ride_matching": true,
      "reduced_passenger_wait_time": 13.3,
      "improved_driver_utilization": 8.7,
      "estimated_customer_satisfaction_boost": 12.4
    },
    "roi_analysis": {
      "break_even_point_days": 18,
      "payback_period_months": 0.6,
      "net_present_value": 2847.50,
      "internal_rate_return": 156.7
    },
    "recommendations": {
      "continue_program": true,
      "optimal_bonus_amount": 2.80,
      "target_communities": ["Copacabana", "Ipanema"],
      "expansion_readiness": "high"
    }
  }
}

// 🔧 ENDPOINT 6: Controle do A/B Test (Admin)
// POST /api/admin/ab-test/toggle
{
  "feature_name": "first_accept_bonus",
  "is_enabled": true,
  "group_a_percentage": 60
}

// Response:
{
  "success": true,
  "message": "A/B test configuration updated successfully",
  "data": {
    "feature_name": "first_accept_bonus",
    "is_enabled": true,
    "group_a_percentage": 60,
    "updated_at": "2026-01-01T21:36:54.685-03:00"
  }
}
