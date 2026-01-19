#!/usr/bin/env node

/**
 * Cron Job - Notificações de Compliance
 * Sistema de Revalidação de Antecedentes
 * 
 * Executa diariamente às 09:00 UTC
 * Envia notificações WhatsApp sobre documentos vencendo
 */

const path = require('path');

// Configurar diretório de trabalho
const BACKEND_DIR = path.join(__dirname, '..');
process.chdir(BACKEND_DIR);

// Carregar variáveis de ambiente
require('dotenv').config();

// Importar serviço de notificações (caminho relativo ao backend)
const { complianceNotificationsService } = require('../dist/services/compliance-notifications.service.js');

async function runNotificationsCron() {
  const startTime = new Date();
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`[${startTime.toISOString()}] Iniciando notificações de compliance`);
  console.log('═══════════════════════════════════════════════════════════');
  
  try {
    // Executar notificações
    const result = await complianceNotificationsService.sendExpirationNotifications();
    
    const endTime = new Date();
    const duration = endTime - startTime;
    
    console.log('\n✅ Notificações processadas com sucesso');
    console.log(`⏱️  Duração: ${duration}ms`);
    console.log(`📊 Total: ${result.total} notificações`);
    console.log(`✅ Enviadas: ${result.sent}`);
    console.log(`❌ Falhas: ${result.failed}`);
    
    if (result.details.length > 0) {
      console.log('\n📋 Detalhes:');
      result.details.forEach((detail, index) => {
        const status = detail.success ? '✅' : '❌';
        const info = detail.success 
          ? `${detail.phone} (${detail.type})`
          : `${detail.driverId} - ${detail.error}`;
        console.log(`  ${index + 1}. ${status} ${info}`);
      });
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`[${endTime.toISOString()}] Notificações finalizadas`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    process.exit(0);
    
  } catch (error) {
    const endTime = new Date();
    
    console.error('\n❌ Erro nas notificações de compliance');
    console.error(`⏱️  Duração até falha: ${endTime - startTime}ms`);
    console.error(`🔴 Erro: ${error.message}`);
    console.error(`📍 Stack: ${error.stack}`);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`[${endTime.toISOString()}] Notificações FALHOU`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    process.exit(1);
  }
}

// Executar
runNotificationsCron();
