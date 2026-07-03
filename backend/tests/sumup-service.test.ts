import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('sumup-service', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    process.env.SUMUP_API_KEY = 'sumup_secret_test';
    process.env.SUMUP_BASE_URL = 'https://api.sumup.com';
    process.env.SUMUP_MERCHANT_CODE = 'MDATH499';
    process.env.SUMUP_ENABLED = 'true';
  });

  it('createSumUpCheckout cria checkout com Authorization Bearer', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ id: 'chk_123', checkout_reference: 'wallet_v2:r1', checkout_url: 'https://pay.sumup.com/b2c/chk_123', hosted_checkout_url: 'https://checkout.sumup.com/hc/chk_123' }),
      text: async () => '',
    });

    const { createSumUpCheckout } = await import('../src/services/sumup-service');
    const checkout = await createSumUpCheckout({
      checkout_reference: 'wallet_v2:r1',
      amount: 50,
      currency: 'BRL',
      description: 'Recarga KAVIAR',
    });

    expect(checkout.id).toBe('chk_123');
    expect(checkout.hosted_checkout_url).toBe('https://checkout.sumup.com/hc/chk_123');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [_url, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer sumup_secret_test');
    const body = JSON.parse(options.body as string);
    expect(body.merchant_code).toBe('MDATH499');
    expect(body.currency).toBe('BRL');
    expect(body.hosted_checkout.enabled).toBe(true);
  });

  it('getSumUpCheckout usa GET corretamente', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ id: 'chk_abc', status: 'PAID' }),
      text: async () => '',
    });

    const { getSumUpCheckout } = await import('../src/services/sumup-service');
    const checkout = await getSumUpCheckout('chk_abc');

    expect(checkout.id).toBe('chk_abc');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.sumup.com/v0.1/checkouts/chk_abc');
    expect(options.method).toBe('GET');
    expect(options.headers.Authorization).toBe('Bearer sumup_secret_test');
  });

  it('createSumUpCheckout falha com erro seguro quando SUMUP_MERCHANT_CODE ausente', async () => {
    process.env.SUMUP_MERCHANT_CODE = '';
    const { createSumUpCheckout } = await import('../src/services/sumup-service');

    await expect(
      createSumUpCheckout({
        checkout_reference: 'wallet_v2:r0',
        amount: 5,
        currency: 'BRL',
        description: 'Recarga KAVIAR',
      })
    ).rejects.toMatchObject({ statusCode: 500, safeMessage: 'Configuração de merchant SumUp indisponível.' });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('createSumUpCheckout mapeia 422 para erro seguro', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      headers: { get: () => 'application/json' },
      json: async () => ({ message: 'invalid checkout' }),
      text: async () => '',
    });

    const { createSumUpCheckout } = await import('../src/services/sumup-service');
    await expect(
      createSumUpCheckout({
        checkout_reference: 'wallet_v2:r2',
        amount: 20,
        currency: 'BRL',
        description: 'Recarga KAVIAR',
      })
    ).rejects.toMatchObject({ statusCode: 422, safeMessage: 'Checkout não pôde ser processado pelo provedor.' });
  });

  it('isSumUpEnabled respeita SUMUP_ENABLED', async () => {
    const { isSumUpEnabled } = await import('../src/services/sumup-service');
    process.env.SUMUP_ENABLED = 'false';
    expect(isSumUpEnabled()).toBe(false);
    process.env.SUMUP_ENABLED = 'true';
    expect(isSumUpEnabled()).toBe(true);
  });
});
