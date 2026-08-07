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
}

export interface EmailTemplate {
  id: number;
  name: string;
  thumbnail: string; // placeholder color or image url
}

export interface EmailDraft {
  id: number;
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
  senderName: string;
  businessType: string;
  goals: string;
  tone: string;
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
}

export interface ConfirmForm {
  testEmail: string;
  delivery: "now" | "later";
  scheduleDate: string;
  scheduleTime: string;
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
  domains: BrandDomain[];
  smtp: SMTPSettings;
  privacy: PrivacySettings;
  sendingLimit: SendingLimitSettings;
  footer: FooterSettings;
}

export interface BrandFormValues {
  name: string;
  fromName: string;
  fromEmail: string;
  replyToEmail: string;
  resendApiKey?: string;
  logo?: File | string;
}