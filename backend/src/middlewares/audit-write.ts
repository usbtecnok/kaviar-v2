import { Request, Response, NextFunction } from 'express';
import { audit, auditCtx } from '../utils/audit';

/**
 * Middleware factory: auto-audit admin write operations.
 * Usage: router.post('/path', auditWrite('action', 'entity_type', (req) => req.params.id), handler)
 */
export function auditWrite(action: string, entityType: string, entityIdFn?: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      // Only audit successful writes
      if (res.statusCode < 400 && body?.success !== false) {
        const ctx = auditCtx(req);
        const entityId = entityIdFn ? entityIdFn(req) : req.params?.id || 'unknown';
        audit({
          adminId: ctx.adminId,
          adminEmail: ctx.adminEmail,
          action,
          entityType,
          entityId,
          newValue: req.body,
          ipAddress: ctx.ip,
          userAgent: ctx.ua,
        });
      }
      return originalJson(body);
    } as any;

    next();
  };
}
