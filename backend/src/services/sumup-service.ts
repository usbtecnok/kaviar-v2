const SUMUP_BASE_URL = process.env.SUMUP_BASE_URL || 'https://api.sumup.com';
const SUMUP_API_KEY = process.env.SUMUP_API_KEY || '';
const SUMUP_MERCHANT_CODE = process.env.SUMUP_MERCHANT_CODE || '';

export class SumUpError extends Error {
  readonly statusCode: number;
  readonly safeMessage: string;

  constructor(statusCode: number, safeMessage: string) {
    super(safeMessage);
    this.name = 'SumUpError';
    this.statusCode = statusCode;
    this.safeMessage = safeMessage;
  }
}

export interface SumUpCheckoutCreateRequest {
  checkout_reference: string;
  amount: number;
  currency: 'BRL' | string;
  description: string;
  merchant_code?: string;
  return_url?: string;
  hosted_checkout?: {
    enabled: boolean;
  };
}

export interface SumUpCheckoutCreateResponse {
  id: string;
  checkout_reference?: string;
  amount?: number;
  currency?: string;
  date?: string;
  description?: string;
  merchant_code?: string;
  status?: string;
  checkout_url?: string;
  hosted_checkout_url?: string;
  [key: string]: unknown;
}

function mapStatusToSafeMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Dados inválidos para criar checkout SumUp.';
    case 401:
      return 'Falha de autenticação no provedor de pagamento.';
    case 402:
      return 'Pagamento recusado pelo provedor.';
    case 403:
      return 'Acesso negado ao provedor de pagamento.';
    case 404:
      return 'Recurso de pagamento não encontrado.';
    case 409:
      return 'Conflito ao criar checkout no provedor.';
    case 422:
      return 'Checkout não pôde ser processado pelo provedor.';
    case 429:
      return 'Limite de requisições do provedor excedido.';
    default:
      if (status >= 500) return 'Provedor de pagamento indisponível no momento.';
      return 'Falha ao criar checkout no provedor de pagamento.';
  }
}

async function sumupRequest<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
  if (!SUMUP_API_KEY) {
    throw new SumUpError(500, 'Configuração de pagamento indisponível.');
  }

  const res = await fetch(`${SUMUP_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUMUP_API_KEY}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const contentType = res.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const raw = await res.text();
    data = raw ? { message: raw.slice(0, 200) } : {};
  }

  if (!res.ok) {
    const safeMessage = mapStatusToSafeMessage(res.status);
    // Não registrar payload sensível nem token da requisição
    console.error(`[SUMUP] checkout request failed status=${res.status}`);
    throw new SumUpError(res.status, safeMessage);
  }

  return data as T;
}

export async function createSumUpCheckout(input: SumUpCheckoutCreateRequest): Promise<SumUpCheckoutCreateResponse> {
  const merchantCode = input.merchant_code || SUMUP_MERCHANT_CODE;
  if (!merchantCode) {
    throw new SumUpError(500, 'Configuração de merchant SumUp indisponível.');
  }

  const payload = {
    checkout_reference: input.checkout_reference,
    amount: input.amount,
    currency: input.currency,
    description: input.description,
    merchant_code: merchantCode,
    ...(input.return_url ? { return_url: input.return_url } : {}),
    hosted_checkout: { enabled: input.hosted_checkout?.enabled ?? true },
  };

  const checkout = await sumupRequest<SumUpCheckoutCreateResponse>('/v0.1/checkouts', 'POST', payload);
  if (!checkout?.id) {
    throw new SumUpError(502, 'Resposta inválida do provedor de pagamento.');
  }
  return checkout;
}

export async function getSumUpCheckout(checkoutId: string): Promise<SumUpCheckoutCreateResponse> {
  if (!checkoutId) {
    throw new SumUpError(400, 'Checkout inválido para consulta.');
  }
  const checkout = await sumupRequest<SumUpCheckoutCreateResponse>(`/v0.1/checkouts/${encodeURIComponent(checkoutId)}`, 'GET');
  if (!checkout?.id) {
    throw new SumUpError(502, 'Resposta inválida do provedor de pagamento.');
  }
  return checkout;
}

export function isSumUpEnabled(): boolean {
  return process.env.SUMUP_ENABLED === 'true';
}
