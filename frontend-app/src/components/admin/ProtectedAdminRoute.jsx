import { Navigate, useLocation } from 'react-router-dom';

export const ProtectedAdminRoute = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem('kaviar_admin_token');

  if (!token) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
};
