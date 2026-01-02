import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verificar token ao carregar app
  useEffect(() => {
    const token = localStorage.getItem('kaviar_token');
    const userData = localStorage.getItem('kaviar_user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        localStorage.removeItem('kaviar_token');
        localStorage.removeItem('kaviar_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password, userType) => {
    try {
      // Usar endpoint de teste existente para validar conectividade
      const testResponse = await api.get('/health');
      
      if (testResponse.data.status === 'OK') {
        // Mock de login para demonstração - em produção usar endpoint real
        const mockUser = {
          id: `mock-${userType}-${Date.now()}`,
          email: email,
          user_type: userType,
          community_id: 'mock-community-id'
        };
        
        const mockToken = `mock-jwt-token-${userType}-${Date.now()}`;
        
        localStorage.setItem('kaviar_token', mockToken);
        localStorage.setItem('kaviar_user', JSON.stringify(mockUser));
        setUser(mockUser);
        
        return { success: true };
      }
      
      return { success: false, error: 'Servidor não disponível' };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Erro de conexão com servidor' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('kaviar_token');
    localStorage.removeItem('kaviar_user');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
