import { useState } from "react";
import { MOCK_TEMPLATES } from "../../types/Mockdata";
import type { EmailTemplate } from "../../types/Types";
import searchIcon from "../../assets/searchIconBAW.svg";

interface Props {
  onSelectTemplate: (t: EmailTemplate) => void;
  onCreateBlank: () => void;
}

export function TemplateMockup({  index }: { color: string; index: number }) {
  const layouts = [
    // Layout 0: Card 2 (Large top banner, bold title, 5 faded lines, footer bar)
    <svg key={0} viewBox="0 0 120 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Top broad header block */}
      <rect x="10" y="10" width="100" height="30" rx="4" fill="#dbeafe" />
      {/* Thick title line below banner */}
      <rect x="16" y="52" width="80" height="7" rx="3.5" fill="#dbeafe" />
      {/* 5 Left-aligned body lines with staggered widths matching the image */}
      <rect x="16" y="68" width="70" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="16" y="78" width="90" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="16" y="88" width="82" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="16" y="98" width="74" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="16" y="108" width="56" height="3" rx="1.5" fill="#e2e8f0" />
      {/* Bottom footer block */}
      <rect x="10" y="118" width="100" height="14" rx="4" fill="#dbeafe" />
    </svg>,

    // Layout 1: Card 3 (Pill title, 2 small lines, center portrait box, 3 footer lines)
    <svg key={1} viewBox="0 0 120 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Top rounded pill header */}
      <rect x="14" y="14" width="92" height="10" rx="5" fill="#dbeafe" />
      {/* 2 upper sub-lines (centered/tapered layout) */}
      <rect x="22" y="32" width="76" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="34" y="42" width="52" height="3" rx="1.5" fill="#e2e8f0" />
      {/* Center vertical portrait block */}
      <rect x="46" y="52" width="28" height="42" rx="4" fill="#dbeafe" />
      {/* 3 lower footer lines */}
      <rect x="24" y="102" width="72" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="20" y="112" width="80" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="36" y="122" width="48" height="3" rx="1.5" fill="#e2e8f0" />
    </svg>,

    // Layout 2: Card 4 (Pill title, 5 stacked body lines, 2 asymmetric asymmetric blocks)
    <svg key={2} viewBox="0 0 120 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Top rounded pill header */}
      <rect x="12" y="14" width="96" height="10" rx="5" fill="#dbeafe" />
      {/* 5 Left-aligned body lines */}
      <rect x="12" y="34" width="88" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="12" y="44" width="72" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="12" y="54" width="80" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="12" y="64" width="64" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="12" y="74" width="76" height="3" rx="1.5" fill="#e2e8f0" />
      {/* 2 Bottom blocks (Left is slightly smaller, right is wider exactly like the image) */}
      <rect x="10" y="90" width="38" height="36" rx="4" fill="#dbeafe" />
      <rect x="52" y="90" width="58" height="36" rx="4" fill="#dbeafe" />
    </svg>,

    // Layout 3: Card 5 (Pill title, 7 long lines close together, 3 even footer boxes)
    <svg key={3} viewBox="0 0 120 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Top rounded pill header */}
      <rect x="14" y="14" width="82" height="10" rx="5" fill="#dbeafe" />
      {/* 7 Stacked body lines with exact image alignment */}
      <rect x="14" y="34" width="92" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="14" y="42" width="78" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="14" y="50" width="88" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="14" y="58" width="92" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="14" y="66" width="72" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="14" y="74" width="84" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="14" y="82" width="64" height="3" rx="1.5" fill="#e2e8f0" />
      {/* 3 Grid footer blocks side-by-side */}
      <rect x="12" y="94" width="30" height="32" rx="4" fill="#dbeafe" />
      <rect x="45" y="94" width="30" height="32" rx="4" fill="#dbeafe" />
      <rect x="78" y="94" width="30" height="32" rx="4" fill="#dbeafe" />
    </svg>,

    // Layout 4: Card 6 (Pill title, 1 line, large landscape box, 4 footer lines)
    <svg key={4} viewBox="0 0 120 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Top rounded pill header */}
      <rect x="14" y="14" width="92" height="10" rx="5" fill="#dbeafe" />
      {/* Thin line right above the large box */}
      <rect x="20" y="34" width="80" height="3" rx="1.5" fill="#e2e8f0" />
      {/* Large central landscape block */}
      <rect x="14" y="44" width="92" height="44" rx="6" fill="#dbeafe" />
      {/* 4 Bottom body lines */}
      <rect x="20" y="98" width="80" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="24" y="108" width="72" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="16" y="118" width="88" height="3" rx="1.5" fill="#e2e8f0" />
      <rect x="32" y="128" width="56" height="3" rx="1.5" fill="#e2e8f0" />
    </svg>
  ];

  return layouts[index % layouts.length];
}

function TemplateCard({ template, onSelect, onView, onDelete }: {
  template: EmailTemplate;
  onSelect: () => void;
  onView: () => void;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="relative border-2 border-gray-100 rounded-2xl overflow-hidden cursor-pointer transition-all hover:border-blue-300 hover:shadow-md bg-white"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="h-36 flex items-center justify-center bg-gray-50">
        <TemplateMockup color={template.thumbnail} index={template.id - 1} />
      </div>

      {/* Hover overlay */}
      {hover && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center gap-3">
          <button
            onClick={onSelect}
            className="flex flex-col items-center gap-1 p-2 hover:text-blue-600 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-700">Select</span>
          </button>
          <button
            onClick={onView}
            className="flex flex-col items-center gap-1 p-2 hover:text-blue-600 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-700">View</span>
          </button>
          <button
            onClick={onDelete}
            className="flex flex-col items-center gap-1 p-2 hover:text-red-600 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-700">Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function TemplatesTab({ onSelectTemplate, onCreateBlank }: Props) {
  const [templates, setTemplates] = useState(MOCK_TEMPLATES);
  const [search, setSearch] = useState("");

  const filtered = templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      {/* Blank + template picker row */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
        {/* Blank template */}
        <button
          onClick={onCreateBlank}
          className="shrink-0 w-36 h-36 border-2 border-blue-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-all bg-white"
        >
          <div className="rounded-full w-5 h-5 flex items-center justify-center bg-[#64a8f7] text-[#337DD3] text-2xl text-center pt-3.5 pb-5 pl-4.5 pr-4">+</div>
          <span className="text-sm text-blue-600 font-medium">Blank Template</span>
        </button>

        {/* Preset template mockups (non-interactive top row) */}
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="shrink-0 w-36 h-36 border border-gray-100 rounded-2xl overflow-hidden bg-gray-50">
            <TemplateMockup color="#bfdbfe" index={i} />
          </div>
        ))}
      </div>

      {/* Stats + search */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
            {templates.length}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Total Email Templates</p>
            <p className="text-xs text-gray-500">27 Remaining</p>
          </div>
        </div>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm"><img src={searchIcon} alt="Search" /></span>
          <input
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52 bg-white"
            placeholder="search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map(t => (
          <div key={t.id} className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
            <TemplateCard
              template={t}
              onSelect={() => onSelectTemplate(t)}
              onView={() => {}}
              onDelete={() => setTemplates(prev => prev.filter(x => x.id !== t.id))}
            />
            <p className="text-xs text-gray-500 mt-2 px-1 truncate">🤌 The Lemon Squeezy Slack is here, and you're invited to join!</p>
          </div>
        ))}
      </div>
    </div>
  );
}