import apiClient from './apiClient';

// ─── Draft Types ──────────────────────────────────────────────────────────────

export interface DraftAttachment {
  id: number;
  user_id: number;
  brand_id: number;
  campaign_id: number | null;
  image_url: string;
  storage_key: string;
  status: number;
  createdAt: string;
  updatedAt: string;
  draft_id: number;
}

export interface Draft {
  id: number;
  user_id: number;
  brand_id: number;
  domain_id: number | null;
  template_id: number | null;
  from_name: string | null;
  head: string | null;
  preview: string | null;
  template_layout: string | null; // JSON string of TemplateLayoutBlock[]
  sections_content: string | null; // JSON string of section_id → HTML mapping
  removed_sections: string | null; // JSON string of removed section IDs
  custom_images: string | null; // JSON string of custom images array
  attachments: string | null; // JSON string of attachments array
  html: string;
  footer: string | null;
  address: string | null;
  ai_agent_id: number | null;
  post_every_id: number | null;
  product_link_id: number | null;
  headline_id: number | null;
  ai_goal: string | null;
  business_type: string | null;
  stop_post_id: number | null;
  duration_id: number | null;
  tone_id: number | null;
  start_date: string | null;
  stop_date: string | null;
  test_email: string | null;
  status: number;
  createdAt: string;
  updatedAt: string;
  Images: any[];
  Attachments: DraftAttachment[];
  AiGeneratedImages: any[];
  AiGeneratedAttachments: any[];
  AiGeneratedCampaignResults: any[];
}

export interface CreateDraftPayload {
  brand_id: number;
  domain_id?: number;
  template_id?: number;
  from_name?: string;
  head?: string;
  preview?: string;
  template_layout?: string;
  sections_content?: string;
  removed_sections?: string;
  custom_images?: string;
  attachments?: string;
  html: string;
  footer?: string;
  address?: string;
  ai_agent_id?: number;
  ai_goal?: string;
  business_type?: string;
  tone_id?: number;
  post_every_id?: number;
  product_link_id?: number;
  headline_id?: number;
  stop_post_id?: number;
  duration_id?: number;
  start_date?: string;
  stop_date?: string;
  test_email?: string;
}

export interface UpdateDraftPayload {
  template_id?: number;
  from_name?: string;
  head?: string;
  preview?: string;
  template_layout?: string;
  sections_content?: string;
  removed_sections?: string;
  custom_images?: string;
  attachments?: string;
  html?: string;
  footer?: string;
  address?: string;
  ai_agent_id?: number;
  ai_goal?: string;
  business_type?: string;
  tone_id?: number;
  post_every_id?: number;
  product_link_id?: number;
  headline_id?: number;
  stop_post_id?: number;
  duration_id?: number;
  start_date?: string;
  stop_date?: string;
  test_email?: string;
  domain_id?: number;
}

// ─── Draft Service ──────────────────────────────────────────────────────────────

export const draftService = {
  /**
   * POST /draft/create
   * Create a new draft for a brand
   */
  async createDraft(payload: CreateDraftPayload): Promise<Draft> {
    try {
      const response = await apiClient.post('/draft/create', payload);
      return response.data.data;
    } catch (error: any) {
      console.error('[DraftService] Draft creation failed:', error.response?.data || error);
      throw error;
    }
  },

  /**
   * PATCH /draft/update/:id
   * Update an existing draft
   */
  async updateDraft(id: number, payload: UpdateDraftPayload): Promise<Draft> {
    const response = await apiClient.patch(`/draft/update/${id}`, payload);
    console.log('[DraftService] Draft updated successfully:', response.data.data);
    return response.data.data;
  },

  /**
   * DELETE /draft/delete/:id
   * Delete a draft by ID
   */
  async deleteDraft(id: number): Promise<void> {
    await apiClient.delete(`/draft/delete/${id}`);
  },

  /**
   * GET /draft/get-one/:id
   * Get a single draft by ID
   */
  async getDraft(id: number): Promise<Draft | undefined> {
    try {
      const response = await apiClient.get(`/draft/get-one/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Failed to fetch draft ${id}:`, error);
      return undefined;
    }
  },

  /**
   * GET /draft/get-all/brand/:brandId
   * Get all drafts for a specific brand
   */
  async getDraftsByBrand(brandId: number): Promise<Draft[]> {
    const response = await apiClient.get(`/draft/get-all/brand/${brandId}`);
    return response.data.data || [];
  },
};
