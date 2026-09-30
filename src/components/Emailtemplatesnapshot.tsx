import type { ReactNode } from "react";
import type { TemplateLayoutBlock } from "../types/Types";

// ─── Shared with EmailComposerModal.tsx ──────────────────────────────────────
// Kept in sync deliberately: this is a read-only-only extraction of the
// `interactive={false}` branch of TemplatePreviewCanvas (see
// EmailComposerModal.tsx). It renders the same 5 fixed layouts + blank
// fallback, but has zero dependency on the rich text editor (TipTap), so it's
// cheap to mount many of these at once (e.g. one per card in the drafts grid)
// without shipping the editor bundle to a page that never edits anything.
//
// If the layouts in TemplatePreviewCanvas ever change (new template, new
// image-grid rule, etc.), mirror the change here too — this file intentionally
// does NOT import from EmailComposerModal.tsx to avoid dragging its editor
// dependencies in transitively.

const RICH_TEXT_DISPLAY_CLASS =
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-200 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500";

function normalizeRichTextContent(value?: string | null) {
  if (!value) return "";
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " "); // Convert &nbsp; to regular space to preserve spacing
}

const Shell = ({
  children,
  footer,
  attachments,
}: {
  children: ReactNode;
  footer: ReactNode;
  attachments: ReactNode;
}) => (
  <div className="rounded-[30px] border border-slate-200 bg-slate-50 p-3 shadow-[0_20px_70px_-36px_rgba(15,23,42,0.35)]">
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      {children}
      {footer}
      {attachments}
    </div>
  </div>
);

function renderImage(block?: TemplateLayoutBlock) {
  // A removed or never-filled slot renders as nothing at all -- this mirrors
  // the real send/read-only preview, not the "click to add back" editing
  // placeholder, which only makes sense while actively composing.
  if (!block || block.removed || !block.imageUrl) return null;

  const widthValue = block.imageWidth && block.imageWidth.trim() ? block.imageWidth : "100%";
  const offsetValue = typeof block.imageOffsetX === "number" ? block.imageOffsetX : 0;

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl">
      <div
        className="h-full w-full overflow-hidden rounded-2xl"
        style={{ width: widthValue, maxWidth: "100%", transform: `translateX(${offsetValue}px)` }}
      >
        <img
          src={block.imageUrl}
          alt={block.label}
          style={{ objectFit: "cover", width: "100%", height: "100%", display: "block", objectPosition: "center" }}
        />
      </div>
    </div>
  );
}

function ImageBox({ block, className }: { block?: TemplateLayoutBlock; className: string }) {
  const img = renderImage(block);
  if (!img) return null;
  return <div className={className}>{img}</div>;
}

function renderBlockText(block: TemplateLayoutBlock | undefined, className: string) {
  if (!block || block.removed || !block.text) return null;
  return (
    <div
      className={`${className} ${RICH_TEXT_DISPLAY_CLASS}`}
      style={{ whiteSpace: "pre-wrap" }}
      dangerouslySetInnerHTML={{ __html: normalizeRichTextContent(block.text) }}
    />
  );
}

export interface EmailTemplateSnapshotProps {
  templateId?: number | null;
  blocks?: TemplateLayoutBlock[] | null;
  html?: string | null;
  attachmentCount?: number;
}

