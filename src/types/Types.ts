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

export interface AIContentForm {
  headlines: string[];
  currentHeadline: string;
  description: string;
  productLink: string;
}

export interface AIScheduleForm {
  campaignFrequency: boolean;
  postEveryAmount: number;
  postEveryUnit: string;
  stopPost: string;
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