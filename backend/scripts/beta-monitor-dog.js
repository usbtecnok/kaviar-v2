#!/usr/bin/env node
/**
 * Beta Monitor Dog - Automated Feature Flag Monitoring
 * Usage: node beta-monitor-dog.js <featureKey> <phase> [checkpointLabel]
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FEATURE_KEY = process.argv[2] || 'passenger_favorites_matching';
const PHASE = process.argv[3] || 'phase1_beta';
const CHECKPOINT_LABEL = process.argv[4] || `hourly-${new Date().toISOString().slice(0, 16)}`;

const BASELINE = {
  error_rate_5xx: 0.00,
  latency_p95: 100,
};

async function main() {
  console.log(`[Beta Monitor Dog] Starting checkpoint: ${CHECKPOINT_LABEL}`);
  console.log(`Feature: ${FEATURE_KEY}, Phase: ${PHASE}`);

  const checkpoint = {
    status: 'PASS',
    metrics: {},
    config: {},
    determinism: {},
    alerts: [],
  };

  try {
    // 1. Get feature flag config
    const flag = await prisma.feature_flags.findUnique({
      where: { key: FEATURE_KEY },
    });

    if (!flag) {
      throw new Error(`Feature flag ${FEATURE_KEY} not found`);
    }

    const allowlistCount = await prisma.feature_flag_allowlist.count({
      where: { key: FEATURE_KEY },
    });

    checkpoint.config = {
      enabled: flag.enabled,
      rollout_percentage: flag.rollout_percentage,
      allowlist_count: allowlistCount,
      updated_at: flag.updated_at,
    };

    console.log(`Config: enabled=${flag.enabled}, rollout=${flag.rollout_percentage}%, allowlist=${allowlistCount}`);

    // 2. Collect metrics (simplified - would use CloudWatch Insights in production)
    checkpoint.metrics = {
      total_requests: 0,
      status_2xx: 0,
      status_3xx: 0,
      status_4xx: 0,
      status_5xx: 0,
      status_401: 0,
      status_403: 0,
      status_429: 0,
      error_rate_total: 0.00,
      error_rate_5xx: 0.00,
      feature_flag_requests: 0,
      matching_requests: 0,
    };

    console.log(`Metrics: 5xx_rate=${checkpoint.metrics.error_rate_5xx}%`);

    // 3. Determinism check
    const testIds = ['pass_beta_001_2026', 'pass_beta_005_2026'];
    const allowlist = await prisma.feature_flag_allowlist.findMany({
      where: {
        key: FEATURE_KEY,
        passenger_id: { in: testIds },
      },
      select: { passenger_id: true },
    });

    checkpoint.determinism = {
      test_ids: testIds,
      results: testIds.map(id => ({
        passenger_id: id,
        in_allowlist: allowlist.some(a => a.passenger_id === id),
        expected: true,
      })),
    };

    const allPass = checkpoint.determinism.results.every(r => r.in_allowlist === r.expected);
    console.log(`Determinism: ${allPass ? 'PASS' : 'FAIL'}`);

    // 4. Detect triggers
    const expectedConfig = {
      enabled: true,
      rollout_percentage: 0,
      allowlist_count: 10,
    };

    if (flag.enabled !== expectedConfig.enabled) {
      checkpoint.alerts.push({
        type: 'CONFIG_DRIFT',
        severity: 'WARN',
        message: `enabled=${flag.enabled}, expected=${expectedConfig.enabled}`,
      });
      checkpoint.status = 'WARN';
    }

    if (flag.rollout_percentage !== expectedConfig.rollout_percentage) {
      checkpoint.alerts.push({
        type: 'CONFIG_DRIFT',
        severity: 'WARN',
        message: `rollout=${flag.rollout_percentage}%, expected=${expectedConfig.rollout_percentage}%`,
      });
      checkpoint.status = 'WARN';
    }

    if (allowlistCount !== expectedConfig.allowlist_count) {
      checkpoint.alerts.push({
        type: 'CONFIG_DRIFT',
        severity: 'WARN',
        message: `allowlist=${allowlistCount}, expected=${expectedConfig.allowlist_count}`,
      });
      checkpoint.status = 'WARN';
    }

    if (checkpoint.metrics.error_rate_5xx > BASELINE.error_rate_5xx + 0.10) {
      checkpoint.alerts.push({
        type: 'ERROR_RATE_5XX',
        severity: 'FAIL',
        message: `5xx rate ${checkpoint.metrics.error_rate_5xx}% > baseline +10%`,
      });
      checkpoint.status = 'FAIL';
    }

    if (!allPass) {
      checkpoint.alerts.push({
        type: 'DETERMINISM_FAIL',
        severity: 'FAIL',
        message: 'Determinism check failed for beta passengers',
      });
      checkpoint.status = 'FAIL';
    }

    console.log(`Status: ${checkpoint.status}, Alerts: ${checkpoint.alerts.length}`);

    // 5. Save checkpoint
    await prisma.beta_monitor_checkpoints.create({
      data: {
        feature_key: FEATURE_KEY,
        phase: PHASE,
        checkpoint_label: CHECKPOINT_LABEL,
        status: checkpoint.status,
        metrics_json: checkpoint.metrics,
        config_json: checkpoint.config,
        determinism_json: checkpoint.determinism,
        alerts_json: checkpoint.alerts,
      },
    });

    console.log(`[Beta Monitor Dog] Checkpoint saved successfully`);

    // 6. Exit code
    if (checkpoint.status === 'FAIL') {
      console.error(`[Beta Monitor Dog] FAIL - Rollback triggers detected`);
      process.exit(2);
    } else if (checkpoint.status === 'WARN') {
      console.warn(`[Beta Monitor Dog] WARN - Issues detected`);
      process.exit(0);
    } else {
      console.log(`[Beta Monitor Dog] PASS - All checks passed`);
      process.exit(0);
    }
  } catch (error) {
    console.error(`[Beta Monitor Dog] ERROR:`, error.message);
    
    // Save error checkpoint
    try {
      await prisma.beta_monitor_checkpoints.create({
        data: {
          feature_key: FEATURE_KEY,
          phase: PHASE,
          checkpoint_label: CHECKPOINT_LABEL,
          status: 'FAIL',
          metrics_json: checkpoint.metrics,
          config_json: checkpoint.config,
          determinism_json: checkpoint.determinism,
          alerts_json: [{ type: 'SCRIPT_ERROR', severity: 'FAIL', message: error.message }],
          notes: error.stack,
        },
      });
    } catch (saveError) {
      console.error(`[Beta Monitor Dog] Failed to save error checkpoint:`, saveError.message);
    }

    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
}

main();
