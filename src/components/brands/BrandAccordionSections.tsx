import { useState } from "react";
import trashIcon from "../../assets/trashIcon.svg";
import { Btn } from "../Modalshells";
import { REGIONS, SMTP_PROVIDERS } from "../../types/Mockdata";
import type {
  BrandDomain,
  DNSRecord,
  SMTPSettings,
  PrivacySettings,
  SendingLimitSettings,
  SendingLimitType,
  FooterSettings,
} from "../../types/Types";

// ─── Shared bits ────────────────────────────────────────────────────────────
function DnsTable({ title, records, onCopy, copied }: { title?: string; records: DNSRecord[]; onCopy: (value: string, key: string) => void; copied: string | null }) {
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden mb-2 overflow-x-auto">
      <table className="w-full min-w-[600px]">
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
          {records.map((r, i) => {
            const nameKey = `${title ?? r.type}-name-${i}`;
            const contentKey = `${title ?? r.type}-content-${i}`;
            return (
              <tr key={i} className="border-b border-gray-50 bg-blue-50/30">
                <td className="px-4 py-2 text-sm text-blue-600 font-medium">{r.type}</td>
                <td className="px-4 py-2 text-sm text-gray-600">
                  <button onClick={() => onCopy(r.name, nameKey)} className="flex items-center gap-1 hover:text-blue-600">
                    <span className="truncate max-w-[160px]">{r.name}</span>
                    <span>{copied === nameKey ? "✓" : "⧉"}</span>
                  </button>
                </td>
                <td className="px-4 py-2 text-sm text-gray-600">
                  <button onClick={() => onCopy(r.content, contentKey)} className="flex items-center gap-1 hover:text-blue-600">
                    <span className="truncate max-w-[160px]">{r.content}</span>
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

// ─── Add domain ─────────────────────────────────────────────────────────────

type DomainStep = "list" | "form" | "verify";

interface AddDomainSectionProps {
  domains: BrandDomain[];
  onAddDomain: (name: string, region: string) => Promise<BrandDomain | undefined>;
  onDeleteDomain: (domainId: number) => void;
  onVerifyDomain: (domainId: number) => Promise<void>;
}

export function AddDomainSection({ domains, onAddDomain, onDeleteDomain, onVerifyDomain }: AddDomainSectionProps) {
  const [step, setStep] = useState<DomainStep>(domains.length ? "list" : "form");
  const [name, setName] = useState("");
  const [region, setRegion] = useState(REGIONS[0].code);
  const [pendingDomain, setPendingDomain] = useState<BrandDomain | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [copied, setCopied] = useState<string | null>(null);

  const regionLabel = (code: string) => REGIONS.find(r => r.code === code)?.label ?? code;

  const handleAddDomain = async () => {
    if (!name.trim()) return;
    const domain = await onAddDomain(name.trim(), regionLabel(region));
    if (domain) {
      setPendingDomain(domain);
      setStep("verify");
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
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base leading-none">
                      {REGIONS.find(r => r.code === region)?.flag ?? "🇺🇸"}
                    </span>
                    <select
                      value={region}
                      onChange={e => setRegion(e.target.value)}
                      className="w-full appearance-none bg-gray-100 rounded-xl pl-10 pr-9 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {REGIONS.map(r => (
                        <option key={r.code} value={r.code}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <svg className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAdvanced(prev => !prev)}
                className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:text-blue-600 mb-5"
              >
                <svg className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                Advanced options
              </button>

              {showAdvanced && (
                <div className="mb-5 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <p className="text-sm font-semibold text-gray-800 mb-3">Advanced options</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm text-gray-600">DNS TTL</label>
                      <input
                        value="3600"
                        readOnly
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm text-gray-600">Priority</label>
                      <input
                        value="Auto"
                        readOnly
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white"
                      />
                    </div>
                  </div>
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
                      <span className="text-gray-400 text-xs">&lt;youremail@</span>
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
            🇺🇸 {pendingDomain.name}
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
        <table className="w-full min-w-[650px]">
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
  onSave: (smtp: SMTPSettings) => void;
  onCancel: () => void;
  saving?: boolean;
}

export function SmtpSettingsSection({ smtp, onSave, onCancel, saving }: SmtpSettingsSectionProps) {
  const [values, setValues] = useState<SMTPSettings>(smtp);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Choose SMTP Provider</label>
          <select
            value={values.provider}
            onChange={e => setValues(v => ({ ...v, provider: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SMTP_PROVIDERS.map(p => (
              <option key={p}>{p}</option>
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
            value={values.security}
            onChange={e => setValues(v => ({ ...v, security: e.target.value as SMTPSettings["security"] }))}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="SSL">SSL</option>
            <option value="TLS">TLS</option>
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

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
          <label className="block text-xs font-medium text-gray-700 mb-2">Currently used</label>
          <input
            type="number"
            value={values.currentlyUsed}
            onChange={e => setValues(v => ({ ...v, currentlyUsed: Number(e.target.value) }))}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
  const [values, setValues] = useState<FooterSettings>(footer);
 
  return (
    <div className="rounded-2xl bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_0.9fr_1.2fr] gap-5 items-start">
          {/* Unsubscribe information */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Unsubscribe information</label>
            <div className="rounded-2xl bg-gray-100 p-4">
              <textarea
                value={values.unsubscribeText}
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
                value={values.companyName}
                onChange={e => setValues(v => ({ ...v, companyName: e.target.value }))}
                placeholder="Company Name"
                className="w-full bg-transparent text-sm text-gray-800 leading-6 focus:outline-none block"
              />
              <input
                value={values.address}
                onChange={e => setValues(v => ({ ...v, address: e.target.value }))}
                placeholder="99 Street Address"
                className="w-full bg-transparent text-sm text-gray-800 leading-6 focus:outline-none block"
              />
              <input
                value={values.cityStateZip}
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
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 bg-white px-3 py-1 rounded-full shadow-sm">
                  Powered by
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-blue-600 text-white text-[9px] font-bold">
                    N
                  </span>
                  Ai Newsletter
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
                checked={values.removeBadge}
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