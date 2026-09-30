import apiClient from './apiClient';
import type { BroadcastSendPayload } from '../types/Types';

export interface DeliverySchedulePayload {
  brand_id: number;
  draft_id: number;
  domain_id: number;
  action: "send now" | "send later";
  date: string | null;
  time: string | null;
}

export interface SendCampaignPayload {
  draft_id: number;
  client_category_ids: number[];
}

export const composerWorkflowService = {
  async createDeliverySchedule(payload: DeliverySchedulePayload) {
    const response = await apiClient.post('/delivery-schedule/create', payload);
    return response.data?.data ?? response.data;
  },

  async sendCampaign(payload: SendCampaignPayload) {
    try {
      const response = await apiClient.post('/send-campaign/send', payload);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      console.error('[composerWorkflowService] sendCampaign error:', error.response?.data || error);
      throw error;
    }
  },

  /**
   * Send broadcast using transactional pool
   * POST /broadcast/send
   */
  async sendBroadcast(payload: BroadcastSendPayload) {
    try {
      const response = await apiClient.post('/broadcast/send', payload);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      console.error('[composerWorkflowService] sendBroadcast error:', error.response?.data || error);
      throw error;
    }
  },
};
