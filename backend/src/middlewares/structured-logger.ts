import { Request, Response, NextFunction } from 'express';

export const structuredLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const admin = (req as any).admin;
    const log: any = {
      ts: new Date().toISOString(),
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      requestId: (req as any).requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    };
    if (admin?.id) {
      log.adminId = admin.id;
      log.adminEmail = admin.email;
    }
    console.log(JSON.stringify(log));
  });

  next();
};
