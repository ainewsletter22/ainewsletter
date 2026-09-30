import apiClient from './apiClient';
import type { Brand, BrandFormValues, SendVia } from '../types/Types';

const MANUAL_RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || "re_WtKgQuR4_3AzKiToo7eeypUGWmh7otvpx";

export interface BrandSettingsPayload {
  brand_name?: string;
  send_via?: string;
  sending_limit?: string;
  from_name?: string;
  from_email?: string;
  reply_to_email?: string;
  track_opens?: boolean;
  track_clicks?: boolean;
  set_campaign_notif?: boolean;
  limits_id?: number;
  number_email_per_month?: number;
  reset_day_id?: number;
  newsletter_badge?: boolean;
  ai_agent_id?: number;
  business_type?: string;
  ai_goal?: string;
  tone_id?: number;
  product_link_id?: number;
  post_every_id?: number;
  duration_id?: number;
  stop_post_id?: number;
  regen_headline?: boolean;
  regen_email_body?: boolean;
  start_date?: string;
  stop_date?: string;
  test_email?: string;
  schedule_date?: string;
  schedule_time?: string;
  unsuscribe_information?: string;
  footer_address?: string;
}

/**
 * ─── Brand Service ───────────────────────────────────────────────────────────
 * Wraps Phase 2 Brand API endpoints
 * 
 * Pattern: Call apiClient → extract response.data.data → return
 * ⚠️ Known Issues (await backend confirmation):
 * - "unsuscribe_information" is a typo in docs, but sending as-is
 * - Brand update endpoint uses snake_case field names
 * 
 * Endpoints:
 *   POST   /brand/create (multipart/form-data for logo)
 *   GET    /brand/all
 *   GET    /brand/get-one/:id
 *   PATCH  /brand/update-one/:id
 *   DELETE /brand/delete-one/:id
 */

// ─── Type Helpers ──────────────────────────────────────────────────────────

/** Maps BrandFormValues (camelCase) → Brand API create payload (snake_case) */
function mapBrandCreatePayload(values: BrandFormValues) {
  return {
    brand_name: values.name,
    from_name: values.fromName,
    from_email: values.fromEmail,
    reply_to_email: values.replyToEmail ?? undefined,
    resend_api_key: values.resendApiKey ?? MANUAL_RESEND_API_KEY,
    // logo: values.logo, // handled separately as multipart
  };
}

/** Maps BrandFormValues (camelCase) → Brand API update payload (snake_case) */
function mapBrandUpdatePayload(values: Partial<BrandFormValues>) {
  const payload: Record<string, any> = {};
  if (values.name !== undefined) payload.brand_name = values.name;
  if (values.fromName !== undefined) payload.from_name = values.fromName;
  if (values.fromEmail !== undefined) payload.from_email = values.fromEmail;
  if (values.replyToEmail !== undefined) payload.reply_to_email = values.replyToEmail;
  if (values.resendApiKey !== undefined) payload.resend_api_key = values.resendApiKey;
  return payload;
}

// ─── Brand Service ────────────────────────────────────────────────────────

