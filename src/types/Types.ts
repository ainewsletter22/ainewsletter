// ─── Newsletter Types ─────────────────────────────────────────────────────────

export type NewsletterStatus = "Complete" | "Scheduled" | "Sending" | "Draft";

export interface Newsletter {
  id: number;
  title: string;
  subtitle: string;
  date: string;
  opened: string;
  clicked: string;
  status: NewsletterStatus;
  type?: "campaign" | "broadcast";
  html?: string;
  preview?: string | null;
  from_name?: string | null;
  footer?: string | null;
  address?: string;
}

export interface EmailTemplate {
  id: number;
  name: string;
  thumbnail: string; // placeholder color or image url
}

export interface EmailDraft {
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
  Attachments: Array<{
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
  }>;
  AiGeneratedImages: any[];
  AiGeneratedAttachments: any[];
  AiGeneratedCampaignResults: any[];
  
  // Computed property for UI display
  title: string;
  thumbnail: string;
}

export interface Recipient {
  id: number;
  name: string;
  email: string;
  opens: number;
  clicked?: string;
}

export interface ReportData {
  subject: string;
  sentAt: string;
  deliveryRate: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  recipients: number;
  stopDate: string;
  stopTime: string;
  chart: { time: string; opens: number; clicks: number }[];
  recipientList: Recipient[];
}

// ─── Send Newsletter Flow Types ───────────────────────────────────────────────

export type SendMethod = "ai" | "scratch" | "template";

export interface AIAgentForm {
  agent: string;
  agentId: number;
  senderName: string;
  businessType: string;
  businessTypeId: number;
  goals: string;
  goalId: number;
  tone: string;
  toneId: number;
}

export interface HeadlineItem {
  id?: number;
  name: string;
  brandId?: number;
  status?: number;
}

export interface AIContentForm {
  headlines: HeadlineItem[];
  currentHeadline: string;
  description: string;
  productLink: string;
}

export interface AIScheduleForm {
  campaignFrequency: boolean;
  postEveryAmount: number;
  postEveryUnit: string;
  postEveryId?: number;
  durationId?: number;
  stopPost: string;
  stopPostId?: number;
  regenerateSubject: boolean;
  regenerateBody: boolean;
  startDate: string;
  startTime: string;
  stopDate: string;
  stopTime: string;
}

export interface ComposeForm {
  name: string;
  from: string;
  to: string;
  subject: string;
  preview: string;
  body: string;
  attachments: ComposerAttachment[];
  footer: string;
  address: string;
}

export interface ComposerAttachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  assetId?: string | number;
}

export interface TemplateLayoutBlock {
  id: string;
  role: "headline" | "body" | "image" | "footer";
  label: string;
  text: string;
  imageUrl?: string;
  imageWidth?: string;
  imageOffsetX?: number;
  placeholder?: string;
  /** Requirement #4: an image slot (or blank-template image) can link out. */
  imageLinkUrl?: string;
  /** Requirement #5: image slot hidden from the preview for this send, without deleting it from the layout. */
  removed?: boolean;
}

export interface ConfirmForm {
  testEmail: string;
  delivery: "now" | "later";
  scheduleDate: string;
  scheduleTime: string;
  clientCategoryIds: number[];
  isFromAIFlow?: boolean;
}

// ─── Client & Folder Types ───────────────────────────────────────────────────

export interface Folder {
  id: number;
  name: string;
  count?: number;
}

export interface Client {
  id: number;
  name: string;
  email: string;
}

// ─── Brand Types ──────────────────────────────────────────────────────────────

export type DomainStatus = "Pending" | "Verified" | "Failed";

export interface DNSRecord {
  type: string;
  name: string;
  content: string;
  ttl: string;
  priority?: string;
  verified?: boolean;
}

export interface BrandDomain {
  id: number;
  name: string;
  region: string;
  status: DomainStatus;
  addedAt: string;
  enableSending: boolean;
  enableReceiving: boolean;
  dkim: DNSRecord;
  spf: DNSRecord[];
  dmarc: DNSRecord;
  cnames?: DNSRecord[];
  brand_id?: number;
}

