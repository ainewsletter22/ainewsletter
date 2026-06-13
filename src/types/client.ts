import { type Folder } from '../types/Types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.yourdomain.com';

/**
 * Internal helper for standardized fetch calls. 
 * Handles headers, error parsing, and response shaping.
 */
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<{ data: T }> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(errorData.message || `HTTP Error: ${response.status}`);
  }

  const data = await response.json();
  return { data };
}

export const ClientService = {
  getFolders: () => apiRequest<Folder[]>('/folders'),
  
  createFolder: (name: string) => apiRequest<Folder>('/folders', { 
    method: 'POST', 
    body: JSON.stringify({ name }) 
  }),
};