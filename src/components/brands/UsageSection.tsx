import { useState } from "react";
import type { SendVia } from "../../types/Types";
import { brandService } from "../../services/brandService";

// ─── Shared bits ────────────────────────────────────────────────────────────

function ProgressBar({ pct, tone = "default" }: { pct: number; tone?: "default" | "danger" | "success" }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const barColor =
    tone === "danger" ? "bg-gradient-to-r from-orange-400 to-red-500" :
    tone === "success" ? "bg-green-500" :
    "bg-blue-500";
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-100">
      <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

function StatRow({
  label,
  value,
  max,
  tone = "default",
}: {
  label: string;
  value: number | "Unlimited";
  max?: number;
  tone?: "default" | "danger" | "success";
}) {
  const isUnlimited = value === "Unlimited";
  const pct = isUnlimited ? 0 : max ? (value / max) * 100 : 0;
  return (
    <div className="py-2.5">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-semibold text-gray-900">
          {isUnlimited ? "Unlimited" : `${value.toLocaleString()} / ${max?.toLocaleString()}`}
        </span>
      </div>
      {!isUnlimited && <ProgressBar pct={pct} tone={tone} />}
    </div>
  );
}

function PlanBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium text-gray-600">
      {label}
    </span>
  );
}

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-blue-600" : "bg-gray-300"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function UsageCard({
  title,
  description,
  action,
  planLabel,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  planLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6">
        <div>
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <p className="mt-1.5 text-sm text-gray-500 leading-5">{description}</p>
          {action && <div className="mt-4">{action}</div>}
        </div>
        <div>
          <div className="mb-1 flex justify-start">
            <PlanBadge label={planLabel} />
          </div>
          <div className="divide-y divide-gray-200 rounded-xl border-2 border-gray-100">{children}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Usage Section ──────────────────────────────────────────────────────────

interface UsageSectionProps {
  brandId: number;
  sendVia: SendVia | undefined;
  onSendViaChange: (mode: SendVia) => void;
  onUpgrade: (planType: "transactional" | "marketing") => void;
}

// TODO: wire these to real usage/billing endpoints once they exist — for now
// this mirrors the figures from the approved design so the tab isn't empty.
const MOCK_USAGE = {
  transactional: { renews: "Sep 11", used: 455456, limit: 500000 },
  marketing: { contactsUsed: 955, contactsLimit: 1000, segmentsUsed: 1, segmentsLimit: 3 },
  team: { aiCreditsUsed: 0, aiCreditsLimit: 1000, automationsUsed: 0, automationsLimit: 10 },
};

