import type { Newsletter } from "../../types/Types";

interface Props {
  newsletter?: Newsletter;
  onClose: () => void;
  loading?: boolean;
}

const RICH_TEXT_DISPLAY_CLASS = "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-200 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500";

function normalizeRichTextContent(html: string | null | undefined): string {
  if (!html) return "";
  return html;
}

function getInitialLetter(name: string): string {
  return name?.charAt(0)?.toUpperCase() || "A";
}

export function EmailPreviewModal({ newsletter, onClose, loading = false }: Props) {
  const senderName = newsletter?.from_name || "Your name";
  const senderEmail = "your@email.com";
  const recipient = "recipient@email.com";
  const subject = newsletter?.title || "(no subject)";
  const htmlContent = newsletter?.html || newsletter?.preview || "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto bg-[#f2f6fc] px-6 py-8">
            <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h1 className="text-xl text-gray-900" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                  {subject}
                </h1>
              </div>

              <div className="flex items-start gap-3 px-6 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white">
                  {getInitialLetter(senderName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-gray-900">{senderName}</span>
                      <span className="ml-2 text-sm text-gray-500">&lt;{senderEmail}&gt;</span>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">now</span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">to {recipient}</p>
                </div>
              </div>

              <div
                className={`px-6 pb-6 text-[15px] leading-relaxed text-gray-800 ${RICH_TEXT_DISPLAY_CLASS}`}
                style={{ fontFamily: "Arial, Helvetica, sans-serif", whiteSpace: "pre-wrap" }}
                dangerouslySetInnerHTML={{
                  __html: `<style>img{display:inline-block;vertical-align:middle;border-radius:8px;cursor:pointer;margin:0 4px;}</style>` + (normalizeRichTextContent(htmlContent) || '<p style="color:#9CA3AF;">This email is empty.</p>'),
                }}
              />

              {newsletter?.footer && (
                <div className="border-t border-gray-100 px-6 py-4">
                  <p className="text-xs text-gray-500 whitespace-pre-line">{newsletter.footer}</p>
                  {newsletter?.address && (
                    <p className="mt-1 text-xs text-gray-400 whitespace-pre-line">{newsletter.address}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}