import axios from 'axios';
import apiClient from './apiClient';
import { useAuthStore } from '../store/useAuthStore';

export interface AiWriterGeneratePayload {
  brand_id?: number;
  ai_agent_id?: number;
  draft_id?: number;
  template_id?: number;
  prompt: string;
  ai_tone_id?: number;
  campaign_goal_id?: number;
  business_type_id?: number;
}

export interface SubjectRewritePayload {
  subject: string;
}

export interface PartialRewritePayload {
  dropdown_id?: number | null;
  user_text: string;
}

export const aiWriterService = {
  async generate(payload: AiWriterGeneratePayload) {
    const token = useAuthStore.getState().token;
    if (!token) {
      throw new Error('UNAUTHENTICATED: Please sign in before generating AI content.');
    }

    try {
      const response = await apiClient.post('/ai-writer/generate', payload);
      return response.data?.data ?? response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        const message = typeof error.response.data === 'string'
          ? error.response.data
          : JSON.stringify(error.response.data);
        throw new Error(`AI writer request failed: ${message}`);
      }
      throw error;
    }
  },

  async rewriteSubject(payload: SubjectRewritePayload) {
    const token = useAuthStore.getState().token;
    if (!token) {
      throw new Error('UNAUTHENTICATED: Please sign in before rewriting the subject.');
    }

    try {
      const response = await apiClient.post('/ai-writer/subject-rewrite', payload);
      return response.data?.data ?? response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        const message = typeof error.response.data === 'string'
          ? error.response.data
          : JSON.stringify(error.response.data);
        throw new Error(`Subject rewrite request failed: ${message}`);
      }
      throw error;
    }
  },

  async partlyRewrite(payload: PartialRewritePayload) {
    const token = useAuthStore.getState().token;
    if (!token) {
      throw new Error('UNAUTHENTICATED: Please sign in before rewriting the selected text.');
    }

    try {
      const response = await apiClient.post('/ai-writer/partly-rewrite', payload);
      return response.data?.data ?? response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        const message = typeof error.response.data === 'string'
          ? error.response.data
          : JSON.stringify(error.response.data);
        throw new Error(`Partial rewrite request failed: ${message}`);
      }
      throw error;
    }
  },

  async getGeneratedResult(id: number | string) {
    const token = useAuthStore.getState().token;
    if (!token) {
      throw new Error('UNAUTHENTICATED: Please sign in before loading AI generated content.');
    }

    try {
      const response = await apiClient.get(`/ai-generated-result/get-one/${id}`);
      return response.data?.data ?? response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        const message = typeof error.response.data === 'string'
          ? error.response.data
          : JSON.stringify(error.response.data);
        throw new Error(`AI generated result request failed: ${message}`);
      }
      throw error;
    }
  },
};

