import { Request, Response } from 'express';
import { DashboardService } from './dashboard-service';

export class DashboardController {
  private dashboardService = new DashboardService();

  // GET /api/admin/dashboard/metrics
  getMetrics = async (req: Request, res: Response) => {
    try {
      const metrics = await this.dashboardService.getMetrics();

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar métricas',
      });
    }
  };

  // GET /api/admin/dashboard/recent-rides
  getRecentRides = async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const rides = await this.dashboardService.getRecentRides(limit);

      res.json({
        success: true,
        data: rides,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar corridas recentes',
      });
    }
  };

  // GET /api/admin/dashboard/drivers-overview
  getDriversOverview = async (req: Request, res: Response) => {
    try {
      const overview = await this.dashboardService.getDriversOverview();

      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar overview de motoristas',
      });
    }
  };
}
