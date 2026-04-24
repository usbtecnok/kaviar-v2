/**
 * Normaliza telefone para formato E.164.
 * - Se começar com +, trata como internacional e valida direto.
 * - Se for 10-11 dígitos sem DDI, assume Brasil (+55).
 * - Se começar com 55 e tiver 12+ dígitos, assume Brasil com DDI.
 */
export function normalizeE164(phone: string): string {
  const trimmed = phone.trim();

  // Já tem DDI explícito — normalizar removendo formatação
  if (trimmed.startsWith('+')) {
    const normalized = '+' + trimmed.replace(/\D/g, '');
    if (!isValidE164(normalized)) {
      throw new Error(`Telefone inválido: formato E.164 inválido`);
    }
    return normalized;
  }

  const digits = trimmed.replace(/\D/g, '');

  let normalized: string;
  if (digits.startsWith('55') && digits.length >= 12) {
    normalized = `+${digits}`;
  } else if (digits.length === 10 || digits.length === 11) {
    // Número brasileiro sem código de país
    normalized = `+55${digits}`;
  } else {
    throw new Error(`Telefone inválido: não foi possível normalizar para E.164`);
  }

  if (!isValidE164(normalized)) {
    throw new Error(`Telefone inválido: formato E.164 inválido`);
  }

  return normalized;
}

/** Valida formato E.164 estrito: +{country}{number}, 11-15 dígitos total */
export function isValidE164(phone: string): boolean {
  return /^\+\d{11,15}$/.test(phone);
}
