import apiClient from './apiClient';

/**
 * ─── Lookup Service ──────────────────────────────────────────────────────────
 * Wraps Phase 2 Lookup (reference data) API endpoints
 * 
 * Pattern: Call apiClient → extract response.data.data → return
 * 
 * These endpoints return static reference data used to populate dropdowns/selects
 * throughout the application. Each returns: [{ id: number, name: string }, ...]
 * 
 * Endpoints:
 *   GET /lookup/regions
 *   GET /lookup/smtp-providers
 *   GET /lookup/security-protocols
 *   GET /lookup/sending-limits
 *   GET /lookup/day-of-months
 *   GET /lookup/post-everies
 *   GET /lookup/durations
 *   GET /lookup/stop-post-afters (⚠️ Same path as durations? Needs confirmation)
 */

export interface LookupItem {
  id: number;
  name: string;
}

// ─── Lookup Cache (in-memory during session) ────────────────────────────────

const lookupCache = new Map<string, LookupItem[]>();

function getCacheKey(endpoint: string): string {
  return `lookup:${endpoint}`;
}

// ─── Lookup Service ────────────────────────────────────────────────────────

export const lookupService = {
  /**
   * GET /lookup/regions
   * Read-only lookup. No request body is sent.
   * Expected response shape: { data: [{ id, name }, ...] }
   */
  async getRegions(useCache: boolean = true): Promise<LookupItem[]> {
    const cacheKey = getCacheKey('regions');
    if (useCache && lookupCache.has(cacheKey)) {
      return lookupCache.get(cacheKey) || [];
    }

    try {
      const response = await apiClient.get('/lookup/regions');
      const data = response.data.data || [];
      if (useCache) lookupCache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch regions:', error);
      return [];
    }
  },

  /**
   * GET /lookup/campaign-goals
   * Read-only lookup. No request body is sent.
   * Expected response shape: { data: [{ id, name }, ...] }
   */
  async getCampaignGoals(useCache: boolean = true): Promise<LookupItem[]> {
    const cacheKey = getCacheKey('campaign-goals');
    if (useCache && lookupCache.has(cacheKey)) {
      return lookupCache.get(cacheKey) || [];
    }

    try {
      const response = await apiClient.get('/lookup/campaign-goals');
      const data = response.data.data || [];
      if (useCache) lookupCache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch campaign goals:', error);
      return [];
    }
  },

  /**
   * GET /lookup/ai-tones
   * Read-only lookup. No request body is sent.
   * Expected response shape: { data: [{ id, name }, ...] }
   */
  async getAITones(useCache: boolean = true): Promise<LookupItem[]> {
    const cacheKey = getCacheKey('ai-tones');
    if (useCache && lookupCache.has(cacheKey)) {
      return lookupCache.get(cacheKey) || [];
    }

    try {
      const response = await apiClient.get('/lookup/ai-tones');
      const data = response.data.data || [];
      if (useCache) lookupCache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch AI tones:', error);
      return [];
    }
  },

  /**
   * GET /lookup/ai-agents
   * Read-only lookup. No request body is sent.
   * Expected response shape: { data: [{ id, name }, ...] }
   */
  async getAIAgents(useCache: boolean = true): Promise<LookupItem[]> {
    const cacheKey = getCacheKey('ai-agents');
    if (useCache && lookupCache.has(cacheKey)) {
      return lookupCache.get(cacheKey) || [];
    }

    try {
      const response = await apiClient.get('/lookup/ai-agents');
      const data = response.data.data || [];
      if (useCache) lookupCache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch AI agents:', error);
      return [];
    }
  },

  /**
   * GET /lookup/business-types
   * Read-only lookup. No request body is sent.
   * Expected response shape: { data: [{ id, name }, ...] }
   */
  async getBusinessTypes(useCache: boolean = true): Promise<LookupItem[]> {
    const cacheKey = getCacheKey('business-types');
    if (useCache && lookupCache.has(cacheKey)) {
      return lookupCache.get(cacheKey) || [];
    }

    try {
      const response = await apiClient.get('/lookup/business-types');
      const data = response.data.data || [];
      if (useCache) lookupCache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch business types:', error);
      return [];
    }
  },

  /**
   * GET /lookup/ai-writer-dropdowns
   * Read-only lookup for AI writer dropdown options.
   * Expected response shape: { data: [{ id, name }, ...] }
   */
  async getAIWriterDropdowns(useCache: boolean = true): Promise<LookupItem[]> {
    const cacheKey = getCacheKey('ai-writer-dropdowns');
    if (useCache && lookupCache.has(cacheKey)) {
      return lookupCache.get(cacheKey) || [];
    }

    try {
      const response = await apiClient.get('/lookup/ai-writer-dropdowns');
      const data = response.data.data || [];
      if (useCache) lookupCache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch AI writer dropdowns:', error);
      return [];
    }
  },

  /**
   * GET /lookup/smtp-providers
   * Fetch all SMTP provider options
   */
  async getSMTPProviders(useCache: boolean = true): Promise<LookupItem[]> {
    const cacheKey = getCacheKey('smtp-providers');
    if (useCache && lookupCache.has(cacheKey)) {
      return lookupCache.get(cacheKey) || [];
    }

    try {
      const response = await apiClient.get('/lookup/smtp-providers');
      const data = response.data.data || [];
      if (useCache) lookupCache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch SMTP providers:', error);
      return [];
    }
  },

  /**
   * GET /lookup/security-protocols
   * Fetch all security protocol options (SSL, TLS, etc.)
   */
  async getSecurityProtocols(useCache: boolean = true): Promise<LookupItem[]> {
    const cacheKey = getCacheKey('security-protocols');
    if (useCache && lookupCache.has(cacheKey)) {
      return lookupCache.get(cacheKey) || [];
    }

    try {
      const response = await apiClient.get('/lookup/security-protocols');
      const data = response.data.data || [];
      if (useCache) lookupCache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch security protocols:', error);
      return [];
    }
  },

  /**
   * GET /lookup/sending-limits
   * Fetch all sending limit type options
   */
  async getSendingLimits(useCache: boolean = true): Promise<LookupItem[]> {
    const cacheKey = getCacheKey('sending-limits');
    if (useCache && lookupCache.has(cacheKey)) {
      return lookupCache.get(cacheKey) || [];
    }

    try {
      const response = await apiClient.get('/lookup/sending-limits');
      const data = response.data.data || [];
      if (useCache) lookupCache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch sending limits:', error);
      return [];
    }
  },

  /**
   * GET /lookup/day-of-months
   * Fetch all day-of-month options (1-31)
   */
  async getDayOfMonths(useCache: boolean = true): Promise<LookupItem[]> {
    const cacheKey = getCacheKey('day-of-months');
    if (useCache && lookupCache.has(cacheKey)) {
      return lookupCache.get(cacheKey) || [];
    }

    try {
      const response = await apiClient.get('/lookup/day-of-months');
      const data = response.data.data || [];
      if (useCache) lookupCache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch day of months:', error);
      return [];
    }
  },

  /**
   * GET /lookup/post-everies
   * Fetch all post frequency options (Daily, Weekly, Monthly, etc.)
   */
  async getPostEveries(useCache: boolean = true): Promise<LookupItem[]> {
    const cacheKey = getCacheKey('post-everies');
    if (useCache && lookupCache.has(cacheKey)) {
      return lookupCache.get(cacheKey) || [];
    }

    try {
      const response = await apiClient.get('/lookup/post-everies');
      const data = response.data.data || [];
      if (useCache) lookupCache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch post everies:', error);
      return [];
    }
  },

  /**
   * GET /lookup/durations
   * Fetch all duration/interval options
   */
  async getDurations(useCache: boolean = true): Promise<LookupItem[]> {
    const cacheKey = getCacheKey('durations');
    if (useCache && lookupCache.has(cacheKey)) {
      return lookupCache.get(cacheKey) || [];
    }

    try {
      const response = await apiClient.get('/lookup/durations');
      const data = response.data.data || [];
      if (useCache) lookupCache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch durations:', error);
      return [];
    }
  },

  /**
   * GET /lookup/stop-post-afters
   * Fetch all stop-post-after options
   * 
   * ⚠️ Documentation shows same path as /lookup/durations — may be a duplicate
   *    or may reuse the same endpoint. Awaiting backend confirmation.
   */
  async getStopPostAfters(useCache: boolean = true): Promise<LookupItem[]> {
    const cacheKey = getCacheKey('stop-post-afters');
    if (useCache && lookupCache.has(cacheKey)) {
      return lookupCache.get(cacheKey) || [];
    }

    try {
      // Try dedicated endpoint first, fall back to durations if not found
      try {
        const response = await apiClient.get('/lookup/stop-post-afters');
        const data = response.data.data || [];
        if (useCache) lookupCache.set(cacheKey, data);
        return data;
      } catch (e: any) {
        if (e.response?.status === 404) {
          // Endpoint doesn't exist, use durations instead
          console.warn('GET /lookup/stop-post-afters not found, using /lookup/durations');
          return this.getDurations(useCache);
        }
        throw e;
      }
    } catch (error) {
      console.error('Failed to fetch stop post afters:', error);
      return [];
    }
  },

  /**
   * Fetch all lookups in parallel
   * Useful for initialization to pre-populate all dropdown data
   */
  async getAllLookups(): Promise<{
    regions: LookupItem[];
    smtpProviders: LookupItem[];
    securityProtocols: LookupItem[];
    sendingLimits: LookupItem[];
    dayOfMonths: LookupItem[];
    postEveries: LookupItem[];
    durations: LookupItem[];
    stopPostAfters: LookupItem[];
  }> {
    const [
      regions,
      smtpProviders,
      securityProtocols,
      sendingLimits,
      dayOfMonths,
      postEveries,
      durations,
      stopPostAfters,
    ] = await Promise.all([
      this.getRegions(),
      this.getSMTPProviders(),
      this.getSecurityProtocols(),
      this.getSendingLimits(),
      this.getDayOfMonths(),
      this.getPostEveries(),
      this.getDurations(),
      this.getStopPostAfters(),
    ]);

    return {
      regions,
      smtpProviders,
      securityProtocols,
      sendingLimits,
      dayOfMonths,
      postEveries,
      durations,
      stopPostAfters,
    };
  },

  /**
   * Clear all cached lookups
   */
  clearCache(): void {
    lookupCache.clear();
  },

  /**
   * Clear specific lookup cache by endpoint
   */
  clearCacheForEndpoint(endpoint: string): void {
    lookupCache.delete(getCacheKey(endpoint));
  },
};
