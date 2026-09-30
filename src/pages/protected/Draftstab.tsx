import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import type { EmailDraft } from "../../types/Types";
import searchIcon from "../../assets/searchIconBAW.svg";
import { draftService } from "../../services/draftService";
import { EmailTemplateSnapshot } from "../../components/Emailtemplatesnapshot";
import { parseAttachmentCount, restoreDraftLayout } from "../../utils/Draftlayout";

interface Props {
  onSelectDraft: (d: EmailDraft) => void;
  brandId?: number;
}

export interface DraftsTabRef {
  refresh: () => void;
}

// The width (in px) EmailTemplateSnapshot's Tailwind classes (h-56, grid
// gaps, etc.) are effectively authored for -- it's the same effective content
// width EmailComposerModal's EmailPreviewPane renders templates at
// (max-w-2xl minus its px-6 padding). The thumbnail renders the snapshot at
// this real size, then scales the whole thing down to fit the card -- so
// what you see in the card is a true miniature of the real layout, not a
// separate approximation of it.
const SNAPSHOT_DESIGN_WIDTH = 624;

function DraftPreviewThumbnail({ draft }: { draft: EmailDraft }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const update = () => {
      if (el.clientWidth > 0) setScale(el.clientWidth / SNAPSHOT_DESIGN_WIDTH);
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const blocks = restoreDraftLayout(draft);
  const attachmentCount = parseAttachmentCount(draft.attachments);

  return (
    <div ref={wrapperRef} className="relative h-40 w-full overflow-hidden bg-gray-50">
      {!blocks && !draft.html ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-xs text-gray-400">Empty draft</p>
        </div>
      ) : (
        <div
          className="pointer-events-none origin-top-left"
          style={{ width: SNAPSHOT_DESIGN_WIDTH, transform: `scale(${scale})` }}
        >
          <EmailTemplateSnapshot
            templateId={draft.template_id ?? undefined}
            blocks={blocks}
            html={draft.html}
            attachmentCount={attachmentCount}
          />
        </div>
      )}
    </div>
  );
}

function DraftCard({ draft, onOpen, onDelete }: {
  draft: EmailDraft;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);

  // Generate a title from the draft data
  const title = draft.head || draft.preview || "no subject yet";

  // Format the last updated date
  const lastUpdated = draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) : '';

  return (
    <div
      className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-all cursor-pointer hover:border-blue-200"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onOpen}
    >
      <div className="relative">
        {/* Draft preview card - true scaled-down snapshot of the actual draft */}
        <div className="p-4 bg-gray-50">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <DraftPreviewThumbnail draft={draft} />
          </div>
        </div>

        {/* Hover actions */}
        {hover && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center gap-3">
            <button onClick={(e) => { e.stopPropagation(); onOpen(); }} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-700">Open</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="flex flex-col items-center gap-1">
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
        <p className="text-sm font-medium text-gray-800 truncate">{title}</p>
        {lastUpdated && (
          <p className="text-xs text-gray-400 mt-1">Updated {lastUpdated}</p>
        )}
      </div>
    </div>
  );
}

export const DraftsTab = forwardRef<DraftsTabRef, Props>(({ onSelectDraft, brandId }, ref) => {
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchDrafts = async () => {
    if (!brandId) return;
    setLoading(true);
    try {
      const apiDrafts = await draftService.getDraftsByBrand(brandId);
      // Transform API drafts to EmailDraft format with computed properties
      const transformedDrafts: EmailDraft[] = apiDrafts.map(draft => ({
        ...draft,
        title: draft.head || draft.preview || `Draft ${draft.id}`,
        thumbnail: draft.html ? draft.html.substring(0, 100) : '',
      }));
      // Sort by updated date (newest first)
      transformedDrafts.sort((a, b) => {
        const dateA = new Date(a.updatedAt || 0).getTime();
        const dateB = new Date(b.updatedAt || 0).getTime();
        return dateB - dateA;
      });
      setDrafts(transformedDrafts);
    } catch (error) {
      console.error('Failed to fetch drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [brandId]);

  // Expose refresh function via ref for parent to call
  useImperativeHandle(ref, () => ({
    refresh: fetchDrafts
  }));

  const filtered = drafts.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async (draftId: number) => {
    try {
      await draftService.deleteDraft(draftId);
      setDrafts(prev => prev.filter(x => x.id !== draftId));
    } catch (error) {
      console.error('Failed to delete draft:', error);
    }
  };

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

      {/* Empty state */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-sm text-gray-500">Loading drafts...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-800">No drafts yet</h3>
          <p className="text-sm text-gray-500 mt-2">Create your first email draft to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map(d => (
            <DraftCard
              key={d.id}
              draft={d}
              onOpen={() => onSelectDraft(d)}
              onDelete={() => handleDelete(d.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
});

DraftsTab.displayName = 'DraftsTab';