import apiClient from './apiClient';

export interface HeadlinePayload {
  brand_id: number;
  name: string;
}

export interface DraftHeadlinePayload {
  draft_id: number;
  name: string;
}

export interface HeadlineItem {
  id?: number;
  user_id?: number;
  brand_id?: number;
  draft_id?: number;
  name: string;
  status?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const headlineService = {
  async createHeadline(brandId: number, name: string): Promise<HeadlineItem> {
    console.log('[headlineService] createHeadline', { brandId, name });
    try {
      const response = await apiClient.post('/headline/create', { brand_id: brandId, name });
      const data = response.data?.data ?? response.data;
      console.log('[headlineService] createHeadline response', data);
      return data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn('[headlineService] createHeadline 404, trying fallback /headline', { brandId, name });
        const fallback = await apiClient.post('/headline', { brand_id: brandId, name });
        const data = fallback.data?.data ?? fallback.data;
        console.log('[headlineService] createHeadline fallback response', data);
        return data;
      }
      throw error;
    }
  },

  async getHeadlinesByBrand(brandId: number): Promise<HeadlineItem[]> {
    console.log('[headlineService] getHeadlinesByBrand', brandId);
    try {
      const response = await apiClient.get(`/headline/brand/${brandId}`);
      const data = response.data?.data ?? [];
      console.log('[headlineService] getHeadlinesByBrand response', data);
      return data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn('[headlineService] getHeadlinesByBrand 404, trying fallback brand query', brandId);
        const fallbackResponse = await apiClient.get('/headline', { params: { brand_id: brandId } });
        const fallbackData = fallbackResponse.data?.data ?? [];
        console.log('[headlineService] getHeadlinesByBrand fallback response', fallbackData);
        return fallbackData;
      }
      throw error;
    }
  },

  async updateHeadline(headlineId: number, name: string): Promise<HeadlineItem> {
    console.log('[headlineService] updateHeadline', { headlineId, name });
    try {
      const response = await apiClient.patch(`/headline/update-one/${headlineId}`, { name });
      const data = response.data?.data ?? response.data;
      console.log('[headlineService] updateHeadline response', data);
      return data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn('[headlineService] updateHeadline 404, trying fallback /headline/${headlineId}', headlineId);
        const fallbackResponse = await apiClient.patch(`/headline/${headlineId}`, { name });
        const data = fallbackResponse.data?.data ?? fallbackResponse.data;
        console.log('[headlineService] updateHeadline fallback response', data);
        return data;
      }
      throw error;
    }
  },

  async deleteHeadline(headlineId: number): Promise<void> {
    console.log('[headlineService] deleteHeadline', headlineId);
    try {
      await apiClient.delete(`/headline/delete-one/${headlineId}`);
      console.log('[headlineService] deleteHeadline complete');
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn('[headlineService] deleteHeadline 404, trying fallback /headline/${headlineId}', headlineId);
        await apiClient.delete(`/headline/${headlineId}`);
        console.log('[headlineService] deleteHeadline fallback complete');
        return;
      }
      throw error;
    }
  },

  // Draft-based headline endpoints for AI flow
  async createDraftHeadline(draftId: number, name: string): Promise<HeadlineItem> {
    console.log('[headlineService] createDraftHeadline', { draftId, name });
    const response = await apiClient.post('/headline/draft/create', { draft_id: draftId, name });
    const data = response.data?.data ?? response.data;
    console.log('[headlineService] createDraftHeadline response', data);
    return data;
  },

  async getHeadlinesByDraft(draftId: number): Promise<HeadlineItem[]> {
    console.log('[headlineService] getHeadlinesByDraft', draftId);
    const response = await apiClient.get(`/headline/draft/${draftId}`);
    const data = response.data?.data ?? [];
    console.log('[headlineService] getHeadlinesByDraft response', data);
    return data;
  },

  async deleteDraftHeadline(headlineId: number): Promise<void> {
    console.log('[headlineService] deleteDraftHeadline', headlineId);
    await apiClient.delete(`/headline/draft/delete-one/${headlineId}`);
    console.log('[headlineService] deleteDraftHeadline complete');
  },
};
