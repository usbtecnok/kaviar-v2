/**
 * Formata data de forma segura — nunca retorna "Invalid Date".
 * @param {string|Date|null|undefined} value
 * @param {{ showTime?: boolean }} options
 * @returns {string} Data formatada em pt-BR ou "—"
 */
export function formatDate(value, { showTime = false } = {}) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  if (showTime) {
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('pt-BR');
}
