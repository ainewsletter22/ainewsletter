import { useEffect, useState } from "react";
import trashIcon from "../../assets/trashIcon.svg";
import { Btn } from "../Modalshells";
import { REGIONS } from "../../types/Mockdata";
import { getApiErrorMessage } from "../../utils/api";
import logo from "../../assets/mainLogo.png";
import type {
  BrandDomain,
  DNSRecord,
  SMTPSettings,
  PrivacySettings,
  SendingLimitSettings,
  SendingLimitType,
  FooterSettings,
} from "../../types/Types";

type RegionOption = {
  id: number;
  name: string;
};

// ─── Shared bits ────────────────────────────────────────────────────────────
function DnsTable({ title, records, onCopy, copied }: { title?: string; records?: DNSRecord[]; onCopy: (value: string, key: string) => void; copied: string | null }) {
  const safeRecords = (records ?? []).filter((r): r is DNSRecord => Boolean(r && r.type && r.name && r.content && r.ttl));

  if (safeRecords.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500 mb-2">
        No DNS records are available for this domain yet.
      </div>
    );
  }

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden mb-2 overflow-x-auto">
      <table className="w-full min-w-150">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {["Brand Name", "Name", "Content", "TTL", "Priority"].map(h => (
              <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records?.map((r, i) => {
            const nameKey = `${title ?? r.type}-name-${i}`;
            const contentKey = `${title ?? r.type}-content-${i}`;
            return (
              <tr key={i} className="border-b border-gray-50 bg-blue-50/30">
                <td className="px-4 py-2 text-sm text-blue-600 font-medium">{r.type}</td>
                <td className="px-4 py-2 text-sm text-gray-600">
                  <button onClick={() => onCopy(r.name, nameKey)} className="flex items-center gap-1 hover:text-blue-600">
                    <span className="truncate max-w-40">{r.name}</span>
                    <span>{copied === nameKey ? "✓" : "⧉"}</span>
                  </button>
                </td>
                <td className="px-4 py-2 text-sm text-gray-600">
                  <button onClick={() => onCopy(r.content, contentKey)} className="flex items-center gap-1 hover:text-blue-600">
                    <span className="truncate max-w-40">{r.content}</span>
                    <span>{copied === contentKey ? "✓" : "⧉"}</span>
                  </button>
                </td>
                <td className="px-4 py-2 text-sm text-gray-500">{r.ttl}</td>
                <td className="px-4 py-2 text-sm text-gray-500">{r.priority ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// NOTE: flag *emoji* (🇺🇸) are actually two stacked "regional indicator"
// letters under the hood. Many fonts/OSes (Windows especially) don't have a
// flag glyph for that sequence and just render the two letters as plain text
// ("US"). That's not a matching bug — it's a rendering limitation. To get a
// flag that reliably looks like a flag everywhere, we render an actual flag
// image (via flagcdn.com) instead of relying on emoji font support.

// Extracts a plain 2-letter ISO 3166-1 country code from whatever the source
// data gives us — could already be a code ("US"), or a flag emoji ("🇺🇸").
function extractIsoCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // Already a plain 2-letter code.
  if (/^[a-zA-Z]{2}$/.test(trimmed)) return trimmed.toUpperCase();

  // A flag emoji: each character is a regional-indicator symbol in the
  // range U+1F1E6–U+1F1FF, which maps back to A–Z by subtracting 127397.
  const chars = Array.from(trimmed);
  if (chars.length === 2 && chars.every(ch => {
    const cp = ch.codePointAt(0) ?? 0;
    return cp >= 0x1f1e6 && cp <= 0x1f1ff;
  })) {
    return chars.map(ch => String.fromCharCode((ch.codePointAt(0) ?? 0) - 127397)).join("");
  }

  return null;
}

// Strips accents/diacritics so "São Paulo" and "sao paulo" compare equal.
function normalizeForMatch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// A small flag image, rendered from an ISO country code. Falls back to a
// plain globe icon if we couldn't resolve a code at all.
function FlagIcon({ code, className = "w-5 h-3.5 rounded-xs object-cover inline-block align-middle" }: { code: string | null; className?: string }) {
  if (!code) {
    return (
      <svg className={className.replace("object-cover", "")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M3 12h18" />
        <path strokeLinecap="round" d="M12 3c2.4 2.6 3.75 5.9 3.75 9S14.4 18.4 12 21c-2.4-2.6-3.75-5.9-3.75-9S9.6 5.6 12 3z" />
      </svg>
    );
  }
  const lower = code.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/24x18/${lower}.png`}
      srcSet={`https://flagcdn.com/48x36/${lower}.png 2x`}
      alt={code}
      className={className}
    />
  );
}

// Direct keyword → ISO code lookup for common AWS SES region names. This is
// the primary matcher since it doesn't depend on Mockdata's REGIONS array
// lining up character-for-character with whatever the backend calls things.
const REGION_KEYWORD_TO_ISO: Array<[string, string]> = [
  ["virginia", "US"], ["ohio", "US"], ["oregon", "US"], ["california", "US"],
  ["us east", "US"], ["us west", "US"], ["us-east", "US"], ["us-west", "US"], ["united states", "US"],
  ["canada", "CA"],
  ["ireland", "IE"],
  ["london", "GB"], ["united kingdom", "GB"],
  ["frankfurt", "DE"], ["germany", "DE"],
  ["paris", "FR"], ["france", "FR"],
  ["milan", "IT"], ["italy", "IT"],
  ["zurich", "CH"], ["switzerland", "CH"],
  ["stockholm", "SE"], ["sweden", "SE"],
  ["madrid", "ES"], ["spain", "ES"],
  ["sao paulo", "BR"], ["brazil", "BR"],
  ["tokyo", "JP"], ["osaka", "JP"], ["japan", "JP"],
  ["seoul", "KR"], ["korea", "KR"],
  ["singapore", "SG"],
  ["mumbai", "IN"], ["hyderabad", "IN"], ["india", "IN"],
  ["sydney", "AU"], ["melbourne", "AU"], ["australia", "AU"],
  ["cape town", "ZA"], ["south africa", "ZA"],
  ["bahrain", "BH"],
  ["uae", "AE"], ["dubai", "AE"],
  ["jakarta", "ID"], ["indonesia", "ID"],
  ["hong kong", "HK"],
  ["beijing", "CN"], ["ningxia", "CN"], ["china", "CN"],
];

// ─── Add domain ─────────────────────────────────────────────────────────────

type DomainStep = "list" | "form" | "verify";

interface AddDomainSectionProps {
  domains: BrandDomain[];
  regions: RegionOption[];
  onAddDomain: (name: string, regionId: number) => Promise<BrandDomain | undefined>;
  onDeleteDomain: (domainId: number) => void;
  onVerifyDomain: (domainId: number) => Promise<void>;
}

export function AddDomainSection({ domains, regions, onAddDomain, onDeleteDomain, onVerifyDomain }: AddDomainSectionProps) {
  const [step, setStep] = useState<DomainStep>(domains.length ? "list" : "form");
  const [name, setName] = useState("");
  const [region, setRegion] = useState<string>(regions.length > 0 ? regions[0].id.toString() : "");
  const [pendingDomain, setPendingDomain] = useState<BrandDomain | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [serverError, setServerError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!region && regions.length > 0) {
      setRegion(regions[0].id.toString());
    }
  }, [regions, region]);

  // Returns a plain ISO country code (e.g. "US") for a given region label,
  // or null if nothing matched — FlagIcon renders a globe icon for null.
  const findRegionIsoCode = (label: string): string | null => {
    const normalizedLabel = normalizeForMatch(label);

    // 1. Keyword match first — most reliable since it doesn't depend on
    //    Mockdata's REGIONS array lining up with the real region names.
    const keywordMatch = REGION_KEYWORD_TO_ISO.find(([keyword]) => normalizedLabel.includes(keyword));
    if (keywordMatch) return keywordMatch[1];

    // 2. Fall back to matching against the REGIONS mock metadata.
    const match = REGIONS.find(regionMeta => {
      const metaLabel = normalizeForMatch(regionMeta.label);
      const metaCode = normalizeForMatch(regionMeta.code);
      const metaName = metaLabel.split(" (")[0].trim();
      return (
        normalizedLabel.includes(metaCode) || metaCode.includes(normalizedLabel) ||
        normalizedLabel.includes(metaLabel) || metaLabel.includes(normalizedLabel) ||
        normalizedLabel.includes(metaName) || metaName.includes(normalizedLabel)
      );
    });
    if (match) return extractIsoCode(match.flag);

    return null;
  };

  const selectedRegion = regions.find(r => r.id.toString() === region);
  const selectedRegionIsoCode = selectedRegion ? findRegionIsoCode(selectedRegion.name) : null;

  const handleAddDomain = async () => {
    if (!name.trim() || !region) return;
    setServerError(null);

    try {
      const domain = await onAddDomain(name.trim(), Number(region));
      if (domain) {
        setPendingDomain(domain);
        setStep("verify");
      }
    } catch (error) {
      setServerError(getApiErrorMessage(error, "Unable to add domain."));
    }
  };

  const handleCopy = (value: string, key: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const filtered = domains.filter(
    d => d.name.toLowerCase().includes(search.toLowerCase()) && (statusFilter === "All Statuses" || d.status === statusFilter)
  );

  if (step === "form") {
    return (
      <div className="rounded-2xl bg-white">

          <p className="text-base font-bold text-gray-900 mb-1">Domain</p>
          <p className="text-sm text-gray-400 mb-6">Domain name and region for your sending and receiving.</p>

          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr,1fr] gap-8">
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Name</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="updates.AINewsletter.com"
                    className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Region</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center">
                      <FlagIcon code={selectedRegionIsoCode} className="w-5 h-3.5 rounded-xs object-cover" />
                    </span>
                    <select
                      value={region}
                      onChange={e => setRegion(e.target.value)}
                      className="w-full appearance-none bg-gray-100 rounded-xl pl-10 pr-9 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {regions.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <svg className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-start gap-5 mb-5">
                <span className="text-sm font-semibold text-gray-900">Advanced options</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showAdvanced}
                  onClick={() => setShowAdvanced(prev => !prev)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showAdvanced ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      showAdvanced ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className={showAdvanced ? "" : "opacity-50 pointer-events-none"}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-900">
                      Custom Return-Path
                    </label>
                    <input
                      type="text"
                      placeholder="send"
                      disabled={!showAdvanced}
                      className="w-full border border-gray-200 rounded-md px-4 py-4 text-sm bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-900">
                      Tracking Subdomain
                    </label>
                    <input
                      type="text"
                      placeholder="Links"
                      disabled={!showAdvanced}
                      className="w-full border border-gray-200 rounded-md px-4 py-4 text-sm bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    />
                  </div>
                </div>

                <div className="space-y-2 mb-5">
                  <p className="text-sm font-semibold text-gray-900 my-4">Tracking options</p>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      disabled={!showAdvanced}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Enable click tracking
                  </label>
                </div>
              </div>

              {serverError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
                  {serverError}
                </div>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleAddDomain}
                  disabled={!name.trim()}
                  className="inline-flex items-center gap-1.5 bg-white border border-blue-500 text-blue-600 text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  +Add New Domain
                </button>
                {domains.length > 0 && (
                  <button onClick={() => setStep("list")} className="text-sm text-gray-500 hover:text-gray-700">
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="relative rounded-2xl bg-blue-50/70 p-4 self-start">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-200 text-blue-700 flex items-center justify-center font-semibold text-sm shrink-0">Y</div>
                  <div>
                    <p className="text-sm leading-tight">
                      <span className="text-blue-600 font-semibold">Your Name</span>{" "}
                      <span className="text-gray-400 text-xs mx-2">&lt;youremail@</span>
                      <span className="inline-block h-5 min-w-16 bg-blue-100 rounded px-1 text-xs align-middle text-gray-500">
                        {name}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      to me
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </p>
                  </div>
                </div>
                <svg className="w-3.5 h-3.5 text-gray-400 mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="border-t border-blue-100 my-3" />
              <div className="space-y-2.5">
                <div className="h-2 bg-blue-100 rounded-full w-full" />
                <div className="h-2 bg-blue-100 rounded-full w-full opacity-90" />
                <div className="h-2 bg-blue-100 rounded-full w-4/5 opacity-70" />
                <div className="h-2 bg-blue-100 rounded-full w-3/5 opacity-50" />
              </div>
            </div>
          </div>
      </div>
    );
  }

  if (step === "verify" && pendingDomain) {
    return (
      <div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-6">
          <p className="text-sm font-semibold text-green-700 flex items-center gap-2">
            Domain <span>✓</span>
          </p>
          <p className="text-xs text-gray-500 mb-2">Domain name and region for your sending and receiving.</p>
          <span className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-1 text-sm text-gray-700">
            <FlagIcon code={selectedRegionIsoCode} className="w-4 h-2.75 rounded-xs object-cover" />
            {pendingDomain.name}
          </span>
        </div>

        <p className="text-sm font-semibold text-gray-800 mb-1">Fill in your DNS Records</p>
        <p className="text-xs text-gray-400 mb-4">Add the following DNS records in your domain provider.</p>

        <p className="text-xs font-semibold text-gray-500 mb-2">Domain Verification</p>

        <p className="text-base font-bold mt-6 mb-2">
          DKIM
        </p>
        <DnsTable title="DKIM" records={[pendingDomain.dkim]} onCopy={handleCopy} copied={copied} />

        <p className="text-base font-bold mt-6 mb-2">
          SPF
        </p>
        <DnsTable records={pendingDomain.spf} onCopy={handleCopy} copied={copied} />

        <p className="text-base font-bold mt-6 mb-2">
          <span className="underline mr-1">DMARC</span> <span className="text-gray-400 font-normal text-xs ">Optional</span>
        </p>
        <DnsTable records={[pendingDomain.dmarc]} onCopy={handleCopy} copied={copied} />

        <p className="text-base font-bold mt-6 mb-2">CNAME</p>
        <DnsTable records={pendingDomain.cnames} onCopy={handleCopy} copied={copied} />

        <div className="mt-4 mb-6">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={pendingDomain.enableReceiving}
              readOnly
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Enable Receiving
          </label>
        </div>

        <button
          onClick={async () => {
          if (!pendingDomain) return;
            await onVerifyDomain(pendingDomain.id);
            setStep("list");
          }}
          className="flex items-center gap-2 border border-green-500 text-green-600 text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-green-50 hover:border-white transition-colors"
        >
          ✓ I&apos;ve added the records
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row items-center gap-3 justify-between mb-4">
        <p className="text-sm font-semibold text-gray-800">Domains</p>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            {["All Statuses", "Pending", "Verified", "Failed"].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setName("");
              setStep("form");
            }}
            className="flex items-center gap-2 border border-blue-500 text-blue-600 text-sm font-semibold px-3 py-2 rounded-lg hover:bg-blue-50"
          >
            + Add New Domain
          </button>
        </div>
      </div>

      <div className="border border-gray-100 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-162.5">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" />
              </th>
              {["Brand Name", "Status", "Region", "Priority", "Actions"].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id} className="border-b border-gray-50">
                <td className="px-4 py-3">
                  <input type="checkbox" />
                </td>
                <td className="px-4 py-3 text-sm text-blue-600 flex items-center gap-2">🌐 {d.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      d.status === "Verified" ? "bg-green-100 text-green-700" : d.status === "Failed" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                    }`}
                  >
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{d.region}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{d.addedAt}</td>
                <td className="px-4 py-3">
                  <button onClick={() => onDeleteDomain(d.id)} className="p-2 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                    <img src={trashIcon} className="w-5 h-5" alt="Delete" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-sm text-gray-400 py-8">
                  No domains yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {domains.length > 0 && (
        <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
          <span>
            Page 1 – 1 of {domains.length} domain{domains.length === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <button className="hover:text-gray-700">Prev</button>
            <button className="hover:text-gray-700">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SMTP Settings ──────────────────────────────────────────────────────────

interface SmtpSettingsSectionProps {
  smtp: SMTPSettings;
  smtpProviders: { id: number; name: string }[];
  securityProtocols: { id: number; name: string }[];
  onSave: (smtp: SMTPSettings) => void;
  onCancel: () => void;
  saving?: boolean;
  error?: string | null;
}

export function SmtpSettingsSection({ smtp, smtpProviders, securityProtocols, onSave, onCancel, saving, error }: SmtpSettingsSectionProps) {
  const [values, setValues] = useState<SMTPSettings>(() => ({
    provider: smtp.provider || smtpProviders[0]?.name || "",
    providerId: smtp.providerId,
    host: smtp.host || "",
    port: smtp.port || "",
    security: smtp.security || "SSL",
    securityId: smtp.securityId,
    username: smtp.username || "",
    password: smtp.password,
  }));

  useEffect(() => {
    setValues({
      provider: smtp.provider || smtpProviders[0]?.name || "",
      providerId: smtp.providerId,
      host: smtp.host || "",
      port: smtp.port || "",
      security: smtp.security || "SSL",
      securityId: smtp.securityId,
      username: smtp.username || "",
      password: smtp.password,
    });
  }, [smtp, smtpProviders, securityProtocols]);

  return (
    <div>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-6">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Choose SMTP Provider</label>
          <select
            value={values.providerId ?? ""}
            onChange={e => {
              const providerId = Number(e.target.value);
              const providerName = smtpProviders.find(item => item.id === providerId)?.name ?? "";
              setValues(v => ({ ...v, provider: providerName, providerId }));
            }}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select provider</option>
            {smtpProviders.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Host</label>
          <input
            value={values.host}
            onChange={e => setValues(v => ({ ...v, host: e.target.value }))}
            placeholder="eg. smtp.gmail.com"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
          <input
            value={values.port}
            onChange={e => setValues(v => ({ ...v, port: e.target.value }))}
            placeholder="eg. 465"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">SSL / TLS</label>
          <select
            value={values.securityId ?? ""}
            onChange={e => {
              const securityId = Number(e.target.value);
              const securityName = securityProtocols.find(item => item.id === securityId)?.name ?? "";
              setValues(v => ({ ...v, security: securityName as SMTPSettings["security"], securityId }));
            }}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select protocol</option>
            {securityProtocols.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
          <input
            value={values.username}
            onChange={e => setValues(v => ({ ...v, username: e.target.value }))}
            placeholder="Username (Usually your email)"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
          <input
            type="password"
            value={values.password ?? ""}
            onChange={e => setValues(v => ({ ...v, password: e.target.value }))}
            placeholder="Leave Blank to not change"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex gap-3 mt-8">
        <Btn variant="outline" onClick={onCancel}>
          ✕ Cancel
        </Btn>
        <Btn onClick={() => onSave(values)} disabled={saving}>
          {saving ? "Saving..." : "Continue"} →
        </Btn>
      </div>
    </div>
  );
}

// ─── Privacy & Notifications ────────────────────────────────────────────────

interface PrivacySectionProps {
  privacy: PrivacySettings;
  loginEmail: string;
  onSave: (privacy: PrivacySettings) => void;
  onCancel: () => void;
  saving?: boolean;
}

export function PrivacySection({ privacy, loginEmail, onSave, onCancel, saving }: PrivacySectionProps) {
  const [values, setValues] = useState<PrivacySettings>(privacy);

  useEffect(() => {
    setValues(privacy);
  }, [privacy]);

  return (
    <div>
      <div className="bg-amber-50 border border-amber-100 text-amber-700 text-xs rounded-lg px-4 py-3 mb-6">
        Set your default email tracking preference when creating new campaigns or autoresponders. This can still be changed on the fly when you
        create new campaigns or autoresponders.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Track opens:</label>
          <select
            value={values.trackOpens}
            onChange={e => setValues(v => ({ ...v, trackOpens: e.target.value as PrivacySettings["trackOpens"] }))}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Track clicks:</label>
          <select
            value={values.trackClicks}
            onChange={e => setValues(v => ({ ...v, trackClicks: e.target.value as PrivacySettings["trackClicks"] }))}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Yes">Yes</option>
            <option value="Anonymously">Anonymously</option>
            <option value="No">No</option>
          </select>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
          Set Campaign Notification <span className="text-gray-400 text-xs">ⓘ</span>
        </p>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={values.notifyOnCampaign} onChange={e => setValues(v => ({ ...v, notifyOnCampaign: e.target.checked }))} />
          Send email notifications to my main login email ({loginEmail})
        </label>
      </div>

      <div className="flex gap-3 mt-8">
        <Btn variant="outline" onClick={onCancel}>
          ✕ Cancel
        </Btn>
        <Btn onClick={() => onSave(values)} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"} →
        </Btn>
      </div>
    </div>
  );
}

// ─── Sending Limit ──────────────────────────────────────────────────────────

const LIMIT_TYPES: SendingLimitType[] = ["Unlimited", "Monthly Limit", "Non Expiring Limit"];

interface SendingLimitSectionProps {
  limit: SendingLimitSettings;
  onSave: (limit: SendingLimitSettings) => void;
  onCancel: () => void;
  saving?: boolean;
}

export function SendingLimitSection({ limit, onSave, onCancel, saving }: SendingLimitSectionProps) {
  const [values, setValues] = useState<SendingLimitSettings>(limit);
  const isUnlimited = values.limitType === "Unlimited";

  useEffect(() => {
    setValues(limit);
  }, [limit]);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Choose Limit</label>
          <select
            value={values.limitType}
            onChange={e => setValues(v => ({ ...v, limitType: e.target.value as SendingLimitType }))}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {LIMIT_TYPES.map(t => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Number of emails per month</label>
          <input
            type="number"
            disabled={isUnlimited}
            value={values.emailsPerMonth ?? ""}
            onChange={e => setValues(v => ({ ...v, emailsPerMonth: Number(e.target.value) }))}
            placeholder="eg. 100000"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Reset limit on which day of the month?</label>
          <select
            disabled={isUnlimited}
            value={values.resetDay}
            onChange={e => setValues(v => ({ ...v, resetDay: Number(e.target.value) }))}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-3 mt-8">
        <Btn variant="outline" onClick={onCancel}>
          ✕ Cancel
        </Btn>
        <Btn onClick={() => onSave(values)} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"} →
        </Btn>
      </div>
    </div>
  );
}

// ─── Footer Settings ────────────────────────────────────────────────────────


interface FooterSettingsSectionProps {
  footer: FooterSettings;
  onSave: (footer: FooterSettings) => void;
  onCancel: () => void;
  saving?: boolean;
}


export function FooterSettingsSection({ footer, onSave, onCancel, saving }: FooterSettingsSectionProps) {
  const getInitialValues = (initial: FooterSettings): FooterSettings => ({
    unsubscribeText: initial.unsubscribeText ?? "",
    companyName: initial.companyName ?? "",
    address: initial.address ?? "",
    cityStateZip: initial.cityStateZip ?? "",
    removeBadge: initial.removeBadge ?? false,
  });

  const [values, setValues] = useState<FooterSettings>(() => getInitialValues(footer));

  useEffect(() => {
    setValues(getInitialValues(footer));
  }, [footer]);

  return (
    <div className="rounded-2xl bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_0.9fr_1.2fr] gap-5 items-start">
          {/* Unsubscribe information */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Unsubscribe information</label>
            <div className="rounded-2xl bg-gray-100 p-4">
              <textarea
                value={values.unsubscribeText ?? ""}
                onChange={e => setValues(v => ({ ...v, unsubscribeText: e.target.value }))}
                rows={5}
                className="w-full bg-transparent text-sm text-gray-500 leading-6 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Address</label>
            <div className="rounded-2xl bg-gray-100 p-4">
              <input
                value={values.companyName ?? ""}
                onChange={e => setValues(v => ({ ...v, companyName: e.target.value }))}
                placeholder="Company Name"
                className="w-full bg-transparent text-sm text-gray-800 leading-6 focus:outline-none block"
              />
              <input
                value={values.address ?? ""}
                onChange={e => setValues(v => ({ ...v, address: e.target.value }))}
                placeholder="99 Street Address"
                className="w-full bg-transparent text-sm text-gray-800 leading-6 focus:outline-none block"
              />
              <input
                value={values.cityStateZip ?? ""}
                onChange={e => setValues(v => ({ ...v, cityStateZip: e.target.value }))}
                placeholder="City, STATE 000-000"
                className="w-full bg-transparent text-sm text-gray-800 leading-6 focus:outline-none block"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-2xl bg-blue-50/70 p-4">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-blue-200 text-blue-700 flex items-center justify-center font-semibold text-sm shrink-0">Y</div>
              <div>
                <p className="text-sm leading-tight">
                  <span className="text-blue-600 font-semibold">Your Name</span>{" "}
                  <span className="text-gray-400 text-xs mx-2">&lt;youremail@</span>
                  <span className="inline-block h-3 w-16 bg-blue-100 rounded align-middle" />
                </p>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  to me
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </p>
              </div>
            </div>

            <div className="border-t border-blue-100 my-3" />

            <div className="h-2 bg-blue-100 rounded-full w-1/2 mx-auto mb-4" />

            <div className="text-center text-[12px] text-gray-700 leading-6 whitespace-pre-line">
              {values.unsubscribeText}
            </div>

            <div className="text-center text-[12px] text-gray-700 leading-6 mt-3">
              {values.companyName}
              <br />
              {values.address}
              <br />
              {values.cityStateZip}
            </div>

            {!values.removeBadge && (
              <div className="mt-4 flex justify-center">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 bg-linear-to-r from-blue-100 to-white px-3 py-1 rounded-full shadow-sm border border-blue-500">
                  Powered by
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-blue-600 text-white text-[9px] font-bold">
                   <img src={logo} alt="" />
                  </span>
                  <span className="text-black">Ai Newsletter</span>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <label className="flex items-center gap-3 text-sm font-bold text-gray-900">
            Remove Ai newsletter Badge.
            <span className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={Boolean(values.removeBadge)}
                onChange={e => setValues(v => ({ ...v, removeBadge: e.target.checked }))}
                className="sr-only"
              />
              <span className={`block w-11 h-6 rounded-full transition-colors ${values.removeBadge ? "bg-blue-600" : "bg-gray-300"}`} />
              <span
                className={`pointer-events-none absolute left-0.5 top-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  values.removeBadge ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </span>
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <Btn variant="outline" onClick={onCancel}>
            ✕ Cancel
          </Btn>
          <Btn onClick={() => onSave(values)} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"} →
          </Btn>
        </div>
    </div>
  );
}