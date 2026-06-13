import apiClient from './apiClient';
import type { ClientData } from '../components/Clientcard';

export const clientService = {
  async searchClients(niche: string, country: string, state: string) {
    const response = await apiClient.get<ClientData[]>('/clients/search', {
      params: { niche, country, state }
    });
    return response.data;
  },

  async addClientsToManage(ids: string[]) {
    return await apiClient.post('/clients/manage', { ids });
  }
};