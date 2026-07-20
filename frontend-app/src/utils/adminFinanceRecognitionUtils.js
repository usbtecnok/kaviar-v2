// Centralized labels and helpers for Finance Recognition Policy entities.
// Use these functions throughout the UI — do not scatter switch/if translations.

export const RECOGNITION_SUBJECT_LABELS = {
  RIDE_REVENUE: 'Receita de corridas',
  PREPAID_DRIVER_CREDITS: 'Créditos pré-pagos de motoristas',
  MANAGER_PAYMENTS: 'Pagamentos de gestores',
  COMMERCIAL_PAYMENTS: 'Pagamentos comerciais',
  OTHER: 'Outras operações',
};

export const RECOGNITION_POLICY_LABELS = {
  UNCLASSIFIED: 'Não classificada',
  GROSS_PRINCIPAL: 'Principal — reconhecimento bruto',
  NET_AGENT: 'Agente — reconhecimento líquido',
};

export const RECOGNITION_SCOPE_LABELS = {
  GLOBAL: 'Global',
  TERRITORY: 'Território',
  CITY: 'Cidade',
  COST_CENTER: 'Centro de custo',
};

export const RECOGNITION_STATUS_LABELS = {
  DRAFT: 'Rascunho',
  APPROVED: 'Aprovada',
  REVOKED: 'Revogada',
  SUPERSEDED: 'Substituída',
};

export const RECOGNITION_STATUS_COLORS = {
  DRAFT:      { bgcolor: '#FEF3C7', color: '#92400E' },
  APPROVED:   { bgcolor: '#D1FAE5', color: '#065F46' },
  REVOKED:    { bgcolor: '#FEE2E2', color: '#991B1B' },
  SUPERSEDED: { bgcolor: '#EDE9FE', color: '#5B21B6' },
};

export const RECOGNITION_POLICY_COLORS = {
  UNCLASSIFIED:   { bgcolor: '#FEF3C7', color: '#92400E' },
  GROSS_PRINCIPAL: { bgcolor: '#DBEAFE', color: '#1E40AF' },
  NET_AGENT:      { bgcolor: '#EDE9FE', color: '#5B21B6' },
};

export const RECOGNITION_SUBJECT_OPTIONS = [
  'RIDE_REVENUE',
  'PREPAID_DRIVER_CREDITS',
  'MANAGER_PAYMENTS',
  'COMMERCIAL_PAYMENTS',
  'OTHER',
];

export const RECOGNITION_POLICY_OPTIONS = [
  'UNCLASSIFIED',
  'GROSS_PRINCIPAL',
  'NET_AGENT',
];

export const RECOGNITION_SCOPE_OPTIONS = [
  'GLOBAL',
  'TERRITORY',
  'CITY',
  'COST_CENTER',
];

export const RECOGNITION_STATUS_OPTIONS = [
  'DRAFT',
  'APPROVED',
  'REVOKED',
  'SUPERSEDED',
];

/**
 * Formats an effective_from / effective_until ISO string to pt-BR date (DD/MM/YYYY)
 * without timezone conversion — reads only the date portion of the UTC string.
 * @param {string|null} isoStr
 * @returns {string|null}
 */
export function formatPolicyDate(isoStr) {
  if (!isoStr) return null;
  const datePart = isoStr.substring(0, 10); // 'YYYY-MM-DD'
  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) return null;
  return `${day}/${month}/${year}`;
}

/**
 * Formats a timestamp (updated_at / created_at / approved_at) using the browser
 * locale to show date and time, matching the pattern already used in FinanceiroPage.
 * @param {string|null} isoStr
 * @returns {string}
 */
export function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  const ts = Date.parse(isoStr);
  if (Number.isNaN(ts)) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(ts);
}

/**
 * Builds a human-readable scope display string for a policy, including territory
 * name, city/state, or cost center name when present.
 * @param {object} policy
 * @returns {string}
 */
export function buildScopeDisplay(policy) {
  const base = RECOGNITION_SCOPE_LABELS[policy.scope_type] || policy.scope_type;
  if (policy.scope_type === 'TERRITORY') {
    return policy.territory?.name ? `${base}: ${policy.territory.name}` : base;
  }
  if (policy.scope_type === 'CITY') {
    const parts = [policy.city, policy.state].filter(Boolean).join('/');
    return parts ? `${base}: ${parts}` : base;
  }
  if (policy.scope_type === 'COST_CENTER') {
    return policy.cost_center?.name ? `${base}: ${policy.cost_center.name}` : base;
  }
  return base;
}

/**
 * Returns the contextual notice text for a policy's combined status + policy type.
 * @param {object} policy
 * @returns {string}
 */
export function getPolicyContextNotice(policy) {
  if (policy.policy === 'UNCLASSIFIED') {
    return 'Esta política ainda não possui classificação contábil.';
  }
  if (policy.status === 'DRAFT') {
    return 'Esta política é um rascunho e ainda não produz efeitos.';
  }
  if (policy.status === 'APPROVED') {
    return 'Esta política está aprovada para o período informado.';
  }
  if (policy.status === 'REVOKED') {
    return 'Esta política foi revogada e permanece disponível apenas para histórico.';
  }
  if (policy.status === 'SUPERSEDED') {
    return 'Esta política foi substituída por uma versão posterior.';
  }
  return '';
}
