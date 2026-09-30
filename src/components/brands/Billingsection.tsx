import { useState } from "react";

interface Subscription {
  key: "transactional" | "marketing";
  name: string;
  renews?: string;
  quantityLabel: string;
  priceLabel: string;
  priceValue: number;
}

// TODO: replace with real subscription data from the billing service once it exists.
const MOCK_SUBSCRIPTIONS: Subscription[] = [
  { key: "transactional", name: "Transactional", renews: "Sep 11", quantityLabel: "500,000 Contacts", priceLabel: "$350 / mo", priceValue: 350 },
  { key: "marketing", name: "Marketing", quantityLabel: "1,000 Emails", priceLabel: "$0 / mo", priceValue: 0 },
];

interface BillingSectionProps {
  billingEmail: string;
  sendVia?: "campaign" | "broadcast";
  onSaveBillingEmail: (email: string) => void;
  onSelectSendVia: (sendVia: "campaign" | "broadcast") => void;
  onUpgrade: (planType: "transactional" | "marketing") => void;
  onViewPlans: () => void;
}

export function BillingSection({ billingEmail, sendVia = "campaign", onSaveBillingEmail, onSelectSendVia, onUpgrade, onViewPlans }: BillingSectionProps) {
  const [openMenu, setOpenMenu] = useState<Subscription["key"] | null>(null);
  const [email, setEmail] = useState(billingEmail);
  const [saving, setSaving] = useState(false);

  const total = MOCK_SUBSCRIPTIONS.reduce((sum, s) => sum + s.priceValue, 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveBillingEmail(email);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectSubscription = (key: Subscription["key"]) => {
    if (key === "transactional") {
      onSelectSendVia("campaign");
    } else {
      onSelectSendVia("broadcast");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Billing</h2>
        <p className="text-sm text-gray-500">Check and handle your plans and payments</p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-4">Subscriptions</h3>

        <div className="divide-y divide-gray-100">
          {MOCK_SUBSCRIPTIONS.map((sub) => {
            const isSelected = (sub.key === "transactional" && sendVia === "campaign") ||
                              (sub.key === "marketing" && sendVia === "broadcast");
            return (
              <div
                key={sub.key}
                onClick={() => handleSelectSubscription(sub.key)}
                className={`flex items-center justify-between gap-4 py-4 cursor-pointer transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
              >
                <div className="flex items-center gap-2 min-w-40">
                  <span className={`text-sm font-medium ${isSelected ? "text-blue-700" : "text-gray-900"}`}>{sub.name}</span>
                  {isSelected && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">Active</span>
                  )}
                  {sub.renews && !isSelected && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">Renews {sub.renews}</span>
                  )}
                </div>
                <span className="flex-1 text-sm text-gray-500">{sub.quantityLabel}</span>
                <span className="text-sm font-semibold text-gray-900 w-20 text-right">{sub.priceLabel}</span>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenu(openMenu === sub.key ? null : sub.key);
                    }}
                    aria-label={`${sub.name} options`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="8" cy="3" r="1.4" />
                      <circle cx="8" cy="8" r="1.4" />
                      <circle cx="8" cy="13" r="1.4" />
                    </svg>
                  </button>
                  {openMenu === sub.key && (
                    <div className="absolute right-0 top-9 z-10 w-44 rounded-xl border border-gray-100 bg-white py-1.5 shadow-lg">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenu(null);
                          onUpgrade(sub.key === "transactional" ? "transactional" : "marketing");
                        }}
                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Upgrade subscription
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
          <span className="text-sm font-bold text-gray-900">Total</span>
          <span className="text-sm font-bold text-gray-900">${total} / mo</span>
        </div>

        <button
          onClick={onViewPlans}
          className="mt-5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          View Plans
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-gray-900">Billing Email</h3>
        <p className="mt-1 text-sm text-gray-500">Invoices will be sent to the following email address</p>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          className="mt-4 w-full max-w-md rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:bg-white"
        />

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}