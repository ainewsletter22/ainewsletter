import apiClient from './apiClient';
import { useAuthStore } from '../store/useAuthStore';
import type { LoginCredentials, RegisterForm, ResetPasswordPayload } from '../types/domain';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://ai-newsletter-be.onrender.com/api/v1.0';
const AUTH_STORAGE_KEY = 'ingageiq_auth';

function saveAuthToStorage(token: string | null, user: any | null) {
  if (!token) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }));
  } catch (error) {
    console.warn('[authService] Failed to persist auth to localStorage', error);
  }
}

export function clearAuthStorage() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function loadPersistedAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { token: string; user: any };
  } catch {
    return null;
  }
}

export const authService = {
  async login(credentials: LoginCredentials) {
    const response = await apiClient.post('/auth/login', credentials);
    const { token, user } = response.data.data;
    
    useAuthStore.getState().setAuth(token, user);
    saveAuthToStorage(token, user);
    return response.data;
  },

  async register(userData: RegisterForm) {
    // Maps frontend camelCase to backend snake_case
    const payload = {
      email: userData.email,
      password: userData.password,
      first_name: userData.firstName,
      last_name: userData.lastName
    };
    return await apiClient.post('/auth/register', payload);
  },

  async confirmEmail(token: string) {
    return await apiClient.get(`/auth/confirm-email/${token}`);
  },

  async logout() {
    await apiClient.get('/auth/logout');
    useAuthStore.getState().clearAuth();
    clearAuthStorage();
  },

  async forgotPassword(email: string) {
    return await apiClient.post('/auth/forgot-password', { email });
  },

  async resetPassword(payload: ResetPasswordPayload) {
    return await apiClient.post('/auth/reset-password', payload);
  },

  async resendForgotPassword(email: string) {
    return await apiClient.post('/auth/resend-forgot-password', { email });
  },

  async refresh() {
    try {
      const resp = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
      const token = resp.data?.data?.token ?? null;
      const user = resp.data?.data?.user ?? null;
      if (token) {
        useAuthStore.getState().setAuth(token, user);
      }
      return resp.data;
    } catch (e) {
      throw e;
    }
  },
};
