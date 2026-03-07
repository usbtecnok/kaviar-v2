import { authStore } from '../auth/auth.store';
import { User, UserType } from '../types/user';

// Hook de autenticação (placeholder)
export const useAuth = () => {
  const isAuthenticated = authStore.isAuthenticated();
  const user = authStore.getUser();
  const userType = authStore.getUserType();

  const login = async (email: string, password: string, type: UserType) => {
    // TODO: Implementar lógica de login
    throw new Error('Not implemented');
  };

  const logout = () => {
    authStore.clearAuth();
  };

  return {
    isAuthenticated,
    user,
    userType,
    login,
    logout,
  };
};
