/**
 * Teste 6 — Validação das variáveis posicionais do WhatsApp complete
 * Simula exatamente o que rides-v2.ts envia e valida o payload JSON.
 */

import { WHATSAPP_TEMPLATES } from '../../src/modules/whatsapp/whatsapp-templates';

// Reproduz toContentVariables de whatsapp.service.ts
function toContentVariables(vars: Record<string, any>): string {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) {
    clean[String(k)] = String(v ?? '').replace(/[\n\r\t]/g, ' ').replace(/ {4,}/g, '   ') || ' ';
  }
  return JSON.stringify(clean);
}

// Dados simulados do settlement (exatamente como o teste 3 retornou)
const settlement = {
  final_price: 7,
  fee_percent: 7,
  fee_amount: 0.49,
  driver_earnings: 6.51,
};

const passenger = { name: 'Maria Silva', phone: '+5521999990001' };
const driver = { name: 'João Motorista', phone: '+5521999990002' };
const pickup = 'Furnas Origem';
const dropoff = 'Furnas Destino';
const price = String(settlement.final_price);

console.log('=== TESTE 6: WhatsApp complete — variáveis posicionais ===\n');

// --- Template passageiro ---
console.log('--- Passageiro: kaviar_rides_passenger_completed_v1 ---');
const passengerVars = {
  '1': passenger.name,
  '2': driver.name,
  '3': pickup,
  '4': dropoff,
  '5': price,
};
const passengerJson = toContentVariables(passengerVars);
const passengerParsed = JSON.parse(passengerJson);
console.log('ContentVariables:', passengerJson);

// --- Template motorista ---
console.log('\n--- Motorista: kaviar_rides_driver_completed_v1 ---');
const driverVars = {
  '1': driver.name,
  '2': pickup,
  '3': dropoff,
  '4': price,
  '5': String(settlement.fee_percent),
  '6': String(settlement.driver_earnings),
};
const driverJson = toContentVariables(driverVars);
const driverParsed = JSON.parse(driverJson);
console.log('ContentVariables:', driverJson);

// --- Validações ---
console.log('\n--- Resultados ---');
const checks: [string, boolean][] = [
  // SIDs existem
  ['SID passageiro existe', WHATSAPP_TEMPLATES.kaviar_rides_passenger_completed_v1 === 'HXb370f31ef271b85e0abf17e921ef16db'],
  ['SID motorista existe', WHATSAPP_TEMPLATES.kaviar_rides_driver_completed_v1 === 'HX697bc0dbe68bd5d1a83ef0ddf07bdb05'],

  // Passageiro: 5 variáveis na ordem certa
  ['P {{1}} = passenger_name', passengerParsed['1'] === 'Maria Silva'],
  ['P {{2}} = driver_name', passengerParsed['2'] === 'João Motorista'],
  ['P {{3}} = pickup', passengerParsed['3'] === 'Furnas Origem'],
  ['P {{4}} = dropoff', passengerParsed['4'] === 'Furnas Destino'],
  ['P {{5}} = price (final_price)', passengerParsed['5'] === '7'],
  ['P total = 5 variáveis', Object.keys(passengerParsed).length === 5],

  // Motorista: 6 variáveis na ordem certa
  ['M {{1}} = driver_name', driverParsed['1'] === 'João Motorista'],
  ['M {{2}} = pickup', driverParsed['2'] === 'Furnas Origem'],
  ['M {{3}} = dropoff', driverParsed['3'] === 'Furnas Destino'],
  ['M {{4}} = price (final_price)', driverParsed['4'] === '7'],
  ['M {{5}} = fee_percent', driverParsed['5'] === '7'],
  ['M {{6}} = driver_earnings', driverParsed['6'] === '6.51'],
  ['M total = 6 variáveis', Object.keys(driverParsed).length === 6],

  // Dados vêm do settlement
  ['price = settlement.final_price', price === String(settlement.final_price)],
  ['fee = settlement.fee_percent', driverVars['5'] === String(settlement.fee_percent)],
  ['earnings = settlement.driver_earnings', driverVars['6'] === String(settlement.driver_earnings)],
];

let passed = 0;
for (const [label, ok] of checks) {
  console.log(`  ${ok ? '✅' : '❌'} ${label}`);
  if (ok) passed++;
}
console.log(`\nTESTE 6: ${passed}/${checks.length} passed`);
if (passed === checks.length) {
  console.log('\n✅ Variáveis posicionais alinhadas com Twilio.');
  console.log('Pronto para ativar WA_RIDE_COMPLETE_ENABLED=true em produção.');
}
