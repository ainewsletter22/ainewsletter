import type {
  Brand,
  BrandDomain,
  SMTPSettings,
  PrivacySettings,
  SendingLimitSettings,
  FooterSettings,
} from "../types/Types";

/**
 * ─── Brand Service ──────────────────────────────────────────────────────────
 * There is no live backend for Brands/Domains/SMTP yet. This service keeps an
 * in-memory "fake DB" and mimics network latency so the UI already behaves the
 * way it will once real endpoints exist.
 *
 * To wire this up to the real API later, swap the body of each function for
 * an `apiClient` call (see clientService.ts for the pattern) and keep the
 * function signatures the same — nothing in the UI needs to change.
 *
 *   GET    /brands/list
 *   POST   /brands/create
 *   PUT    /brands/update/:id
 *   DELETE /brands/delete/:id
 *   POST   /brands/:id/domains
 *   DELETE /brands/:id/domains/:domainId
 *   POST   /brands/:id/domains/:domainId/verify
 *   PUT    /brands/:id/smtp
 *   PUT    /brands/:id/privacy
 *   PUT    /brands/:id/sending-limit
 *   PUT    /brands/:id/footer
 */


let BRANDS: Brand[] = [];
let nextBrandId = 1;
let nextDomainId = 1;

const delay = <T,>(value: T, ms = 350): Promise<T> =>
  new Promise(resolve => setTimeout(() => resolve(value), ms));

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function defaultDomainRecords(domainName: string) {
  const slug = domainName.split(".")[0];
  return {
    dkim: { type: "TXT", name: `resend._domainkey.${slug}`, content: "p=MIGfMA...QIDAQAB", ttl: "Auto", verified: true },
    spfMx: { type: "MX", name: `resend._domainkey.${slug}`, content: "p=MIGfMA...QIDAQAB", ttl: "Auto", priority: "10" },
    spfTxt: { type: "TXT", name: `resend._domainkey.${slug}`, content: "p=MIGfMA...QIDAQAB", ttl: "Auto" },
    dmarc: { type: "TXT", name: `resend._domainkey.${slug}`, content: "p=MIGfMA...QIDAQAB", ttl: "Auto" },
  };
}

export const brandService = {
  async listBrands(): Promise<Brand[]> {
    return delay(clone(BRANDS));
  },

  async getBrand(id: number): Promise<Brand | undefined> {
    return delay(clone(BRANDS.find(b => b.id === id)));
  },

  async createBrand(payload: {
    name: string;
    fromName: string;
    fromEmail: string;
    replyToEmail: string;
    logo?: string;
  }): Promise<Brand> {
    const brand: Brand = {
      id: nextBrandId++,
      name: payload.name,
      fromName: payload.fromName,
      fromEmail: payload.fromEmail,
      replyToEmail: payload.replyToEmail,
      logo: payload.logo,
      dateCreated: new Date().toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      totalCampaigns: 0,
      sendsVia: "Send Grid",
      domains: [],
      smtp: { provider: "Send Grid", host: "", port: "", security: "SSL", username: "" },
      privacy: { trackOpens: "Yes", trackClicks: "Anonymously", notifyOnCampaign: false, notifyEmail: "" },
      sendingLimit: { limitType: "Unlimited", currentlyUsed: 0, resetDay: 1 },
      footer: {
        unsubscribeText:
          "You are receiving this email because you opted in via our site.\nWant to change how you receive these emails? You can unsubscribe from this list.",
        companyName: payload.name,
        address: "99 Street Address",
        cityStateZip: "City, STATE 000-000",
        removeBadge: false,
      },
    };
    BRANDS = [...BRANDS, brand];
    return delay(clone(brand));
  },

  async updateBrandIdentity(
    id: number,
    payload: Partial<{ name: string; fromName: string; fromEmail: string; replyToEmail: string; logo?: string }>
  ): Promise<Brand | undefined> {
    BRANDS = BRANDS.map(b => (b.id === id ? { ...b, ...payload } : b));
    return delay(clone(BRANDS.find(b => b.id === id)));
  },

  async deleteBrand(id: number): Promise<void> {
    BRANDS = BRANDS.filter(b => b.id !== id);
    return delay(undefined);
  },

  async addDomain(brandId: number, name: string, region: string): Promise<BrandDomain | undefined> {
    const records = defaultDomainRecords(name);
    const domain: BrandDomain = {
      id: nextDomainId++,
      name,
      region,
      status: "Pending",
      addedAt: "1hr Ago",
      enableSending: true,
      enableReceiving: true,
      dkim: records.dkim,
      spf: [records.spfMx, records.spfTxt],
      dmarc: records.dmarc,
    };
    BRANDS = BRANDS.map(b => (b.id === brandId ? { ...b, domains: [...b.domains, domain] } : b));
    return delay(clone(domain));
  },

  async verifyDomain(brandId: number, domainId: number): Promise<BrandDomain | undefined> {
    BRANDS = BRANDS.map(b =>
      b.id === brandId
        ? { ...b, domains: b.domains.map(d => (d.id === domainId ? { ...d, status: "Verified" as const } : d)) }
        : b
    );
    return delay(clone(BRANDS.find(b => b.id === brandId)?.domains.find(d => d.id === domainId)));
  },

  async deleteDomain(brandId: number, domainId: number): Promise<void> {
    BRANDS = BRANDS.map(b => (b.id === brandId ? { ...b, domains: b.domains.filter(d => d.id !== domainId) } : b));
    return delay(undefined);
  },

  async updateSmtp(brandId: number, smtp: SMTPSettings): Promise<void> {
    BRANDS = BRANDS.map(b => (b.id === brandId ? { ...b, smtp, sendsVia: smtp.provider } : b));
    return delay(undefined);
  },

  async updatePrivacy(brandId: number, privacy: PrivacySettings): Promise<void> {
    BRANDS = BRANDS.map(b => (b.id === brandId ? { ...b, privacy } : b));
    return delay(undefined);
  },

  async updateSendingLimit(brandId: number, sendingLimit: SendingLimitSettings): Promise<void> {
    BRANDS = BRANDS.map(b => (b.id === brandId ? { ...b, sendingLimit } : b));
    return delay(undefined);
  },

  async updateFooter(brandId: number, footer: FooterSettings): Promise<void> {
    BRANDS = BRANDS.map(b => (b.id === brandId ? { ...b, footer } : b));
    return delay(undefined);
  },
};