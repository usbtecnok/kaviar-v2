import { pool } from '../db';

const BASE_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';
const API_KEY = process.env.ASAAS_API_KEY || '';

async function asaasRequest(method: string, path: string, body?: any): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', access_token: API_KEY },
    ...(body && { body: JSON.stringify(body) }),
  });
  const data: any = await res.json();
  if (!res.ok) {
    console.error(`[ASAAS] ${method} ${path} → ${res.status}`, data);
    throw new Error(data.errors?.[0]?.description || `Asaas error ${res.status}`);
  }
  return data;
}

/** Find or create Asaas customer for a driver */
export async function ensureAsaasCustomer(driverId: string): Promise<string> {
  const driver = await pool.query(
    'SELECT id, name, email, phone, document_cpf, asaas_customer_id FROM drivers WHERE id = $1',
    [driverId]
  );
  if (!driver.rows[0]) throw new Error('Driver not found');
  const d = driver.rows[0];

  if (d.asaas_customer_id) return d.asaas_customer_id;

  if (!d.document_cpf) throw new Error('CPF obrigatório para criar conta de pagamento');

  const customer = await asaasRequest('POST', '/customers', {
    name: d.name,
    cpfCnpj: d.document_cpf,
    email: d.email || undefined,
    phone: d.phone?.replace(/\D/g, '') || undefined,
    externalReference: d.id,
  });

  await pool.query('UPDATE drivers SET asaas_customer_id = $1 WHERE id = $2', [customer.id, driverId]);
  console.log(`[ASAAS] Customer created: ${customer.id} for driver ${driverId}`);
  return customer.id;
}

/** Create Pix payment and return QR code data */
export async function createPixPayment(customerId: string, amountCents: number, externalRef: string, description: string) {
  const payment = await asaasRequest('POST', '/payments', {
    customer: customerId,
    billingType: 'PIX',
    value: amountCents / 100,
    description,
    externalReference: externalRef,
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  let qrCode = '';
  let copyPaste = '';
  let expirationDate = '';
  try {
    const qr = await asaasRequest('GET', `/payments/${payment.id}/pixQrCode`);
    qrCode = qr.encodedImage || '';
    copyPaste = qr.payload || '';
    expirationDate = qr.expirationDate || '';
  } catch (qrErr: any) {
    console.warn(`[ASAAS] QR code unavailable for ${payment.id}: ${qrErr.message}`);
  }

  return {
    paymentId: payment.id as string,
    status: payment.status as string,
    invoiceUrl: payment.invoiceUrl as string || '',
    qrCode,
    copyPaste,
    expirationDate,
  };
}
