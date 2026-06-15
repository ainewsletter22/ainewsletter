import apiClient from './apiClient';

export const clientService = {
  // Start the AI Job
  async generateLeads(prompt: string) {
    const response = await apiClient.post('/leads/generate', { prompt });
    return response.data;
  },

  // Poll for job status
  async getJobStatus(jobId: string) {
    const response = await apiClient.get(`/leads/jobs/${jobId}`);
    return response.data;
  },

  // Fetch results once job is "completed"
  async getLeadResults(jobId: string) {
    const response = await apiClient.get(`/leads/jobs/${jobId}/results`);

    const rawData = response.data.data;
    console.log("Raw AI Search Results:", rawData);

    const results = Array.isArray(rawData) ? rawData : (rawData?.leads || rawData?.results || []);

    /**
     * Safely coerces a backend value to a string.
     * Returns `fallback` for any of: null, undefined, "", "null", "undefined", "@NONE".
     */
    const safeStr = (val: any, fallback = "@NONE"): string => {
      if (val === null || val === undefined) return fallback;
      const s = String(val).trim();
      if (s === "" || s === "null" || s === "undefined" || s === "@NONE") return fallback;
      return s;
    };

    return results.map((l: any) => {
      // Capture raw IDs for saving
      const leadId  = l.id;
      const placeId = safeStr(l.google_place_id, "");
      
      const name    = safeStr(l.business_name, "Unknown Business");
      const address = safeStr(l.address, "No address provided");
      const city    = safeStr(l.city, "");
      const country = safeStr(l.country, "");

      // Build a high-signal query for the embed: "Business Name, Address, City, Country"
      const queryStr = [name, address, city, country].filter(v => v !== "@NONE" && v !== "").join(", ");
      const mapQuery = encodeURIComponent(queryStr);

      const mapEmbedUrl = `https://www.google.com/maps?q=${mapQuery}&z=15&output=embed`;

      // Use the verified google_maps_url if available to prevent the redirect bug.
      const directionsUrl = (l.google_maps_url && l.google_maps_url !== "null")
        ? l.google_maps_url
        : `https://www.google.com/maps/search/?api=1&query=${mapQuery}${placeId !== "@NONE" ? `&query_place_id=${placeId}` : ""}`;

      // --- Social media ---
      // Backend may use either the `_url` suffix or the bare field name.
      // We check both variants so neither naming convention is silently dropped.
      const instagram   = safeStr(l.instagram_url   || l.instagram);
      const twitter     = safeStr(l.twitter_url     || l.twitter    || l.x_url);
      const facebook    = safeStr(l.facebook_url    || l.facebook);
      const linkedin    = safeStr(l.linkedin_url    || l.linkedin);
      const yelp        = safeStr(l.yelp_url        || l.yelp);

      return {
        id:             leadId ? String(leadId) : Math.random().toString(),
        name,
        address,
        telephone:      safeStr(l.phone || l.telephone, "No phone"),
        email:          safeStr(l.email || l.business_email, "No email"),
        website:        safeStr(l.website),
        instagram,
        twitter,
        facebook,
        linkedin_url:   linkedin,
        yelp,
        gmbPhotos:      safeStr(l.gmb_photos, "0 Photos"),
        rating:         l.rating ? parseFloat(l.rating) : 0,
        reviews:        l.reviews_count || 0,
        claimed:        !!l.is_saved,
        businessStatus: safeStr(l.enrichment_status, "Partial"),
        leadScore:      Math.floor(Math.random() * 100),
        mapEmbedUrl,
        directionsUrl,
      };
    });
  },

  // Move leads to "Manage Clients"
  async addClientsToManage(ids: string[], categoryId: number | string = 1) {
    // The backend expects an array of Numbers and a Number for category ID.
    // Ensure we filter out any non-numeric fallback IDs (like random strings).
    const numericIds = ids
      .map(id => parseInt(id, 10))
      .filter(n => !isNaN(n));

    const payload = {
      ids: numericIds,
      client_category_id: parseInt(String(categoryId), 10),
    };

    if (numericIds.length === 0) {
      throw new Error("No valid lead IDs selected to save.");
    }

    console.log("Saving leads payload:", payload);
    return await apiClient.post('/leads/save', payload);
  },

  async getCountries() {
    const response = await apiClient.get('/countries/list');
    console.log("Full Countries Response:", response.data);
    return response.data.data;
  },

  async getStates(countryId: number | string) {
    const response = await apiClient.get(`/states/list/${countryId}`);
    console.log("Full States Response:", response.data);
    return response.data.data;
  },

  async getCities(countryId: number | string, stateId: number | string) {
    const response = await apiClient.get(`/cities/list/${countryId}/${stateId}`);
    console.log("Full Cities Response:", response.data);
    return response.data.data;
  },

  async getNiches() {
    const response = await apiClient.get('/business-niches/list');
    console.log("Full Niches Response:", response.data);
    return response.data.data;
  },

  async getStats() {
    const all       = await apiClient.get('/clients/count-all');
    const contacted = await apiClient.get('/clients/contacted/count');
    return {
      total:     all.data?.data?.count       || 0,
      contacted: contacted.data?.data?.count || 0,
    };
  },

  // ─── Onboarding Endpoints ──────────────────────────────────────────
  async getOnboardingMeta() {
    const [purposes, kinds, sizes, goals, roles] = await Promise.all([
      apiClient.get('/app-purposes/list'),
      apiClient.get('/company-kinds/list'),
      apiClient.get('/company-sizes/list'),
      apiClient.get('/goals/list'),
      apiClient.get('/roles-in-company/list'),
    ]);
    return {
      purposes: purposes.data.data || [],
      kinds:    kinds.data.data    || [],
      sizes:    sizes.data.data    || [],
      goals:    goals.data.data    || [],
      roles:    roles.data.data    || [],
    };
  },

  async saveOnboardingInfo(payload: {
    company_kind_id: number;
    role_in_company_id: number;
    company_size_id: number;
    app_purpose_id: number;
  }) {
    const response = await apiClient.put('/user/save-onboarding-info', payload);
    return response.data;
  },

  async saveGoals(goalIds: number[]) {
    const response = await apiClient.post('/goals/save-goals', { goal_ids: goalIds });
    return response.data;
  },

  // ─── Client Categories (Folders) ───────────────────────────────────
  async getCategories() {
    const response = await apiClient.get('/client-categories/list');
    const rawData = response.data.data;
    return Array.isArray(rawData) ? rawData : (rawData?.results || rawData?.categories || rawData?.data || []);
  },

  async createCategory(name: string, description: string) {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description || " "); // Ensure description isn't strictly null if required
    return await apiClient.post('/client-categories/create', formData);
  },

  async updateCategory(id: number | string, name: string, description: string) {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description || " ");
    return await apiClient.put(`/client-categories/update/${id}`, formData);
  },

  async deleteCategory(id: number | string) {
    return await apiClient.delete(`/client-categories/delete/${id}`);
  },

  // ─── Saved Clients Management ──────────────────────────────────────
  async getSavedClients(categoryId?: number | string) {
    const url = categoryId ? `/clients/clients-list/${categoryId}` : '/clients/list';
    const response = await apiClient.get(url);
    const rawData = response.data.data;
    return Array.isArray(rawData) ? rawData : (rawData?.results || rawData?.clients || rawData?.data || []);
  },

  async deleteClient(id: number | string) {
    return await apiClient.delete(`/clients/delete/${id}`);
  },

  async updateClient(id: number | string, payload: any) {
    // Reverting to JSON payload as per backend documentation for /clients/update
    const cleanPayload = Object.entries(payload).reduce((acc, [key, value]) => {
      // Convert UI placeholders back to empty strings so the backend validator doesn't fail on URL/Email formats
      const isPlaceholder = value === "@NONE" || value === "null" || value === "undefined" || value === null;
      acc[key] = isPlaceholder ? "" : value;
      return acc;
    }, {} as any);

    return await apiClient.put(`/clients/update/${id}`, cleanPayload);
  },

  async exportClients(format: 'xlsx' | 'csv' | 'xml' | 'json') {
    const response = await apiClient.get(`/clients/export?format=${format}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async addClientManual(payload: {
    display_name: string;
    phone: string;
    email_1: string;
    site: string;
    client_category_id: number | string;
  }) {
    const response = await apiClient.post('/clients/add', payload);
    return response.data;
  },

  async getAllJobs() {
    const response = await apiClient.get('/leads/jobs');
    return response.data;
  },

  async inspectN8N(payload: any) {
    const response = await apiClient.post('/leads/inspect-n8n', payload);
    return response.data;
  },
};