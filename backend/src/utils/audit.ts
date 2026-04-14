import { prisma } from '../lib/prisma';

interface AuditLogData {
  adminId: string;
  adminEmail?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

const SENSITIVE_FIELDS = ['password', 'password_hash', 'token', 'secret', 'api_key', 'medicalNotes', 'emergencyContact'];

function sanitize(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const out: any = Array.isArray(data) ? [...data] : { ...data };
  for (const key of Object.keys(out)) {
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      out[key] = '[REDACTED]';
    }
  }
  return out;
}

export async function audit(data: AuditLogData): Promise<void> {
  try {
    const { pool } = require('../db');
    await pool.query(
      `INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, old_value, new_value, reason, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        data.adminId,
        data.action,
        data.entityType,
        data.entityId,
        data.oldValue ? JSON.stringify(sanitize(data.oldValue)) : null,
        data.newValue ? JSON.stringify(sanitize(data.newValue)) : null,
        data.reason || null,
        data.ipAddress || null,
      ]
    );
  } catch (error) {
    console.error('[AUDIT_PERSIST_ERROR]', error);
    console.log(`[AUDIT] ${data.action} by=${data.adminId} (${data.adminEmail}) on ${data.entityType}:${data.entityId}`);
  }
}

/** Log admin login attempt (success or failure) */
export async function auditLogin(data: {
  email: string;
  adminId?: string;
  success: boolean;
  failReason?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    const { pool } = require('../db');
    await pool.query(
      `INSERT INTO admin_login_history (admin_id, email, success, fail_reason, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [data.adminId || null, data.email, data.success, data.failReason || null, data.ipAddress || null, data.userAgent || null]
    );
  } catch (error) {
    console.error('[AUDIT_LOGIN_ERROR]', error);
    console.log(`[AUDIT_LOGIN] email=${data.email} success=${data.success} reason=${data.failReason || 'ok'}`);
  }
}

/** @deprecated Use `audit` instead */
export const createAuditLog = audit;

export function auditCtx(req: any): { adminId: string; adminEmail: string; ip: string; ua: string } {
  return {
    adminId: req.admin?.id || req.adminId || 'unknown',
    adminEmail: req.admin?.email || 'unknown',
    ip: req.ip || req.socket?.remoteAddress || 'unknown',
    ua: (req.headers?.['user-agent'] || 'unknown').substring(0, 200),
  };
}
