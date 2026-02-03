import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export class BetaMonitorController {
  // GET /api/admin/beta-monitor/:featureKey/checkpoints
  async getCheckpoints(req: Request, res: Response) {
    try {
      const { featureKey } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const cursor = req.query.cursor as string;
      const phase = req.query.phase as string;

      const where: any = { feature_key: featureKey };
      if (cursor) {
        where.created_at = { lt: new Date(cursor) };
      }
      if (phase) {
        where.phase = phase;
      }

      const checkpoints = await prisma.beta_monitor_checkpoints.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        select: {
          id: true,
          checkpoint_label: true,
          status: true,
          created_at: true,
          phase: true,
        },
      });

      res.json({
        success: true,
        checkpoints,
        cursor: checkpoints.length > 0 ? checkpoints[checkpoints.length - 1].created_at : null,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar checkpoints',
      });
    }
  }

  // GET /api/admin/beta-monitor/:featureKey/checkpoints/:id
  async getCheckpointDetail(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const checkpoint = await prisma.beta_monitor_checkpoints.findUnique({
        where: { id },
      });

      if (!checkpoint) {
        return res.status(404).json({
          success: false,
          error: 'Checkpoint não encontrado',
        });
      }

      // Map database fields to API response
      const response = {
        id: checkpoint.id,
        feature_key: checkpoint.feature_key,
        phase: checkpoint.phase,
        checkpoint_label: checkpoint.checkpoint_label,
        created_at: checkpoint.created_at,
        status: checkpoint.status,
        metrics: checkpoint.metrics_json,
        config: checkpoint.config_json,
        determinism: checkpoint.determinism_json,
        alerts: checkpoint.alerts_json,
        notes: checkpoint.notes,
      };

      res.json({
        success: true,
        checkpoint: response,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar checkpoint',
      });
    }
  }

  // POST /api/admin/beta-monitor/:featureKey/run
  async runCheckpoint(req: Request, res: Response) {
    try {
      const { featureKey } = req.params;
      const admin = (req as any).admin;
      const phase = req.body.phase || 'phase2_rollout';
      const label = `manual-run-${new Date().toISOString().slice(0, 16)}`;

      console.log(`[Beta Monitor] Manual run triggered by admin ${admin.id} for ${featureKey}`);

      // Get current config for fallback
      const flag = await prisma.feature_flags.findUnique({
        where: { key: featureKey },
      });

      if (!flag) {
        return res.status(404).json({
          success: false,
          error: 'Feature flag não encontrada',
        });
      }

      // Use provided values or fallback to current config
      const expectedRollout = req.body.expectedRollout ?? flag.rollout_percentage;
      const expectedEnabled = req.body.expectedEnabled ?? flag.enabled;

      // Spawn dog script - use absolute path in container
      const scriptPath = path.join(__dirname, '../../scripts/beta-monitor-dog.js');
      const args = [
        scriptPath,
        featureKey,
        phase,
        label,
        `--expected-rollout=${expectedRollout}`,
      ];

      if (expectedEnabled !== undefined) {
        args.push(`--expected-enabled=${expectedEnabled}`);
      }

      const child = spawn('node', args, {
        detached: false,
        stdio: 'pipe',
        cwd: path.join(__dirname, '../..'),
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
        console.log(`[Beta Monitor Dog] ${data.toString().trim()}`);
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error(`[Beta Monitor Dog Error] ${data.toString().trim()}`);
      });

      child.on('close', async (code) => {
        console.log(`[Beta Monitor] Dog script exited with code ${code}`);
        console.log(`[Audit] Admin ${admin.email} (${admin.id}) ran beta monitor for ${featureKey}`);
      });

      // Don't wait for completion - return immediately
      res.json({
        success: true,
        message: 'Checkpoint iniciado',
        label,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao executar checkpoint',
      });
    }
  }

  // GET /api/admin/runbooks/:key
  async getRunbook(req: Request, res: Response) {
    try {
      const { key } = req.params;
      
      // Map feature key to runbook filename
      const runbookMap: Record<string, string> = {
        'passenger_favorites_matching': 'RUNBOOK_PASSENGER_FAVORITES_MATCHING.md',
      };

      const filename = runbookMap[key];
      if (!filename) {
        return res.status(404).json({
          success: false,
          error: 'Runbook não encontrado',
        });
      }

      const runbookPath = path.join(__dirname, '../../../docs/runbooks', filename);
      
      if (!fs.existsSync(runbookPath)) {
        return res.status(404).json({
          success: false,
          error: 'Arquivo de runbook não encontrado',
        });
      }

      const markdown = fs.readFileSync(runbookPath, 'utf8');

      // Sanitize: ensure no tokens/credentials
      const sanitized = markdown
        .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED]')
        .replace(/password["\s:=]+[^\s"]+/gi, 'password: [REDACTED]');

      res.json({
        success: true,
        key,
        title: `RUNBOOK - ${key.replace(/_/g, ' ').toUpperCase()}`,
        markdown: sanitized,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar runbook',
      });
    }
  }
}
