import { useState, type ReactNode } from "react";

interface AccordionProps {
  icon: ReactNode;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function Accordion({ icon, title, defaultOpen = false, children }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`border rounded-xl overflow-hidden ${open ? "border-blue-200" : "border-gray-100"}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-4 text-sm font-semibold transition-colors ${
          open ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="p-5 bg-white border-t border-gray-100">{children}</div>}
    </div>
  );
}

// ─── Small inline icon set (kept local so brand components stay self-contained) ──

export const icons = {
  globe: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 10h15M10 2.5c2.2 2.2 2.2 13 0 15M10 2.5c-2.2 2.2-2.2 13 0 15" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  mail: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 5.5l7 5.5 7-5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  bell: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M10 2a6 6 0 00-6 6v3l-1.5 2.5h15L16 11V8a6 6 0 00-6-6z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 15.5a2 2 0 004 0" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  infinity: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path
        d="M5.5 7a3.5 3.5 0 100 6c1.9 0 3-1.5 4.5-3.5C11.5 7.5 12.6 6 14.5 6a3.5 3.5 0 110 7c-1.9 0-3-1.5-4.5-3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  frame: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path
        d="M2.5 6V3.5H5M15 3.5h2.5V6M17.5 14v2.5H15M5 16.5H2.5V14"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};