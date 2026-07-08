import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const PublicRoute = () => {
  const token = useAuthStore((state) => state.token);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  // While auth rehydration is in progress, show a loading placeholder
  if (!isInitialized) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  // If token exists, redirect to dashboard instead of showing auth pages
  return token ? <Navigate to="/dashboard" replace /> : <Outlet />;
};

export default PublicRoute;