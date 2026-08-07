import { useState, useEffect, useRef, type ReactNode, type ChangeEvent, type MouseEvent } from "react";
import ReactQuill from "react-quill-new";
import type { ComposeForm, ConfirmForm, ComposerAttachment, TemplateLayoutBlock } from "../../types/Types";
import { useAuthStore } from "../../store/useAuthStore";
import { lookupService, type LookupItem } from "../../services/lookupService";
import { aiWriterService } from "../../services/aiWriterService";
import { composerWorkflowService } from "../../services/composerWorkflowService";
import { brandService } from "../../services/brandService";
import { deleteUploadedAsset, uploadAsset } from "../../services/apiClient";
import { useParams } from "react-router-dom";
import "react-quill-new/dist/quill.snow.css";

// ─── Quill dynamic import ─────────────────────────────────────────────────────
// NOTE: Install with: npm install react-quill quill
// Then import at the top of your app: import 'react-quill/dist/quill.snow.css';

type ComposerStep = "compose" | "confirm" | "sent";

type TemplateLayoutDefinition = {
  name: string;
  blocks: TemplateLayoutBlock[];
};

interface Props {
  onClose: () => void;
  prefilled?: { subject?: string; body?: string; preview?: string; aiResult?: Record<string, unknown> };
  templateId?: number;
}

function getInitialLetter(value?: string) {
  const trimmed = value?.trim() || "";
  const match = trimmed.match(/[A-Za-z0-9]/);
  return (match?.[0] || "A").toUpperCase();
}

function normalizeRichTextContent(value?: string) {
  if (!value) return "";

  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isValidEmail(value?: string) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getValueByPath(source: unknown, path: string): unknown {
  if (!source || typeof source !== "object") return undefined;

  return path.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, source);
}

function isHtmlString(value: string) {
  return /<[^>]+>/.test(value);
}

function containsHtmlMarkup(value?: string) {
  if (!value) return false;
  return /<(p|div|span|a|button|img|table|ul|ol|li|h[1-6]|br|strong|em|b|i)\b[^>]*>/i.test(value) || /style=|class=/.test(value);
}

function reduceObjectToText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(reduceObjectToText).filter(Boolean).join(" ");
  if (typeof value === "object" && value !== null) {
    return Object.values(value)
      .map(reduceObjectToText)
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

function resolveContentValue(source: unknown, candidates: string[], preserveHtml = false) {
  for (const candidate of candidates) {
    const value = getValueByPath(source, candidate);
    if (typeof value === "string") {
      if (preserveHtml && isHtmlString(value)) {
        return value.trim();
      }
      const cleaned = cleanIncomingText(value);
      if (cleaned) return cleaned;
    }
    if (value && typeof value === "object") {
      const serialized = reduceObjectToText(value).trim();
      if (serialized) {
        return preserveHtml && isHtmlString(serialized) ? serialized : cleanIncomingText(serialized);
      }
    }
  }

  return "";
}

function isNonEmptyAiResult(source?: Record<string, unknown>) {
  if (!source || typeof source !== "object") return false;
  return reduceObjectToText(source).trim().length > 0;
}

function resolveImageUrls(source: unknown): string[] {
  const candidates = [
    "AiGeneratedImages",
    "ai_generated_images",
    "images",
    "generated_images",
    "image_urls",
    "data.AiGeneratedImages",
    "data.ai_generated_images",
    "data.images",
    "result.AiGeneratedImages",
    "result.ai_generated_images",
  ];

  for (const candidate of candidates) {
    const value = getValueByPath(source, candidate);
    if (Array.isArray(value)) {
      const urls = value
        .map((item) => {
          if (typeof item === "string") return item;
          if (typeof item === "object" && item !== null) {
            const record = item as Record<string, unknown>;
            return typeof record.image_url === "string"
              ? record.image_url
              : (typeof record.url === "string" ? record.url : (typeof record.src === "string" ? record.src : undefined));
          }
          return undefined;
        })
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0);

      if (urls.length > 0) return urls;
    }
  }

  return [];
}

// ─── Rich Text Editor (Quill wrapper) ────────────────────────────────────────

