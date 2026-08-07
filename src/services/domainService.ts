import apiClient from './apiClient';
import type { BrandDomain } from '../types/Types';

// Normalize backend domain payloads to our frontend BrandDomain shape
function mapDomainStatus(name: string | undefined | null) {
  const n = (name || '').toLowerCase();
  if (n.includes('verified')) return 'Verified' as const;
  if (n.includes('fail') || n.includes('failed')) return 'Failed' as const;
  // treat not_started / pending / unknown as Pending
  return 'Pending' as const;
}

function toDnsRecord(item: any) {
  if (!item) return null;
  return {
    type: item.type ?? 'TXT',
    name: item.name ?? '',
    content: item.content ?? '',
    ttl: item.ttl ?? 'Auto',
    priority: item.priority ?? undefined,
    verified: (item.status || '').toLowerCase() === 'verified',
  };
}

function normalizeDomain(raw: any): BrandDomain {
  if (!raw) throw new Error('Invalid domain payload');

  const dkimItem = Array.isArray(raw.Dkims) && raw.Dkims.length > 0 ? toDnsRecord(raw.Dkims[0]) : null;
  const spfItems = Array.isArray(raw.Spfs) ? raw.Spfs.map(toDnsRecord).filter(Boolean) as any[] : [];
  const dmarcItem = Array.isArray(raw.Dmarcs) && raw.Dmarcs.length > 0 ? toDnsRecord(raw.Dmarcs[0]) : null;
  const cnameItems = Array.isArray(raw.Cnames) ? raw.Cnames.map(toDnsRecord).filter(Boolean) as any[] : [];

  return {
    id: raw.id,
    name: raw.name ?? raw.domain ?? '',
    region: raw.Region?.name ?? (raw.region_id ? String(raw.region_id) : ''),
    status: mapDomainStatus(raw.DomainStatus?.name ?? raw.domain_status ?? raw.status),
    addedAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
    enableSending: Boolean(raw.enable_sending ?? true),
    enableReceiving: Boolean(raw.enable_receiving ?? false),
    dkim: dkimItem ?? { type: 'TXT', name: '', content: '', ttl: 'Auto' },
    spf: spfItems as any[],
    dmarc: dmarcItem ?? { type: 'TXT', name: '', content: '', ttl: 'Auto' },
    cnames: cnameItems as any[],
  } as BrandDomain;
}

/**
 * ─── Domain Service ──────────────────────────────────────────────────────────
 * Wraps Phase 2 Domain API endpoints
 * 
 * Pattern: Call apiClient → extract response.data.data → return
 * ⚠️ Known Issue: Field names differ between create and update
 *    - Create uses: enable_open_tracking, enable_click_tracking
 *    - Update uses: open_tracking, click_tracking (without "enable_")
 * 
 * Endpoints:
 *   POST   /domain/create
 *   GET    /domain/all
 *   GET    /domain/get-one/:id
 *   PATCH  /domain/update/:id
 *   DELETE /domain/delete/:id
 */

// ─── Type Helpers ──────────────────────────────────────────────────────────

export interface CreateDomainPayload {
  brand_id: number;
  name: string;
  region_id: number;
  custom_return_path?: string;
  tracking_subdomain?: string;
  enable_open_tracking?: boolean;
  enable_click_tracking?: boolean;
}

export interface UpdateDomainPayload {
  open_tracking?: boolean;
  click_tracking?: boolean;
  tracking_subdomain?: string;
  tls?: string;
}

// ─── Domain Service ──────────────────────────────────────────────────────

export const domainService = {
  /**
   * GET /domain/all
   * Fetch all domains (no filters)
   */
  async listDomains(): Promise<BrandDomain[]> {
    const response = await apiClient.get('/domain/all');
    const raw = response.data.data || [];
    return (raw as any[]).map(normalizeDomain);
  },

  /**
   * GET /domain/get-one/:id
   * Fetch single domain by ID
   */
  async getDomain(id: number): Promise<BrandDomain | undefined> {
    try {
      const response = await apiClient.get(`/domain/get-one/${id}`);
      return normalizeDomain(response.data.data);
    } catch (error) {
      console.error(`Failed to fetch domain ${id}:`, error);
      return undefined;
    }
  },

  /**
   * POST /domain/create (application/json)
   * Create new domain for a brand
   * 
   * Required fields:
   *   - brand_id: which brand this domain belongs to
   *   - name: domain name (e.g., "newsletter.example.com")
   *   - region_id: lookup ID for region selection
   * 
   * Optional fields:
   *   - custom_return_path: bounces return address
   *   - tracking_subdomain: custom subdomain for tracking pixels
   *   - enable_open_tracking: track open events (default: false)
   *   - enable_click_tracking: track click events (default: false)
   */
  async createDomain(payload: CreateDomainPayload): Promise<BrandDomain> {
    // Ensure optional booleans default to false if not provided
    const body: CreateDomainPayload = {
      ...payload,
      enable_open_tracking: payload.enable_open_tracking ?? false,
      enable_click_tracking: payload.enable_click_tracking ?? false,
    };

    const response = await apiClient.post('/domain/create', body);
    return normalizeDomain(response.data.data);
  },

  /**
   * PATCH /domain/update/:id
   * Update domain settings
   * 
   * ⚠️ CRITICAL: Field names differ from create!
   *    - Use "open_tracking" not "enable_open_tracking"
   *    - Use "click_tracking" not "enable_click_tracking"
   */
  async updateDomain(id: number, payload: UpdateDomainPayload): Promise<BrandDomain> {
    const response = await apiClient.patch(`/domain/update/${id}`, payload);
    return normalizeDomain(response.data.data);
  },

  /**
   * DELETE /domain/delete/:id
   * Delete domain by ID
   */
  async deleteDomain(id: number): Promise<void> {
    await apiClient.delete(`/domain/delete/${id}`);
  },

  /**
   * POST /domain/create then wait for verification
   * Helper: Create domain and wait for DNS verification status
   * 
   * This is a convenience wrapper. Frontend will still need to:
   * 1. Call createDomain() to get domain record with DNS info
   * 2. User copies DNS records to registrar
   * 3. Poll getDomain() to check if status changed to "Verified"
   */
  async createAndPollDomain(
    payload: CreateDomainPayload,
    maxAttempts: number = 10,
    delayMs: number = 2000
  ): Promise<{ domain: BrandDomain; verified: boolean }> {
    const domain = await this.createDomain(payload);
    
    let verified = domain.status === 'Verified';
    let attempts = 0;

    while (!verified && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      const updated = await this.getDomain(domain.id);
      if (updated) {
        verified = updated.status === 'Verified';
        if (verified) return { domain: updated, verified: true };
      }
      attempts++;
    }

    return { domain, verified: false };
  },
};
