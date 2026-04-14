/**
 * Normaliza telefone para formato E.164 (+5521999999999).
 * Regra central — todo input de telefone no sistema deve passar por aqui.
 */
export function normalizeE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');

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