function stripHtml(value?: string) {
  if (!value) return "";
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function cleanIncomingText(value?: string) {
  if (!value) return "";

  return stripHtml(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function splitHtmlBody(html: string, count: number) {
  // Split on block-level boundaries so each chunk stays valid, self-contained HTML.
  const blocks = html
    .split(/(?=<(?:p|div|h[1-6]|li)\b)|(?<=<\/(?:p|div|h[1-6]|li)>)|<br\s*\/?>/i)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  // No block-level structure to split on (e.g. a single inline-formatted string).
  // Put it in the first slot only — never repeat it into the other slots.
  if (blocks.length <= 1) {
    return [html, ...Array.from({ length: Math.max(count - 1, 0) }, () => "")];
  }

  const targetLength = Math.floor(html.length / count);
  const chunks: string[] = [];
  let current = "";

  blocks.forEach((block) => {
    const candidate = current + block;
    if (!current || candidate.length <= targetLength + 80) {
      current = candidate;
    } else {
      chunks.push(current);
      current = block;
    }
  });
  if (current) chunks.push(current);

  if (chunks.length === 0) return Array.from({ length: count }, () => "");
  if (chunks.length < count) {
    return chunks.concat(Array.from({ length: count - chunks.length }, () => ""));
  }
  if (chunks.length > count) {
    // Don't silently drop content past the requested slot count — fold any
    // overflow chunks into the final slot instead of discarding them.
    const head = chunks.slice(0, count - 1);
    const tail = chunks.slice(count - 1).join("");
    return [...head, tail];
  }
  return chunks;
}

function splitBodyText(text: string, count: number) {
  const cleaned = text.trim();
  if (!cleaned) return Array.from({ length: count }, () => "");
  if (count <= 1) return [cleaned];
  if (containsHtmlMarkup(cleaned)) return splitHtmlBody(cleaned, count);

  const compacted = cleaned.replace(/\s+/g, " ");

  const sentences = compacted.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [compacted];
  if (sentences.length <= 1) {
    const midpoint = Math.floor(cleaned.length / 2);
    const breakIndex = cleaned.indexOf(" ", midpoint);
    const splitIndex = breakIndex > 0 ? breakIndex : midpoint;
    return [cleaned.slice(0, splitIndex).trim(), cleaned.slice(splitIndex).trim()];
  }

  const chunks: string[] = [];
  let current = "";
  const targetLength = Math.floor(cleaned.length / count);

  sentences.forEach((sentence) => {
    const candidate = `${current} ${sentence}`.trim();
    if (!current || candidate.length <= targetLength + 80) {
      current = candidate;
    } else {
      chunks.push(current.trim());
      current = sentence.trim();
    }
  });

  if (current) chunks.push(current.trim());

  if (chunks.length === 0) return Array.from({ length: count }, () => "");
  if (chunks.length < count) {
    return chunks.concat(Array.from({ length: count - chunks.length }, () => ""));
  }

  return chunks.slice(0, count);
}

// AI-generated `html_body` values sometimes arrive as a *complete* standalone
// HTML document (doctype, head, header-logo div, <h1> headline, paragraphs,
// CTA button, closing line) rather than a plain content fragment. Feeding
// that whole document into splitBodyText/splitHtmlBody causes the header
// logo and headline to leak into the body-top/body-bottom slots, duplicating
// content that's already rendered separately via the `headline` and
// `footer_text` fields. This pulls out just the genuine message content
// (<p> paragraphs and <a> CTA elements) and drops the document chrome.
function extractBodyContent(html: string) {
  if (!html) return html;

  const looksLikeFullDocument = /<html[\s>]|<body[\s>]/i.test(html);
  if (!looksLikeFullDocument) return html;

  const pieces = html.match(/<(p|a)\b[^>]*>[\s\S]*?<\/\1>/gi) || [];
  return pieces.length ? pieces.join("") : html;
}

function buildTemplateLayout(templateId?: number, aiResult?: Record<string, unknown>) {
  if (!templateId || templateId === 0) {
    return [];
  }

  const baseLayout: Record<number, TemplateLayoutDefinition> = {
    1: {
      name: "Hero banner layout",
      blocks: [
        { id: "headline", role: "headline", label: "Headline", text: "<p>Your headline goes here</p>", placeholder: "Add a bold headline" },
        { id: "body", role: "body", label: "Intro copy", text: "<p>Write a short intro that welcomes the reader and introduces the offer.</p>", placeholder: "Add supporting text" },
        { id: "image", role: "image", label: "Hero image", text: "", placeholder: "Paste an image URL" },
        { id: "footer", role: "footer", label: "Footer", text: "<p>Add your closing line or contact details.</p>", placeholder: "Add a footer" },
      ],
    },
    2: {
      name: "Portrait-focused layout",
      blocks: [
        { id: "headline", role: "headline", label: "Headline", text: "<p>Your headline goes here</p>", placeholder: "Add a bold headline" },
        { id: "body", role: "body", label: "Body copy", text: "<p>Add your main message and supporting details.</p>", placeholder: "Add supporting text" },
        { id: "image", role: "image", label: "Primary image", text: "", placeholder: "Paste an image URL" },
        { id: "footer", role: "footer", label: "Footer", text: "<p>Add your closing line or contact details.</p>", placeholder: "Add a footer" },
      ],
    },
    3: {
      name: "Split image layout",
      blocks: [
        { id: "headline", role: "headline", label: "Headline", text: "<p>Your headline goes here</p>", placeholder: "Add a bold headline" },
        { id: "body", role: "body", label: "Main copy", text: "<p>Use the main text area for your primary message.</p>", placeholder: "Add supporting text" },
        { id: "image-1", role: "image", label: "Left image", text: "", placeholder: "Paste an image URL" },
        { id: "image-2", role: "image", label: "Right image", text: "", placeholder: "Paste an image URL" },
        { id: "footer", role: "footer", label: "Footer", text: "<p>Add your closing line or contact details.</p>", placeholder: "Add a footer" },
      ],
    },
    4: {
      name: "Three-card layout",
      blocks: [
        { id: "headline", role: "headline", label: "Headline", text: "<p>Your headline goes here</p>", placeholder: "Add a bold headline" },
        { id: "body", role: "body", label: "Body copy", text: "<p>Share the story, offer or announcement.</p>", placeholder: "Add supporting text" },
        { id: "image-1", role: "image", label: "Image one", text: "", placeholder: "Paste an image URL" },
        { id: "image-2", role: "image", label: "Image two", text: "", placeholder: "Paste an image URL" },
        { id: "image-3", role: "image", label: "Image three", text: "", placeholder: "Paste an image URL" },
        { id: "footer", role: "footer", label: "Footer", text: "<p>Add your closing line or contact details.</p>", placeholder: "Add a footer" },
      ],
    },
    5: {
      name: "Landscape spotlight layout",
      blocks: [
        { id: "headline", role: "headline", label: "Headline", text: "<p>Your headline goes here</p>", placeholder: "Add a bold headline" },
        { id: "body-top", role: "body", label: "Top body", text: "<p>Add a leading paragraph that introduces the image.</p>", placeholder: "Add supporting text" },
        { id: "image", role: "image", label: "Landscape image", text: "", placeholder: "Paste an image URL" },
        { id: "body-bottom", role: "body", label: "Bottom body", text: "<p>Add a closing paragraph or additional details below the image.</p>", placeholder: "Add supporting text" },
        { id: "footer", role: "footer", label: "Footer", text: "<p>Add your closing line or contact details.</p>", placeholder: "Add a footer" },
      ],
    },
  };

  const fallback = baseLayout[templateId ?? 1] ?? baseLayout[1];
  const hasAiResult = isNonEmptyAiResult(aiResult);
  const headline = hasAiResult
    ? resolveContentValue(aiResult, ["headline", "data.headline", "result.headline", "subject", "data.subject", "result.subject", "title"])
    : "";
  const rawBody = hasAiResult
    ? resolveContentValue(aiResult, ["html_body", "data.html_body", "result.html_body", "body", "data.body", "result.body", "content", "data.content", "result.content"], true)
    : "";
  const body = extractBodyContent(rawBody);
  const footer = hasAiResult
    ? resolveContentValue(aiResult, ["footer_text", "data.footer_text", "result.footer_text", "footer", "data.footer", "result.footer", "closing"])
    : "";
  const imageUrls = hasAiResult ? resolveImageUrls(aiResult) : [];

  const bodySources = splitBodyText(body, fallback.blocks.filter((block) => block.role === "body").length || 1);

  return fallback.blocks.map((block) => {
    if (block.role === "headline") {
      return { ...block, text: headline || block.text };
    }
    if (block.role === "footer") {
      return { ...block, text: footer || block.text };
    }
    if (block.role === "image") {
      const nextIndex = fallback.blocks.filter((item) => item.role === "image").indexOf(block);
      return { ...block, imageUrl: imageUrls[nextIndex] || block.imageUrl };
    }

    if (block.role === "body") {
      const bodyIndex = fallback.blocks.filter((item) => item.role === "body").indexOf(block);
      const textSource = bodySources[bodyIndex] || block.text;
      return { ...block, text: textSource };
    }

    return block;
  });
}

function safeBuildTemplateLayout(templateId?: number, aiResult?: Record<string, unknown>) {
  try {
    return buildTemplateLayout(templateId, aiResult);
  } catch (error) {
    console.error('[EmailComposerModal] safeBuildTemplateLayout failed', error);
    return buildTemplateLayout(templateId);
  }
}

// Tailwind's preflight resets <ul>/<ol> to list-style: none, which is why
// bullet/numbered lists Quill produces don't visually show up outside of its
// own .ql-editor (which ships its own list CSS). Anywhere we render rich text
// HTML outside an active Quill instance — read-only previews, the sent email
// itself — needs this restored explicitly, and needs it as an actual inline
// style for the sent email (email clients ignore stylesheets/utility classes).
const RICH_TEXT_DISPLAY_CLASS = "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-200 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500";
const RICH_TEXT_EMAIL_STYLE = "ul{list-style:disc;padding-left:1.25em;margin:8px 0;}ol{list-style:decimal;padding-left:1.25em;margin:8px 0;}li{margin:2px 0;}blockquote{border-left:4px solid #e2e8f0;padding-left:12px;color:#64748b;margin:8px 0;}";

function buildLayoutHtml(blocks: TemplateLayoutBlock[]) {
  const renderBlock = (block: TemplateLayoutBlock) => {
    if (block.role === "image") {
      if (!block.imageUrl) return "";
      return `<div style="margin:16px 0;"><img src="${block.imageUrl}" alt="${block.label}" style="width:100%;border-radius:12px;display:block;" /></div>`;
    }
    if (!block.text) return "";
    return `<div style="margin:12px 0;">${block.text}</div>`;
  };

  return `<style>${RICH_TEXT_EMAIL_STYLE}</style><div style="font-family:Arial,sans-serif;line-height:1.6;color:#243126;">${blocks.map(renderBlock).join("")}</div>`;
}

function TemplatePreviewCanvas({
  templateId,
  blocks,
  activeBlockId,
  onSelectBlock,
  attachments = [],
  onRemoveAttachment,
  brandName,
  interactive = true,
  onBlockTextChange,
  onEditorFocus,
  onBlockSelectionChange,
}: {
  templateId?: number;
  blocks: TemplateLayoutBlock[];
  activeBlockId?: string | null;
  onSelectBlock?: (blockId: string) => void;
  attachments?: ComposerAttachment[];
  onRemoveAttachment?: (attachment: ComposerAttachment) => void;
  brandName?: string;
  // When false (used inside the "Preview" reading pane), text renders as
  // plain read-only HTML instead of live Quill instances, and image slots
  // aren't clickable.
  interactive?: boolean;
  onBlockTextChange?: (blockId: string, value: string) => void;
  onEditorFocus?: (blockId: string, handle: RichTextEditorHandle) => void;
  onBlockSelectionChange?: (text: string) => void;
}) {
  const headline = blocks.find((block) => block.role === "headline")?.text || "Add your headline";
  const bodyBlocks = blocks.filter((block) => block.role === "body");
  const footer = blocks.find((block) => block.role === "footer")?.text || "Add your footer";
  const imageBlocks = blocks.filter((block) => block.role === "image");

  const renderInteractiveText = (blockId: string | undefined, content: ReactNode, className = "w-full text-left") => {
    if (!blockId || !interactive) return <div className={className}>{content}</div>;

    const isActive = activeBlockId === blockId;

    return (
      <button
        type="button"
        onClick={() => onSelectBlock?.(blockId)}
        className={`block w-full cursor-text text-left ${isActive ? "rounded-2xl ring-2 ring-blue-400 ring-offset-1" : ""} ${className}`}
      >
        {content}
      </button>
    );
  };

  const renderImage = (block: TemplateLayoutBlock, className = "w-full h-full object-cover") => {
    if (block?.imageUrl) {
      const widthValue = block.imageWidth && block.imageWidth.trim() ? block.imageWidth : "100%";
      const offsetValue = typeof block.imageOffsetX === "number" ? block.imageOffsetX : 0;

      return (
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
          <div
            className="h-full overflow-hidden rounded-2xl"
            style={{ width: widthValue, maxWidth: "100%", transform: `translateX(${offsetValue}px)` }}
          >
            <img
              src={block.imageUrl}
              alt={block.label}
              className={`block h-full object-cover ${className}`}
              style={{ objectFit: "cover", width: "100%", height: "100%", display: "block" }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-100 text-sm text-slate-500">
        Add an image
      </div>
    );
  };

  const renderRichText = (content?: string, className = "text-sm leading-6 text-slate-600") => {
    const safeContent = normalizeRichTextContent(content?.trim() || "");
    return <div className={`${className} ${RICH_TEXT_DISPLAY_CLASS}`} dangerouslySetInnerHTML={{ __html: safeContent }} />;
  };

  // Text blocks (headline/body/footer) are edited directly in place — no more
  // "click to open a side panel". `bare` strips Quill's default box chrome so
  // it blends into the template layout; a focus ring shows which block is
  // currently being edited. In non-interactive (read-only preview) mode it
  // just renders the HTML.
  const renderEditableText = (
    block: TemplateLayoutBlock | undefined,
    className: string,
    placeholder?: string
  ) => {
    if (!block) return <p className={className}>{placeholder}</p>;

    if (!interactive) {
      return renderRichText(block.text || block.placeholder, className);
    }

    const isActive = activeBlockId === block.id;

    return (
      <div className={`rounded-xl transition-shadow ${isActive ? "ring-2 ring-blue-400 ring-offset-1" : "hover:ring-1 hover:ring-slate-200"}`}>
        <RichTextEditor
          bare
          value={block.text}
          placeholder={block.placeholder || placeholder}
          className={className}
          onChange={(value) => onBlockTextChange?.(block.id, value)}
          onEditorReady={(handle) => onEditorFocus?.(block.id, handle)}
          onSelectionChange={(text) => onBlockSelectionChange?.(text)}
        />
      </div>
    );
  };

  const renderBodyParagraphs = () => (
    <div className="space-y-3">
      {bodyBlocks.length > 0 ? bodyBlocks.map((block) => (
        <div key={block.id}>
          {renderEditableText(block, "text-sm leading-6 text-slate-600 text-center")}
        </div>
      )) : (
        <p className="text-sm leading-6 text-slate-600 text-center">Add your supporting text</p>
      )}
    </div>
  );

  // Mirrors the real send: a quiet centered brand wordmark with a hairline
  // rule underneath, not app-UI chrome.
  const renderBrandHeader = () => (
    <div className="border-b border-slate-100 px-6 py-4 text-center">
      <span className="text-base font-bold text-blue-700">{brandName || "Your brand"}</span>
    </div>
  );

  const renderHeadline = () => (
    <div className="mt-6">
      {renderEditableText(
        blocks.find((block) => block.role === "headline"),
        "text-2xl font-bold leading-snug text-slate-900 text-center",
        "Add your headline"
      )}
    </div>
  );

  // Footer is disclaimer/contact copy, not a call-to-action — keep it quiet
  // and small like a real unsubscribe/copyright line, not a blue button.
  const renderFooterBar = () => (
    <div className="mt-6 border-t border-slate-100 bg-slate-50 px-6 py-4 text-center">
      {renderEditableText(blocks.find((block) => block.role === "footer"), "text-xs leading-5 text-slate-400 text-center", "Add your footer")}
    </div>
  );

  const renderAttachmentSection = () => {
    if (!attachments.length) return null;

    const visibleAttachments = attachments.slice(0, 4);
    return (
      <div className="mt-6 rounded-[20px] border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Attachments</span>
          <span className="text-[11px] text-slate-400">{attachments.length} file{attachments.length > 1 ? 's' : ''}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleAttachments.map((attachment) => (
            <button
              key={attachment.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRemoveAttachment?.(attachment);
              }}
              className="inline-flex max-w-40 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-[10px] font-semibold text-blue-600">📎</span>
              <span className="truncate">{attachment.name}</span>
              <span className="ml-1 text-[11px] text-slate-400">✕</span>
            </button>
          ))}
          {attachments.length > 4 && (
            <span className="inline-flex items-center rounded-full bg-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-600">
              +{attachments.length - 4} more
            </span>
          )}
        </div>
      </div>
    );
  };

  // Shared outer shell: light neutral mounting frame + a white "email card"
  // with a real brand header and a quiet disclaimer footer, instead of the
  // dark UI-chrome toolbar that was identical across every template.
  const Shell = ({ children }: { children: ReactNode }) => (
    <div className="rounded-[30px] border border-slate-200 bg-slate-50 p-3 shadow-[0_20px_70px_-36px_rgba(15,23,42,0.35)]">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        {children}
        {renderFooterBar()}
        {renderAttachmentSection()}
      </div>
    </div>
  );

  switch (templateId) {
    // Hero banner — full-bleed image up top, like a real hero email header,
    // then headline/body/CTA copy underneath.
    case 1:
      return (
        <Shell>
          <div className="h-56 overflow-hidden bg-slate-100 sm:h-64">
            {renderInteractiveText(imageBlocks[0]?.id, renderImage(imageBlocks[0], "h-full w-full"), "w-full h-full")}
          </div>
          <div className="px-6 pb-2">
            {renderHeadline()}
            <div className="mt-4">{renderBodyParagraphs()}</div>
          </div>
        </Shell>
      );

    // Portrait-focused — headline and copy first, then a tall centered
    // portrait image (people/product shots), not a wide banner.
    case 2:
      return (
        <Shell>
          <div className="px-6 pb-2">
            {renderHeadline()}
            <div className="mt-4">{renderBodyParagraphs()}</div>
            <div className="mx-auto mt-6 h-64 w-48 overflow-hidden rounded-2xl bg-slate-100">
              {renderInteractiveText(imageBlocks[0]?.id, renderImage(imageBlocks[0], "h-full w-full"), "w-full h-full")}
            </div>
          </div>
        </Shell>
      );

    // Split image — headline and copy, then two images side by side.
    case 3:
      return (
        <Shell>
          <div className="px-6 pb-2">
            {renderHeadline()}
            <div className="mt-4">{renderBodyParagraphs()}</div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="h-36 overflow-hidden rounded-2xl bg-slate-100">
                {renderInteractiveText(imageBlocks[0]?.id, renderImage(imageBlocks[0], "h-full w-full"), "w-full h-full")}
              </div>
              <div className="h-36 overflow-hidden rounded-2xl bg-slate-100">
                {renderInteractiveText(imageBlocks[1]?.id, renderImage(imageBlocks[1], "h-full w-full"), "w-full h-full")}
              </div>
            </div>
          </div>
        </Shell>
      );

    // Three-card — headline and copy, then three bordered "cards" in a row
    // (a bordered/shadowed thumbnail reads as a card, a plain grey box doesn't).
    case 4:
      return (
        <Shell>
          <div className="px-6 pb-2">
            {renderHeadline()}
            <div className="mt-4">{renderBodyParagraphs()}</div>
            <div className="mt-6 grid grid-cols-3 gap-2.5">
              {[0, 1, 2].map((index) => (
                <div key={imageBlocks[index]?.id || index} className="rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                  <div className="h-24 overflow-hidden rounded-xl bg-slate-100">
                    {renderInteractiveText(imageBlocks[index]?.id, renderImage(imageBlocks[index], "h-full w-full"), "w-full h-full")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Shell>
      );

    // Landscape spotlight — leading paragraph, wide landscape image, closing
    // paragraph. Mirrors the actual AI-generated sample: text / image / text.
    case 5:
      return (
        <Shell>
          <div className="px-6 pb-2">
            {renderHeadline()}
            <div className="mt-4">
              {renderEditableText(bodyBlocks[0], "text-sm leading-6 text-slate-600 text-center")}
            </div>
            <div className="mt-5 h-44 overflow-hidden rounded-2xl bg-slate-100">
              {renderInteractiveText(imageBlocks[0]?.id, renderImage(imageBlocks[0], "h-full w-full"), "w-full h-full")}
            </div>
            <div className="mt-5">
              {renderEditableText(bodyBlocks[1], "text-sm leading-6 text-slate-600 text-center")}
            </div>
          </div>
        </Shell>
      );

    default:
      return (
        <Shell>
          <div className="px-6 pb-2">
            {renderHeadline()}
            <div className="mt-4">{renderBodyParagraphs()}</div>
            <div className="mt-6 h-44 overflow-hidden rounded-2xl bg-slate-100">
              {renderInteractiveText(imageBlocks[0]?.id, renderImage(imageBlocks[0], "h-full w-full"), "w-full h-full")}
            </div>
          </div>
        </Shell>
      );
  }
}


// A stable, reusable Quill editor. Always renders as Quill (it handles HTML
// content natively) rather than switching between Quill and a bare
// contentEditable div depending on whether the value "looks like HTML" —
// that switch was swapping the underlying DOM node out from under the user
// mid-typing, which is what was causing the caret/focus loss.
//
// Quill's own built-in toolbar is disabled entirely (`toolbar: false`).
// Formatting instead goes through <CustomToolbar>, a plain React-controlled
// panel that calls the Quill API (`editor.format(...)`) directly on whichever
// editor is currently focused. Quill's built-in toolbar picks (the dropdowns
// for header/size/color) work by injecting their own DOM nodes into a
// container Quill assumes it owns — every time React re-rendered that
// container (which happens on every keystroke here), React and Quill fought
// over the same DOM nodes and the pickers silently stopped responding. Custom
// buttons that call the documented API sidestep that entirely.
function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  onEditorReady,
  onSelectionChange,
  bare,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onEditorReady?: (editor: RichTextEditorHandle) => void;
  onSelectionChange?: (value: string) => void;
  // Strips Quill's default bordered box so the editor blends into a layout
  // (e.g. inline in a template preview) instead of looking like a form field.
  bare?: boolean;
}) {
  const quillRef = useRef<any>(null);
  // Quill only remembers a selection/cursor position across a blur+refocus
  // cycle for as long as *it* thinks the page focus moved somewhere mundane.
  // A native <input type="color"> picker is a full OS-level overlay, and on
  // some browsers that clears Quill's own remembered range entirely. Once
  // that range is gone, `editor.format(name, value)` on a collapsed cursor
  // silently does nothing (there's nothing to attach the "pending format for
  // the next typed character" to) — which is exactly why color/background
  // only ever seemed to work when text was already highlighted (a real
  // visible selection survives the round trip; a bare cursor doesn't). We
  // track the last selection ourselves, independent of Quill's internal
  // bookkeeping, and restore it explicitly before formatting.
  const lastRangeRef = useRef<{ index: number; length: number } | null>(null);

  const buildHandle = (editor: any): RichTextEditorHandle => ({
    replaceSelection: (nextText: string) => {
      editor.focus();
      const selection = editor.getSelection() || { index: editor.getLength(), length: 0 };
      if (selection.length > 0) {
        editor.deleteText(selection.index, selection.length, "user");
      }
      editor.insertText(selection.index, nextText, "user");
      editor.setSelection(selection.index + nextText.length, 0, "user");
    },
    insertImage: (url: string) => {
      editor.focus();
      const selection = editor.getSelection() || { index: editor.getLength(), length: 0 };
      editor.insertEmbed(selection.index, "image", url, "user");
      editor.setSelection(selection.index + 1, 0, "user");
    },
    getHtml: () => editor.root.innerHTML,
    focus: () => editor.focus(),
    // Mirrors what Quill's own toolbar module does internally: focus() first
    // (this restores the last-known selection even if the editor is
    // currently blurred — e.g. because the user just clicked a sidebar
    // button), *then* apply the format to that restored selection/caret.
    applyFormat: (name: string, formatValue: unknown) => {
      editor.focus();
      // If Quill lost track of where the cursor/selection was (e.g. a
      // native color picker just stole focus), restore it explicitly from
      // our own record before formatting, instead of trusting whatever
      // focus() happened to land on.
      if (!editor.getSelection() && lastRangeRef.current) {
        editor.setSelection(lastRangeRef.current.index, lastRangeRef.current.length, "silent");
      }
      editor.format(name, formatValue, "user");
    },
    getFormats: () => {
      editor.focus();
      const selection = editor.getSelection() || lastRangeRef.current;
      if (!selection) return {};
      return editor.getFormat(selection.index, selection.length) || {};
    },
    clearFormatting: () => {
      editor.focus();
      const selection = editor.getSelection();
      if (selection && selection.length > 0) {
        editor.removeFormat(selection.index, selection.length, "user");
      }
    },
    // Swaps an existing embedded image's src by mutating the live DOM node
    // directly, then asking Quill to resync (`editor.update`) rather than
    // re-parsing a hand-built HTML string back through the controlled
    // `value` prop — round-tripping through DOMParser/innerHTML could
    // produce markup that doesn't parse back to an identical Delta, which is
    // what was causing this to hang.
    replaceImageSrc: (oldSrc: string, newSrc: string) => {
      const images: HTMLImageElement[] = Array.from(editor.root.querySelectorAll("img"));
      const image = images.find((candidate) => candidate.getAttribute("src") === oldSrc);
      if (image) {
        image.setAttribute("src", newSrc);
        editor.update("user");
      }
    },
    // The blank template's images are plain <img> embeds inside the Quill
    // delta — there's no TemplateLayoutBlock to hang width/offset state off
    // of like the preset templates have. So width and horizontal offset are
    // read from and written directly onto the live <img> node's own inline
    // style, mirroring the replaceImageSrc approach above (mutate the DOM
    // node, then editor.update("user") to resync Quill's model).
    getImageStyle: (src: string) => {
      const images: HTMLImageElement[] = Array.from(editor.root.querySelectorAll("img"));
      const image = images.find((candidate) => candidate.getAttribute("src") === src);
      if (!image) return { width: 100, offsetX: 0 };
      const widthAttr = image.style.width;
      const width = widthAttr && widthAttr.endsWith("%") ? Number.parseInt(widthAttr, 10) || 100 : 100;
      const offsetMatch = /translateX\((-?\d+(?:\.\d+)?)px\)/.exec(image.style.transform || "");
      const offsetX = offsetMatch ? Number.parseFloat(offsetMatch[1]) : 0;
      return { width, offsetX };
    },
    updateImageStyle: (src: string, updates: { width?: number; offsetX?: number }) => {
      const images: HTMLImageElement[] = Array.from(editor.root.querySelectorAll("img"));
      const image = images.find((candidate) => candidate.getAttribute("src") === src);
      if (!image) return;
      if (typeof updates.width === "number") {
        image.style.width = `${updates.width}%`;
        image.style.height = "auto";
        image.style.maxWidth = "100%";
        image.style.display = "block";
      }
      if (typeof updates.offsetX === "number") {
        image.style.transform = updates.offsetX ? `translateX(${updates.offsetX}px)` : "";
      }
      editor.update("user");
    },
  });

  return (
    <div className={`${className || ""} ${bare ? "composer-editor-bare" : ""}`}>
      {bare && (
        // Quill hardcodes its own font-size/padding/border on .ql-editor,
        // which would otherwise fight the surrounding Tailwind typography
        // classes (e.g. a headline's text-2xl font-bold) and make every
        // inline-editable block look like plain default Quill text. This
        // makes it inherit typography from its wrapping element instead.
        <style>{`
          .composer-editor-bare .ql-container { border: none !important; }
          .composer-editor-bare .ql-editor {
            padding: 0 !important;
            font-size: inherit !important;
            line-height: inherit !important;
            font-weight: inherit !important;
            font-family: inherit !important;
            color: inherit !important;
            text-align: inherit !important;
          }
          .composer-editor-bare .ql-editor.ql-blank::before {
            font-style: normal;
            color: #94a3b8;
            left: 0;
            right: 0;
          }
        `}</style>
      )}
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        onFocus={() => {
          const editor = quillRef.current?.getEditor?.();
          if (editor && onEditorReady) {
            onEditorReady(buildHandle(editor));
          }
        }}
        onChangeSelection={(range, _source, editor) => {
          if (range) {
            lastRangeRef.current = { index: range.index, length: range.length };
          }
          if (onSelectionChange) {
            if (range && range.length > 0) {
              onSelectionChange(editor.getText(range.index, range.length).trim());
            } else {
              onSelectionChange("");
            }
          }
        }}
        placeholder={placeholder}
        modules={{ toolbar: false }}
        formats={["header", "size", "bold", "italic", "underline", "strike", "list", "link", "color", "background", "blockquote", "align", "image"]}
      />
    </div>
  );
}

type RichTextEditorHandle = {
  replaceSelection: (nextText: string) => void;
  insertImage: (url: string) => void;
  replaceImageSrc: (oldSrc: string, newSrc: string) => void;
  getHtml: () => string;
  getImageStyle: (src: string) => { width: number; offsetX: number };
  updateImageStyle: (src: string, updates: { width?: number; offsetX?: number }) => void;
  focus: () => void;
  applyFormat: (name: string, value: unknown) => void;
  getFormats: () => Record<string, unknown>;
  clearFormatting: () => void;
};

const HEADER_OPTIONS: { label: string; value: string }[] = [
  { label: "Normal text", value: "" },
  { label: "Heading 1", value: "1" },
  { label: "Heading 2", value: "2" },
  { label: "Heading 3", value: "3" },
];

const SIZE_OPTIONS: { label: string; value: string }[] = [
  { label: "Small", value: "small" },
  { label: "Normal size", value: "" },
  { label: "Large", value: "large" },
  { label: "Huge", value: "huge" },
];

// The formatting panel shown in the right column. Operates on whichever
// editor handle is currently passed in (the most recently focused one) —
// it doesn't own or render an editor itself.
function CustomToolbar({ editor, disabled }: { editor: RichTextEditorHandle | null; disabled?: boolean }) {
  const isDisabled = disabled || !editor;

  const apply = (name: string, formatValue: unknown) => {
    editor?.applyFormat(name, formatValue);
  };

  const toggle = (name: string) => {
    if (!editor) return;
    const current = editor.getFormats();
    editor.applyFormat(name, !current[name]);
  };

  const toggleList = (type: "ordered" | "bullet") => {
    if (!editor) return;
    const current = editor.getFormats();
    editor.applyFormat("list", current.list === type ? false : type);
  };

  // Prevents the browser from blurring the Quill editor (and collapsing its
  // selection) the instant the mouse goes down on a toolbar control — the
  // same trick Quill's own toolbar buttons use internally.
  const preventBlur = (event: MouseEvent<HTMLElement>) => event.preventDefault();

  const btn = "flex h-8 min-w-8 items-center justify-center rounded-lg border border-transparent px-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div className={isDisabled ? "opacity-50" : undefined}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-2">
          <select
            disabled={isDisabled}
            value=""
            onChange={(event) => {
              const raw = event.target.value;
              apply("header", raw ? Number(raw) : false);
            }}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-slate-700 disabled:cursor-not-allowed"
          >
            <option value="" disabled>
              Format
            </option>
            {HEADER_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            disabled={isDisabled}
            value=""
            onChange={(event) => {
              const raw = event.target.value;
              apply("size", raw || false);
            }}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-slate-700 disabled:cursor-not-allowed"
          >
            <option value="" disabled>
              Size
            </option>
            {SIZE_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-gray-200 bg-white p-2">
          <button type="button" disabled={isDisabled} onMouseDown={preventBlur} onClick={() => toggle("bold")} className={`${btn} font-bold`} title="Bold">
            B
          </button>
          <button type="button" disabled={isDisabled} onMouseDown={preventBlur} onClick={() => toggle("italic")} className={`${btn} italic`} title="Italic">
            I
          </button>
          <button type="button" disabled={isDisabled} onMouseDown={preventBlur} onClick={() => toggle("underline")} className={`${btn} underline`} title="Underline">
            U
          </button>
          <button type="button" disabled={isDisabled} onMouseDown={preventBlur} onClick={() => toggle("strike")} className={`${btn} line-through`} title="Strikethrough">
            S
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white p-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            Text
            <input
              type="color"
              disabled={isDisabled}
              onMouseDown={preventBlur}
              onChange={(event) => apply("color", event.target.value)}
              className="h-6 w-8 cursor-pointer rounded border border-gray-200 p-0 disabled:cursor-not-allowed"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            Highlight
            <input
              type="color"
              disabled={isDisabled}
              onMouseDown={preventBlur}
              onChange={(event) => apply("background", event.target.value)}
              className="h-6 w-8 cursor-pointer rounded border border-gray-200 p-0 disabled:cursor-not-allowed"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-gray-200 bg-white p-2">
          <button type="button" disabled={isDisabled} onMouseDown={preventBlur} onClick={() => apply("align", false)} className={btn} title="Align left">
            ⯇
          </button>
          <button type="button" disabled={isDisabled} onMouseDown={preventBlur} onClick={() => apply("align", "center")} className={btn} title="Align center">
            ≡
          </button>
          <button type="button" disabled={isDisabled} onMouseDown={preventBlur} onClick={() => apply("align", "right")} className={btn} title="Align right">
            ⯈
          </button>
          <span className="mx-1 h-5 w-px bg-gray-200" />
          <button type="button" disabled={isDisabled} onMouseDown={preventBlur} onClick={() => toggleList("bullet")} className={`${btn} text-xs`} title="Bulleted list">
            • List
          </button>
          <button type="button" disabled={isDisabled} onMouseDown={preventBlur} onClick={() => toggleList("ordered")} className={`${btn} text-xs`} title="Numbered list">
            1. List
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-gray-200 bg-white p-2">
          <button
            type="button"
            disabled={isDisabled}
            onMouseDown={preventBlur}
            onClick={() => {
              const url = window.prompt("Link URL");
              if (url) apply("link", url);
            }}
            className={btn}
            title="Insert link"
          >
            🔗
          </button>
          <button type="button" disabled={isDisabled} onMouseDown={preventBlur} onClick={() => toggle("blockquote")} className={btn} title="Quote">
            ❝
          </button>
          <button
            type="button"
            disabled={isDisabled}
            onMouseDown={preventBlur}
            onClick={() => editor?.clearFormatting()}
            className={btn}
            title="Clear formatting"
          >
            ⨯
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AI Writer Popup ──────────────────────────────────────────────────────────

function AIWriterPopup({
  onClose,
  selectedWriterId,
  onSelectWriter,
  prompt,
  onPromptChange,
  onGenerate,
  readOnly,
  isRewriting,
}: {
  onClose: () => void;
  selectedWriterId: number | null;
  onSelectWriter: (value: number | null) => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  readOnly?: boolean;
  isRewriting?: boolean;
}) {
  const [writerOptions, setWriterOptions] = useState<LookupItem[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadOptions = async () => {
      try {
        const options = await lookupService.getAIWriterDropdowns();
        if (!isMounted) return;
        setWriterOptions(options);
        if (options.length > 0 && (selectedWriterId === null || !options.some(option => option.id === selectedWriterId))) {
          onSelectWriter(options[0].id);
        }
      } catch (error) {
        console.error("Failed to load AI writer dropdown options:", error);
        if (isMounted) {
          setWriterOptions([]);
        }
      }
    };

    void loadOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-140 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 z-10">
      <button onClick={onClose} className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-gray-200 rounded-full text-gray-500 text-xs flex items-center justify-center hover:bg-gray-50">✕</button>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 min-w-55">
          <select
            className="w-full bg-transparent text-sm font-medium text-gray-700 focus:outline-none"
            value={selectedWriterId ?? ""}
            onChange={(e) => onSelectWriter(Number(e.target.value))}
            disabled={writerOptions.length === 0}
          >
            {writerOptions.length === 0 ? (
              <option value="">A.I Writer</option>
            ) : (
              writerOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))
            )}
          </select>
        </div>
        <input
          className="flex-1 text-sm text-gray-700 bg-transparent focus:outline-none placeholder-gray-400"
          placeholder="Highlight parts of email to rewrite"
          value={prompt}
          onChange={e => onPromptChange(e.target.value)}
          readOnly={readOnly}
        />
        <button
          onClick={onGenerate}
          disabled={isRewriting}
          className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ImageSlotInput({
  block,
  onCommit,
  onUpload,
  uploading,
  uploadError,
  onStyleChange,
}: {
  block: TemplateLayoutBlock;
  onCommit: (value: string) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
  uploadError: string;
  onStyleChange: (updates: Partial<TemplateLayoutBlock>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.value = block.imageUrl || "";
    }
  }, [block.imageUrl]);

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        spellCheck={false}
        inputMode="text"
        aria-label={block.placeholder || "Paste an image URL"}
        className="relative z-30 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        defaultValue={block.imageUrl || ""}
        onBlur={(event) => onCommit(event.currentTarget.value)}
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        placeholder={block.placeholder || "Paste an image URL"}
      />

      <div className="flex items-center gap-2">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50"
        >
          {uploading ? "Uploading..." : "Upload image"}
        </button>
        <span className="text-xs text-slate-500">Use a local file or paste a URL.</span>
      </div>

      {uploadError ? <p className="text-xs text-red-600">{uploadError}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-slate-600">
          <span className="mb-1 block">Preview width</span>
          <input
            type="range"
            min="50"
            max="140"
            step="5"
            value={Number.parseInt(block.imageWidth?.replace(/%/, "") || "100", 10) || 100}
            onChange={(event) => onStyleChange({ imageWidth: `${event.target.value}%` })}
            className="w-full"
          />
          <span className="mt-1 block text-slate-500">{block.imageWidth || "100%"}</span>
        </label>

        <label className="text-xs font-medium text-slate-600">
          <span className="mb-1 block">Horizontal offset</span>
          <input
            type="range"
            min="-120"
            max="120"
            step="10"
            value={block.imageOffsetX ?? 0}
            onChange={(event) => onStyleChange({ imageOffsetX: Number(event.target.value) })}
            className="w-full"
          />
          <span className="mt-1 block text-slate-500">{block.imageOffsetX ?? 0}px</span>
        </label>
      </div>
    </div>
  );
}

// ─── Email Preview Pane (Gmail-style reading view) ───────────────────────────

function EmailPreviewPane({
  form,
  brandName,
  brandInitial,
  attachments,
  templateId,
  templateLayout,
}: {
  form: ComposeForm;
  brandName: string;
  brandInitial: string;
  attachments: ComposerAttachment[];
  templateId?: number;
  templateLayout: TemplateLayoutBlock[];
}) {
  const senderName = brandName || form.name || "Your name";
  const senderEmail = form.from || "your@email.com";
  const recipient = form.to || "recipient@email.com";
  const isBlankTemplate = !templateId || templateId === 0;

  return (
    <div className="flex-1 overflow-y-auto bg-[#f2f6fc] px-6 py-8">
      <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h1 className="text-xl text-gray-900" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
            {form.subject || "(no subject)"}
          </h1>
        </div>

        <div className="flex items-start gap-3 px-6 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white">
            {brandInitial || getInitialLetter(senderName)}
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

        {isBlankTemplate ? (
          // The blank template has no fixed arrangement to preserve — it's a
          // freeform document, so the raw content is the whole story.
          <div
            className={`px-6 pb-6 text-[15px] leading-relaxed text-gray-800 ${RICH_TEXT_DISPLAY_CLASS}`}
            style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
            dangerouslySetInnerHTML={{
              __html: normalizeRichTextContent(form.body) || '<p style="color:#9CA3AF;">This email is empty.</p>',
            }}
          />
        ) : (
          // Preset templates have a specific visual arrangement (hero image,
          // split images, cards, etc.) — reuse the same canvas that renders
          // the live editor, just in non-interactive/read-only mode, so the
          // preview actually matches what's on the left instead of just
          // dumping flattened HTML.
          <div className="px-6 pb-6">
            <TemplatePreviewCanvas
              templateId={templateId}
              blocks={templateLayout}
              interactive={false}
              attachments={[]}
              brandName={brandName}
            />
          </div>
        )}

        {attachments.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {attachments.length} attachment{attachments.length > 1 ? "s" : ""}
            </p>
            <div className="flex flex-wrap gap-3">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex w-48 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-xs">📎</span>
                  <span className="truncate">{attachment.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Compose Step ─────────────────────────────────────────────────────────────

function ComposeStep({
    form, onChange, onNext, brandId, templateId, templateLayout, onTemplateLayoutChange, onRegisterCleanup,
  }: {
    form: ComposeForm;
    onChange: <K extends keyof ComposeForm>(k: K, v: ComposeForm[K]) => void;
    onClose: () => void;
    onNext: () => void;
    brandId?: number;
    templateId?: number;
    templateLayout: TemplateLayoutBlock[];
    onTemplateLayoutChange: (value: TemplateLayoutBlock[]) => void;
    onRegisterCleanup?: (cleanup: () => Promise<void>) => void;
  }) {
  const isBlankTemplate = !templateId || templateId === 0;

  const [showAIWriter, setShowAIWriter] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [selectedWriterId, setSelectedWriterId] = useState<number | null>(null);
  const [writerPrompt, setWriterPrompt] = useState("");
  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
  const [selectedSubjectSuggestion, setSelectedSubjectSuggestion] = useState("");
  const [showSubjectRewritePanel, setShowSubjectRewritePanel] = useState(false);
  const [isSubjectRewriting, setIsSubjectRewriting] = useState(false);
  const [activeEditor, setActiveEditor] = useState<RichTextEditorHandle | null>(null);
  const [activeSelectionText, setActiveSelectionText] = useState("");
  const [pendingRewrite, setPendingRewrite] = useState<{ originalText: string; rewrittenText: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadKind, setUploadKind] = useState<'image' | 'attachment' | null>(null);
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<ComposerAttachment[]>([]);
  const [blankImageUrl, setBlankImageUrl] = useState("");
  const [selectedBlankImageSrc, setSelectedBlankImageSrc] = useState<string | null>(null);
  const [blankImageWidth, setBlankImageWidth] = useState(100);
  const [blankImageOffsetX, setBlankImageOffsetX] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [isRewritingSelection, setIsRewritingSelection] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [showAttachmentsPanel, setShowAttachmentsPanel] = useState(false);

  useEffect(() => {
    if (selectedBlankImageSrc && form.body && !form.body.includes(selectedBlankImageSrc)) {
      setSelectedBlankImageSrc(null);
    }
  }, [form.body, selectedBlankImageSrc]);

  // Clicking an <img> inside the blank template's editor swaps the right-hand
  // panel over to image controls for that image instead of the formatting
  // toolbar. Clicking anywhere else in the editor clears that state so the
  // toolbar comes back.
  const handleBlankPreviewClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const image = target.closest('img');

    const rawSrc = image?.getAttribute('src');

    if (rawSrc) {
      const nextSrc = rawSrc;
      if (selectedBlankImageSrc !== nextSrc || !showImagePanel) {
        setSelectedBlankImageSrc(nextSrc);
        setShowImagePanel(true);
        const style = activeEditor?.getImageStyle(nextSrc) || { width: 100, offsetX: 0 };
        setBlankImageWidth(style.width);
        setBlankImageOffsetX(style.offsetX);
      }
      return;
    }

    // Do not reset state while interacting with the editor itself.
    if (target.closest('.ql-editor')) {
      return;
    }

    if (selectedBlankImageSrc || showImagePanel) {
      setSelectedBlankImageSrc(null);
      setShowImagePanel(false);
    }
  };

  const [brandName, setBrandName] = useState("");
  const [brandInitial, setBrandInitial] = useState("B");
  const [brandFromEmail, setBrandFromEmail] = useState("");

  useEffect(() => {
    if (!brandId) {
      setBrandName("");
      setBrandInitial("B");
      setBrandFromEmail("");
      return;
    }

    let isMounted = true;

    const loadBrand = async () => {
      try {
        const brand = await brandService.getBrand(Number(brandId));
        if (!isMounted || !brand) return;

        const nextName = brand.name || "";
        const nextFromEmail = brand.fromEmail || "";
        setBrandName(nextName);
        setBrandInitial(getInitialLetter(nextName));
        setBrandFromEmail(nextFromEmail);

        if (nextName) {
          onChange("name", nextName);
        }
        if (nextFromEmail) {
          onChange("from", nextFromEmail);
        }
      } catch (error) {
        console.error("Failed to load brand details:", error);
      }
    };

    void loadBrand();

    return () => {
      isMounted = false;
    };
  }, [brandId]);

  useEffect(() => {
    setActiveBlockId(null);
    setActiveEditor(null);
    setShowAIWriter(false);
    setPendingRewrite(null);
    setActiveSelectionText("");
    setWriterPrompt("");
    setShowImagePanel(false);
    setShowAttachmentsPanel(false);
    setSelectedBlankImageSrc(null);
    setIsPreviewMode(false);
  }, [templateId]);

  // Used only for image slots now — clicking an image slot selects it (and a
  // second click on the same slot deselects it). Text blocks are activated
  // by focusing them directly (see handleEditorFocus below).
  const handleSelectImageBlock = (blockId: string) => {
    const nextBlockId = activeBlockId === blockId ? null : blockId;
    setActiveBlockId(nextBlockId);
    setShowAIWriter(false);
    setPendingRewrite(null);
    setActiveSelectionText("");
    setWriterPrompt("");
  };

  // Fired when any inline text block (headline/body/footer, or the blank
  // template's single document) gains focus — this is what drives which
  // editor the right-hand toolbar and the AI Writer act on.
  const handleEditorFocus = (blockId: string, handle: RichTextEditorHandle) => {
    setActiveBlockId(blockId);
    setActiveEditor(handle);
  };

  const handleRewriteSubject = async () => {
    if (!form.subject?.trim()) return;

    setIsSubjectRewriting(true);
    try {
      const response = await aiWriterService.rewriteSubject({ subject: form.subject });
      const suggestions = Array.isArray(response?.variations)
        ? response.variations.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
        : [];

      setSubjectSuggestions(suggestions);
      setSelectedSubjectSuggestion(suggestions[0] || "");
      setShowSubjectRewritePanel(suggestions.length > 0);
    } catch (error) {
      console.error("Subject rewrite failed:", error);
    } finally {
      setIsSubjectRewriting(false);
    }
  };

  const handleRewriteSelection = async () => {
    const textToRewrite = activeSelectionText || writerPrompt || form.preview || form.subject || form.body;
    if (!textToRewrite) return;

    setIsRewritingSelection(true);
    try {
      const response = await aiWriterService.partlyRewrite({
        dropdown_id: selectedWriterId ?? undefined,
        user_text: textToRewrite,
      });

      if (response?.rewritten_text) {
        setPendingRewrite({ originalText: textToRewrite, rewrittenText: response.rewritten_text });
      }
    } catch (error) {
      console.error("Partial rewrite failed:", error);
    } finally {
      setIsRewritingSelection(false);
    }
  };

  const handleApproveRewrite = () => {
    if (!pendingRewrite || !activeEditor) return;

    activeEditor.replaceSelection(pendingRewrite.rewrittenText);

    setPendingRewrite(null);
    setActiveSelectionText("");
    setWriterPrompt("");
  };

  const handleOpenAttachment = async (attachment: ComposerAttachment) => {
    try {
      const response = await fetch(attachment.url, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Attachment download failed', error);
      const fallbackLink = document.createElement('a');
      fallbackLink.href = attachment.url;
      fallbackLink.download = attachment.name;
      fallbackLink.target = '_blank';
      fallbackLink.rel = 'noopener noreferrer';
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      fallbackLink.remove();
    }
  };

  // Uploads into whichever image *slot* is active — preset templates only
  // ever replace an existing slot, they never add new ones.
  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setUploadingFile(true);
    setUploadKind('image');
    setUploadProgress(0);
    setUploadError("");

    try {
      const { url } = await uploadAsset(file, 'images', brandId ? Number(brandId) : undefined, (percent) => setUploadProgress(percent));
      if (activeBlockId) {
        const activeBlock = templateLayout.find((item) => item.id === activeBlockId);
        if (activeBlock?.role === 'image') {
          const nextBlocks = templateLayout.map((item) => item.id === activeBlock.id ? { ...item, imageUrl: url } : item);
          onTemplateLayoutChange(nextBlocks);
          onChange('body', buildLayoutHtml(nextBlocks));
        }
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error('Image upload failed', error);
      setUploadError('Unable to upload image right now.');
    } finally {
      setUploadingImage(false);
      setUploadingFile(false);
      setUploadKind(null);
      setUploadProgress(0);
    }
  };

  // Blank template only: drops an image in as a real embed at wherever the
  // cursor currently sits, so it can add as many images as the user wants,
  // exactly where they're typing. If the editor was never focused yet, it
  // falls back to appending — that's the only case where we touch form.body
  // directly instead of going through Quill's own API.
  const insertImageAtCursor = (url: string) => {
    if (activeEditor) {
      activeEditor.insertImage(url);
      onChange('body', activeEditor.getHtml());
      return;
    }
    const imgHtml = `<p><img src="${url}" alt="Inserted image" style="max-width:100%;height:auto;" /></p>`;
    onChange('body', `${form.body || ''}${imgHtml}`);
  };

  // Swaps an image the user clicked on for a new one. Goes through the
  // editor's own DOM + Quill's resync (see replaceImageSrc), not a
  // DOMParser/innerHTML round-trip — that round-trip was producing markup
  // that didn't parse back to an identical Quill Delta, which is what made
  // this hang.
  const replaceSelectedBlankImageSrc = (newSrc: string) => {
    if (!selectedBlankImageSrc || !activeEditor) return;
    activeEditor.replaceImageSrc(selectedBlankImageSrc, newSrc);
    onChange('body', activeEditor.getHtml());
    setSelectedBlankImageSrc(newSrc);
  };

  const handleBlankImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setUploadingFile(true);
    setUploadKind('image');
    setUploadProgress(0);
    setUploadError("");

    try {
      const { url } = await uploadAsset(file, 'images', brandId ? Number(brandId) : undefined, (percent) => setUploadProgress(percent));
      if (selectedBlankImageSrc) {
        replaceSelectedBlankImageSrc(url);
      } else {
        insertImageAtCursor(url);
      }
      setBlankImageUrl(url);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error('Image upload failed', error);
      setUploadError('Unable to upload image right now.');
    } finally {
      setUploadingImage(false);
      setUploadingFile(false);
      setUploadKind(null);
      setUploadProgress(0);
    }
  };

  const handleInsertBlankImageUrl = () => {
    if (!blankImageUrl?.trim()) return;
    if (selectedBlankImageSrc) {
      replaceSelectedBlankImageSrc(blankImageUrl.trim());
    } else {
      insertImageAtCursor(blankImageUrl.trim());
    }
    setBlankImageUrl("");
  };

  const handleAttachmentUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadKind('attachment');
    setUploadProgress(0);
    setUploadError("");

    try {
      const { url, filename, mimeType, assetId } = await uploadAsset(file, 'attachments', brandId ? Number(brandId) : undefined, (percent) => setUploadProgress(percent));
      const nextAttachment: ComposerAttachment = { id: `${Date.now()}-${filename}`, name: filename, url, mimeType, assetId };
      setPendingAttachments((current) => [...current, nextAttachment]);
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }
    } catch (error) {
      console.error('Attachment upload failed', error);
      setUploadError('Unable to upload attachment right now.');
    } finally {
      setUploadingFile(false);
      setUploadKind(null);
      setUploadProgress(0);
    }
  };

  const handleCancelPendingAttachment = async (attachmentToRemove: ComposerAttachment) => {
    setPendingAttachments((current) => current.filter((attachment) => attachment.id !== attachmentToRemove.id));

    try {
      if (attachmentToRemove.assetId) {
        await deleteUploadedAsset(attachmentToRemove.assetId, brandId ? Number(brandId) : undefined);
      }
    } catch (error) {
      console.error('Attachment delete failed', error);
      setUploadError('The file was removed from the composer, but cleanup failed in the backend.');
    }
  };

  const handleAddPendingAttachment = (attachmentToAdd: ComposerAttachment) => {
    setPendingAttachments((current) => current.filter((attachment) => attachment.id !== attachmentToAdd.id));
    setAttachments((current) => {
      const alreadyAdded = current.some((attachment) => attachment.id === attachmentToAdd.id || (attachment.url === attachmentToAdd.url && attachment.name === attachmentToAdd.name));
      return alreadyAdded ? current : [...current, attachmentToAdd];
    });
  };

  const handleRemoveAddedAttachment = (attachmentToRemove: ComposerAttachment) => {
    setAttachments((current) => current.filter((attachment) => attachment.id !== attachmentToRemove.id));
  };

  const cleanupAttachments = async () => {
    const allAttachments = [...pendingAttachments, ...attachments];
    const cleanupTargets = allAttachments.filter((attachment) => Boolean(attachment.assetId));

    if (cleanupTargets.length === 0) {
      setPendingAttachments([]);
      setAttachments([]);
      return;
    }

    await Promise.allSettled(
      cleanupTargets.map((attachment) => deleteUploadedAsset(attachment.assetId, brandId ? Number(brandId) : undefined, 'attachment'))
    );

    setPendingAttachments([]);
    setAttachments([]);
  };

  useEffect(() => {
    onRegisterCleanup?.(cleanupAttachments);
  }, [onRegisterCleanup, brandId, attachments, pendingAttachments]);

  const updateActiveImageBlock = (updates: Partial<TemplateLayoutBlock>) => {
    if (!activeBlockId) return;

    const activeBlock = templateLayout.find((item) => item.id === activeBlockId);
    if (!activeBlock || activeBlock.role !== "image") return;

    const nextBlocks = templateLayout.map((item) => item.id === activeBlock.id ? { ...item, ...updates } : item);
    onTemplateLayoutChange(nextBlocks);
    onChange("body", buildLayoutHtml(nextBlocks));
  };

  // A preset template's text block just typed into directly — no more side
  // panel duplicating the content. Stores Quill's own output as-is; nothing
  // here re-normalizes it before it becomes that same block's next
  // controlled `value`, which is what was breaking the space bar and list/
  // color/alignment formatting.
  const handleBlockTextChange = (blockId: string, value: string) => {
    const nextBlocks = templateLayout.map((item) => item.id === blockId ? { ...item, text: value } : item);
    onTemplateLayoutChange(nextBlocks);
    onChange("body", buildLayoutHtml(nextBlocks));
  };

  // Header "Add Image" button. Blank template just opens the image panel —
  // the image itself lands wherever the cursor is. Preset templates route it
  // to whichever image slot is active, or the first empty slot, since those
  // templates can only ever replace an existing slot.
  const handleAddImageClick = () => {
    if (isBlankTemplate) {
      setSelectedBlankImageSrc(null);
      setShowImagePanel((value) => !value);
      return;
    }

    const currentActive = templateLayout.find((block) => block.id === activeBlockId);
    const target =
      (currentActive?.role === "image" ? currentActive : null) ||
      templateLayout.find((block) => block.role === "image" && !block.imageUrl) ||
      templateLayout.find((block) => block.role === "image");

    if (target) {
      setActiveBlockId(target.id);
    }
  };

  const handleAddFileClick = () => {
    setShowAttachmentsPanel((value) => !value);
  };

  const handleAIRewriteClick = () => {
    setShowAIWriter((value) => !value);
  };

  const renderAttachmentsPanel = () => (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">Attachments</p>
          <p className="text-xs text-slate-500">Upload files to share with the recipient.</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={attachmentInputRef} type="file" className="hidden" onChange={handleAttachmentUpload} />
          <button
            type="button"
            onClick={() => attachmentInputRef.current?.click()}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50"
          >
            Upload attachment
          </button>
        </div>
      </div>

      {uploadingFile && (
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
          <div className="flex items-center justify-between text-xs font-medium text-blue-700">
            <span>{uploadKind === 'attachment' ? 'Uploading attachment...' : 'Uploading image...'}</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-blue-100">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {pendingAttachments.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ready to add</p>
          <ul className="mt-2 space-y-2">
            {pendingAttachments.map((attachment) => (
              <li key={attachment.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-amber-50 px-3 py-2 text-sm text-slate-700">
                <span>{attachment.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCancelPendingAttachment(attachment)}
                    className="text-xs font-medium text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPendingAttachment(attachment)}
                    className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {attachments.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Added to preview</p>
          <ul className="mt-2 space-y-2">
            {attachments.map((attachment) => (
              <li key={attachment.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <span>{attachment.name}</span>
                <button
                  type="button"
                  onClick={() => void handleOpenAttachment(attachment)}
                  className="text-blue-600 hover:underline"
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        pendingAttachments.length === 0 && <p className="mt-3 text-sm text-slate-500">No attachments added yet.</p>
      )}
    </div>
  );

  const activeImageBlock = !isBlankTemplate ? templateLayout.find((block) => block.id === activeBlockId && block.role === "image") : undefined;

  return (
    <div className="flex flex-col h-full relative">
      {/* Toolbar header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-5">
              <div className="text-xs text-gray-500">Name:</div>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-gray-800">
                <div className=" bg-amber-500 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white">
                  {brandInitial || getInitialLetter(brandName || form.name)}
                </div>
                <span>{brandName || form.name || "Your name"}</span>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-xs text-gray-500">From:</div>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                <div className="bg-amber-500 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white">
                  {getInitialLetter(brandFromEmail || form.from || "F")}
                </div>
                <span>{brandFromEmail || form.from || "your@email.com"}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPreviewMode((value) => !value)}
              className={`text-sm px-4 py-1.5 rounded-lg border transition-colors ${isPreviewMode ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              Preview
            </button>
            <button className="border border-gray-200 text-gray-600 text-sm px-4 py-1.5 rounded-lg hover:bg-gray-50">Save</button>
            <button
              onClick={onNext}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
            >
              Send Now
            </button>
            <button className="border border-gray-200 text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-50">📅</button>
          </div>
        </div>
      </div>

      {isPreviewMode ? (
        <EmailPreviewPane
          form={form}
          brandName={brandName}
          brandInitial={brandInitial}
          attachments={attachments}
          templateId={templateId}
          templateLayout={templateLayout}
        />
      ) : (
        <>
          {/* To */}
          <div className="flex items-center px-6 py-3 border-b border-gray-100">
            <span className="text-sm text-gray-500 w-10">To:</span>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {getInitialLetter(isValidEmail(form.to) ? form.to.split("@")[0] : form.to || "T")}
              </div>
              <input
                className="min-w-60 border-b border-transparent bg-transparent text-sm font-medium text-gray-700 focus:border-gray-300 focus:outline-none"
                value={form.to || ""}
                onChange={(event) => onChange("to", event.target.value)}
                placeholder="recipient@email.com"
              />
            </div>
          </div>

          {/* Subject */}
          <div className="px-6 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 w-16">Subject:</span>
              <input
                className="flex-1 text-sm font-medium text-gray-800 focus:outline-none"
                value={form.subject}
                onChange={e => onChange("subject", e.target.value)}
                placeholder="Email subject line"
              />
              <button
                onClick={handleRewriteSubject}
                disabled={isSubjectRewriting}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
              >
                {isSubjectRewriting ? "Rewriting..." : "✨ Rewrite"}
              </button>
            </div>
            {showSubjectRewritePanel && subjectSuggestions.length > 0 && (
              <div className="ml-16 mt-2 flex items-center gap-2">
                <select
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                  value={selectedSubjectSuggestion}
                  onChange={(event) => setSelectedSubjectSuggestion(event.target.value)}
                >
                  {subjectSuggestions.map((suggestion) => (
                    <option key={suggestion} value={suggestion}>
                      {suggestion}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (selectedSubjectSuggestion) {
                      onChange("subject", selectedSubjectSuggestion);
                    }
                    setShowSubjectRewritePanel(false);
                    setSubjectSuggestions([]);
                    setSelectedSubjectSuggestion("");
                  }}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                >
                  Use
                </button>
                <button
                  onClick={() => {
                    setShowSubjectRewritePanel(false);
                    setSubjectSuggestions([]);
                    setSelectedSubjectSuggestion("");
                  }}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Preview text */}
          <div className="flex items-center px-6 py-3 border-b border-gray-100 gap-3">
            <span className="text-sm text-gray-500 w-16">Preview:</span>
            <input
              className="flex-1 text-sm text-gray-600 focus:outline-none"
              value={form.preview}
              onChange={e => onChange("preview", e.target.value)}
              placeholder="Email preview text"
            />
          </div>

          {/* Editor area — 60% preview / 40% controls */}
          <div className="flex-1 px-6 pt-4 pb-2 overflow-y-auto relative">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:gap-6">
              <div className="xl:w-[60%] xl:min-w-0">
                {isBlankTemplate ? (
                  <div
                    className="rounded-3xl border border-slate-200 bg-white p-6 min-h-[26rem]"
                    onClick={handleBlankPreviewClick}
                  >
                    <RichTextEditor
                      value={form.body}
                      onChange={(value) => onChange('body', value)}
                      placeholder="Start typing your email..."
                      className="min-h-[24rem]"
                      onEditorReady={(handle) => handleEditorFocus("blank-body", handle)}
                      onSelectionChange={(value) => {
                        setActiveSelectionText(value);
                        if (value) {
                          setWriterPrompt(value);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <TemplatePreviewCanvas
                    templateId={templateId}
                    blocks={templateLayout}
                    activeBlockId={activeBlockId}
                    onSelectBlock={handleSelectImageBlock}
                    attachments={attachments}
                    onRemoveAttachment={handleRemoveAddedAttachment}
                    brandName={brandName}
                    onBlockTextChange={handleBlockTextChange}
                    onEditorFocus={handleEditorFocus}
                    onBlockSelectionChange={(text) => {
                      setActiveSelectionText(text);
                      if (text) {
                        setWriterPrompt(text);
                      }
                    }}
                  />
                )}
              </div>

              <div className="xl:w-[40%] flex flex-col gap-4">
                {isBlankTemplate ? (
                  <>
                    {/* Formatting toolbar stays mounted at all times (just hidden)
                        so its state doesn't reset when the image panel toggles. */}
                    <div
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                      style={{ display: showImagePanel || selectedBlankImageSrc ? "none" : "block" }}
                    >
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Formatting</div>
                      <CustomToolbar editor={activeEditor} disabled={!activeEditor} />
                      {!activeEditor && (
                        <p className="mt-2 text-xs text-slate-500">Click into the email to start formatting.</p>
                      )}
                    </div>

                    {(showImagePanel || selectedBlankImageSrc) && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {selectedBlankImageSrc ? "Replace image" : "Add image"}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {selectedBlankImageSrc
                                ? "Click a different image in the email to switch, or replace this one below."
                                : "Paste a URL or upload a file — it drops in right where your cursor is."}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShowImagePanel(false);
                              setSelectedBlankImageSrc(null);
                            }}
                            className="text-xs font-medium text-slate-500 hover:text-slate-700"
                          >
                            Close
                          </button>
                        </div>

                        {selectedBlankImageSrc && (
                          <img
                            src={selectedBlankImageSrc}
                            alt="Selected"
                            className="mt-3 h-32 w-full rounded-xl border border-slate-200 bg-white object-contain"
                          />
                        )}

                        {selectedBlankImageSrc && (
                          <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                            <label className="block text-xs font-medium text-slate-600">
                              Size
                              <input
                                type="range"
                                min={10}
                                max={100}
                                value={blankImageWidth}
                                onChange={(event) => {
                                  const width = Number(event.target.value);
                                  setBlankImageWidth(width);
                                  activeEditor?.updateImageStyle(selectedBlankImageSrc, { width });
                                }}
                                className="mt-1 w-full"
                              />
                              <span className="mt-1 block text-slate-500">{blankImageWidth}%</span>
                            </label>
                            <label className="block text-xs font-medium text-slate-600">
                              Position
                              <input
                                type="range"
                                min={-200}
                                max={200}
                                value={blankImageOffsetX}
                                onChange={(event) => {
                                  const offsetX = Number(event.target.value);
                                  setBlankImageOffsetX(offsetX);
                                  activeEditor?.updateImageStyle(selectedBlankImageSrc, { offsetX });
                                }}
                                className="mt-1 w-full"
                              />
                              <span className="mt-1 block text-slate-500">{blankImageOffsetX}px</span>
                            </label>
                          </div>
                        )}

                        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                          <input
                            value={blankImageUrl}
                            onChange={(event) => setBlankImageUrl(event.target.value)}
                            placeholder="Paste image URL"
                            className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={handleInsertBlankImageUrl}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            {selectedBlankImageSrc ? "Replace" : "Insert"}
                          </button>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBlankImageUpload} />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50"
                          >
                            {uploadingImage ? "Uploading..." : "Upload from device"}
                          </button>
                        </div>
                        {uploadError ? <p className="mt-2 text-xs text-red-600">{uploadError}</p> : null}
                      </div>
                    )}

                    {showAttachmentsPanel && renderAttachmentsPanel()}
                  </>
                ) : (
                  <>
                    {activeImageBlock ? (
                      <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">Image slot: {activeImageBlock.label}</p>
                            <p className="text-xs text-slate-500">Paste an image URL, or upload, to place it in this slot.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectImageBlock(activeImageBlock.id)}
                            className="text-xs font-medium text-slate-500 hover:text-slate-700"
                          >
                            Close
                          </button>
                        </div>

                        <ImageSlotInput
                          block={activeImageBlock}
                          onCommit={(nextValue) => updateActiveImageBlock({ imageUrl: nextValue })}
                          onUpload={handleImageUpload}
                          uploading={uploadingImage}
                          uploadError={uploadError}
                          onStyleChange={updateActiveImageBlock}
                        />
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Formatting</div>
                        <CustomToolbar editor={activeEditor} disabled={!activeEditor} />
                        {!activeEditor && (
                          <p className="mt-2 text-xs text-slate-500">Click into the headline, body, or footer text on the left to start formatting.</p>
                        )}
                      </div>
                    )}

                    {showAttachmentsPanel && renderAttachmentsPanel()}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Floating action cluster — Add File / Add Image / AI Writer */}
      {!isPreviewMode && (
        <div className="absolute right-4 top-28 z-20 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleAddFileClick}
            title="Add file"
            className={`flex h-11 w-11 items-center justify-center rounded-full border text-base shadow-md transition-colors ${showAttachmentsPanel ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            📎
          </button>
          <button
            type="button"
            onClick={handleAddImageClick}
            title="Add image"
            className={`flex h-11 w-11 items-center justify-center rounded-full border text-base shadow-md transition-colors ${showImagePanel || selectedBlankImageSrc || activeImageBlock ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            🖼️
          </button>
          <button
            type="button"
            onClick={handleAIRewriteClick}
            title="AI Writer"
            className={`flex h-11 w-11 items-center justify-center rounded-full text-base text-white shadow-md transition-colors ${showAIWriter ? "bg-blue-700" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            ✨
          </button>
        </div>
      )}

      {showAIWriter && !isPreviewMode && (
        <AIWriterPopup
          onClose={() => setShowAIWriter(false)}
          selectedWriterId={selectedWriterId}
          onSelectWriter={setSelectedWriterId}
          prompt={writerPrompt}
          onPromptChange={setWriterPrompt}
          onGenerate={handleRewriteSelection}
          readOnly={Boolean(activeSelectionText)}
          isRewriting={isRewritingSelection}
        />
      )}

      {pendingRewrite && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">Approve rewritten text?</h3>
            <p className="mt-2 text-sm text-gray-500">Review the replacement before applying it to your email.</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Original</p>
                <p className="mt-1 text-sm text-gray-700">{pendingRewrite.originalText}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">New</p>
                <p className="mt-1 text-sm text-gray-700">{pendingRewrite.rewrittenText}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPendingRewrite(null)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600"
              >
                Discard
              </button>
              <button
                onClick={handleApproveRewrite}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Confirm Step ─────────────────────────────────────────────────────────────

function ConfirmStep({
  form, onChange, onSend, sent,
}: {
  form: ConfirmForm;
  onChange: <K extends keyof ConfirmForm>(k: K, v: ConfirmForm[K]) => void;
  onSend: () => void;
  sent: boolean;
}) {
  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Newsletter Sent<span className="text-amber-500">.</span></h2>
        <p className="text-gray-500 text-sm mb-8">Your Email has been sent</p>
        <div className="text-8xl mb-8">🥳</div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
        >
          ← Finish and Exit
        </button>
      </div>
    );
  }

  return (
    <div className="px-8 py-10 max-w-xl mx-auto w-full">
      <h2 className="text-2xl font-bold text-gray-900 text-center mb-1">You're almost ready</h2>
      <p className="text-gray-500 text-sm text-center mb-8">review your broadcast before sending</p>

      {/* Test email */}
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-700 mb-2 block">Test Email</label>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.testEmail}
            onChange={e => onChange("testEmail", e.target.value)}
            placeholder="your@email.com"
          />
          <button className="border border-gray-300 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
            Send Test
          </button>
        </div>
      </div>

      <hr className="border-gray-100 mb-6" />

      {/* Delivery */}
      <div className="mb-6">
        <h3 className="font-bold text-gray-900 mb-1">Delivery</h3>
        <p className="text-sm text-gray-500 mb-4">Send Now! or Schedule in future</p>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.delivery === "now" ? "border-blue-600" : "border-gray-300"}`}>
              {form.delivery === "now" && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
            </div>
            <span className="text-sm text-gray-700" onClick={() => onChange("delivery", "now")}>Send Now</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer" onClick={() => onChange("delivery", "later")}>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.delivery === "later" ? "border-blue-600" : "border-gray-300"}`}>
              {form.delivery === "later" && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
            </div>
            <span className="text-sm text-blue-600 font-medium">Send Later</span>
          </label>
        </div>

        {form.delivery === "later" && (
          <div className="mt-4 flex gap-3">
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 flex-1">
              <input
                type="date"
                className="bg-transparent text-sm text-gray-700 focus:outline-none flex-1"
                value={form.scheduleDate}
                onChange={e => onChange("scheduleDate", e.target.value)}
              />
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5">
              <span className="text-xs text-gray-500">UTC</span>
              <input
                type="time"
                className="bg-transparent text-sm text-gray-700 focus:outline-none w-16"
                value={form.scheduleTime}
                onChange={e => onChange("scheduleTime", e.target.value)}
              />
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}

        {form.delivery === "later" && (
          <p className="text-xs text-gray-400 mt-2 text-center">Timezone: (UTC+00:00) Dublin, Edinburgh, Lisbon, London</p>
        )}
      </div>

      <button
        onClick={onSend}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        {form.delivery === "now" ? "Send Now" : "Schedule Broadcast"}
      </button>
    </div>
  );
}

// ─── Root Composer ────────────────────────────────────────────────────────────

export function EmailComposerModal({ onClose, prefilled, templateId }: Props) {
  const [step, setStep] = useState<ComposerStep>("compose");
  const [sent, setSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const user = useAuthStore((state) => state.user);
  const { brandId } = useParams();
  const [templateLayout, setTemplateLayout] = useState<TemplateLayoutBlock[]>(() => safeBuildTemplateLayout(templateId));

  const composeCleanupRef = useRef<(() => Promise<void>) | null>(null);

  const [compose, setCompose] = useState<ComposeForm>({
    name: user ? `${user.first_name} ${user.last_name}` : "User",
    from: user?.email || "",
    to: "",
    subject: prefilled?.subject ?? "Website Design Proposal",
    preview: prefilled?.preview ?? (prefilled?.subject ? `${prefilled.subject} — read more inside` : "My Summer Slash Design Package Is Here And You'reInvited To Join!"),
    body: prefilled?.body ?? "",
  });

  const [confirm, setConfirm] = useState<ConfirmForm>({
    testEmail: user?.email || "",
    delivery: "later",
    scheduleDate: "2023-05-16",
    scheduleTime: "23:39",
  });

  useEffect(() => {
    const nextLayout = safeBuildTemplateLayout(templateId);
    setTemplateLayout(nextLayout);

    if (templateId && templateId !== 0) {
      setCompose((current) => ({
        ...current,
        body: current.body || buildLayoutHtml(nextLayout),
      }));
    }
  }, [templateId]);

  // `prefilled` re-runs this effect whenever it changes *by reference* — and
  // if the parent that renders <EmailComposerModal prefilled={{...}} /> ever
  // builds that object inline, it gets a new reference on every parent
  // render, including ones triggered indirectly by typing here (typing in a
  // template block calls setCompose/setTemplateLayout on this very
  // component). Without a content-based guard, that means every keystroke
  // could re-apply this effect and stomp the user's edit right back to the
  // original prefilled/AI content — which looks like "the keyboard doesn't
  // respond." Only actually apply when the underlying content changes.
  const appliedPrefillSignatureRef = useRef<string | null>(null);
  useEffect(() => {
    if (!prefilled) return;

    const signature = JSON.stringify({ templateId, prefilled });
    if (appliedPrefillSignatureRef.current === signature) return;
    appliedPrefillSignatureRef.current = signature;

    const aiResult = prefilled.aiResult;
    const nextSubjectFromAi = aiResult ? resolveContentValue(aiResult, [
      "headline", "data.headline", "result.headline", "subject", "data.subject", "result.subject", "title",
    ]) : "";
    const nextPreviewFromAi = aiResult ? resolveContentValue(aiResult, [
      "preview", "data.preview", "result.preview", "description", "data.description", "result.description", "summary",
    ]) : "";
    const nextBodyFromAi = aiResult ? resolveContentValue(aiResult, [
      "html_body", "data.html_body", "result.html_body", "body", "data.body", "result.body", "content", "data.content", "result.content",
    ]) : "";

    const hasExplicitPrefill = Boolean(prefilled.subject || prefilled.preview || prefilled.body);
    const hasAiPrefill = isNonEmptyAiResult(aiResult) || nextSubjectFromAi || nextPreviewFromAi || nextBodyFromAi;
    if (!hasExplicitPrefill && !hasAiPrefill) return;

    setCompose((current) => ({
      ...current,
      subject: (prefilled.subject ?? nextSubjectFromAi) || current.subject || "",
      preview: (prefilled.preview ?? nextPreviewFromAi) || current.preview || (prefilled?.subject ? `${prefilled.subject} — read more inside` : ""),
      body: (prefilled.body ?? nextBodyFromAi) || current.body || "",
    }));

    if (hasAiPrefill) {
      setTemplateLayout(
        safeBuildTemplateLayout(templateId, {
          ...(aiResult ?? {}),
          headline: nextSubjectFromAi,
          preview: nextPreviewFromAi,
          body: nextBodyFromAi,
        })
      );
    }
  }, [prefilled, templateId]);

  const handleModalClose = async () => {
    try {
      if (composeCleanupRef.current) {
        await composeCleanupRef.current();
      }
    } catch (error) {
      console.error('Failed to cleanup composer attachments', error);
    } finally {
      onClose();
    }
  };

  const handleSend = async () => {
    if (isSending) return;

    setIsSending(true);
    try {
      const brandIdNumber = brandId ? Number(brandId) : undefined;
      const sendPayload = {
        brand_id: brandIdNumber,
        subject: compose.subject,
        preview: compose.preview,
        body: compose.body,
        test_email: confirm.testEmail || undefined,
        delivery_type: confirm.delivery,
        schedule_date: confirm.delivery === "later" ? confirm.scheduleDate : undefined,
        schedule_time: confirm.delivery === "later" ? confirm.scheduleTime : undefined,
        status: confirm.delivery === "later" ? "scheduled" : "sent",
      };

      await composerWorkflowService.createSendLog(sendPayload);

      if (confirm.delivery === "later" && brandIdNumber) {
        await composerWorkflowService.createDeliverySchedule({
          brand_id: brandIdNumber,
          subject: compose.subject,
          preview: compose.preview,
          body: compose.body,
          test_email: confirm.testEmail || undefined,
          schedule_date: confirm.scheduleDate,
          schedule_time: confirm.scheduleTime,
        });
      }

      setSent(true);
    } catch (error) {
      console.error("Failed to send newsletter workflow", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col">
      {/* Step header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-sm font-medium ${step === "compose" ? "text-blue-600" : "text-gray-400"}`}>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${step === "compose" ? "border-blue-600 text-blue-600" : "border-gray-300"}`}>✓</div>
            Compose
          </div>
          <div className="text-gray-300">›</div>
          <div className={`flex items-center gap-1.5 text-sm font-medium ${step !== "compose" ? "text-blue-600" : "text-gray-400"}`}>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${step !== "compose" ? "border-blue-600 text-blue-600" : "border-gray-300"}`}>✓</div>
            Confirm
          </div>
        </div>
        <div className="flex-1 flex justify-end">
          <button onClick={() => void handleModalClose()} className="text-gray-400 hover:text-gray-700 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-gray-100">
        <div className={`h-full bg-blue-600 transition-all duration-500 ${step === "compose" ? "w-1/2" : "w-full"}`} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-white mx-auto w-full max-w-4xl shadow-sm relative">
        {step === "compose" ? (
          <ComposeStep
            form={compose}
            onChange={(k, v) => setCompose(f => ({ ...f, [k]: v }))}
            onClose={handleModalClose}
            onNext={() => setStep("confirm")}
            brandId={brandId ? Number(brandId) : undefined}
            templateId={templateId}
            templateLayout={templateLayout}
            onTemplateLayoutChange={(value) => {
              setTemplateLayout(value);
            }}
            onRegisterCleanup={(cleanup) => {
              composeCleanupRef.current = cleanup;
            }}
          />
        ) : (
          <ConfirmStep
            form={confirm}
            onChange={(k, v) => setConfirm(f => ({ ...f, [k]: v }))}
            onSend={handleSend}
            sent={sent}
          />
        )}
      </div>
    </div>
  );
}