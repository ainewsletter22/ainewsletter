import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const ProtectedRoute = () => {
  const token = useAuthStore((state) => state.token);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  // While auth rehydration is in progress, show a loading placeholder
  if (!isInitialized) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  // If no token exists, redirect to sign-in
  return token ? <Outlet /> : <Navigate to="/signIn" replace />;
};

export default ProtectedRoute;