export interface SMTPSettings {
  provider: string;
  providerId?: number;
  host: string;
  port: string;
  security: "SSL" | "TLS";
  securityId?: number;
  username: string;
  password?: string;
}

export interface PrivacySettings {
  trackOpens: "Yes" | "No";
  trackClicks: "Yes" | "Anonymously" | "No";
  notifyOnCampaign: boolean;
  notifyEmail: string;
}

export type SendingLimitType = "Unlimited" | "Monthly Limit" | "Non Expiring Limit";

export interface SendingLimitSettings {
  limitType: SendingLimitType;
  emailsPerMonth?: number;
  currentlyUsed: number;
  resetDay: number;
}

export interface FooterSettings {
  unsubscribeText: string;
  companyName: string;
  address: string;
  cityStateZip: string;
  removeBadge: boolean;
}

export interface Brand {
  id: number;
  name: string;
  fromName: string;
  fromEmail: string;
  replyToEmail: string;
  logo?: string;
  resendApiKey?: string;
  dateCreated: string;
  totalCampaigns: number;
  sendsVia: string;
  sendVia?: SendVia;
  domains: BrandDomain[];
  smtp: SMTPSettings;
  privacy: PrivacySettings;
  sendingLimit: SendingLimitSettings;
  footer: FooterSettings;
  accountSuspensionEnabled?: boolean;
  // Backend footer fields (snake_case with typo)
  unsuscribe_information?: string;
  footer_address?: string;
  newsletter_badge?: boolean;
}

export interface BrandFormValues {
  name: string;
  fromName: string;
  fromEmail: string;
  replyToEmail: string;
  resendApiKey?: string;
  logo?: File | string;
}

// ─── Send Mode Types ───────────────────────────────────────────────────────────

export type SendVia = "broadcast" | "campaign";

export interface BroadcastStatus {
  id: number;
  name: string;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface Broadcast {
  id: number;
  user_id: number;
  brand_id: number;
  draft_id: number;
  domain_id: number | null;
  client_cat_id: number;
  resend_audience_id: string;
  resend_broadcast_id: string;
  broadcast_status_id: number;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  complained_count: number;
  sent_count: number;
  delivery_delayed_count: number;
  suppressed_count: number;
  failed_count: number;
  createdAt: string;
  updatedAt: string;
  Brand?: Brand;
  Draft?: EmailDraft;
  Domain?: BrandDomain;
  ClientCategory?: {
    id: number;
    user_id: number;
    name: string;
    description: string;
    status: number;
    createdAt: string;
    updatedAt: string;
  };
  BroadcastStatus?: BroadcastStatus;
  head?: string;
  html?: string;
  preview?: string | null;
  from_name?: string | null;
  footer?: string | null;
  address?: string;
}

export interface Campaign {
  id: number;
  user_id: number;
  brand_id: number;
  domain_id: number | null;
  draft_id: number;
  campaign_goal_id: number | null;
  ai_tone_id: number | null;
  head: string;
  preview: string | null;
  html: string;
  footer: string;
  address: string;
  template_id: number | null;
  sent_at: string | null;
  from_name: string | null;
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
  total_recipients: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  complained_count: number;
  sent_count: number;
  delivery_delayed_count: number;
  suppressed_count: number;
  failed_count: number;
  status: number;
  createdAt: string;
  updatedAt: string;
  AiTone?: any;
  AiAgent?: any;
  PostEvery?: any;
  ProductLink?: any;
  Headline?: any;
  StopPostAfter?: any;
  Duration?: any;
  CampaignGoal?: any;
}

export interface BroadcastSendPayload {
  draft_id: number;
  client_cat_ids: number[];
}

export interface BroadcastSendResult {
  client_cat_id: number;
  status: "success" | "failed";
  broadcast_id?: number;
  error?: string;
}

export interface ClientCategoryDeletePayload {
  client_cat_ids: number[];
}

export interface ClientCategoryDeleteResult {
  client_cat_id: number;
  status: "success" | "failed";
  resend_contacts_removed: number;
  resend_audiences_removed: number;
}