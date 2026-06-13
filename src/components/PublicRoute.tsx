import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const PublicRoute = () => {
  const token = useAuthStore((state) => state.token);

  // If token exists, redirect to dashboard instead of showing auth pages
  return token ? <Navigate to="/dashboard" replace /> : <Outlet />;
};

export default PublicRoute;