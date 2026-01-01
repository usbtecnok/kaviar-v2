import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * COMPONENTE DE ROTA PROTEGIDA
 * 
 * Verifica autenticação e tipo de usuário.
 * Redireciona para login se não autenticado.
 */
function ProtectedRoute({ userType }) {
  // Simular verificação de autenticação
  // Em produção, viria de contexto de auth ou localStorage
  const isAuthenticated = localStorage.getItem('kaviar_token');
  const currentUserType = localStorage.getItem('kaviar_user_type');

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (userType && currentUserType !== userType) {
    // Redirecionar para a rota correta baseada no tipo do usuário
    switch (currentUserType) {
      case 'passenger':
        return <Navigate to="/passenger" replace />;
      case 'driver':
        return <Navigate to="/driver" replace />;
      case 'admin':
        return <Navigate to="/admin" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
}

export default ProtectedRoute;
