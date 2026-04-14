import { prisma } from '../lib/prisma';

interface AuditLogData {
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  reason?: string;
  ipAddress?: string;
}

export async function createAuditLog(data: AuditLogData) {
  try {
    const { pool } = require('../db');
    await pool.query(
      `INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, old_value, new_value, reason, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [data.adminId, data.action, data.entityType, data.entityId,
       data.oldValue ? JSON.stringify(sanitizeAuditData(data.oldValue)) : null,
       data.newValue ? JSON.stringify(sanitizeAuditData(data.newValue)) : null,
       data.reason || null, data.ipAddress || null]
    );
  } catch (error) {
    // Fallback: log only, never fail the main operation
    console.error('[AUDIT_PERSIST_ERROR]', error);
    console.log(`[AUDIT] ${data.action} by ${data.adminId} on ${data.entityType}:${data.entityId}`);
  }
}

function sanitizeAuditData(data: any): any {
  if (!data) return data;
  
  const sanitized = { ...data };
  
  // Remover campos sensíveis dos logs
  const sensitiveFields = ['medicalNotes', 'emergencyContact', 'emergencyPhone', 'notes'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[CONFIDENCIAL]';
    }
  });
  
  return sanitized;
}
