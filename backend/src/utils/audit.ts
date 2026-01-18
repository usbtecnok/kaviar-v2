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
    // Sanitizar dados sensíveis antes de logar
    const sanitizedOldValue = sanitizeAuditData(data.oldValue);
    const sanitizedNewValue = sanitizeAuditData(data.newValue);

    console.log(`[AUDIT] ${data.action} by admin ${data.adminId} on ${data.entityType}:${data.entityId}`, {
      timestamp: new Date().toISOString(),
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      reason: data.reason,
      ipAddress: data.ipAddress
      // Não logar oldValue/newValue para evitar dados sensíveis nos logs
    });

    // Em produção, salvar em tabela de auditoria
    // await prisma.auditLog.create({ data: ... });
    
  } catch (error) {
    console.error('[AUDIT ERROR]', error);
    // Não falhar a operação principal se auditoria falhar
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
