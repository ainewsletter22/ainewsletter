import { create } from 'zustand';
import type { User } from '../types/domain';

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string | null, user: User | null) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  isInitialized: boolean;
  setInitialized: (v: boolean) => void;
}

// Keep auth state in-memory only. Refresh tokens should be handled via httpOnly cookies
// and a `/auth/refresh` endpoint called on app load. This avoids storing sensitive
// tokens in localStorage which is vulnerable to XSS.
export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isInitialized: false,
  setAuth: (token, user) => set({ token, user }),
  clearAuth: () => set({ token: null, user: null }),
  isAuthenticated: () => !!get().token,
  setInitialized: (v: boolean) => set({ isInitialized: v }),
}));
