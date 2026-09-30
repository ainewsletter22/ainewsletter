import apiClient from './apiClient';
import type { Broadcast, BroadcastSendPayload, BroadcastSendResult } from '../types/Types';

/**
 * ─── Broadcast Service ───────────────────────────────────────────────────────────
 * Wraps Broadcast API endpoints for transactional pool sending
 * 
 * Broadcast Mode Limitations:
 * - Max 250,000 clients per category
 * - Max 3 categories per send
 * - Uses Resend transactional pool
 * 
 * Endpoints:
 *   POST   /broadcast/send
 *   GET    /broadcast/get-one/:id
 *   GET    /broadcast/get-all-brand-broadcast/:brandId
 */

export const broadcastService = {
  /**
   * Send a broadcast to multiple client categories
   * POST /broadcast/send
   */
  async sendBroadcast(payload: BroadcastSendPayload): Promise<BroadcastSendResult[]> {
    const response = await apiClient.post('/broadcast/send', payload);
    return response.data.data;
  },

  /**
   * Get a single broadcast by ID with full details
   * GET /broadcast/get-one/:id
   */
  async getBroadcast(id: number): Promise<Broadcast> {
    const response = await apiClient.get(`/broadcast/get-one/${id}`);
    return response.data.data;
  },

  /**
   * Get all broadcasts for a brand
   * GET /broadcast/get-all-brand-broadcast/:brandId
   */
  async getBrandBroadcasts(brandId: number): Promise<Broadcast[]> {
    const response = await apiClient.get(`/broadcast/get-all-brand-broadcast/${brandId}`);
    return response.data.data;
  },

  /**
   * Delete Resend data for client categories (keeps local categories)
   * DELETE /client-categories/bulk-delete-on-resend
   */
  async deleteClientCategoriesFromResend(clientCatIds: number[]): Promise<any[]> {
    const response = await apiClient.delete('/client-categories/bulk-delete-on-resend', {
      data: { client_cat_ids: clientCatIds }
    });
    return response.data.data;
  },

  /**
   * Delete a broadcast
   * DELETE /broadcast/delete/:id
   */
  async deleteBroadcast(id: number): Promise<void> {
    await apiClient.delete(`/broadcast/delete/${id}`);
  },
};
