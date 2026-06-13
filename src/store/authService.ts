import apiClient from './apiClient';
import { useAuthStore } from './useAuthStore';

export const authService = {
  async login(credentials: any) {
    const response = await apiClient.post('/auth/login', credentials);
    const { token, user } = response.data.data;
    
    // Update the Zustand store directly
    useAuthStore.getState().setAuth(token, user);
    return response.data;
  },

  async register(userData: any) {
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

  async resetPassword(payload: any) {
    return await apiClient.post('/auth/reset-password', payload);
  },

  async resendForgotPassword(email: string) {
    return await apiClient.post('/auth/resend-forgot-password', { email });
  },
};