import type { ClientData } from "../components/Clientcard";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ResetPasswordPayload {
  password: string;
  confirm_password: string;
  token?: string;
}

export interface ApiListItem {
  id: number | string;
  name: string;
  description?: string | null;
}

export interface Country extends ApiListItem {
  states?: State[];
}

export type State = ApiListItem;

export type City = ApiListItem;

export interface Category {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
}

export interface RawLead {
  id?: number | string;
  google_place_id?: string | null;
  business_name?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  telephone?: string | null;
  email?: string | null;
  business_email?: string | null;
  website?: string | null;
  instagram_url?: string | null;
  instagram?: string | null;
  twitter_url?: string | null;
  twitter?: string | null;
  x_url?: string | null;
  facebook_url?: string | null;
  facebook?: string | null;
  linkedin_url?: string | null;
  linkedin?: string | null;
  yelp_url?: string | null;
  yelp?: string | null;
  gmb_photos?: string | number | null;
  rating?: string | number | null;
  reviews_count?: number | string | null;
  is_saved?: boolean | number | null;
  enrichment_status?: string | null;
  google_maps_url?: string | null;
}

export interface SavedClientRecord {
  id: number;
  business_name?: string | null;
  display_name?: string | null;
  email?: string | null;
  email_1?: string | null;
  phone?: string | null;
  website?: string | null;
  site?: string | null;
  google_maps_url?: string | null;
  facebook_url?: string | null;
  facebook?: string | null;
  twitter_url?: string | null;
  twitter?: string | null;
  x_url?: string | null;
  instagram_url?: string | null;
  instagram?: string | null;
  yelp_url?: string | null;
  yelp?: string | null;
  contacted?: boolean | number | null;
  emails_count?: number | null;
  client_cat_id?: number | string | null;
}

export interface ManagedClient {
  id: number;
  businessName: string;
  email: string;
  phone?: string;
  website?: string;
  gmb?: string;
  facebook?: string;
  twitter?: string;
  instagram?: string;
  yelp?: string;
  group: "Contacted" | "Not Contacted";
  emailsSent: number;
}

export type ClientUpdatePayload = Record<string, string | number | boolean | null | undefined>;

export interface ManualClientPayload extends ClientUpdatePayload {
  display_name?: string;
  business_name?: string;
  email_1?: string;
  email?: string;
  client_category_id?: number | string;
  client_cat_id?: number | string;
}

export interface SearchJob {
  id: string;
  job_id: string;
  prompt: string;
  status: string;
  created_at: string;
}

export interface OnboardingSelections {
  company_kind_id: number;
  role_in_company_id: number;
  company_size_id: number;
  app_purpose_id: number;
}

export interface OnboardingMeta {
  purposes: ApiListItem[];
  kinds: ApiListItem[];
  sizes: ApiListItem[];
  goals: ApiListItem[];
  roles: ApiListItem[];
}

export type LeadResult = ClientData;

