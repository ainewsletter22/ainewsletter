import apiClient from './apiClient';
import { useAuthStore } from '../store/useAuthStore';
import type { LoginCredentials, RegisterForm, ResetPasswordPayload } from '../types/domain';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://ai-newsletter-be.onrender.com/api/v1.0';

export const authService = {
  async login(credentials: LoginCredentials) {
    const response = await apiClient.post('/auth/login', credentials);
    const { token, user } = response.data.data;
    
    // Update the Zustand store directly
    useAuthStore.getState().setAuth(token, user);
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
      useAuthStore.getState().clearAuth();
      throw e;
    }
  },
};
