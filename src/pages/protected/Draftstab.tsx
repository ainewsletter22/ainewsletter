import { useState } from "react";
import { MOCK_DRAFTS } from "../../types/Mockdata";
import type { EmailDraft } from "../../types/Types";
import searchIcon from "../../assets/searchIconBAW.svg";

interface Props {
  onSelectDraft: (d: EmailDraft) => void;
}

function DraftCard({ draft, onSelect, onView, onDelete }: {
  draft: EmailDraft;
  onSelect: () => void;
  onView: () => void;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-blue-200"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="relative">
        {/* Draft preview card */}
        <div className="p-4 bg-gray-50 min-h-40">
          {/* Mini email preview */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-700 font-medium mb-2">🤌 The Lemon Squeezy Slack is here, and you're invited to join!</p>
            <div className="rounded-lg overflow-hidden" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #7c3aed 50%, #db2777 100%)" }}>
              <div className="flex">
                <div className="bg-purple-900/80 p-2 w-1/3 space-y-1">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-1.5 bg-white/30 rounded" style={{ width: `${60 + i * 8}%` }} />
                  ))}
                </div>
                <div className="flex-1 p-2 space-y-1">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-1.5 bg-white/20 rounded" />
                  ))}
                  <div className="h-6 bg-pink-400/60 rounded mt-1" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hover actions */}
        {hover && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center gap-3">
            <button onClick={onSelect} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-700">Select</span>
            </button>
            <button onClick={onView} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-700">View</span>
            </button>
            <button onClick={onDelete} className="flex flex-col items-center gap-1">
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

      <div className="px-4 py-3">
        <p className="text-sm font-medium text-gray-800 truncate">{draft.title}</p>
      </div>
    </div>
  );
}

export function DraftsTab({ onSelectDraft }: Props) {
  const [drafts, setDrafts] = useState(MOCK_DRAFTS);
  const [search, setSearch] = useState("");

  const filtered = drafts.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      {/* Stats + search */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
            {drafts.length}
          </div>
          <p className="text-sm font-semibold text-gray-800">Total Email Drafts</p>
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

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map(d => (
          <DraftCard
            key={d.id}
            draft={d}
            onSelect={() => onSelectDraft(d)}
            onView={() => {}}
            onDelete={() => setDrafts(prev => prev.filter(x => x.id !== d.id))}
          />
        ))}
      </div>
    </div>
  );
}