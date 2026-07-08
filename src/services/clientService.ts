import apiClient from "./apiClient";
import type {
  ApiListItem,
  Category,
  City,
  ClientUpdatePayload,
  Country,
  LeadResult,
  ManualClientPayload,
  OnboardingMeta,
  OnboardingSelections,
  RawLead,
  SavedClientRecord,
  SearchJob,
} from "../types/domain";
import { safeStr, unwrapList } from "../utils/api";

type JobStatusResponse = {
  data?: {
    status?: string;
  };
};

type GenerateLeadsResponse = {
  data: {
    job_id: string;
  };
};

function mapLead(l: RawLead): LeadResult {
  const leadId = l.id;
  const placeId = safeStr(l.google_place_id, "");

  const name = safeStr(l.business_name, "Unknown Business");
  const address = safeStr(l.address, "No address provided");
  const city = safeStr(l.city, "");
  const country = safeStr(l.country, "");

  const queryStr = [name, address, city, country].filter((v) => v !== "@NONE" && v !== "").join(", ");
  const mapQuery = encodeURIComponent(queryStr);

  const mapEmbedUrl = `https://www.google.com/maps?q=${mapQuery}&z=15&output=embed`;
  const directionsUrl = l.google_maps_url && l.google_maps_url !== "null"
    ? l.google_maps_url
    : `https://www.google.com/maps/search/?api=1&query=${mapQuery}${placeId !== "@NONE" ? `&query_place_id=${placeId}` : ""}`;

  return {
    id: leadId ? String(leadId) : crypto.randomUUID(),
    name,
    address,
    telephone: safeStr(l.phone || l.telephone, "No phone"),
    email: safeStr(l.email || l.business_email, "No email"),
    website: safeStr(l.website),
    instagram: safeStr(l.instagram_url || l.instagram),
    twitter: safeStr(l.twitter_url || l.twitter || l.x_url),
    facebook: safeStr(l.facebook_url || l.facebook),
    linkedin_url: safeStr(l.linkedin_url || l.linkedin),
    yelp: safeStr(l.yelp_url || l.yelp),
    gmbPhotos: safeStr(l.gmb_photos, "0 Photos"),
    rating: l.rating ? parseFloat(String(l.rating)) : 0,
    reviews: l.reviews_count ? Number(l.reviews_count) : 0,
    claimed: !!l.is_saved,
    businessStatus: safeStr(l.enrichment_status, "Partial"),
    leadScore: Math.floor(Math.random() * 100),
    mapEmbedUrl,
    directionsUrl,
  };
}

