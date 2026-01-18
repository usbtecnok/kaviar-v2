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
    const token = localStorage.getItem('kaviar_token');
    const userData = localStorage.getItem('kaviar_user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
        return { success: true };
      } catch (error) {
        return { success: false, error: 'Erro ao processar dados de autenticação' };
      }
    }
    
    return { success: false, error: 'Credenciais não encontradas' };
  };

  const logout = () => {
    localStorage.removeItem('kaviar_token');
    localStorage.removeItem('kaviar_user');
    setUser(null);
  };

  const value = {
    user,
    setUser,
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
