import { prisma } from '../lib/prisma';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

export class ComplianceNotificationsService {
  
  /**
   * Enviar notificações de documentos vencendo
   */
  async sendExpirationNotifications() {
    const results = {
      total: 0,
      sent: 0,
      failed: 0,
      details: [] as any[]
    };

    // 30 dias antes
    const expiring30 = await this.getDocumentsExpiringIn(30);
    for (const doc of expiring30) {
      const result = await this.sendExpirationWarning(doc, 30);
      results.total++;
      result.success ? results.sent++ : results.failed++;
      results.details.push(result);
    }

    // 7 dias antes
    const expiring7 = await this.getDocumentsExpiringIn(7);
    for (const doc of expiring7) {
      const result = await this.sendExpirationWarning(doc, 7);
      results.total++;
      result.success ? results.sent++ : results.failed++;
      results.details.push(result);
    }

    // Vencido hoje
    const expiredToday = await this.getDocumentsExpiredToday();
    for (const doc of expiredToday) {
      const result = await this.sendExpiredNotification(doc);
      results.total++;
      result.success ? results.sent++ : results.failed++;
      results.details.push(result);
    }

    return results;
  }

  /**
   * Buscar documentos vencendo em N dias
   */
  private async getDocumentsExpiringIn(days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + days);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    return await prisma.driver_compliance_documents.findMany({
      where: {
        is_current: true,
        valid_until: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        drivers: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    });
  }

  /**
   * Buscar documentos vencidos hoje
   */
  private async getDocumentsExpiredToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await prisma.driver_compliance_documents.findMany({
      where: {
        is_current: true,
        valid_until: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        drivers: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    });
  }

  /**
   * Enviar aviso de vencimento
   */
  private async sendExpirationWarning(doc: any, days: number) {
    const driver = doc.drivers;
    const validUntil = new Date(doc.valid_until).toLocaleDateString('pt-BR');

    let message = '';
    if (days === 30) {
      message = `🔔 Kaviar - Lembrete de Compliance\n\nOlá ${driver.name},\n\nSeu atestado de antecedentes criminais vence em 30 dias (dia ${validUntil}).\n\nPara evitar bloqueio, envie um novo atestado com antecedência.\n\nDúvidas? Entre em contato com o suporte.`;
    } else if (days === 7) {
      message = `⚠️ Kaviar - URGENTE: Atestado Vencendo\n\nOlá ${driver.name},\n\nSeu atestado vence em 7 dias (dia ${validUntil}).\n\n⚠️ Envie um novo atestado AGORA para evitar bloqueio.\n\nApós o vencimento, você terá 7 dias de prazo antes do bloqueio automático.`;
    }

    return await this.sendWhatsApp(driver.phone, message, doc.driver_id, `expiring_${days}d`);
  }

  /**
   * Enviar notificação de vencido
   */
  private async sendExpiredNotification(doc: any) {
    const driver = doc.drivers;
    const message = `🔴 Kaviar - Atestado Vencido\n\nOlá ${driver.name},\n\nSeu atestado de antecedentes venceu hoje.\n\nVocê tem 7 dias de prazo para enviar um novo antes do bloqueio automático.\n\nEnvie o quanto antes para continuar trabalhando.`;

    return await this.sendWhatsApp(driver.phone, message, doc.driver_id, 'expired_today');
  }

  /**
   * Notificar aprovação de documento
   */
  async notifyDocumentApproved(driverId: string, validUntil: Date) {
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: { name: true, phone: true }
    });

    if (!driver) return { success: false, error: 'Driver not found' };

    const validUntilStr = validUntil.toLocaleDateString('pt-BR');
    const message = `✅ Kaviar - Documento Aprovado\n\nOlá ${driver.name},\n\nSeu atestado de antecedentes foi aprovado!\n\nVálido até: ${validUntilStr}\n\nVocê está liberado para trabalhar.`;

    return await this.sendWhatsApp(driver.phone, message, driverId, 'approved');
  }

  /**
   * Notificar rejeição de documento
   */
  async notifyDocumentRejected(driverId: string, reason: string) {
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: { name: true, phone: true }
    });

    if (!driver) return { success: false, error: 'Driver not found' };

    const message = `❌ Kaviar - Documento Rejeitado\n\nOlá ${driver.name},\n\nSeu atestado foi rejeitado.\n\nMotivo: ${reason}\n\nEnvie um novo documento corrigido o quanto antes.`;

    return await this.sendWhatsApp(driver.phone, message, driverId, 'rejected');
  }

  /**
   * Enviar WhatsApp via Twilio
   * FASE 1: Apenas logs em arquivo, sem persistência em banco
   */
  private async sendWhatsApp(phone: string, message: string, driverId: string, type: string) {
    try {
      if (!phone) {
        return { success: false, driverId, type, error: 'No phone number' };
      }

      // Normalizar telefone
      const normalizedPhone = phone.startsWith('+') ? phone : `+55${phone.replace(/\D/g, '')}`;

      // Enviar via Twilio (se configurado)
      let messageSid = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_NUMBER) {
        // TODO: Implementar chamada real ao Twilio quando necessário
        // const twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
        // const response = await twilio.messages.create({
        //   from: TWILIO_WHATSAPP_NUMBER,
        //   to: `whatsapp:${normalizedPhone}`,
        //   body: message
        // });
        // messageSid = response.sid;
      }

      // FASE 1: Apenas retornar sucesso (log será feito pelo cron)
      // FASE 2 (futura): Persistir em whatsapp_messages via Prisma

      return { success: true, driverId, type, phone: normalizedPhone, messageSid };
    } catch (error: any) {
      return { success: false, driverId, type, error: error.message };
    }
  }
}

export const complianceNotificationsService = new ComplianceNotificationsService();
