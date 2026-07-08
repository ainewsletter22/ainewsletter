import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://ai-newsletter-be.onrender.com/api/v1.0';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    Accept: 'application/json',
  },
  withCredentials: true, // allow refresh cookie to be sent if backend uses it
});

// Request interceptor: read the access token from the in-memory store
apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = token.startsWith('JWT ') ? token : `JWT ${token}`;
      }
    } catch (e) {
      // ignore
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: on 401 try to refresh once then retry the original request
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(p => {
    if (error) p.reject(error);
    else p.resolve(token);
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  resp => resp,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = token as string;
            return apiClient(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh endpoint directly using axios to avoid interceptor loop
        const refreshResp = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        const newToken = refreshResp.data?.data?.token ?? null;
        const newUser = refreshResp.data?.data?.user ?? null;
        useAuthStore.getState().setAuth(newToken, newUser);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = newToken ? (newToken.startsWith('JWT ') ? newToken : `JWT ${newToken}`) : undefined;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().clearAuth();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;