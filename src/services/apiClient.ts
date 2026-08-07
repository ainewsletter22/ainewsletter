import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { clearAuthStorage } from './authService';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://ai-newsletter-be.onrender.com/api/v1.0';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    Accept: 'application/json',
  },
  withCredentials: true, // allow refresh cookie to be sent if backend uses it
});

function normalizeToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const normalized = token.trim();
  if (normalized.startsWith('JWT ') || normalized.startsWith('Bearer ')) {
    return normalized;
  }
  return `JWT ${normalized}`;
}

// Request interceptor: read the access token from the in-memory store
apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = useAuthStore.getState().token;
      const authHeader = normalizeToken(token);
      if (authHeader) {
        config.headers = config.headers || {};
        config.headers.Authorization = authHeader;
      }
    } catch (e) {
      // ignore
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  resp => resp,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      clearAuthStorage();
      window.location.replace('/signIn');
    }
    return Promise.reject(error);
  }
);

export async function uploadAsset(file: File, _folder = 'uploads', brandId?: number, onProgress?: (percent: number) => void) {
  const formData = new FormData();
  formData.append('files', file);
  formData.append('brand_id', String(brandId ?? 0));

  const { data } = await apiClient.post('/campaign-attachments-and-image/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (!progressEvent.total) {
        onProgress?.(0);
        return;
      }

      const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
      onProgress?.(percent);
    },
  });

  onProgress?.(100);

  const payload = data?.data ?? data;
  const firstAttachment = Array.isArray(payload?.attachments) ? payload.attachments[0] : null;
  const firstImage = Array.isArray(payload?.images) ? payload.images[0] : null;
  const url = firstAttachment?.image_url || firstImage?.image_url || payload?.image_url || payload?.url || payload?.secure_url;
  const responseName = firstAttachment?.name || firstAttachment?.filename || firstImage?.name || firstImage?.filename || payload?.name || payload?.filename || file.name;
  const hasLikelyExtension = typeof responseName === 'string' && /\.[a-zA-Z0-9]+$/.test(responseName);
  const filename = typeof responseName === 'string' && responseName.trim() && hasLikelyExtension ? responseName : file.name;
  const mimeType = firstAttachment?.mime_type || firstAttachment?.content_type || firstImage?.mime_type || firstImage?.content_type || file.type;
  const assetId = firstAttachment?.id || firstImage?.id || payload?.id || payload?.asset_id || payload?.attachment_id || payload?.assetId || payload?.attachmentId;

  if (!url) {
    throw new Error('Upload response did not include a URL');
  }

  return { url, filename, mimeType, assetId };
}

export async function deleteUploadedAsset(assetId: string | number | undefined, brandId?: number, kind: 'image' | 'attachment' = 'attachment') {
  if (!assetId) {
    return false;
  }

  const normalizedId = encodeURIComponent(String(assetId));
  const endpoint = kind === 'image'
    ? `/campaign-attachments-and-image/image/${normalizedId}`
    : `/campaign-attachments-and-image/attachment/${normalizedId}`;

  try {
    await apiClient.delete(endpoint, {
      params: brandId ? { brand_id: brandId } : undefined,
    });
    return true;
  } catch (error) {
    throw error instanceof Error ? error : new Error('Unable to delete uploaded attachment');
  }
}

export default apiClient;