export const brandService = {
  /**
   * GET /brand/all
   * Fetch all brands
   */
  async listBrands(): Promise<Brand[]> {
    const response = await apiClient.get('/brand/all');
    return response.data.data || [];
  },

  /**
   * GET /brand/get-one/:id
   * Fetch single brand by ID
   */
  async getBrand(id: number): Promise<Brand | undefined> {
    try {
      const response = await apiClient.get(`/brand/get-one/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Failed to fetch brand ${id}:`, error);
      return undefined;
    }
  },

  /**
   * POST /brand/create (multipart/form-data)
   * Create new brand with optional logo file
   * 
   * ⚠️ Logo handling: If logo is a File object, send as multipart/form-data
   *    Otherwise, send as JSON and backend should ignore logo field
   */
  async createBrand(values: BrandFormValues): Promise<Brand> {
    let response;

    // Log which API key is being used
    const apiKeyToUse = values.resendApiKey ?? MANUAL_RESEND_API_KEY;
    console.log('[BrandService] Creating brand with resend_api_key:', apiKeyToUse);
    console.log('[BrandService] Source:', values.resendApiKey ? 'User provided' : 'Fallback to MANUAL_RESEND_API_KEY');

    // Check if logo is a File object (has type and size properties typical of File)
    const isFileObject = values.logo && typeof values.logo === 'object' && 'size' in (values.logo as any);

    if (isFileObject) {
      // Use FormData for multipart upload
      const formData = new FormData();
      formData.append('brand_name', values.name);
      formData.append('from_name', values.fromName);
      formData.append('from_email', values.fromEmail);
      if (values.replyToEmail) formData.append('reply_to_email', values.replyToEmail);
      formData.append('resend_api_key', apiKeyToUse);
      formData.append('logo', values.logo as any);

      // Let the browser / axios set the Content-Type (including the multipart boundary).
      // Manually setting 'Content-Type' can omit the boundary and break file uploads.
      response = await apiClient.post('/brand/create', formData);
    } else {
      // Send as JSON
      const payload = mapBrandCreatePayload(values);
      console.log('[BrandService] Brand create payload:', payload);
      response = await apiClient.post('/brand/create', payload);
    }

    return response.data.data;
  },

  /**
   * PATCH /brand/update-one/:id
   * Update brand fields (send only changed fields)
   */
  async updateBrandIdentity(id: number, values: Partial<BrandFormValues>): Promise<Brand> {
    const payload = mapBrandUpdatePayload(values);
    const response = await apiClient.patch(`/brand/update-one/${id}`, payload);
    return response.data.data;
  },

  /**
   * DELETE /brand/delete-one/:id
   * Delete brand by ID
   */
  async deleteBrand(id: number): Promise<void> {
    await apiClient.delete(`/brand/delete-one/${id}`);
  },

  // ─── Brand Settings (nested under brand update) ───────────────────────

  /**
   * PATCH /brand/update-one/:id
   * Update SMTP provider selection and other settings
   */
  async updateBrandSettings(id: number, settings: BrandSettingsPayload): Promise<Brand> {
    const response = await apiClient.patch(`/brand/update-one/${id}`, settings);
    return response.data.data;
  },

  /**
   * PATCH /brand/update-one/:id
   * Update privacy/tracking settings
   * Payload: { track_opens: boolean, track_clicks: boolean, set_campaign_notif: boolean }
   */
  async updatePrivacySettings(
    id: number,
    settings: {
      track_opens?: boolean;
      track_clicks?: boolean;
      set_campaign_notif?: boolean;
      notify_email?: string;
    }
  ): Promise<Brand> {
    const response = await apiClient.patch(`/brand/update-one/${id}`, settings);
    return response.data.data;
  },

  /**
   * PATCH /brand/update-one/:id
   * Update sending limit
   * Payload: { sending_limit: string, number_email_per_month?: number, reset_day_id?: number }
   */
  async updateSendingLimit(
    id: number,
    settings: {
      sending_limit?: string;
      number_email_per_month?: number;
      reset_day_id?: number;
      current_used_email_limits?: number;
    }
  ): Promise<Brand> {
    const response = await apiClient.patch(`/brand/update-one/${id}`, settings);
    return response.data.data;
  },

  /**
   * PATCH /brand/update-one/:id
   * Update footer settings
   * Payload: { unsuscribe_information: string, newsletter_badge: boolean }
   * 
   * ⚠️ Note: API uses "unsuscribe_information" (typo) not "unsubscribe_information"
   */
  async updateFooterSettings(
    id: number,
    settings: {
      unsuscribe_information?: string;
      newsletter_badge?: boolean;
    }
  ): Promise<Brand> {
    const response = await apiClient.patch(`/brand/update-one/${id}`, settings);
    return response.data.data;
  },

  /**
   * PATCH /brand/update-one/:id
   * Update send mode (broadcast vs campaign)
   * Payload: { send_via: "broadcast" | "campaign" }
   */
  async updateSendVia(id: number, sendVia: SendVia): Promise<Brand> {
    const response = await apiClient.patch(`/brand/update-one/${id}`, { send_via: sendVia });
    return response.data.data;
  },
};
