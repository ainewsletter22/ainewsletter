import apiClient from './apiClient';

export interface SendLogPayload {
  brand_id?: number;
  subject?: string;
  preview?: string;
  body?: string;
  test_email?: string;
  delivery_type?: string;
  schedule_date?: string;
  schedule_time?: string;
  status?: string;
}

export interface DeliverySchedulePayload {
  brand_id: number;
  subject?: string;
  preview?: string;
  body?: string;
  test_email?: string;
  schedule_date: string;
  schedule_time: string;
}

export const composerWorkflowService = {
  async createSendLog(payload: SendLogPayload) {
    const response = await apiClient.post('/how-to-create-or-send-and-log/create-log', payload);
    return response.data?.data ?? response.data;
  },

  async getSendLogs() {
    const response = await apiClient.get('/how-to-create-or-send-and-log/get-all');
    return response.data?.data ?? response.data;
  },

  async createDeliverySchedule(payload: DeliverySchedulePayload) {
    const response = await apiClient.post('/delivery-schedule/create', payload);
    return response.data?.data ?? response.data;
  },

  async getDeliverySchedule(brandId: number) {
    const response = await apiClient.get(`/delivery-schedule/brand/${brandId}`);
    return response.data?.data ?? response.data;
  },
};