export function UsageSection({ brandId, sendVia, onSendViaChange, onUpgrade }: UsageSectionProps) {
  const [payAsYouGoTransactional, setPayAsYouGoTransactional] = useState(false);
  const [payAsYouGoAutomations, setPayAsYouGoAutomations] = useState(true);
  const [extraDomains, setExtraDomains] = useState(false);
  const [switching, setSwitching] = useState(false);

  const isTransactional = sendVia === "broadcast";
  const targetMode: SendVia = isTransactional ? "campaign" : "broadcast";

  const handleSwitchAccountType = async () => {
    setSwitching(true);
    try {
      await brandService.updateSendVia(brandId, targetMode);
      onSendViaChange(targetMode);
    } catch (error) {
      console.error("Failed to switch account type:", error);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="space-y-4">
      <UsageCard
        title="Transactional"
        description="Integrate email into your app using the Newsletter API or SMTP interface"
        planLabel="Scale"
        action={
          <div className="flex items-center gap-3">
            <button className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition-colors">
              Manage
            </button>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Active
            </span>
          </div>
        }
      >
        <div className="p-5">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-sm text-gray-600 my-3">
              Monthly Limit <span className="ml-1 text-xs text-gray-400 bg-gray-200 rounded-md p-2">Renews {MOCK_USAGE.transactional.renews}</span>
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {MOCK_USAGE.transactional.used.toLocaleString()} / {MOCK_USAGE.transactional.limit.toLocaleString()}
            </span>
          </div>
          <ProgressBar pct={(MOCK_USAGE.transactional.used / MOCK_USAGE.transactional.limit) * 100} tone="danger" />
        </div>
        <div className="px-5 py-3">
          <StatRow label="Daily Limit" value="Unlimited" />
        </div>
        
      </UsageCard>

      <UsageCard
        title="Marketing"
        description="Design and send marketing emails using broadcasts and audiences"
        planLabel="Free"
        action={
          <button
            onClick={() => onUpgrade("marketing")}
            className="rounded-lg bg-linear-to-r from-pink-500 to-purple-500 px-4 py-2 text-xs font-semibold text-white hover:shadow-md transition-shadow"
          >
            Upgrade
          </button>
        }
      >
        <div className="px-5 py-3">
          <StatRow label="Contacts Limit" value={MOCK_USAGE.marketing.contactsUsed} max={MOCK_USAGE.marketing.contactsLimit} tone="danger" />
        </div>
        <div className="px-5 py-3">
          <StatRow label="Segments Limit" value={MOCK_USAGE.marketing.segmentsUsed} max={MOCK_USAGE.marketing.segmentsLimit} tone="success" />
        </div>
        <div className="px-5 py-3">
          <StatRow label="Broadcast Limit" value="Unlimited" />
        </div>
      </UsageCard>

      <UsageCard
        title="Team"
        description="Understand the quotas and limits of your team"
        planLabel="Scale"
        action={
          <button className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition-colors">
            Manage
          </button>
        }
      >
        <div className="px-5 py-3">
          <StatRow label="AI Credits" value={MOCK_USAGE.team.aiCreditsUsed} max={MOCK_USAGE.team.aiCreditsLimit} />
        </div>
        <div className="px-5 py-3">
          <StatRow label="Automations" value={MOCK_USAGE.team.automationsUsed} max={MOCK_USAGE.team.automationsLimit} />
        </div>
        <div className="px-5 py-3">
          <StatRow label="Domains" value="Unlimited" />
        </div>
      </UsageCard>

      {/* Pay-as-you-go */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900">Pay-as-you-go</h3>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Paid Feature</span>
            </div>
            <p className="mt-1.5 text-sm text-gray-500 leading-5">Continue using AI Newsletter beyond your quota</p>
          </div>
          <div className="space-y-5">
            <div className="flex flex-col items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Transactional – $1.49/per 1,000 Emails.</p>
                <p className="mt-0.5 text-xs text-gray-500 leading-5 max-w-sm">
                  When enabled, you will continue sending and receiving transactional emails beyond your quota. AI Newsletter will
                  automatically charge $0.70 for each additional bucket of 1,000 emails.
                </p>
              </div>
              <ToggleSwitch checked={payAsYouGoTransactional} onChange={setPayAsYouGoTransactional} />
            </div>
            <div className="flex flex-col items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Automations – $0.0215/ Per Run</p>
                <p className="mt-0.5 text-xs text-gray-500 leading-5 max-w-sm">
                  Start with 10,000 Automation Runs for free, and scale as you need. Resend automatically charges for each run beyond the
                  free limit.
                </p>
              </div>
              <ToggleSwitch checked={payAsYouGoAutomations} onChange={setPayAsYouGoAutomations} />
            </div>
          </div>
        </div>
      </div>

      {/* Add-ons */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6">
          <div>
            <h3 className="text-base font-bold text-gray-900">Add-ons</h3>
            <p className="mt-1.5 text-sm text-gray-500 leading-5">Get even more of AI Newsletter with special add-ons</p>
          </div>
          <div className="space-y-5">
            <div className="flex flex-col items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Domains – $39 / Mo</p>
                <p className="mt-0.5 text-xs text-gray-500 leading-5 max-w-sm">Adds 100 domains on top of the number included in your plan.</p>
              </div>
              <ToggleSwitch checked={extraDomains} onChange={setExtraDomains} />
            </div>
            <div className="flex flex-col items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Dedicated IPs – $45 / Mo</p>
                <p className="mt-0.5 text-xs text-gray-500 leading-5 max-w-sm">
                  Resend will provision, warm up, monitor and auto-scale the dedicated IP to ensure consistent deliverability and
                  performance.
                </p>
                <p className="mt-1 text-xs text-gray-400">Check if a dedicated IP would be right for you</p>
              </div>
              <button className="shrink-0 rounded-md border-2 border-gray-200 bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition-colors">
                Request dedicated IP
              </button>
            </div>
            <div className="flex flex-col items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Account Type Switch – $10 / Mo</p>
                <p className="mt-0.5 text-xs text-gray-500 leading-5 max-w-sm">Easily toggle between Transactional and Marketing Brands anytime.</p>
              </div>
              <button
                onClick={handleSwitchAccountType}
                disabled={switching}
                className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {switching ? "Switching…" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}