export const clientService = {
  async generateLeads(prompt: string): Promise<GenerateLeadsResponse> {
    const response = await apiClient.post("/leads/generate", { prompt });
    return response.data;
  },

  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    const response = await apiClient.get(`/leads/jobs/${jobId}`);
    return response.data;
  },

  async getLeadResults(jobId: string): Promise<LeadResult[]> {
    const response = await apiClient.get(`/leads/jobs/${jobId}/results`);
    const results = unwrapList<RawLead>(response.data.data);
    return results.map(mapLead);
  },

  async addClientsToManage(ids: string[], categoryId: number | string = 1) {
    const numericIds = ids
      .map((id) => parseInt(id, 10))
      .filter((n) => !Number.isNaN(n));

    if (numericIds.length === 0) {
      throw new Error("No valid lead IDs selected to save.");
    }

    return apiClient.post("/leads/save", {
      ids: numericIds,
      client_category_id: parseInt(String(categoryId), 10),
    });
  },

  async getCountries(): Promise<Country[]> {
    const response = await apiClient.get("/countries/list");
    return unwrapList<Country>(response.data.data);
  },

  async getStates(countryId: number | string): Promise<ApiListItem[]> {
    const response = await apiClient.get(`/states/list/${countryId}`);
    return unwrapList<ApiListItem>(response.data.data);
  },

  async getCities(countryId: number | string, stateId: number | string): Promise<City[]> {
    const response = await apiClient.get(`/cities/list/${countryId}/${stateId}`);
    return unwrapList<City>(response.data.data);
  },

  async getNiches(): Promise<ApiListItem[]> {
    const response = await apiClient.get("/business-niches/list");
    return unwrapList<ApiListItem>(response.data.data);
  },

  async getStats(): Promise<{ total: number; contacted: number }> {
    const all = await apiClient.get("/clients/count-all");
    const contacted = await apiClient.get("/clients/contacted/count");

    return {
      total: all.data?.data?.count || 0,
      contacted: contacted.data?.data?.count || 0,
    };
  },

  async getOnboardingMeta(): Promise<OnboardingMeta> {
    const [purposes, kinds, sizes, goals, roles] = await Promise.all([
      apiClient.get("/app-purposes/list"),
      apiClient.get("/company-kinds/list"),
      apiClient.get("/company-sizes/list"),
      apiClient.get("/goals/list"),
      apiClient.get("/roles-in-company/list"),
    ]);

    return {
      purposes: unwrapList<ApiListItem>(purposes.data.data),
      kinds: unwrapList<ApiListItem>(kinds.data.data),
      sizes: unwrapList<ApiListItem>(sizes.data.data),
      goals: unwrapList<ApiListItem>(goals.data.data),
      roles: unwrapList<ApiListItem>(roles.data.data),
    };
  },

  async saveOnboardingInfo(payload: OnboardingSelections) {
    const response = await apiClient.put("/user/save-onboarding-info", payload);
    return response.data;
  },

  async saveGoals(goalIds: number[]) {
    const response = await apiClient.post("/goals/save-goals", { goal_ids: goalIds });
    return response.data;
  },

  async getCategories(): Promise<Category[]> {
    const response = await apiClient.get("/client-categories/list");
    return unwrapList<Category>(response.data.data);
  },

  async createCategory(name: string, description: string) {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description || " ");
    return apiClient.post("/client-categories/create", formData);
  },

  async updateCategory(id: number | string, name: string, description: string) {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description || " ");
    return apiClient.put(`/client-categories/update/${id}`, formData);
  },

  async deleteCategory(id: number | string) {
    return apiClient.delete(`/client-categories/delete/${id}`);
  },

  async getSavedClients(categoryId?: number | string): Promise<SavedClientRecord[]> {
    const url = categoryId ? `/clients/clients-list/${categoryId}` : "/clients/list";
    const response = await apiClient.get(url);
    return unwrapList<SavedClientRecord>(response.data.data);
  },

  async deleteClient(id: number | string) {
    return apiClient.delete(`/clients/delete/${id}`);
  },

  async updateClient(id: number | string, payload: ClientUpdatePayload) {
    const cleanPayload = Object.entries(payload).reduce<Record<string, string | number | boolean>>((acc, [key, value]) => {
      const isPlaceholder = value === "@NONE" || value === "null" || value === "undefined" || value === null;
      if (value !== undefined) acc[key] = isPlaceholder ? "" : value;
      return acc;
    }, {});

    return apiClient.put(`/clients/update/${id}`, cleanPayload);
  },

  async exportClients(format: "xlsx" | "csv" | "xml" | "json"): Promise<Blob> {
    const response = await apiClient.get(`/clients/export?format=${format}`, {
      responseType: "blob",
    });
    return response.data;
  },

  async addClientManual(payload: ManualClientPayload) {
    const cleanPayload = Object.entries(payload).reduce<Record<string, string | number | boolean>>((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        acc[key] = value;
      }
      return acc;
    }, {});

    try {
      const response = await apiClient.post("/clients/add", cleanPayload, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response.data;
    } catch (error) {
      console.error("addClientManual payload:", cleanPayload);
      console.error("addClientManual error:", error);
      throw error;
    }
  },

  async addClientsBatchManual(clients: ManualClientPayload[], categoryId: number | string) {
    return Promise.all(
      clients.map((client) => this.addClientManual({ ...client, client_category_id: categoryId }))
    );
  },

  async getAllJobs(): Promise<{ data?: SearchJob[] }> {
    const response = await apiClient.get("/leads/jobs");
    return response.data;
  },

  async inspectN8N(payload: Record<string, unknown>) {
    const response = await apiClient.post("/leads/inspect-n8n", payload);
    return response.data;
  },
};
