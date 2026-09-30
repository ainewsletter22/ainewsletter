import apiClient from './apiClient';
import type { Campaign } from '../types/Types';

/**
 * ─── Campaign Service ───────────────────────────────────────────────────────────
 * Wraps Campaign API endpoints for normal campaign sending
 * 
 * Campaign Mode Benefits:
 * - Up to 2.5M clients per send
 * - No category limits
 * - Uses Resend campaign pool
 * 
 * Endpoints:
 *   GET    /campaign/get-one/:id
 *   GET    /campaign/get-all/brand/:brandId
 */

export const campaignService = {
  /**
   * Get a single campaign by ID with full details
   * GET /campaign/get-one/:id
   */
  async getCampaign(id: number): Promise<Campaign> {
    const response = await apiClient.get(`/campaign/get-one/${id}`);
    return response.data.data;
  },

  /**
   * Get all campaigns for a brand
   * GET /campaign/get-all/brand/:brandId
   */
  async getBrandCampaigns(brandId: number): Promise<Campaign[]> {
    const response = await apiClient.get(`/campaign/get-all/brand/${brandId}`);
    return response.data.data;
  },

  /**
   * Delete a campaign
   * DELETE /campaign/delete/:id
   */
  async deleteCampaign(id: number): Promise<void> {
    await apiClient.delete(`/campaign/delete/${id}`);
  },

  /**
   * Get all recipients for a campaign with activity timestamps
   * GET /send-campaign/recipients/:campaignId
   */
  async getCampaignRecipients(campaignId: number): Promise<any[]> {
    const response = await apiClient.get(`/send-campaign/recipients/${campaignId}`);
    return response.data.data;
  },

  /**
   * Get a single campaign recipient by ID
   * GET /send-campaign/recipients/get-one/:id
   */
  async getRecipient(id: number): Promise<any> {
    const response = await apiClient.get(`/send-campaign/recipients/get-one/${id}`);
    return response.data.data;
  },
};
