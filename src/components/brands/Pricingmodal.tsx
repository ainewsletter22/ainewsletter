import { useState } from "react";

type PlanType = "transactional" | "marketing";

interface PlanFeature {
  label: string;
  included: boolean;
}

interface Plan {
  name: string;
  recommended?: boolean;
  price: string;
  cadence?: string;
  capacityLabel: string;
  features: PlanFeature[];
  cta: string;
  isCurrent?: boolean;
}

// TODO: source ticks/plans from the real pricing service — these mirror the
// approved design so the modal isn't empty while that integration lands.
const TICKS = [1000, 5000, 10000, 25000, 50000, 100000, 150000, 200000];

const MARKETING_PLANS: Plan[] = [
  {
    name: "Free",
    price: "$0",
    cadence: "/ Mo",
    capacityLabel: "1,000 contacts\nUnlimited broadcast sending",
    isCurrent: true,
    cta: "Current plan",
    features: [
      { label: "Ticket support", included: true },
      { label: "10,000 automation runs", included: true },
      { label: "3 segments", included: true },
      { label: "3 domains", included: true },
      { label: "5 AI credits / mo", included: true },
      { label: "Marketing analytics", included: false },
      { label: "Dedicated IPs", included: false },
      { label: "Single Sign-On", included: false },
    ],
  },
  {
    name: "Pro marketing",
    recommended: true,
    price: "$180",
    cadence: "/ Mo",
    capacityLabel: "25,000 contacts\nUnlimited broadcast sending",
    cta: "Change to $180 / mo",
    features: [
      { label: "Slack & ticket support", included: true },
      { label: "10,000 automation runs", included: true },
      { label: "Unlimited segments", included: true },
      { label: "Unlimited domains", included: true },
      { label: "100 AI credits / mo", included: true },
      { label: "Marketing analytics", included: true },
      { label: "Dedicated IP with add-on", included: false },
      { label: "Single Sign-On", included: false },
    ],
  },
  {
    name: "Custom",
    price: "Enterprise",
    capacityLabel: "Performance at any scale\nUnlimited broadcast sending",
    cta: "Contact Us",
    features: [
      { label: "Priority support", included: true },
      { label: "Flexible automation runs", included: true },
      { label: "Unlimited segments", included: true },
      { label: "Unlimited domains", included: true },
      { label: "Flexible AI credits", included: true },
      { label: "Marketing analytics", included: true },
      { label: "Dedicated IPs included", included: true },
      { label: "Single Sign-On included", included: true },
    ],
  },
];

const TRANSACTIONAL_PLANS: Plan[] = [
  {
    name: "Scale",
    price: "$350",
    cadence: "/ Mo",
    capacityLabel: "500,000 emails / mo\nUnlimited daily sends",
    isCurrent: true,
    cta: "Current plan",
    features: [
      { label: "Ticket support", included: true },
      { label: "SMTP + API access", included: true },
      { label: "Unlimited domains", included: true },
      { label: "Delivery analytics", included: true },
      { label: "Pay-as-you-go overage", included: true },
      { label: "Dedicated IPs", included: false },
      { label: "Single Sign-On", included: false },
      { label: "Priority support", included: false },
    ],
  },
  {
    name: "Scale Plus",
    recommended: true,
    price: "$650",
    cadence: "/ Mo",
    capacityLabel: "1,500,000 emails / mo\nUnlimited daily sends",
    cta: "Change to $650 / mo",
    features: [
      { label: "Slack & ticket support", included: true },
      { label: "SMTP + API access", included: true },
      { label: "Unlimited domains", included: true },
      { label: "Delivery analytics", included: true },
      { label: "Pay-as-you-go overage", included: true },
      { label: "Dedicated IP with add-on", included: true },
      { label: "Single Sign-On", included: false },
      { label: "Priority support", included: false },
    ],
  },
  {
    name: "Custom",
    price: "Enterprise",
    capacityLabel: "Performance at any scale\nUnlimited daily sends",
    cta: "Contact Us",
    features: [
      { label: "Priority support", included: true },
      { label: "SMTP + API access", included: true },
      { label: "Unlimited domains", included: true },
      { label: "Delivery analytics", included: true },
      { label: "Pay-as-you-go overage", included: true },
      { label: "Dedicated IPs included", included: true },
      { label: "Single Sign-On included", included: true },
      { label: "Custom SLAs", included: true },
    ],
  },
];

function CheckIcon({ included }: { included: boolean }) {
  return included ? (
    <svg className="h-4 w-4 text-green-500 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.5l3 3 7-7" />
    </svg>
  ) : (
    <svg className="h-4 w-4 text-gray-300 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

interface PricingModalProps {
  initialPlanType: PlanType;
  onClose: () => void;
  onSelectPlan: (planType: PlanType, planName: string) => void;
}

export function PricingModal({ initialPlanType, onClose, onSelectPlan }: PricingModalProps) {
  const [planType, setPlanType] = useState<PlanType>(initialPlanType);
  const [tickIndex, setTickIndex] = useState(3);

  const plans = planType === "marketing" ? MARKETING_PLANS : TRANSACTIONAL_PLANS;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10">
      <div className="w-full max-w-5xl rounded-3xl bg-white p-6 md:p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="inline-flex rounded-xl border border-gray-200 p-1">
            <button
              onClick={() => setPlanType("transactional")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                planType === "transactional" ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Transactional Emails
            </button>
            <button
              onClick={() => setPlanType("marketing")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                planType === "marketing" ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Marketing Emails
            </button>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" d="M4 4l10 10M14 4L4 14" />
            </svg>
          </button>
        </div>

        <div className="px-2 mb-10">
          <input
            type="range"
            min={0}
            max={TICKS.length - 1}
            step={1}
            value={tickIndex}
            onChange={(e) => setTickIndex(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="mt-2 flex justify-between text-xs text-gray-400">
            {TICKS.map((t) => (
              <span key={t}>{t.toLocaleString()}</span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 flex flex-col ${
                plan.recommended ? "border-blue-400 bg-blue-50/40 shadow-md" : "border-gray-200"
              }`}
            >
              <div className="mb-3">
                <p className="text-sm font-semibold text-gray-500">
                  {plan.name} {plan.recommended && <span className="text-blue-600">(Recommended)</span>}
                </p>
                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {plan.price} {plan.cadence && <span className="text-base font-medium text-gray-400">{plan.cadence}</span>}
                </p>
              </div>

              <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-600 whitespace-pre-line leading-5">
                {plan.capacityLabel}
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f.label} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckIcon included={f.included} />
                    {f.label}
                  </li>
                ))}
              </ul>

              <button
                disabled={plan.isCurrent}
                onClick={() => onSelectPlan(planType, plan.name)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                  plan.isCurrent
                    ? "border border-gray-200 text-gray-400 cursor-default"
                    : plan.recommended
                    ? "bg-blue-600 text-white hover:bg-blue-500"
                    : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}