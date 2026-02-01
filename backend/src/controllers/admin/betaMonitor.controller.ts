import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { spawn } from 'child_process';
import path from 'path';

export class BetaMonitorController {
  // GET /api/admin/beta-monitor/:featureKey/checkpoints
  async getCheckpoints(req: Request, res: Response) {
    try {
      const { featureKey } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const cursor = req.query.cursor as string;

      const where: any = { feature_key: featureKey };
      if (cursor) {
        where.created_at = { lt: new Date(cursor) };
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

      res.json({
        success: true,
        checkpoint,
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
      const phase = req.body.phase || 'phase1_beta';
      const label = `manual-run-${new Date().toISOString().slice(0, 16)}`;

      console.log(`[Beta Monitor] Manual run triggered by admin ${admin.id} for ${featureKey}`);

      // Spawn dog script
      const scriptPath = path.join(__dirname, '../../scripts/beta-monitor-dog.js');
      const child = spawn('node', [scriptPath, featureKey, phase, label], {
        detached: false,
        stdio: 'pipe',
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', async (code) => {
        console.log(`[Beta Monitor] Dog script exited with code ${code}`);
        
        // Log audit
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
}
