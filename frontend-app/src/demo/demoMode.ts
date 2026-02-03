// Demo Mode - Lógica de ativação e controle

export const isDemoMode = (): boolean => {
  // Verifica query parameter ?demo=1
  const urlParams = new URLSearchParams(window.location.search);
  const demoParam = urlParams.get('demo');
  
  // Verifica variável de ambiente
  const envDemo = import.meta.env.VITE_DEMO_MODE === 'true';
  
  // Verifica se usuário é investidor (role INVESTOR_VIEW)
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isInvestor = user.role === 'INVESTOR_VIEW';
  
  return demoParam === '1' || envDemo || isInvestor;
};

export const isInvestorView = (): boolean => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.role === 'INVESTOR_VIEW';
};

export const canPerformAction = (action: string): boolean => {
  if (!isDemoMode() && !isInvestorView()) {
    return true; // Modo normal, pode tudo
  }
  
  // Lista de ações bloqueadas em demo/investor mode
  const blockedActions = [
    'approve',
    'reject',
    'delete',
    'edit',
    'create',
    'update',
    'payment',
    'notification',
    'activate',
    'deactivate',
  ];
  
  return !blockedActions.includes(action.toLowerCase());
};

export const getBlockedActionMessage = (action: string): string => {
  if (isInvestorView()) {
    return `Ação "${action}" não disponível para visualização de investidor`;
  }
  return `Ação "${action}" desabilitada em modo demonstração`;
};

// Ativar demo mode programaticamente
export const activateDemoMode = () => {
  const url = new URL(window.location.href);
  url.searchParams.set('demo', '1');
  window.history.pushState({}, '', url);
};

// Desativar demo mode
export const deactivateDemoMode = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete('demo');
  window.history.pushState({}, '', url);
};

export default {
  isDemoMode,
  isInvestorView,
  canPerformAction,
  getBlockedActionMessage,
  activateDemoMode,
  deactivateDemoMode,
};
