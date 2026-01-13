import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { CircularProgress, Box } from '@mui/material';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Verificar token real do localStorage
  const token = localStorage.getItem('token');

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Exigir token JWT real - sem token = sem acesso
  if (!token || token.trim() === '') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user || !user.user_type) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.user_type)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
