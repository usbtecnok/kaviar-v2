/** Extrai mensagem amigável de qualquer erro (axios, rede, genérico). */
export function friendlyError(error: any, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.message === 'Network Error') return 'Sem conexão com o servidor. Verifique sua internet.';
  if (error?.code === 'ECONNABORTED') return 'A requisição demorou demais. Tente novamente.';
  return fallback;
}
