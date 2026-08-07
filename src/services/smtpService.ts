import apiClient from './apiClient';
import type { SMTPSettings } from '../types/Types';

/**
 * ─── SMTP Service ────────────────────────────────────────────────────────────
 * Wraps Phase 2 SMTP Setting API endpoints
 * 
 * Pattern: Call apiClient → extract response.data.data → return
 * ⚠️ Known Issue: SMTP create documentation is unclear
 *    - Docs say: host, port, encryption, username, password, from_email, from_name
 *    - Sample payload may reference: smtp_prov_id, sec_prot_id (lookup IDs)
 *    Awaiting backend confirmation on which fields are actually required
 * 
 * Endpoints:
 *   POST   /smtp-setting/create
 *   GET    /smtp-setting/get-one/:id
 *   PATCH  /smtp-setting/update-one/:id
 *   DELETE /smtp-setting/delete-one/:id
 */

// ─── Type Helpers ──────────────────────────────────────────────────────────

export interface CreateSMTPPayload {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  encryption?: 'ssl' | 'tls' | 'none';
  from_email?: string;
  from_name?: string;
  // Optional lookup IDs if backend needs them instead of free text
  brand_id?: number;
  smtp_prov_id?: number;
  sec_prot_id?: number;
}

export interface UpdateSMTPPayload {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  encryption?: 'ssl' | 'tls' | 'none';
  from_email?: string;
  from_name?: string;
}

// ─── SMTP Service ───────────────────────────────────────────────────────

export const smtpService = {
  /**
   * GET /smtp-setting/get-one/:id
   * Fetch single SMTP configuration by ID
   */
  async getSMTPSettings(id: number): Promise<SMTPSettings | undefined> {
    try {
      const response = await apiClient.get(`/smtp-setting/get-one/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Failed to fetch SMTP settings ${id}:`, error);
      return undefined;
    }
  },

  /**
   * POST /smtp-setting/create (application/json)
   * Create new SMTP configuration
   * 
   * ⚠️ Two possible schemas (backend needs to clarify):
   * 
   * Option A (Free text):
   *   Required: host, port, username, password, encryption, from_email
   *   Optional: from_name
   * 
   * Option B (With lookups):
   *   Required: brand_id, smtp_prov_id, sec_prot_id
   *   Optional: from_email, from_name (or backend derives from provider)
   * 
   * Current implementation: supports both by sending all fields provided
   */
  async createSMTPSettings(payload: CreateSMTPPayload): Promise<SMTPSettings> {
    // Send only fields that are provided (undefined fields will be omitted by apiClient or backend)
    const body: Record<string, any> = {};
    
    // Free text fields
    if (payload.host !== undefined) body.host = payload.host;
    if (payload.port !== undefined) body.port = payload.port;
    if (payload.username !== undefined) body.username = payload.username;
    if (payload.password !== undefined) body.password = payload.password;
    if (payload.encryption !== undefined) body.encryption = payload.encryption;
    if (payload.from_email !== undefined) body.from_email = payload.from_email;
    if (payload.from_name !== undefined) body.from_name = payload.from_name;
    
    // Lookup ID fields (if backend uses them)
    if (payload.brand_id !== undefined) body.brand_id = payload.brand_id;
    if (payload.smtp_prov_id !== undefined) body.smtp_prov_id = payload.smtp_prov_id;
    if (payload.sec_prot_id !== undefined) body.sec_prot_id = payload.sec_prot_id;

    const response = await apiClient.post('/smtp-setting/create', body);
    return response.data.data;
  },

  /**
   * PATCH /smtp-setting/update-one/:id
   * Update SMTP configuration
   */
  async updateSMTPSettings(id: number, payload: UpdateSMTPPayload): Promise<SMTPSettings> {
    const body: Record<string, any> = {};
    
    if (payload.host !== undefined) body.host = payload.host;
    if (payload.port !== undefined) body.port = payload.port;
    if (payload.username !== undefined) body.username = payload.username;
    if (payload.password !== undefined) body.password = payload.password;
    if (payload.encryption !== undefined) body.encryption = payload.encryption;
    if (payload.from_email !== undefined) body.from_email = payload.from_email;
    if (payload.from_name !== undefined) body.from_name = payload.from_name;

    const response = await apiClient.patch(`/smtp-setting/update-one/${id}`, body);
    return response.data.data;
  },

  /**
   * DELETE /smtp-setting/delete-one/:id
   * Delete SMTP configuration by ID
   */
  async deleteSMTPSettings(id: number): Promise<void> {
    await apiClient.delete(`/smtp-setting/delete-one/${id}`);
  },

  /**
   * Helper: Test SMTP connection
   * Send a test email or ping the SMTP server (if backend provides this endpoint)
   * ⚠️ This endpoint may not exist yet; awaiting backend confirmation
   */
  async testSMTPConnection(payload: CreateSMTPPayload): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post('/smtp-setting/test', payload);
      return response.data.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'SMTP connection failed',
      };
    }
  },
};
