import { useState, useEffect } from "react";
import { clientService } from "../../store/clientService";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: number | string; name: string }[];
  placeholder?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 pr-9 cursor-pointer"
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronIcon />
        </div>
      </div>
    </div>
  );
}

export default function OnboardingModal({ isOpen, onClose, onContinue }: OnboardingModalProps) {
  const [usage, setUsage] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [role, setRole] = useState("");
  const [companySize, setCompanySize] = useState("");

  const [meta, setMeta] = useState<{
    purposes: any[];
    kinds: any[];
    sizes: any[];
    roles: any[];
  }>({
    purposes: [],
    kinds: [],
    sizes: [],
    roles: [],
  });

  useEffect(() => {
    if (isOpen) {
      clientService.getOnboardingMeta().then((data) => {
        setMeta({
          purposes: data.purposes,
          kinds: data.kinds,
          sizes: data.sizes,
          roles: data.roles,
        });
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 px-8 py-8 z-10">
        <h2 className="text-xl font-bold text-gray-900 text-center mb-6">
          Let's know more about you
        </h2>

        <SelectField
          label="What will you be using Ai Newsletter for?"
          value={usage}
          onChange={setUsage}
          options={meta.purposes}
          placeholder="Select purpose"
        />

        <SelectField
          label="What kind of company is it?"
          value={companyType}
          onChange={setCompanyType}
          options={meta.kinds}
          placeholder="Select a company type"
        />

        <SelectField
          label="What is your role there"
          value={role}
          onChange={setRole}
          options={meta.roles}
          placeholder="Select your role"
        />

        <SelectField
          label="How big is the company"
          value={companySize}
          onChange={setCompanySize}
          options={meta.sizes}
          placeholder="Select size"
        />

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-8 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={onContinue}
            className="px-8 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            Continue <span className="text-base">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}