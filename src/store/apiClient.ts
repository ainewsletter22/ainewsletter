import axios from 'axios';

const apiClient = axios.create({
  // Use environment variables for your base URL
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://ai-newsletter-be.onrender.com/api/v1.0',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach the JWT token if it exists
apiClient.interceptors.request.use(
  (config) => {
    // Pull the token from the Zustand persisted storage
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        const token = parsed.state?.token;
        if (token) {
          // Backend returns token already prefixed with "JWT "
          config.headers.Authorization = token.startsWith('JWT ') ? token : `JWT ${token}`;
        }
      } catch (e) {
        console.error("Failed to parse auth token", e);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;