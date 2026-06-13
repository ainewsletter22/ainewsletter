import type { ReactNode } from "react";

// ─── Overlay ──────────────────────────────────────────────────────────────────


interface OverlayProps {
  children: ReactNode;
  onClose?: () => void;
  blur?: boolean;
}

export function Overlay({ children, onClose, blur = true }: OverlayProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${blur ? "bg-black/40 backdrop-blur-sm" : "bg-black/30"}`}
      onClick={e => { if (e.target === e.currentTarget && onClose) onClose(); }}
    >
      {children}
    </div>
  );
}

// ─── Sky background (used in AI Agent flow) ───────────────────────────────────

export function SkyOverlay({ children }: { children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(180deg, #c9dff7 0%, #ddeeff 40%, #eef6ff 100%)",
      }}
    >
      {/* floating agent avatars */}
      <div className="absolute left-16 top-32 flex flex-col items-center gap-1 animate-pulse">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 overflow-hidden border-2 border-white shadow-lg flex items-center justify-center text-2xl">👩‍💼</div>
        <span className="text-xs font-medium bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">Storytelling Agent</span>
      </div>
      <div className="absolute right-16 top-28 flex flex-col items-center gap-1">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-200 to-indigo-300 overflow-hidden border-2 border-white shadow-lg flex items-center justify-center text-2xl">👨‍💻</div>
        <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Upsell Agent</span>
      </div>
      <div className="absolute left-16 bottom-28 flex flex-col items-center gap-1">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-200 to-slate-300 overflow-hidden border-2 border-white shadow-lg flex items-center justify-center text-2xl">👦</div>
        <span className="text-xs font-medium bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Blog Writer Agent</span>
      </div>
      <div className="absolute right-16 bottom-32 flex flex-col items-center gap-1">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-200 to-rose-300 overflow-hidden border-2 border-white shadow-lg flex items-center justify-center text-xl">👩‍🦰</div>
        <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Quote/Stat Finder</span>
      </div>
      {children}
    </div>
  );
}

// ─── Buttons ──────────────────────────────────────────────────────────────────

interface BtnProps {
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  variant?: "primary" | "outline";
  type?: "button" | "submit";
  className?: string;
}

export function Btn({ onClick, disabled, children, variant = "primary", type = "button", className = "" }: BtnProps) {
  if (variant === "outline") {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center gap-2 border border-gray-300 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${className}`}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

// ─── Modal Card ───────────────────────────────────────────────────────────────

interface ModalCardProps {
  children: ReactNode;
  className?: string;
}

export function ModalCard({ children, className = "" }: ModalCardProps) {
  return (
    <div className={`bg-white rounded-2xl shadow-2xl w-full relative ${className}`}>
      {children}
    </div>
  );
}