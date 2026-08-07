import { useState, useEffect, useRef, type ReactNode, type ChangeEvent, type MouseEvent } from "react";
import ReactQuill, { Quill } from "react-quill-new";
import type { ComposeForm, ConfirmForm, ComposerAttachment, TemplateLayoutBlock } from "../../types/Types";
import { useAuthStore } from "../../store/useAuthStore";
import { lookupService, type LookupItem } from "../../services/lookupService";
import { aiWriterService } from "../../services/aiWriterService";
import { composerWorkflowService } from "../../services/composerWorkflowService";
import { brandService } from "../../services/brandService";
import { deleteUploadedAsset, uploadAsset } from "../../services/apiClient";
import { useParams } from "react-router-dom";
import "react-quill-new/dist/quill.snow.css";

// ─── Register Custom Image Format (Preserves data-blank-image-id) ─────────────
const ImageFormat = Quill.import("formats/image") as any;
class CustomImageSpec extends ImageFormat {
  static create(value: any) {
    const node = super.create(value);
    if (typeof value === "object" && value.id) {
      node.setAttribute("data-blank-image-id", value.id);
      node.setAttribute("src", value.src);
    } else if (typeof value === "string") {
      node.setAttribute("src", value);
    }
    return node;
  }

  static formats(domNode: HTMLElement) {
    const formats = super.formats(domNode);
    if (domNode.hasAttribute("data-blank-image-id")) {
      formats["data-blank-image-id"] = domNode.getAttribute("data-blank-image-id");
    }
    return formats;
  }
}
Quill.register(CustomImageSpec, true);

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
  const blocks = html
    .split(/(?=<(?:p|div|h[1-6]|li)\b)|(?<=<\/(?:p|div|h[1-6]|li)>)|<br\s*\/?>/i)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

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
  interactive?: boolean;
  onBlockTextChange?: (blockId: string, value: string) => void;
  onEditorFocus?: (blockId: string, handle: RichTextEditorHandle) => void;
  onBlockSelectionChange?: (text: string) => void;
}) {
  const bodyBlocks = blocks.filter((block) => block.role === "body");
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
      <div
        key={block.id} // Added permanent key to preserve focus on re-renders
        className={`rounded-xl transition-shadow ${isActive ? "ring-2 ring-blue-400 ring-offset-1" : "hover:ring-1 hover:ring-slate-200"}`}
      >
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

  const renderHeadline = () => (
    <div className="mt-6">
      {renderEditableText(
        blocks.find((block) => block.role === "headline"),
        "text-2xl font-bold leading-snug text-slate-900 text-center",
        "Add your headline"
      )}
    </div>
  );

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


  // ─── Rich Text Editor Component ───────────────────────────────────────────────

function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  bare = false,
  onEditorReady,
  onSelectionChange,
}: {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  bare?: boolean;
  onEditorReady?: (handle: RichTextEditorHandle) => void;
  onSelectionChange?: (text: string) => void;
}) {
  const quillRef = useRef<any>(null);
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
    applyFormat: (name: string, formatValue: unknown) => {
      editor.focus();
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
    replaceImageSrc: (oldSrc: string, newSrc: string) => {
      const images: HTMLImageElement[] = Array.from(editor.root.querySelectorAll("img"));
      const image = images.find((candidate) => candidate.getAttribute("src") === oldSrc);
      if (image) {
        image.setAttribute("src", newSrc);
        editor.update("user");
      }
    },
    replaceImageSrcById: (id: string, newSrc: string) => {
      const image = editor.root.querySelector(`img[data-blank-image-id="${id}"]`) as HTMLImageElement | null;
      if (image) {
        image.setAttribute("src", newSrc);
        editor.update("user");
      }
    },
    getImageElementById: (id: string) => {
      return editor.root.querySelector(`img[data-blank-image-id="${id}"]`) as HTMLImageElement | null;
    },
    getImageStyleById: (id: string) => {
      const image = editor.root.querySelector(`img[data-blank-image-id="${id}"]`) as HTMLImageElement | null;
      if (!image) return { width: 100, offsetX: 0 };
      const widthAttr = image.style.width;
      const width = widthAttr && widthAttr.endsWith("%") ? Number.parseInt(widthAttr, 10) || 100 : 100;
      const offsetMatch = /translateX\((-?\d+(?:\.\d+)?)px\)/.exec(image.style.transform || "");
      const offsetX = offsetMatch ? Number.parseFloat(offsetMatch[1]) : 0;
      return { width, offsetX };
    },
    updateImageStyleById: (id: string, updates: { width?: number; offsetX?: number }) => {
      const image = editor.root.querySelector(`img[data-blank-image-id="${id}"]`) as HTMLImageElement | null;
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
  replaceImageSrcById: (id: string, newSrc: string) => void;
  getImageElementById: (id: string) => HTMLImageElement | null;
  getImageStyleById: (id: string) => { width: number; offsetX: number };
  updateImageStyleById: (id: string, updates: { width?: number; offsetX?: number }) => void;
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
          <div
            className={`px-6 pb-6 text-[15px] leading-relaxed text-gray-800 ${RICH_TEXT_DISPLAY_CLASS}`}
            style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
            dangerouslySetInnerHTML={{
              __html: normalizeRichTextContent(form.body) || '<p style="color:#9CA3AF;">This email is empty.</p>',
            }}
          />
        ) : (
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
  form,
  onChange,
  onClose,
  onNext,
  brandId,
  templateId,
  templateLayout,
  onTemplateLayoutChange,
  onRegisterCleanup,
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
  const [selectedBlankImageId, setSelectedBlankImageId] = useState<string | null>(null);
  const [blankImageWidth, setBlankImageWidth] = useState(100);
  const [blankImageOffsetX, setBlankImageOffsetX] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [isRewritingSelection, setIsRewritingSelection] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [showAttachmentsPanel, setShowAttachmentsPanel] = useState(false);

  useEffect(() => {
    if (!selectedBlankImageId || !activeEditor) return;

    const image = activeEditor.getImageElementById(selectedBlankImageId);
    if (!image) {
      setSelectedBlankImageId(null);
      setSelectedBlankImageSrc(null);
      setShowImagePanel(false);
    }
  }, [form.body, activeEditor, selectedBlankImageId]);

  const handleBlankPreviewClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const image = target.closest('img');

    if (image) {
      const nextSrc = image.getAttribute('src');
      if (!nextSrc) return;

      let nextId = image.getAttribute('data-blank-image-id');
      if (!nextId) {
        nextId = `blank-image-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        image.setAttribute('data-blank-image-id', nextId);
      }

      if (selectedBlankImageId !== nextId || !showImagePanel) {
        setSelectedBlankImageId(nextId);
        setSelectedBlankImageSrc(nextSrc);
        setShowImagePanel(true);
        const style = activeEditor?.getImageStyleById(nextId) || {
          width: Number(image.style.width.replace('%', '')) || 100,
          offsetX: Number(image.style.transform.replace(/translateX\((-?\d+(?:\.\d+)?)px\)/, '$1')) || 0,
        };
        setBlankImageWidth(style.width);
        setBlankImageOffsetX(style.offsetX);
      }
      return;
    }

    if (target.closest('.ql-editor')) {
      return;
    }

    if (selectedBlankImageId || selectedBlankImageSrc || showImagePanel) {
      setSelectedBlankImageId(null);
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
        const brand = await brandService.getBrandById(brandId);
        if (!isMounted || !brand) return;
        setBrandName(brand.name || "");
        setBrandInitial(getInitialLetter(brand.name));
        if (brand.fromEmail) {
          setBrandFromEmail(brand.fromEmail);
          if (!form.from) {
            onChange("from", brand.fromEmail);
          }
        }
      } catch (error) {
        console.error("Failed to load brand details:", error);
      }
    };

    void loadBrand();

    return () => {
      isMounted = false;
    };
  }, [brandId, form.from, onChange]);

  useEffect(() => {
    if (onRegisterCleanup) {
      onRegisterCleanup(async () => {
        const currentUploadedAssets = pendingAttachments.filter((item) => Boolean(item.url));
        if (currentUploadedAssets.length === 0) return;

        await Promise.allSettled(
          currentUploadedAssets.map((asset) => deleteUploadedAsset(asset.url))
        );
      });
    }
  }, [onRegisterCleanup, pendingAttachments]);

  const activeImageBlock = templateLayout.find((block) => block.id === activeBlockId && block.role === "image");

  const handleBlockTextChange = (blockId: string, value: string) => {
    const nextBlocks = templateLayout.map((block) => (block.id === blockId ? { ...block, text: value } : block));
    onTemplateLayoutChange(nextBlocks);
    if (!isBlankTemplate) {
      onChange("body", buildLayoutHtml(nextBlocks));
    }
  };

  const handleBlockImageChange = (blockId: string, imageUrl: string) => {
    const nextBlocks = templateLayout.map((block) => (block.id === blockId ? { ...block, imageUrl } : block));
    onTemplateLayoutChange(nextBlocks);
    if (!isBlankTemplate) {
      onChange("body", buildLayoutHtml(nextBlocks));
    }
  };

  const handleBlockStyleChange = (blockId: string, updates: Partial<TemplateLayoutBlock>) => {
    const nextBlocks = templateLayout.map((block) => (block.id === blockId ? { ...block, ...updates } : block));
    onTemplateLayoutChange(nextBlocks);
    if (!isBlankTemplate) {
      onChange("body", buildLayoutHtml(nextBlocks));
    }
  };

  const handleSelectBlock = (blockId: string) => {
    setActiveBlockId(blockId);
  };

  const handleUploadImageFile = async (event: ChangeEvent<HTMLInputElement>, targetBlockId?: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setUploadError("");
    setUploadProgress(10);
    setUploadKind('image');

    try {
      const asset = await uploadAsset(file, (progress) => setUploadProgress(progress));
      setUploadProgress(100);

      if (targetBlockId) {
        handleBlockImageChange(targetBlockId, asset.asset_url);
      } else if (activeEditor) {
        if (selectedBlankImageId) {
          activeEditor.replaceImageSrcById(selectedBlankImageId, asset.asset_url);
          setSelectedBlankImageSrc(asset.asset_url);
          onChange("body", activeEditor.getHtml());
        } else {
          activeEditor.insertImage(asset.asset_url);
          onChange("body", activeEditor.getHtml());
        }
      }
    } catch (error) {
      console.error("Failed to upload image:", error);
      setUploadError("Image upload failed. Please try again.");
    } finally {
      setUploadingImage(false);
      setUploadProgress(0);
      setUploadKind(null);
      if (event.target) event.target.value = "";
    }
  };

  const handleUploadAttachmentFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadError("");
    setUploadProgress(10);
    setUploadKind('attachment');

    try {
      const asset = await uploadAsset(file, (progress) => setUploadProgress(progress));
      setUploadProgress(100);

      const newAttachment: ComposerAttachment = {
        id: asset.asset_id || `attachment-${Date.now()}`,
        name: asset.filename || file.name,
        size: file.size,
        url: asset.asset_url,
      };

      setAttachments((prev) => [...prev, newAttachment]);
      setPendingAttachments((prev) => [...prev, newAttachment]);
    } catch (error) {
      console.error("Failed to upload attachment:", error);
      setUploadError("Attachment upload failed. Please try again.");
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
      setUploadKind(null);
      if (event.target) event.target.value = "";
    }
  };

  const handleRemoveAttachment = async (attachment: ComposerAttachment) => {
    setAttachments((prev) => prev.filter((item) => item.id !== attachment.id));
    setPendingAttachments((prev) => prev.filter((item) => item.id !== attachment.id));

    if (attachment.url) {
      try {
        await deleteUploadedAsset(attachment.url);
      } catch (error) {
        console.error("Failed to delete asset on remote server:", error);
      }
    }
  };

  const handleRewriteSubject = async () => {
    if (!form.subject?.trim()) return;

    setIsSubjectRewriting(true);
    try {
      const results = await aiWriterService.generateSubjectLines({
        subject: form.subject,
        prompt: writerPrompt,
        aiWriterId: selectedWriterId,
      });
      setSubjectSuggestions(results);
      if (results.length > 0) {
        setSelectedSubjectSuggestion(results[0]);
      }
      setShowSubjectRewritePanel(true);
    } catch (error) {
      console.error("Failed to generate subject variations:", error);
    } finally {
      setIsSubjectRewriting(false);
    }
  };

  const handleApplySubject = () => {
    if (selectedSubjectSuggestion) {
      onChange("subject", selectedSubjectSuggestion);
      setShowSubjectRewritePanel(false);
    }
  };

  const handleRewriteSelection = async () => {
    if (!activeSelectionText || !activeEditor) return;

    setIsRewritingSelection(true);
    try {
      const rewritten = await aiWriterService.rewriteContent({
        content: activeSelectionText,
        prompt: writerPrompt,
        aiWriterId: selectedWriterId,
      });

      setPendingRewrite({
        originalText: activeSelectionText,
        rewrittenText: rewritten,
      });
    } catch (error) {
      console.error("Failed to rewrite text selection:", error);
    } finally {
      setIsRewritingSelection(false);
    }
  };

  const handleApplyRewrite = () => {
    if (pendingRewrite && activeEditor) {
      activeEditor.replaceSelection(pendingRewrite.rewrittenText);
      if (isBlankTemplate) {
        onChange("body", activeEditor.getHtml());
      }
      setPendingRewrite(null);
      setShowAIWriter(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-100">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            ✕
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Email Composer</h2>
            <p className="text-xs text-slate-500">Draft, format, and prepare your message for dispatch.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              isPreviewMode ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {isPreviewMode ? "Edit Layout" : "Preview Email"}
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-blue-700"
          >
            Next: Review
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 overflow-hidden">
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
            <div className="flex flex-1 flex-col overflow-y-auto p-6">
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
                <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">From Address</label>
                      <input
                        type="email"
                        value={form.from || ""}
                        onChange={(event) => onChange("from", event.target.value)}
                        placeholder="your-email@company.com"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">To Address</label>
                      <input
                        type="email"
                        value={form.to || ""}
                        onChange={(event) => onChange("to", event.target.value)}
                        placeholder="recipient@example.com"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-500">Subject Line</label>
                      <button
                        type="button"
                        onClick={handleRewriteSubject}
                        disabled={isSubjectRewriting || !form.subject}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-40"
                      >
                        {isSubjectRewriting ? "Generating..." : "✨ AI Subject Ideas"}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={form.subject || ""}
                      onChange={(event) => onChange("subject", event.target.value)}
                      placeholder="Enter subject line..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    {showSubjectRewritePanel && (
                      <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                        <p className="mb-2 text-xs font-semibold text-blue-900">Suggested Subject Lines</p>
                        <div className="space-y-1.5">
                          {subjectSuggestions.map((suggestion, index) => (
                            <label
                              key={index}
                              className="flex cursor-pointer items-center gap-2 rounded-lg bg-white p-2 text-xs text-slate-700 hover:bg-slate-50"
                            >
                              <input
                                type="radio"
                                name="subjectSuggestion"
                                checked={selectedSubjectSuggestion === suggestion}
                                onChange={() => setSelectedSubjectSuggestion(suggestion)}
                              />
                              <span>{suggestion}</span>
                            </label>
                          ))}
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowSubjectRewritePanel(false)}
                            className="rounded-lg px-3 py-1 text-xs text-slate-500 hover:bg-slate-100"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleApplySubject}
                            className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            Use Selected
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div onClick={handleBlankPreviewClick} className="relative">
                  {isBlankTemplate ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <RichTextEditor
                        value={form.body}
                        placeholder="Write your email body here..."
                        className="min-h-72 text-base text-slate-800"
                        onChange={(value) => onChange("body", value)}
                        onEditorReady={(handle) => setActiveEditor(handle)}
                        onSelectionChange={(text) => setActiveSelectionText(text)}
                      />
                    </div>
                  ) : (
                    <TemplatePreviewCanvas
                      templateId={templateId}
                      blocks={templateLayout}
                      activeBlockId={activeBlockId}
                      onSelectBlock={handleSelectBlock}
                      attachments={attachments}
                      onRemoveAttachment={handleRemoveAttachment}
                      brandName={brandName}
                      interactive={true}
                      onBlockTextChange={handleBlockTextChange}
                      onEditorFocus={(_id, handle) => setActiveEditor(handle)}
                      onBlockSelectionChange={(text) => setActiveSelectionText(text)}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="w-80 border-l border-slate-200 bg-white p-4 overflow-y-auto">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Formatting Tools</span>
                <button
                  type="button"
                  onClick={() => setShowAIWriter(!showAIWriter)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    showAIWriter ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  ✨ AI Writer
                </button>
              </div>

              {showImagePanel && (
                <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Image Settings</span>
                    <button
                      type="button"
                      onClick={() => setShowImagePanel(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Image Width ({blankImageWidth}%)</label>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={blankImageWidth}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setBlankImageWidth(val);
                          if (selectedBlankImageId && activeEditor) {
                            activeEditor.updateImageStyleById(selectedBlankImageId, { width: val });
                            onChange("body", activeEditor.getHtml());
                          }
                        }}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Horizontal Offset ({blankImageOffsetX}px)</label>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={blankImageOffsetX}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setBlankImageOffsetX(val);
                          if (selectedBlankImageId && activeEditor) {
                            activeEditor.updateImageStyleById(selectedBlankImageId, { offsetX: val });
                            onChange("body", activeEditor.getHtml());
                          }
                        }}
                        className="w-full"
                      />
                    </div>

                    <div className="pt-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleUploadImageFile(e)}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                      >
                        {uploadingImage ? "Uploading..." : "Replace Image File"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeImageBlock && !isBlankTemplate && (
                <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="mb-3 block text-xs font-bold text-slate-700">{activeImageBlock.label} Options</span>
                  <ImageSlotInput
                    block={activeImageBlock}
                    onCommit={(val) => handleBlockImageChange(activeImageBlock.id, val)}
                    onUpload={(e) => handleUploadImageFile(e, activeImageBlock.id)}
                    uploading={uploadingImage}
                    uploadError={uploadError}
                    onStyleChange={(updates) => handleBlockStyleChange(activeImageBlock.id, updates)}
                  />
                </div>
              )}

              <CustomToolbar editor={activeEditor} />

              <div className="mt-6 border-t border-slate-100 pt-4">
                <input
                  ref={attachmentInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleUploadAttachmentFile}
                />
                <button
                  type="button"
                  onClick={() => attachmentInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  <span>📎</span>
                  <span>{uploadingFile ? "Uploading File..." : "Attach Document"}</span>
                </button>
              </div>

              {attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Attached Files</span>
                  {attachments.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs"
                    >
                      <span className="truncate max-w-44 text-slate-700">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(file)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {showAIWriter && (
          <AIWriterPopup
            onClose={() => setShowAIWriter(false)}
            selectedWriterId={selectedWriterId}
            onSelectWriter={setSelectedWriterId}
            prompt={writerPrompt}
            onPromptChange={setWriterPrompt}
            onGenerate={handleRewriteSelection}
            readOnly={!activeSelectionText}
            isRewriting={isRewritingSelection}
          />
        )}

        {pendingRewrite && (
          <div className="absolute inset-x-0 bottom-12 mx-auto w-full max-w-xl rounded-2xl border border-blue-200 bg-white p-4 shadow-2xl z-20">
            <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-blue-600">AI Suggested Rewrite</h4>
            <div className="mb-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-800">
              {pendingRewrite.rewrittenText}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingRewrite(null)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleApplyRewrite}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Insert Rewrite
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Confirm Step ─────────────────────────────────────────────────────────────

function ConfirmStep({
  form,
  confirmForm,
  onConfirmChange,
  onBack,
  onSubmit,
  isSubmitting,
}: {
  form: ComposeForm;
  confirmForm: ConfirmForm;
  onConfirmChange: <K extends keyof ConfirmForm>(k: K, v: ConfirmForm[K]) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            ← Back
          </button>
          <h2 className="text-lg font-bold text-slate-900">Review & Send</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="mb-6 text-xl font-bold text-slate-900">Final Confirmation</h3>

          <div className="space-y-4 rounded-2xl bg-slate-50 p-5 text-sm">
            <div className="flex justify-between border-b border-slate-200 pb-3">
              <span className="font-medium text-slate-500">From</span>
              <span className="font-semibold text-slate-800">{form.from || "Not specified"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-3">
              <span className="font-medium text-slate-500">To</span>
              <span className="font-semibold text-slate-800">{form.to || "Not specified"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-slate-500">Subject</span>
              <span className="font-semibold text-slate-800">{form.subject || "(No Subject)"}</span>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmForm.confirmSending}
                onChange={(e) => onConfirmChange("confirmSending", e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs leading-5 text-slate-600">
                I confirm that the message content and recipient details are correct and ready for dispatch.
              </span>
            </label>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Edit Content
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!confirmForm.confirmSending || isSubmitting}
              className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Sending..." : "Send Message"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sent Step ────────────────────────────────────────────────────────────────

function SentStep({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-white p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-2xl text-green-600">
        ✓
      </div>
      <h2 className="text-2xl font-bold text-slate-900">Message Dispatched!</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Your email has been queued and is on its way to the recipient.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-8 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Close Composer
      </button>
    </div>
  );
}

// ─── Main Modal Export ────────────────────────────────────────────────────────

export default function EmailComposerModal({ onClose, prefilled, templateId }: Props) {
  const { brandId } = useParams<{ brandId?: string }>();
  const parsedBrandId = brandId ? Number.parseInt(brandId, 10) : undefined;

  const [step, setStep] = useState<ComposerStep>("compose");
  const [form, setForm] = useState<ComposeForm>({
    name: "",
    from: "",
    to: "",
    subject: prefilled?.subject || "",
    body: prefilled?.body || "",
  });

  const [confirmForm, setConfirmForm] = useState<ConfirmForm>({
    confirmSending: false,
  });

  const [templateLayout, setTemplateLayout] = useState<TemplateLayoutBlock[]>(() =>
    safeBuildTemplateLayout(templateId, prefilled?.aiResult)
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const cleanupRef = useRef<(() => Promise<void>) | null>(null);

  const handleFormChange = <K extends keyof ComposeForm>(key: K, value: ComposeForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleConfirmChange = <K extends keyof ConfirmForm>(key: K, value: ConfirmForm[K]) => {
    setConfirmForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSend = async () => {
    setIsSubmitting(true);
    try {
      await composerWorkflowService.sendEmail({
        form,
        brandId: parsedBrandId,
        templateId,
        layout: templateLayout,
      });
      setStep("sent");
    } catch (error) {
      console.error("Failed to dispatch email:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="h-[90vh] w-[95vw] max-w-7xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        {step === "compose" && (
          <ComposeStep
            form={form}
            onChange={handleFormChange}
            onClose={onClose}
            onNext={() => setStep("confirm")}
            brandId={parsedBrandId}
            templateId={templateId}
            templateLayout={templateLayout}
            onTemplateLayoutChange={setTemplateLayout}
            onRegisterCleanup={(cleanup) => {
              cleanupRef.current = cleanup;
            }}
          />
        )}

        {step === "confirm" && (
          <ConfirmStep
            form={form}
            confirmForm={confirmForm}
            onConfirmChange={handleConfirmChange}
            onBack={() => setStep("compose")}
            onSubmit={handleSend}
            isSubmitting={isSubmitting}
          />
        )}

        {step === "sent" && <SentStep onClose={onClose} />}
      </div>
    </div>
  );
}