export function EmailTemplateSnapshot({ templateId, blocks, html, attachmentCount = 0 }: EmailTemplateSnapshotProps) {
  const isBlank = !templateId || templateId === 0 || !blocks || blocks.length === 0;

  if (isBlank) {
    // Same fallback EmailPreviewPane uses for the blank template: no fixed
    // arrangement to preserve, so the raw HTML body is the whole story.
    return (
      <div
        className={`px-6 py-6 text-[15px] leading-relaxed text-gray-800 ${RICH_TEXT_DISPLAY_CLASS}`}
        style={{ fontFamily: "Arial, Helvetica, sans-serif", whiteSpace: "pre-wrap" }}
        dangerouslySetInnerHTML={{
          __html: `<style>img{display:inline-block;vertical-align:middle;border-radius:8px;cursor:pointer;margin:0 4px;}</style>` + (normalizeRichTextContent(html) || '<p style="color:#9CA3AF;">This email is empty.</p>'),
        }}
      />
    );
  }

  const list = blocks!;
  const bodyBlocksOrdered = list.filter((b) => b.role === "body");
  const imageBlocks = list.filter((b) => b.role === "image");
  const headlineBlock = list.find((b) => b.role === "headline");
  const footerBlock = list.find((b) => b.role === "footer");

  const Headline = (
    <div className="mt-6">{renderBlockText(headlineBlock, "text-2xl font-bold leading-snug text-slate-900 text-center")}</div>
  );
  const Body = (
    <div className="space-y-3">
      {bodyBlocksOrdered.map((b) => (
        <div key={b.id}>{renderBlockText(b, "text-sm leading-6 text-slate-600 text-center")}</div>
      ))}
    </div>
  );
  const Footer =
    footerBlock && !footerBlock.removed && footerBlock.text ? (
      <div className="mt-6 border-t border-slate-100 bg-slate-50 px-6 py-4 text-center">
        {renderBlockText(footerBlock, "text-xs leading-5 text-slate-400 text-center")}
      </div>
    ) : null;
  const Attachments =
    attachmentCount > 0 ? (
      <div className="mt-6 rounded-[20px] border border-slate-200 bg-slate-50 p-3 text-center text-[11px] text-slate-500">
        {attachmentCount} attachment{attachmentCount > 1 ? "s" : ""}
      </div>
    ) : null;

  switch (templateId) {
    // Hero banner
    case 1:
      return (
        <Shell footer={Footer} attachments={Attachments}>
          <ImageBox block={imageBlocks[0]} className="h-56 overflow-hidden sm:h-64" />
          <div className="px-6 pb-2">
            {Headline}
            <div className="mt-4">{Body}</div>
          </div>
        </Shell>
      );

    // Portrait-focused
    case 2:
      return (
        <Shell footer={Footer} attachments={Attachments}>
          <div className="px-6 pb-2">
            {Headline}
            <div className="mt-4">{Body}</div>
            <ImageBox block={imageBlocks[0]} className="mt-4 h-56 overflow-hidden sm:h-64" />
          </div>
        </Shell>
      );

    // Split image
    case 3: {
      const visible = imageBlocks.filter((b) => !b.removed && b.imageUrl);
      return (
        <Shell footer={Footer} attachments={Attachments}>
          <div className="px-6 pb-2">
            {Headline}
            <div className="mt-4">{Body}</div>
            {visible.length === 1 && (
              <div className="mt-6 flex justify-center">
                <ImageBox block={visible[0]} className="h-36 w-full max-w-sm overflow-hidden sm:h-44" />
              </div>
            )}
            {visible.length >= 2 && (
              <div className="mt-6 grid grid-cols-2 gap-3">
                <ImageBox block={imageBlocks[0]} className="h-36 overflow-hidden sm:h-44" />
                <ImageBox block={imageBlocks[1]} className="h-36 overflow-hidden sm:h-44" />
              </div>
            )}
          </div>
        </Shell>
      );
    }

    // Three-card
    case 4: {
      const visible = imageBlocks.filter((b) => !b.removed && b.imageUrl);
      const cardCls = "rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm h-36 overflow-hidden sm:h-36";
      return (
        <Shell footer={Footer} attachments={Attachments}>
          <div className="px-6 pb-2">
            {Headline}
            <div className="mt-4">{Body}</div>
            {visible.length === 1 && (
              <div className="mt-6 flex justify-center">
                <ImageBox block={visible[0]} className={`${cardCls} w-full max-w-sm`} />
              </div>
            )}
            {visible.length === 2 && (
              <div className="mt-6 grid grid-cols-2 gap-2.5">
                <ImageBox block={imageBlocks[0]} className={cardCls} />
                <ImageBox block={imageBlocks[1]} className={cardCls} />
              </div>
            )}
            {visible.length >= 3 && (
              <div className="mt-6 grid grid-cols-3 gap-2.5">
                <ImageBox block={imageBlocks[0]} className={cardCls} />
                <ImageBox block={imageBlocks[1]} className={cardCls} />
                <ImageBox block={imageBlocks[2]} className={cardCls} />
              </div>
            )}
          </div>
        </Shell>
      );
    }

    // Landscape spotlight (text / image / text)
    case 5: {
      const [top, bottom] = bodyBlocksOrdered;
      return (
        <Shell footer={Footer} attachments={Attachments}>
          <div className="px-6 pb-2">
            {Headline}
            <div className="mt-4">{renderBlockText(top, "text-sm leading-6 text-slate-600 text-center")}</div>
            <ImageBox block={imageBlocks[0]} className="mt-5 h-44 overflow-hidden rounded-2xl" />
            <div className="mt-5">{renderBlockText(bottom, "text-sm leading-6 text-slate-600 text-center")}</div>
          </div>
        </Shell>
      );
    }

    default:
      return (
        <Shell footer={Footer} attachments={Attachments}>
          <div className="px-6 pb-2">
            {Headline}
            <div className="mt-4">{Body}</div>
            <ImageBox block={imageBlocks[0]} className="mt-6 h-44 overflow-hidden rounded-2xl" />
          </div>
        </Shell>
      );
  }
}