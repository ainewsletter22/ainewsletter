import { useState, useEffect, useRef, useCallback, memo, type ReactNode, type ChangeEvent, type MouseEvent } from "react";
import type { ComposeForm, ConfirmForm, ComposerAttachment, TemplateLayoutBlock, Brand, SendVia } from "../../types/Types";
import type { Category } from "../../types/domain";
import { useAuthStore } from "../../store/useAuthStore";
import { lookupService, type LookupItem } from "../../services/lookupService";
import { aiWriterService } from "../../services/aiWriterService";
import { composerWorkflowService } from "../../services/composerWorkflowService";
import { brandService } from "../../services/brandService";
import { clientService } from "../../services/clientService";
import { deleteUploadedAsset, uploadAsset } from "../../services/apiClient";
import { validateBroadcastSelection, getValidationErrorMessage } from "../../utils/sendValidation";
import { draftService } from "../../services/draftService";
import { appendFooterToEmail } from "../../utils/emailFooter";
import { useParams } from "react-router-dom";
import { ComposerRichTextEditor, type ComposerEditorHandle } from "./composer-tiptap/ComposerRichTextEditor";
import { ComposerToolbar } from "./composer-tiptap/ComposerToolbar";
import { useAiWriterBridge } from "./composer-tiptap/useAiWriterBridge";
import { EmailTemplateSnapshot } from "../Emailtemplatesnapshot";
import addFile from "../../assets/addFile.png"
import addImage from "../../assets/addImage.png"
import aiWriter from "../../assets/aiWriter.png"
import aiWriterBlue from "../../assets/aiWriterBlue.png"

// ─── Editor engine ────────────────────────────────────────────────────────
// The editor is TipTap (see ./composer-tiptap), not Quill. Quill was removed
// entirely -- it was already dead code in this file (RichTextEditor/Quill
// wrapper was defined but never actually rendered anywhere; the blank
// template body and the 5 fixed templates' text blocks were both really
// running on raw contentEditable + document.execCommand, which is what was
// causing the persistent "typed content deleted on highlight" bug).
// NOTE: install with `npm install @tiptap/core @tiptap/react @tiptap/starter-kit
// @tiptap/extension-underline @tiptap/extension-text-style @tiptap/extension-color
// @tiptap/extension-text-align @tiptap/extension-link @tiptap/extension-image lucide-react`

// ─── Type additions needed in ../../types/Types.ts ───────────────────────
// TemplateLayoutBlock needs two new OPTIONAL fields for requirements #4/#5:
//   imageLinkUrl?: string;  // requirement #4: image slot can link out
//   removed?: boolean;      // requirement #5: image slot removed from this send, but not deleted from the layout
// Both are optional so existing stored layouts without them still typecheck.

type ComposerStep = "compose" | "confirm" | "sent";

type TemplateLayoutDefinition = {
  name: string;
  blocks: TemplateLayoutBlock[];
};

interface Props {
  onClose: () => void;
  prefilled?: {
    subject?: string;
    body?: string;
    preview?: string;
    aiResult?: Record<string, unknown>;
    templateId?: number;
    templateLayout?: any[];
    attachments?: any[];
    footer?: string;
    address?: string;
  };
  templateId?: number;
  brand?: Brand | null;
  draftId?: number;
}

function getInitialLetter(value?: string) {
  const trimmed = value?.trim() || "";
  const match = trimmed.match(/[A-Za-z0-9]/);
  return (match?.[0] || "A").toUpperCase();
}

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

async function cropImageToBox(
  sourceUrl: string,
  boxWidthPx: number,
  boxHeightPx: number,
  offsetXPx: number
): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = sourceUrl;
  });

  const scale = Math.max(boxWidthPx / img.width, boxHeightPx / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const dx = (boxWidthPx - drawW) / 2 + offsetXPx;
  const dy = (boxHeightPx - drawH) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = boxWidthPx;
  canvas.height = boxHeightPx;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, dx, dy, drawW, drawH);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9));
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

// Default width (as a % of the editor) newly-inserted blank-template images
// start at, before the user drags the size slider. Mirrors the "small
// default, then let the user adjust" behavior the 5 fixed templates already
// have for their image slots.
const DEFAULT_BLANK_IMAGE_WIDTH = 45;

function buildLayoutHtml(blocks: TemplateLayoutBlock[], templateId?: number | null) {
  const isBlank = !templateId || templateId === 0 || !blocks || blocks.length === 0;

  if (isBlank) {
    // Blank template: just render the body HTML with rich text styles
    const bodyBlock = blocks?.find(b => b.role === "body");
    const html = bodyBlock?.text || "";
    return `<style>${RICH_TEXT_EMAIL_STYLE}img{display:inline-block;vertical-align:middle;border-radius:8px;cursor:pointer;margin:0 4px;}</style><div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#243126;padding:24px;">${html}</div>`;
  }

  const list = blocks;
  const bodyBlocksOrdered = list.filter((b) => b.role === "body");
  const imageBlocks = list.filter((b) => b.role === "image");
  const headlineBlock = list.find((b) => b.role === "headline");
  const footerBlock = list.find((b) => b.role === "footer");

  const renderHeadline = () => {
    if (!headlineBlock || headlineBlock.removed || !headlineBlock.text) return "";
    return `<div style="margin:24px 0 0 0;text-align:center;font-size:24px;font-weight:bold;line-height:1.2;color:#1e293b;">${headlineBlock.text}</div>`;
  };

  const renderBody = () => {
    return bodyBlocksOrdered.map(b => {
      if (b.removed || !b.text) return "";
      return `<div style="margin:12px 0;text-align:center;font-size:14px;line-height:1.5;color:#475569;">${b.text}</div>`;
    }).join("");
  };

  const renderFooter = () => {
    if (!footerBlock || footerBlock.removed || !footerBlock.text) return "";
    return `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #f1f5f9;background-color:#f8fafc;text-align:center;font-size:12px;line-height:1.25;color:#94a3b8;">${footerBlock.text}</div>`;
  };

  // ─── Bulletproof cropped image for email clients ──────────────────────────
  // Outlook desktop (Win) renders with Word's engine: no object-fit, no
  // transform, unreliable overflow:hidden. VML `v:fill type="frame"` is the
  // only way to get cover-style cropping there. Everywhere else, a plain
  // background-image + background-size:cover on the same box does the job.
  // offsetX (px) is approximated as a background-position shift for non-mso
  // clients; Outlook's VML fill always center-crops (offset is not
  // achievable in Word's VML renderer, so it degrades to center-crop there).
  const renderImage = (block?: TemplateLayoutBlock, extraStyle = "") => {
    if (!block || block.removed || !block.imageUrl) return "";

    const widthValue = block.imageWidth && block.imageWidth.trim() ? block.imageWidth : "100%";
    const offsetValue = typeof block.imageOffsetX === "number" ? block.imageOffsetX : 0;
    const heightMatch = extraStyle.match(/height:\s*(\d+)px/);
    const heightPx = heightMatch ? Number(heightMatch[1]) : 200; // fallback, all callers pass an explicit height today

    // Rough px→% conversion for background-position so a dragged offset still
    // reads as "roughly the same crop" outside Outlook. Good enough visually;
    // exact parity isn't achievable without knowing the source image's
    // natural width, which we don't have client-side here.
    const bgPosX = 50 - Math.max(-50, Math.min(50, offsetValue / 3));

    return `
  <div style="margin:16px 0;${extraStyle}width:${widthValue};max-width:100%;overflow:hidden;">
    <!--[if mso]>
    <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:100%;height:${heightPx}px;">
      <v:fill type="frame" src="${block.imageUrl}" color="#ffffff" />
      <v:textbox inset="0,0,0,0"><div style="mso-hide:all;">
    <![endif]-->
    <div style="background-image:url('${block.imageUrl}');background-repeat:no-repeat;background-position:${bgPosX}% center;background-size:cover;height:${heightPx}px;line-height:${heightPx}px;font-size:1px;">
      <!--[if !mso]><!-->
      <img src="${block.imageUrl}" alt="${block.label}" width="1" height="1" style="opacity:0;width:1px;height:1px;display:block;border:0;" />
      <!--<![endif]-->
    </div>
    <!--[if mso]>
      </div></v:textbox>
    </v:rect>
    <![endif]-->
  </div>`.trim();
  };

  const contentStyle = "font-family:Arial,sans-serif;line-height:1.6;color:#243126;";

  switch (templateId) {
    // Hero banner
    case 1:
      return `<style>${RICH_TEXT_EMAIL_STYLE}</style><div style="${contentStyle}border-radius:30px;border:1px solid #e2e8f0;background-color:#f8fafc;padding:12px;"><div style="border-radius:24px;border:1px solid #e2e8f0;background-color:#ffffff;overflow:hidden;">${renderImage(imageBlocks[0], "height:224px;")}<div style="padding:24px 24px 8px 24px;">${renderHeadline()}<div style="margin-top:16px;">${renderBody()}</div></div>${renderFooter()}</div></div>`;

    // Portrait-focused
    case 2:
      return `<style>${RICH_TEXT_EMAIL_STYLE}</style><div style="${contentStyle}border-radius:30px;border:1px solid #e2e8f0;background-color:#f8fafc;padding:12px;"><div style="border-radius:24px;border:1px solid #e2e8f0;background-color:#ffffff;overflow:hidden;"><div style="padding:24px 24px 8px 24px;">${renderHeadline()}<div style="margin-top:16px;">${renderBody()}</div>${renderImage(imageBlocks[0], "margin-top:16px;height:224px;")}</div>${renderFooter()}</div></div>`;

    // Split image
    case 3: {
      const visible = imageBlocks.filter((b) => !b.removed && b.imageUrl);
      let imagesHtml = "";
      if (visible.length === 1) {
        imagesHtml = `<div style="margin-top:24px;text-align:center;">${renderImage(visible[0], "height:144px;max-width:384px;")}</div>`;
      } else if (visible.length >= 2) {
        imagesHtml = `<table style="margin-top:24px;width:100%;border-collapse:collapse;"><tr><td style="width:50%;padding:0 6px 0 0;vertical-align:top;">${renderImage(imageBlocks[0], "height:144px;")}</td><td style="width:50%;padding:0 0 0 6px;vertical-align:top;">${renderImage(imageBlocks[1], "height:144px;")}</td></tr></table>`;
      }
      return `<style>${RICH_TEXT_EMAIL_STYLE}</style><div style="${contentStyle}border-radius:30px;border:1px solid #e2e8f0;background-color:#f8fafc;padding:12px;"><div style="border-radius:24px;border:1px solid #e2e8f0;background-color:#ffffff;overflow:hidden;"><div style="padding:24px 24px 8px 24px;">${renderHeadline()}<div style="margin-top:16px;">${renderBody()}</div>${imagesHtml}</div>${renderFooter()}</div></div>`;
    }

    // Three-card
    case 4: {
      const visible = imageBlocks.filter((b) => !b.removed && b.imageUrl);
      const cardStyle = "background-color:#ffffff;padding:6px;box-shadow:0 1px 2px rgba(0,0,0,0.05);height:144px;overflow:hidden;";
      let imagesHtml = "";
      if (visible.length === 1) {
        imagesHtml = `<div style="margin-top:24px;text-align:center;"><div style="${cardStyle}max-width:384px;">${renderImage(visible[0])}</div></div>`;
      } else if (visible.length === 2) {
        imagesHtml = `<table style="margin-top:24px;width:100%;border-collapse:collapse;"><tr><td style="width:50%;padding:0 5px 0 0;vertical-align:top;"><div style="${cardStyle}">${renderImage(imageBlocks[0])}</div></td><td style="width:50%;padding:0 0 0 5px;vertical-align:top;"><div style="${cardStyle}">${renderImage(imageBlocks[1])}</div></td></tr></table>`;
      } else if (visible.length >= 3) {
        imagesHtml = `<table style="margin-top:24px;width:100%;border-collapse:collapse;"><tr><td style="width:33.33%;padding:0 5px 0 0;vertical-align:top;"><div style="${cardStyle}">${renderImage(imageBlocks[0])}</div></td><td style="width:33.33%;padding:0 5px;vertical-align:top;"><div style="${cardStyle}">${renderImage(imageBlocks[1])}</div></td><td style="width:33.33%;padding:0 0 0 5px;vertical-align:top;"><div style="${cardStyle}">${renderImage(imageBlocks[2])}</div></td></tr></table>`;
      }
      return `<style>${RICH_TEXT_EMAIL_STYLE}</style><div style="${contentStyle}border-radius:30px;border:1px solid #e2e8f0;background-color:#f8fafc;padding:12px;"><div style="border-radius:24px;border:1px solid #e2e8f0;background-color:#ffffff;overflow:hidden;"><div style="padding:24px 24px 8px 24px;">${renderHeadline()}<div style="margin-top:16px;">${renderBody()}</div>${imagesHtml}</div>${renderFooter()}</div></div>`;
    }

    // Landscape spotlight (text / image / text)
    case 5: {
      const [top, bottom] = bodyBlocksOrdered;
      return `<style>${RICH_TEXT_EMAIL_STYLE}</style><div style="${contentStyle}border-radius:30px;border:1px solid #e2e8f0;background-color:#f8fafc;padding:12px;"><div style="border-radius:24px;border:1px solid #e2e8f0;background-color:#ffffff;overflow:hidden;"><div style="padding:24px 24px 8px 24px;">${renderHeadline()}<div style="margin-top:16px;text-align:center;font-size:14px;line-height:1.5;color:#475569;">${top?.text || ""}</div>${renderImage(imageBlocks[0], "margin-top:20px;height:176px;")}<div style="margin-top:20px;text-align:center;font-size:14px;line-height:1.5;color:#475569;">${bottom?.text || ""}</div></div>${renderFooter()}</div></div>`;
    }

    default:
      return `<style>${RICH_TEXT_EMAIL_STYLE}</style><div style="${contentStyle}border-radius:30px;border:1px solid #e2e8f0;background-color:#f8fafc;padding:12px;"><div style="border-radius:24px;border:1px solid #e2e8f0;background-color:#ffffff;overflow:hidden;"><div style="padding:24px 24px 8px 24px;">${renderHeadline()}<div style="margin-top:16px;">${renderBody()}</div>${renderImage(imageBlocks[0], "margin-top:24px;height:176px;")}</div>${renderFooter()}</div></div>`;
  }
}

// One editable block (headline / body / footer) for the 5 preset templates.
//
// This used to be an inline `<div ref={(el) => {...}}>` built fresh inside
// TemplatePreviewCanvas's render. That ref callback's identity changed on
// every single render of TemplatePreviewCanvas (a brand new arrow function
// each time), so React tore down and reattached it constantly -- not just on
// mount. Every reattach re-ran the "sync" check `el.innerHTML !== htmlContent`
// against the LIVE DOM, which by design has already diverged from
// `block.text` while typing (state only updates onBlur). So the guard that
// was supposed to protect the DOM was instead the thing clobbering it: any
// unrelated state update anywhere in EmailComposerModal caused a re-render, which tore down/rebuilt the
// ref, which stomped whatever had just been typed or highlighted back to the
// last-blurred value.
//
// Fix: give the DOM node a stable identity (a real useRef, not an inline
// callback) and only ever push block.text -> DOM once, when this component
// mounts for a given block.id. After that the DOM is the uncontrolled source
// of truth, synced on every keystroke via TipTap's onUpdate -- see
// ComposerRichTextEditor.
const EditableTextBlock = memo(function EditableTextBlock({
  block,
  className,
  placeholder,
  isActive,
  onBlockTextChange,
  onEditorFocus,
  onActivateBlock,
  onSelectionChange,
  enableImages
}: {
  block: TemplateLayoutBlock;
  className: string;
  placeholder?: string;
  isActive: boolean;
  onBlockTextChange?: (blockId: string, value: string) => void;
  onEditorFocus?: (blockId: string, handle: ComposerEditorHandle) => void;
  onActivateBlock?: (blockId: string) => void;
  onSelectionChange?: (blockId: string, handle: ComposerEditorHandle, selectedText: string) => void;
  enableImages?: boolean;
}) {
  const handleRef = useRef<ComposerEditorHandle>(null);

  return (
    <div
      className={`rounded-xl transition-shadow ${isActive ? "ring-2 ring-blue-400 ring-offset-1" : "hover:ring-1 hover:ring-slate-200"}`}
    >
      <ComposerRichTextEditor
        ref={handleRef}
        content={block.text || ""}
        placeholder={block.placeholder || placeholder}
        className={`w-full bg-transparent border-none outline-none whitespace-pre-wrap ${RICH_TEXT_DISPLAY_CLASS} ${className}`}
        enableImages={enableImages}
        onChange={(html) => {
          onBlockTextChange?.(block.id, html);
        }}
        onFocus={() => {
          if (handleRef.current) onEditorFocus?.(block.id, handleRef.current);
          onActivateBlock?.(block.id);
        }}
        onSelectionChange={(selectedText) => {
          if (handleRef.current) onSelectionChange?.(block.id, handleRef.current, selectedText);
        }}
      />
    </div>
  );
});

// Shared outer shell: light neutral mounting frame + a white "email card"
// with a real brand header and a quiet disclaimer footer, instead of the
// dark UI-chrome toolbar that was identical across every template.
//
// This MUST live at module scope, not inside TemplatePreviewCanvas. It used
// to be declared inline there (`const Shell = (...) => (...)`), which meant
// it got a brand-new function identity on every render of
// TemplatePreviewCanvas. React tells components apart by function identity,
// so a new `Shell` reference on every render made React treat it as a
// completely different component type at that spot in the tree -- which
// tears down and remounts everything inside it, `EditableTextBlock`/
// ComposerRichTextEditor included, `key`s notwithstanding. Since
// TemplatePreviewCanvas re-renders on every keystroke/focus/state change in
// ComposeStep (it isn't memoized), that meant every interaction destroyed
// and recreated the TipTap editors mid-interaction -- clicking a block lost
// focus immediately, and typing lost the keystroke immediately, because the
// DOM node the browser was about to type into no longer existed by the time
// the next paint happened. Hoisting Shell out fixes it: same function
// reference every render, so React just re-renders its children in place.
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

function TemplatePreviewCanvas({
  templateId,
  blocks,
  activeBlockId,
  onSelectBlock,
  attachments = [],
  onDownloadAttachment,
  interactive = true,
  onBlockTextChange,
  onEditorFocus,
  onActivateBlock,
  onSelectionChange,
  enableInlineImages = false,
  onToggleSectionRemoved,
  onRestoreImageSlot,
  boxRefs
}: {
  templateId?: number;
  blocks: TemplateLayoutBlock[];
  activeBlockId?: string | null;
  onSelectBlock?: (blockId: string) => void;
  attachments?: ComposerAttachment[];
  onDownloadAttachment?: (attachment: ComposerAttachment) => void;
  // When false (used inside the "Preview" reading pane), text renders as
  // plain read-only HTML instead of live Quill instances, and image slots
  // aren't clickable.
  interactive?: boolean;
  onBlockTextChange?: (blockId: string, value: string) => void;
  onEditorFocus?: (blockId: string, handle: ComposerEditorHandle) => void;
  onActivateBlock?: (blockId: string) => void; // For text block activation (separate from image slot selection)
  onSelectionChange?: (blockId: string, handle: ComposerEditorHandle, selectedText: string) => void;
  enableInlineImages?: boolean;
  onToggleSectionRemoved?: (blockId: string) => void;
  onRestoreImageSlot?: (blockId: string) => void;
  boxRefs?: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  const bodyBlocks = blocks.filter((block) => block.role === "body");
  const imageBlocks = blocks.filter((block) => block.role === "image");

  const renderInteractiveText = (blockId: string | undefined, content: ReactNode, className = "w-full text-left") => {
    if (!blockId || !interactive) return <div className={className}>{content}</div>;

    const block = blocks.find((b) => b.id === blockId);
    const isActive = activeBlockId === blockId;

    // If this is a removed image slot, clicking should restore it
    if (block?.role === "image" && block.removed) {
      return (
        <button
          type="button"
          onClick={() => onRestoreImageSlot?.(blockId)}
          className={`block w-full cursor-pointer text-left ${className}`}
        >
          {content}
        </button>
      );
    }

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


  // Requirement #1: in read-only mode (the actual send preview), a removed
  // slot disappears completely -- container and all -- instead of showing
  // the "click to add back" placeholder, which only makes sense while
  // actively editing.
  const shouldRenderSlot = (block?: TemplateLayoutBlock) => interactive || !block?.removed;

  const renderImageSlot = (
    block: TemplateLayoutBlock | undefined,
    containerClassName: string,
    imgClassName = "h-full w-full",
    
  ) => {
    if (!block || !shouldRenderSlot(block)) return null;
    return (
        <div
          className={containerClassName}
          ref={(el) => { if (block?.id && boxRefs) boxRefs.current[block.id] = el; }}
        >
        {renderInteractiveText(block?.id, renderImage(block, imgClassName), "w-full h-full")}
      </div>
    );
  };

  // Requirement #5: a fixed template's image slot can be removed from the
  // preview for this send (without deleting it from the layout definition,
  // so it can be added back) -- see `removeImageSlot`/`restoreImageSlot`
  // wired in from ComposeStep.
  const renderImage = (block: TemplateLayoutBlock, className = "w-full h-full object-cover ") => {
    if (block?.removed) {
      // Selecting is handled by the button wrapper renderInteractiveText
      // already puts around this (interactive mode) -- this is just the
      // visual placeholder. Restoring happens from the ImageSlotInput panel
      // that opens once selected.
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
          <span>Image slot removed</span>
          <span className="font-medium text-blue-600">Click to add back</span>
        </div>
      );
    }

    if (block?.imageUrl) {
      const widthValue = block.imageWidth && block.imageWidth.trim() ? block.imageWidth : "100%";
      const offsetValue = typeof block.imageOffsetX === "number" ? block.imageOffsetX : 0;

      const img = (
        <img
          src={block.imageUrl}
          alt={block.label}
          className={`block h-full object-cover ${className}`}
          style={{ objectFit: "cover", width: "100%", height: "100%", display: "block", objectPosition: "center 40%" }}
        />
      );

      return (
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl">
          <div
            className="h-full overflow-hidden rounded-2xl"
            style={{ width: widthValue, maxWidth: "100%", transform: `translateX(${offsetValue}px)` }}
          >
            {/* Requirement #4: image slot can be made a link */}
            {block.imageLinkUrl ? (
              <a href={block.imageLinkUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => interactive && e.preventDefault()}>
                {img}
              </a>
            ) : (
              img
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">
        Add an image
      </div>
    );
  };

  const renderRichText = (content?: string | null, className = "text-sm leading-6 text-slate-600") => {
    const safeContent = normalizeRichTextContent(content);
    return <div className={`${className} ${RICH_TEXT_DISPLAY_CLASS}`} style={{ whiteSpace: "pre-wrap" }} dangerouslySetInnerHTML={{ __html: safeContent }} />;
  };

  // Text blocks (headline/body/footer) are edited directly in place.
  // The actual contentEditable + DOM-sync logic lives in EditableTextBlock
  // (module scope, above) -- see the comment there for why it has to be a
  // real component with its own stable ref, not inline JSX built here.
  const renderEditableText = (
    block: TemplateLayoutBlock | undefined,
    className: string,
    placeholder?: string,
    onSelectionChange?: (blockId: string, handle: ComposerEditorHandle, selectedText: string) => void,
    onActivateBlock?: (blockId: string) => void
  ) => {
    if (!block) return <p className={className}>{placeholder}</p>;

    if (block.removed) {
      if (!interactive) return null; // gone entirely from the real send preview
      return (
        <button
          type="button"
          onClick={() => {
            onToggleSectionRemoved?.(block.id);
            // After restoring, also activate this block so it gets focus
            onActivateBlock?.(block.id);
          }}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-400"
        >
          <span>{block.label} removed</span>
          <span className="font-medium text-blue-600">Click to add back</span>
        </button>
      );
    }

    if (!interactive) {
      return renderRichText(block.text || block.placeholder, className);
    }

    return (
      <EditableTextBlock
        key={block.id}
        block={block}
        className={className}
        placeholder={placeholder}
        isActive={activeBlockId === block.id}
        onBlockTextChange={onBlockTextChange}
        onEditorFocus={onEditorFocus}
        onActivateBlock={onActivateBlock}
        onSelectionChange={onSelectionChange}
        enableImages={enableInlineImages}
      />
    );
  };

  const renderBodyParagraphs = (onSelectionChange?: (blockId: string, handle: ComposerEditorHandle, selectedText: string) => void) => (
    <div className="space-y-3">
      {bodyBlocks.length > 0 ? bodyBlocks.map((block) => (
        <div key={block.id}>
          {renderEditableText(block, "text-sm leading-6 text-slate-600 text-center", undefined, onSelectionChange, onActivateBlock)}
        </div>
      )) : (
        <p className="text-sm leading-6 text-slate-600 text-center">Add your supporting text</p>
      )}
    </div>
  );

  const renderHeadline = (onSelectionChange?: (blockId: string, handle: ComposerEditorHandle, selectedText: string) => void) => (
    <div className="mt-6">
      {renderEditableText(
        blocks.find((block) => block.role === "headline"),
        "text-2xl font-bold leading-snug text-slate-900 text-center",
        "Add your headline",
        onSelectionChange,
        onActivateBlock
      )}
    </div>
  );

  // Footer is disclaimer/contact copy, not a call-to-action — keep it quiet
  // and small like a real unsubscribe/copyright line, not a blue button.
  const renderFooterBar = (onSelectionChange?: (blockId: string, handle: ComposerEditorHandle, selectedText: string) => void) => (
    <div className="mt-6 border-t border-slate-100 bg-slate-50 px-6 py-4 text-center">
      {renderEditableText(blocks.find((block) => block.role === "footer"), "text-xs leading-5 text-slate-400 text-center", "Add your footer", onSelectionChange, onActivateBlock)}
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
                onDownloadAttachment?.(attachment);
              }}
              className="inline-flex max-w-40 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-[10px] font-semibold text-blue-600">📎</span>
              <span className="truncate">{attachment.name}</span>
              <span className="ml-1 text-[11px] text-slate-400">⬇</span>
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

  switch (templateId) {
    // Hero banner — full-bleed image up top, like a real hero email header,
    // then headline/body/CTA copy underneath.
    case 1:
      return (
        <Shell footer={renderFooterBar(onSelectionChange)} attachments={renderAttachmentSection()}>
          {renderImageSlot(imageBlocks[0], "h-56 overflow-hidden sm:h-64")}
          <div className="px-6 pb-2">
            {renderHeadline(onSelectionChange)}
            <div className="mt-4">{renderBodyParagraphs(onSelectionChange)}</div>
          </div>
        </Shell>
      );

    // Portrait-focused — headline and copy first, then a tall centered
    // portrait image (people/product shots), not a wide banner.
    case 2:
      return (
        <Shell footer={renderFooterBar(onSelectionChange)} attachments={renderAttachmentSection()}>
          <div className="px-6 pb-2">
            {renderHeadline(onSelectionChange)}
            <div className="mt-4">{renderBodyParagraphs(onSelectionChange)}</div>
            {renderImageSlot(imageBlocks[0], "h-56 overflow-hidden sm:h-64")}
          </div>
        </Shell>
      );

    // Split image — headline and copy, then two images side by side.
    case 3:
      return (
        <Shell footer={renderFooterBar(onSelectionChange)} attachments={renderAttachmentSection()}>
          <div className="px-6 pb-2">
            {renderHeadline(onSelectionChange)}
            <div className="mt-4">{renderBodyParagraphs(onSelectionChange)}</div>
            <div className="mt-6">
              {(() => {
                const visibleImages = imageBlocks.filter(block => !block.removed);
                if (visibleImages.length === 0) return null;
                if (visibleImages.length === 1) {
                  return (
                    <div className="flex justify-center">
                      {renderImageSlot(visibleImages[0], "h-36 overflow-hidden sm:h-44 max-w-sm")}
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-2 gap-3">
                    {renderImageSlot(imageBlocks[0], "h-36 overflow-hidden sm:h-44")}
                    {renderImageSlot(imageBlocks[1], "h-36 overflow-hidden sm:h-44")}
                  </div>
                );
              })()}
            </div>
          </div>
        </Shell>
      );

    // Three-card — headline and copy, then three bordered "cards" in a row
    // (a bordered/shadowed thumbnail reads as a card, a plain grey box doesn't).
    case 4:
      return (
        <Shell footer={renderFooterBar(onSelectionChange)} attachments={renderAttachmentSection()}>
          <div className="px-6 pb-2">
            {renderHeadline(onSelectionChange)}
            <div className="mt-4">{renderBodyParagraphs(onSelectionChange)}</div>
            <div className="mt-6">
              {(() => {
                const visibleImages = imageBlocks.filter(block => !block.removed);
                if (visibleImages.length === 0) return null;
                if (visibleImages.length === 1) {
                  return (
                    <div className="flex justify-center">
                      {renderImageSlot(visibleImages[0], "rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm h-36 overflow-hidden sm:h-36 max-w-sm")}
                    </div>
                  );
                }
                if (visibleImages.length === 2) {
                  return (
                    <div className="grid grid-cols-2 gap-2.5">
                      {renderImageSlot(imageBlocks[0], "rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm h-36 overflow-hidden sm:h-36")}
                      {renderImageSlot(imageBlocks[1], "rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm h-36 overflow-hidden sm:h-36")}
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-3 gap-2.5">
                      {renderImageSlot(imageBlocks[0], "rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm h-36 overflow-hidden sm:h-36")}
                      {renderImageSlot(imageBlocks[1], "rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm h-36 overflow-hidden sm:h-36")}
                      {renderImageSlot(imageBlocks[2], "rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm h-36 overflow-hidden sm:h-36")}
                  </div>
                );
              })()}
            </div>
          </div>
        </Shell>
      );

    // Landscape spotlight — leading paragraph, wide landscape image, closing
    // paragraph. Mirrors the actual AI-generated sample: text / image / text.
    case 5:
      return (
        <Shell footer={renderFooterBar(onSelectionChange)} attachments={renderAttachmentSection()}>
          <div className="px-6 pb-2">
            {renderHeadline(onSelectionChange)}
            <div className="mt-4">
              {renderEditableText(bodyBlocks[0], "text-sm leading-6 text-slate-600 text-center", undefined, onSelectionChange, onActivateBlock)}
            </div>
            {renderImageSlot(imageBlocks[0], "mt-5 h-44 overflow-hidden rounded-2xl", "h-full w-full")}
            <div className="mt-5">
              {renderEditableText(bodyBlocks[1], "text-sm leading-6 text-slate-600 text-center", undefined, onSelectionChange, onActivateBlock)}
            </div>
          </div>
        </Shell>
      );

    default:
      return (
        <Shell footer={renderFooterBar(onSelectionChange)} attachments={renderAttachmentSection()}>
          <div className="px-6 pb-2">
            {renderHeadline(onSelectionChange)}
            <div className="mt-4">{renderBodyParagraphs(onSelectionChange)}</div>
            {renderImageSlot(imageBlocks[0], "mt-6 h-44 overflow-hidden rounded-2xl")}
          </div>
        </Shell>
      );
  }
}

// Formatting toolbar (bold/italic/underline/strike, alignment, lists, color,
// link, clear) now lives in ./composer-tiptap/ComposerToolbar and drives
// whichever ComposerRichTextEditor instance is currently focused directly
// via its handle -- see activeEditorHandle in ComposeStep below. The old
// CustomToolbar (blockId + execCommand-format-name dispatch) is gone along
// with handleFormatText, since TipTap owns formatting state/commands itself.

// ─── Draggable Component ──────────────────────────────────────────────────────────

function Draggable({ children, initialPosition = { x: 0, y: 0 }, className = "" }: {
  children: React.ReactNode;
  initialPosition?: { x: number; y: number };
  className?: string;
}) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    if (!dragRef.current) return;
    
    const rect = dragRef.current.getBoundingClientRect();
    offsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    
    setIsDragging(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!isDragging) return;
      
      const parentRect = dragRef.current?.parentElement?.getBoundingClientRect();
      if (!parentRect) return;
      
      const newX = e.clientX - parentRect.left - offsetRef.current.x;
      const newY = e.clientY - parentRect.top - offsetRef.current.y;
      
      setPosition({
        x: Math.max(0, newX),
        y: Math.max(0, newY),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={dragRef}
      className={className}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
    >
      {children}
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
  isRewriting,
}: {
  onClose: () => void;
  selectedWriterId: number | null;
  onSelectWriter: (value: number | null) => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
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
    <div
      className="w-140 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 z-10"
    >
      <div className="flex items-center justify-between mb-3 cursor-move">
        <span className="text-xs font-semibold text-gray-500">AI Writer (drag to move)</span>
        <button onClick={onClose} className="w-6 h-6 bg-white border border-gray-200 rounded-full text-gray-500 text-xs flex items-center justify-center hover:bg-gray-50">✕</button>
      </div>
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
          placeholder="Paste text to rewrite"
          value={prompt}
          onChange={e => onPromptChange(e.target.value)}
        />
        <button
          onClick={onGenerate}
          disabled={isRewriting}
          onMouseDown={(e) => e.preventDefault()} // Prevent focus stealing
          className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center hover:bg-blue-300 transition-colors disabled:opacity-60"
        >
         <img src={aiWriterBlue} className="h-5 w-5" alt="" />
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
  onRemove,
  onCommitCrop
}: {
  block: TemplateLayoutBlock;
  onCommit: (value: string) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
  uploadError: string;
  onStyleChange: (updates: Partial<TemplateLayoutBlock>) => void;
  onRemove: () => void;
  onCommitCrop?: () => void;
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
        className="relative w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            onPointerUp={onCommitCrop}
            onTouchEnd={onCommitCrop}
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
            onPointerUp={onCommitCrop}
            onTouchEnd={onCommitCrop}
          />
          <span className="mt-1 block text-slate-500">{block.imageOffsetX ?? 0}px</span>
        </label>
      </div>

      {/* Requirement #4: make this image slot a link */}
      <label className="block text-xs font-medium text-slate-600">
        <span className="mb-1 block">Link URL (optional)</span>
        <input
          type="text"
          defaultValue={block.imageLinkUrl || ""}
          onBlur={(event) => onStyleChange({ imageLinkUrl: event.currentTarget.value.trim() || undefined })}
          placeholder="https://example.com"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>

      {/* Requirement #5: remove/restore this image slot for this send */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <span className="text-xs text-slate-500">
          {block.removed ? "This image slot is hidden from the preview." : "Remove this image slot from the preview without deleting it."}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${block.removed ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-red-200 text-red-600 hover:bg-red-50"}`}
        >
          {block.removed ? "Add image back" : "Remove image"}
        </button>
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
  onDownloadAttachment,
}: {
  form: ComposeForm;
  brandName: string;
  brandInitial: string;
  attachments: ComposerAttachment[];
  templateId?: number;
  templateLayout: TemplateLayoutBlock[];
  onDownloadAttachment?: (attachment: ComposerAttachment) => void;
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
            style={{ fontFamily: "Arial, Helvetica, sans-serif", whiteSpace: "pre-wrap" }}
            dangerouslySetInnerHTML={{
              __html: `<style>img{display:inline-block;vertical-align:middle;border-radius:8px;cursor:pointer;margin:0 4px;}</style>` + (normalizeRichTextContent(form.body) ?? '<p style="color:#9CA3AF;">This email is empty.</p>'),
            }}
          />
        ) : (
          // Preset templates have a specific visual arrangement (hero image,
          // split images, cards, etc.) — use EmailTemplateSnapshot for
          // consistent rendering with the drafts tab preview.
          <div className="px-6 pb-6">
            <EmailTemplateSnapshot
              templateId={templateId}
              blocks={templateLayout}
              html={form.body}
              attachmentCount={attachments.length}
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
                <button
                  key={attachment.id}
                  type="button"
                  onClick={() => onDownloadAttachment?.(attachment)}
                  className="flex w-48 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white text-xs">📎</span>
                  <span className="truncate">{attachment.name}</span>
                  <span className="ml-auto text-xs text-blue-600">⬇</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared Editor Focus Handler ─────────────────────────────────────────────────────

// ─── Compose Step ─────────────────────────────────────────────────────────────

function ComposeStep({
    form, onChange, onNext, brandId, templateId, templateLayout, onTemplateLayoutChange, onRegisterCleanup, onSwitchToBlankTemplate, onSaveDraft, isAutoSaving, prefilled, categories: _categories, draftId,
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
    onSwitchToBlankTemplate?: () => void;
    onSaveDraft?: () => Promise<void>;
    isAutoSaving?: boolean;
    prefilled?: {
      subject?: string;
      body?: string;
      preview?: string;
      aiResult?: Record<string, unknown>;
      templateId?: number;
      templateLayout?: any[];
      attachments?: any[];
      footer?: string;
      address?: string;
    };
    categories?: { id: number; name: string }[];
    draftId?: number;
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
  const [activeEditorHandle, setActiveEditorHandle] = useState<ComposerEditorHandle | null>(null);
  const [rewrittenText, setRewrittenText] = useState<string | null>(null);
  // Requirement #6: highlight text anywhere in the composer -> it flows into
  // the AI Writer prompt -> "Approve" writes the rewrite back into exactly
  // where it was highlighted, on whichever block it came from.
  const aiWriterBridge = useAiWriterBridge();
  const [replaceUnavailable, setReplaceUnavailable] = useState(false);
  const blankBodyEditorRef = useRef<ComposerEditorHandle>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadKind, setUploadKind] = useState<'image' | 'attachment' | null>(null);
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<ComposerAttachment[]>([]);
  const [blankImageUrl, setBlankImageUrl] = useState("");
  const [selectedBlankImageSrc, setSelectedBlankImageSrc] = useState<string | null>(null);

  // Initialize local attachments from prefilled when loading drafts
  useEffect(() => {
    if (prefilled?.attachments && prefilled.attachments.length > 0) {
      setAttachments(prefilled.attachments);
    }
  }, [prefilled?.attachments]);

  // Sync local attachments state with compose.attachments for draft saving
  useEffect(() => {
    const allAttachments = [...attachments, ...pendingAttachments];
    const currentAttachmentsStr = JSON.stringify(form.attachments);
    const newAttachmentsStr = JSON.stringify(allAttachments);
    if (currentAttachmentsStr !== newAttachmentsStr) {
      onChange('attachments', allAttachments);
    }
  }, [attachments, pendingAttachments, form.attachments, onChange]); // eslint-disable-line react-hooks/exhaustive-deps
  // Size/position of whichever blank-template image is currently selected —
  // mirrors block.imageWidth/imageOffsetX for the 5 fixed templates' image
  // slots, just tracked in local state instead of on a layout block since a
  // free-form image isn't a block.
  const [blankImageWidth, setBlankImageWidth] = useState(DEFAULT_BLANK_IMAGE_WIDTH);
  const [blankImageOffsetX, setBlankImageOffsetX] = useState(0);
  const [blankImageHeight, setBlankImageHeight] = useState<number | null>(null); // null = auto
  const [blankImageHref, setBlankImageHref] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [isRewritingSelection, setIsRewritingSelection] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [showAttachmentsPanel, setShowAttachmentsPanel] = useState(false);

  useEffect(() => {
    if (!selectedBlankImageSrc || !form.body) return;
    const container = document.createElement("div");
    container.innerHTML = form.body;
    const stillPresent = Array.from(container.querySelectorAll("img")).some(
      (img) => img.getAttribute("src") === selectedBlankImageSrc
    );
    if (!stillPresent) setSelectedBlankImageSrc(null);
  }, [form.body, selectedBlankImageSrc]);

  // Blank-body content sync (previously a hand-rolled effect diffing
  // innerHTML against form.body, guarded by window.getSelection() checks to
  // avoid stomping in-progress typing) is now handled generically inside
  // ComposerRichTextEditor itself -- it only pushes `content` into the
  // TipTap document when it's actually different from what's already there.

  useEffect(() => {
    setActiveBlockId(null);
    setActiveEditorHandle(null);
    // Don't reset AI writer when template changes - let user keep it open
    // setShowAIWriter(false);
    setWriterPrompt("");
    setShowImagePanel(false);
    setShowAttachmentsPanel(false);
    // Don't reset selectedBlankImageSrc when toggling preview mode
    // setSelectedBlankImageSrc(null);
    setIsPreviewMode(false);
  }, [templateId]);

  // Clicking an <img> inside the blank template's editor swaps the right-hand
  // panel over to image controls for that image instead of the formatting
  // toolbar. Clicking anywhere else in the editor clears that state so the
  // toolbar comes back.
  const handleBlankPreviewClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const image = target.closest('img');

    const rawSrc = image?.getAttribute('src');

    if (rawSrc && image) {
      const nextSrc = rawSrc;

      // Read this image's current width/offset off the live DOM so the
      // sliders open already reflecting its actual size, not whatever the
      // previously-selected image left behind.
      const widthAttr = image.style.width;
      const width = widthAttr && widthAttr.endsWith('%')
        ? Number.parseInt(widthAttr, 10) || DEFAULT_BLANK_IMAGE_WIDTH
        : DEFAULT_BLANK_IMAGE_WIDTH;
      // % of the image's own width, not px -- see extensions.ts offsetX comment.
      const offsetMatch = /translateX\((-?\d+(?:\.\d+)?)%\)/.exec(image.style.transform || "");
      const offsetX = offsetMatch ? Number.parseFloat(offsetMatch[1]) : 0;
      const heightAttr = image.style.height;
      const height = heightAttr && heightAttr.endsWith("px") ? Number.parseInt(heightAttr, 10) : null;
      const href = image.closest("a")?.getAttribute("href") || "";

      setBlankImageWidth(width);
      setBlankImageOffsetX(offsetX);
      setBlankImageHeight(height);
      setBlankImageHref(href);
      setSelectedBlankImageSrc(nextSrc);
      setShowImagePanel(true);
      return;
    }

    // Do not reset state while interacting with the contentEditable editor
    if (target.closest('[contenteditable]')) {
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
        if (!isMounted || !brand) {
          return;
        }


        const brandData = brand as any; // Cast to access actual API fields
        console.log('Fetched brands raw', brand);
        const nextName = brandData.from_name || "";
        const nextFromEmail = brandData.from_email || "";
        setBrandName(nextName || "Your Brand"); // Use actual brand name
        setBrandInitial(getInitialLetter(nextName || "B"));
        setBrandFromEmail(nextFromEmail);

        // Update compose state with brand information
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

  // Remove this duplicate useEffect - the templateId effect already handles this

  // Used only for image slots now — clicking an image slot selects it (and a
  // second click on the same slot deselects it). Text blocks are activated
  // by focusing them directly (see handleEditorFocus below).
  const handleSelectImageBlock = (blockId: string) => {
    const nextBlockId = activeBlockId === blockId ? null : blockId;
    setActiveBlockId(nextBlockId);
    // Don't close AI writer when selecting image blocks
    // setShowAIWriter(false);
    setWriterPrompt("");
  };

  // Handler for text block activation (doesn't clear selection state)
  const handleActivateTextBlock = (blockId: string) => {
    setActiveBlockId(blockId);
    // Don't clear selection state for text blocks
  };


  // Fired when any inline text block (headline/body/footer, or the blank
  // template's single document) gains focus — this is what drives which
  // editor the right-hand toolbar and the AI Writer act on.
  const handleEditorFocus = (blockId: string, handle: ComposerEditorHandle) => {
    setActiveBlockId(blockId);
    setActiveEditorHandle(handle);
  };

  // Fired by any editable region's onSelectionChange -- feeds the AI Writer
  // bridge so a highlight anywhere immediately becomes available to
  // "rewrite," regardless of which block/editor instance it came from.
  const handleEditorSelectionChange = useCallback(
    (_blockId: string, handle: ComposerEditorHandle, selectedText: string) => {
      if (selectedText) {
        aiWriterBridge.captureSelection(handle, selectedText);
        setWriterPrompt(selectedText);
      }
    },
    [aiWriterBridge]
  );

  // Formatting now goes straight through ComposerToolbar -> activeEditorHandle
  // (a ComposerEditorHandle backed by TipTap) rather than a blockId+format
  // string dispatcher hand-rolling execCommand + DOM Range surgery. See
  // ComposerToolbar's onClick handlers, which call e.g.
  // activeEditorHandle.toggleBold() / .setAlign('center') / .setLink(url)
  // directly on whichever block is focused.



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
    const textToRewrite = writerPrompt.trim();
    if (!textToRewrite) return;

    setIsRewritingSelection(true);
    try {
      const response = await aiWriterService.partlyRewrite({
        dropdown_id: selectedWriterId ?? undefined,
        user_text: textToRewrite,
      });

      if (response?.rewritten_text) {
        // Show the rewritten text in a popup
        setRewrittenText(response.rewritten_text);
      }
    } catch (error) {
      console.error("Partial rewrite failed:", error);
    } finally {
      setIsRewritingSelection(false);
    }
  };

  const handleCopyRewrittenText = () => {
    if (rewrittenText) {
      navigator.clipboard.writeText(rewrittenText);
    }
  };

  const handleDownloadAttachment = async (attachment: ComposerAttachment) => {
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
      // Fallback: open in new tab
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
      link.download   = attachment.name;
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
      const { url } = await uploadAsset(file, 'images', brandId ? Number(brandId) : undefined, draftId, (percent) => setUploadProgress(percent));
      if (activeBlockId) {
        const activeBlock = templateLayout.find((item) => item.id === activeBlockId);
        if (activeBlock?.role === 'image') {
          const nextBlocks = templateLayout.map((item) => item.id === activeBlock.id ? { ...item, imageUrl: url } : item);
          onTemplateLayoutChange(nextBlocks);
          onChange('body', buildLayoutHtml(nextBlocks, templateId));
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

  // Blank template only: drops an image in as a real embed wherever the
  // cursor currently sits (or at the end, if the editor never had focus
  // yet). Goes through the TipTap handle's insertImage command -- a real
  // document node insertion via a transaction, not a manual DOM
  // createElement/insertNode -- so there's no risk of the DOM and React/
  // TipPap's model disagreeing about what's actually in the document.
  const insertImageAtCursor = (url: string) => {
    const handle = getInlineImageTargetHandle();
    if (!handle) return;
    handle.insertImage(url);
    // Update body HTML for both blank and fixed templates
    onChange('body', handle.getHtml());
    setBlankImageWidth(DEFAULT_BLANK_IMAGE_WIDTH);
    setBlankImageOffsetX(0);
    setBlankImageHeight(null);
    setBlankImageHref("");
    setSelectedBlankImageSrc(url);
  };

  // Swaps an image the user clicked on for a new one.
  const replaceSelectedBlankImageSrc = (newSrc: string) => {
    const handle = getInlineImageTargetHandle();
    if (!selectedBlankImageSrc || !handle) return;
    handle.replaceImageSrc(selectedBlankImageSrc, newSrc);
    onChange('body', handle.getHtml());
    setSelectedBlankImageSrc(newSrc);
  };

  // Resizes/repositions/(re)links whichever blank-template image is
  // currently selected. Requirement #4 (image can be a link) is folded in
  // here via `href` alongside the pre-existing width/offset controls.
  const updateBlankImageStyle = (updates: { width?: number; height?: number | null; offsetX?: number; href?: string | null }) => {
    const handle = getInlineImageTargetHandle();
    if (!selectedBlankImageSrc || !handle) return;

    handle.updateImageStyle(selectedBlankImageSrc, updates);
    if (typeof updates.width === 'number') setBlankImageWidth(updates.width);
    if (typeof updates.offsetX === 'number') setBlankImageOffsetX(updates.offsetX);
    if (updates.height !== undefined) setBlankImageHeight(updates.height);
    if (updates.href !== undefined) setBlankImageHref(updates.href || "");
    onChange('body', handle.getHtml());
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
      const { url } = await uploadAsset(file, 'images', brandId ? Number(brandId) : undefined, draftId, (percent) => setUploadProgress(percent));
      
      if (selectedBlankImageSrc) {
        replaceSelectedBlankImageSrc(url);
      } else {
        insertImageAtCursor(url);
      }
      
      // Set the URL in the input field
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
      const { url, filename, mimeType, assetId } = await uploadAsset(file, 'attachments', brandId ? Number(brandId) : undefined, draftId, (percent) => setUploadProgress(percent));
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
        await deleteUploadedAsset(attachmentToRemove.assetId, brandId ? Number(brandId) : undefined, draftId);
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

  const cleanupAttachments = async () => {
    const allAttachments = [...pendingAttachments, ...attachments];
    const cleanupTargets = allAttachments.filter((attachment) => Boolean(attachment.assetId));

    if (cleanupTargets.length === 0) {
      setPendingAttachments([]);
      setAttachments([]);
      return;
    }

    await Promise.allSettled(
      cleanupTargets.map((attachment) => deleteUploadedAsset(attachment.assetId, brandId ? Number(brandId) : undefined, draftId, 'attachment'))
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
    applyLayoutUpdate(nextBlocks);
  };

  const imageBoxRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const commitImageCrop = async (blockId: string) => {
    const block = templateLayout.find((b) => b.id === blockId);
    const boxEl = imageBoxRefs.current[blockId];
    if (!block?.imageUrl || !boxEl) return;

    const rect = boxEl.getBoundingClientRect();
    try {
      const blob = await cropImageToBox(block.imageUrl, Math.round(rect.width), Math.round(rect.height), block.imageOffsetX ?? 0);
      const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
      const { url } = await uploadAsset(file, 'images', brandId ? Number(brandId) : undefined, draftId);
      updateActiveImageBlock({ imageUrl: url, imageWidth: "100%", imageOffsetX: 0 });
    } catch (err) {
      console.error('[EmailComposer] crop-on-commit failed', err);
    }
  };

  // Requirement #3: shared write path for any layout change that might
  // remove the last remaining section. Centralized so both image removal
  // (ImageSlotInput) and text-section removal go through the same
  // all-removed check instead of duplicating it.
  const applyLayoutUpdate = (nextBlocks: TemplateLayoutBlock[]) => {
    onTemplateLayoutChange(nextBlocks);
    onChange("body", buildLayoutHtml(nextBlocks, templateId));
    if (nextBlocks.length > 0 && nextBlocks.every((block) => block.removed)) {
      onSwitchToBlankTemplate?.();
    }
  };

  // Requirement #3: remove/restore any headline, body, or footer section —
  // mirrors the image slot's own removed/restored toggle.
  const toggleSectionRemoved = (blockId: string) => {
    const nextBlocks = templateLayout.map((item) => item.id === blockId ? { ...item, removed: !item.removed } : item);
    applyLayoutUpdate(nextBlocks);
  };

  // Restore a removed image slot (doesn't trigger blank template switch)
  const handleRestoreImageSlot = (blockId: string) => {
    const nextBlocks = templateLayout.map((item) => item.id === blockId ? { ...item, removed: false } : item);
    onTemplateLayoutChange(nextBlocks);
    onChange("body", buildLayoutHtml(nextBlocks, templateId));
  };

  // A preset template's text block just typed into directly — no more side
  // panel duplicating the content. Stores Quill's own output as-is; nothing
  // here re-normalizes it before it becomes that same block's next
  // controlled `value`, which is what was breaking the space bar and list/
  // color/alignment formatting.
  const handleBlockTextChange = (blockId: string, value: string) => {
    const currentBlock = templateLayout.find((item) => item.id === blockId);
    if (currentBlock?.text === value) return; // Prevent infinite loop on initialization
    
    const nextBlocks = templateLayout.map((item) => {
      if (item.id === blockId) {
        // For image blocks, update imageUrl instead of text
        if (item.role === "image") {
          return { ...item, imageUrl: value };
        }
        // For text blocks, use the value as-is (Quill already provides HTML)
        return { ...item, text: value };
      }
      return item;
    });
    
    onTemplateLayoutChange(nextBlocks);
    onChange("body", buildLayoutHtml(nextBlocks, templateId));
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

    if (allImageSlotsRemoved) {
      // Auto-focus the first available text block if none is focused
      if (!activeEditorHandle) {
        const firstTextBlock = templateLayout.find((block) => block.role !== "image" && !block.removed);
        if (firstTextBlock) {
          setActiveBlockId(firstTextBlock.id);
        }
      }
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

  const handleAIRewriteMouseDown = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault(); // Prevent blur when clicking AI button
  };

  const handleAIRewriteClick = () => {
    setShowAIWriter((value) => !value);
  };

  const handleCloseAIWriter = () => {
    setShowAIWriter(false);
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

  const activeImageBlock = !isBlankTemplate ? templateLayout.find((block) => block.id === activeBlockId && block.role === "image" && !block.removed) : undefined;

  // Requirement #2: once every image slot in this template has been
  // removed, "insert image" falls back to dropping it inline in whichever
  // text block currently has focus, the same way the blank template works.
  const imageBlocksInTemplate = templateLayout.filter((block) => block.role === "image");
  const allImageSlotsRemoved =
    !isBlankTemplate && imageBlocksInTemplate.length > 0 && imageBlocksInTemplate.every((block) => block.removed);

  const getInlineImageTargetHandle = (): ComposerEditorHandle | null => {
    if (isBlankTemplate) return blankBodyEditorRef.current;
    if (allImageSlotsRemoved) return activeEditorHandle;
    return null;
  };

  // Reusable image panel for both blank template and fixed template when all slots removed
  const renderImageInsertPanel = () => (
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
      </div>

      {selectedBlankImageSrc && (
        <>
          <img
            src={selectedBlankImageSrc}
            alt="Selected"
            className="mt-3 h-32 w-full rounded-xl border border-slate-200 bg-white object-contain object-center"
          />

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-600">
              <span className="mb-1 block">Size</span>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={blankImageWidth}
                onChange={(event) => updateBlankImageStyle({ width: Number(event.target.value) })}
                className="w-full"
              />
              <span className="mt-1 block text-slate-500">{blankImageWidth}%</span>
            </label>

            <label className="text-xs font-medium text-slate-600">
              <span className="mb-1 block">Horizontal position</span>
              <input
                type="range"
                min="-100"
                max="100"
                step="5"
                value={blankImageOffsetX}
                onChange={(event) => updateBlankImageStyle({ offsetX: Number(event.target.value) })}
                className="w-full"
              />
              {/* % of the image's own width -- renders the same relative
                  position in the composer, the preview pane, and the sent
                  email regardless of container width. See extensions.ts. */}
              <span className="mt-1 block text-slate-500">{blankImageOffsetX}%</span>
            </label>

            <label className="text-xs font-medium text-slate-600">
              <span className="mb-1 block">Height</span>
              <input
                type="range"
                min="50"
                max="600"
                step="10"
                value={blankImageHeight ?? 240}
                onChange={(event) => updateBlankImageStyle({ height: Number(event.target.value) })}
                className="w-full"
                disabled={blankImageHeight === null}
              />
              <span className="mt-1 flex items-center justify-between text-slate-500">
                <span>{blankImageHeight === null ? "Auto" : `${blankImageHeight}px`}</span>
                <button
                  type="button"
                  onClick={() => updateBlankImageStyle({ height: blankImageHeight === null ? 240 : null })}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {blankImageHeight === null ? "Set custom" : "Reset to auto"}
                </button>
              </span>
            </label>
          </div>

          <label className="mt-3 block text-xs font-medium text-slate-600">
            <span className="mb-1 block">Link URL (optional)</span>
            <input
              type="text"
              value={blankImageHref}
              onChange={(event) => setBlankImageHref(event.target.value)}
              onBlur={(event) => updateBlankImageStyle({ href: event.target.value.trim() || null })}
              placeholder="https://example.com"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </>
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
  );



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
              onClick={() => {
                // form.body is already kept live on every keystroke by
                // ComposerRichTextEditor's onChange (TipTap has no
                // blur-only sync the way the old contentEditable did), so
                // there's nothing extra to flush here before switching.
                setIsPreviewMode((value) => !value);
              }}
              className={`text-sm px-4 py-1.5 rounded-lg border transition-colors ${isPreviewMode ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              Preview
            </button>
            <button 
              type="button"
              onClick={onSaveDraft}
              disabled={isAutoSaving}
              className={`border border-gray-200 text-gray-600 text-sm px-4 py-1.5 rounded-lg hover:bg-gray-50 ${isAutoSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isAutoSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={onNext}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
            >
              Send Now
            </button>
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
          onDownloadAttachment={handleDownloadAttachment}
        />
      ) : (
        <>
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
                <img src={aiWriter} className="h-5 w-5" alt="" />
                {isSubjectRewriting ? "Rewriting..." : "Rewrite"}
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
                    className="rounded-3xl border border-slate-200 bg-white p-6 min-h-104"
                    onClick={handleBlankPreviewClick}
                  >
                    <style>{`
                      [data-composer-editor="blank-body"] img {
                        cursor: pointer;
                      }
                      [data-composer-editor="blank-body"] img:hover {
                        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                      }
                    `}</style>
                    <div data-composer-editor="blank-body">
                      <ComposerRichTextEditor
                        ref={blankBodyEditorRef}
                        content={form.body || ""}
                        enableImages
                        placeholder="Start typing your email..."
                        className="w-full min-h-96 bg-transparent border-none outline-none whitespace-pre-wrap text-sm leading-6 text-slate-600"
                        onChange={(html) => onChange('body', html)}
                        onFocus={() => {
                          setActiveBlockId("blank-body");
                          if (blankBodyEditorRef.current) setActiveEditorHandle(blankBodyEditorRef.current);
                        }}
                        onSelectionChange={(selectedText) => {
                          if (selectedText && blankBodyEditorRef.current) {
                            aiWriterBridge.captureSelection(blankBodyEditorRef.current, selectedText);
                            setWriterPrompt(selectedText);
                          }
                        }}
                      />
                    </div>

                    {attachments.length > 0 && (
                      <div
                        className="mt-6 rounded-[20px] border border-slate-200 bg-slate-50 p-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Attachments</span>
                          <span className="text-[11px] text-slate-400">{attachments.length} file{attachments.length > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {attachments.slice(0, 4).map((attachment) => (
                            <button
                              key={attachment.id}
                              type="button"
                              onClick={() => handleDownloadAttachment(attachment)}
                              className="inline-flex max-w-40 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
                            >
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-[10px] font-semibold text-blue-600">📎</span>
                              <span className="truncate">{attachment.name}</span>
                              <span className="ml-1 text-[11px" title="Download">⬇</span>
                            </button>
                          ))}
                          {attachments.length > 4 && (
                            <span className="inline-flex items-center rounded-full bg-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-600">
                              +{attachments.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <TemplatePreviewCanvas
                    templateId={templateId}
                    blocks={templateLayout}
                    activeBlockId={activeBlockId}
                    onSelectBlock={handleSelectImageBlock}
                    attachments={attachments}
                    onDownloadAttachment={handleDownloadAttachment}
                    onBlockTextChange={handleBlockTextChange}
                    onEditorFocus={handleEditorFocus}
                    onActivateBlock={handleActivateTextBlock}
                    onSelectionChange={handleEditorSelectionChange}
                    enableInlineImages={allImageSlotsRemoved}
                    onToggleSectionRemoved={toggleSectionRemoved}
                    onRestoreImageSlot={handleRestoreImageSlot}
                    boxRefs={imageBoxRefs}
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
                      <ComposerToolbar activeEditor={activeEditorHandle} disabled={!activeBlockId} />
                      {!activeBlockId && (
                        <p className="mt-2 text-xs text-slate-500">Click into the email to start formatting.</p>
                      )}
                    </div>

                    {(showImagePanel || selectedBlankImageSrc) && renderImageInsertPanel()}

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
                          onCommitCrop={() => commitImageCrop(activeBlockId!)}
                          uploading={uploadingImage}
                          uploadError={uploadError}
                          onStyleChange={updateActiveImageBlock}
                          onRemove={() => {
                            updateActiveImageBlock({ removed: true });
                            setActiveBlockId(null);
                          }}
                        />
                      </div>
                    ) : allImageSlotsRemoved && (showImagePanel || selectedBlankImageSrc) ? (
                      renderImageInsertPanel()
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Formatting</div>
                        {activeBlockId ? (
                          <>
                            <ComposerToolbar activeEditor={activeEditorHandle} disabled={false} />
                            <button
                              type="button"
                              onClick={() => toggleSectionRemoved(activeBlockId)}
                              className="mt-3 w-full rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                            >
                              Remove this section
                            </button>
                          </>
                        ) : (
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
        <Draggable initialPosition={{ x: 500, y: 150 }} className="z-20 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleAddFileClick}
            title="Add file"
            className={`flex flex-col h-14 w-14 items-center justify-center rounded-full border text-base shadow-md transition-colors ${showAttachmentsPanel ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            <img src={addFile} className="w-5 h-5" alt="" />
            <p className="text-[8px]">Add File</p>
          </button>
          <button
            type="button"
            onClick={handleAddImageClick}
            title="Add image"
            className={`flex flex-col h-14 w-14 items-center justify-center rounded-full border text-base shadow-md transition-colors ${showImagePanel || selectedBlankImageSrc || activeImageBlock ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
          >
             <img src={addImage} className="w-5 h-5" alt="" />
            <p className="text-[8px]">Add Image</p>
          </button>
          <button
            type="button"
            onMouseDown={handleAIRewriteMouseDown}
            onClick={handleAIRewriteClick}
            title="AI Writer"
            className={`flex flex-col h-14 w-14 items-center justify-center rounded-full text-base text-white shadow-md transition-colors ${showAIWriter ? "bg-blue-700" : "bg-blue-600 hover:bg-blue-700"}`}
          >
             <img src={aiWriter} className="w-5 h-5" alt="" />
            <p className="text-[8px]">Ai Writer</p>
          </button>
          <button
            type="button"
            onMouseDown={handleAIRewriteMouseDown}
            onClick={handleCloseAIWriter}
            title="Close AI Writer"
            className={`flex h-11 w-11 items-center justify-center rounded-full border text-base shadow-md transition-colors ${showAIWriter ? "border-gray-200 bg-white text-gray-600 hover:bg-gray-50" : "hidden"}`}
          >
            ✕
          </button>
        </Draggable>
      )}

      {showAIWriter && !isPreviewMode && (
        <Draggable initialPosition={{ x: 200, y: 300 }}>
          <AIWriterPopup
              onClose={handleCloseAIWriter}
              selectedWriterId={selectedWriterId}
              onSelectWriter={setSelectedWriterId}
              prompt={writerPrompt}
              onPromptChange={setWriterPrompt}
              onGenerate={handleRewriteSelection}
              isRewriting={isRewritingSelection}
            />
        </Draggable>
      )}

      {rewrittenText && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">AI Rewritten Text</h3>
            <p className="mt-2 text-sm text-gray-500">
              {aiWriterBridge.highlightedText
                ? "Approve to drop this back in where you highlighted it, or just copy it."
                : "Copy the rewritten text below to use in your email."}
            </p>
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{rewrittenText}</p>
            </div>
            {replaceUnavailable && (
              <p className="mt-2 text-xs text-amber-600">
                Couldn't find where that text was highlighted anymore (you may have clicked elsewhere) — copy it instead.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setRewrittenText(null);
                  setReplaceUnavailable(false);
                }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600"
              >
                Close
              </button>
              <button
                onClick={handleCopyRewrittenText}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                📋 Copy
              </button>
              {/* Requirement #6: approve -> replace exactly what was highlighted */}
              <button
                onClick={() => {
                  const didReplace = aiWriterBridge.approveReplacement(rewrittenText);
                  if (didReplace) {
                    setRewrittenText(null);
                    setReplaceUnavailable(false);
                  } else {
                    setReplaceUnavailable(true);
                  }
                }}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                ✓ Approve &amp; Replace
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
  form, onChange, onSend, sent, categories, isSending, sendError, sendVia,
}: {
  form: ConfirmForm;
  onChange: <K extends keyof ConfirmForm>(k: K, v: ConfirmForm[K]) => void;
  onSend: () => void;
  sent: boolean;
  categories: Category[];
  isSending: boolean;
  sendError: string | null;
  sendVia?: SendVia;
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

  // AI flow special case: only show test email + Start Agent button
  if (form.isFromAIFlow) {
    return (
      <div className="px-8 py-10 max-w-xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-1">Start AI Agent</h2>
        <p className="text-gray-500 text-sm text-center mb-8">Configure and start your AI agent</p>

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

        {/* Recipients */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Recipients
            {sendVia === "broadcast" && (
              <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                Broadcast Mode: Max 3 categories, 250k each
              </span>
            )}
          </label>
          <div className="border border-gray-200 rounded-xl p-3 max-h-40 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="text-sm text-gray-400">No categories available</p>
            ) : (
              categories.map(cat => {
                const isSelected = form.clientCategoryIds.includes(cat.id);
                const isBroadcast = sendVia === "broadcast";
                const exceedsLimit = isBroadcast && cat.count && cat.count > 250000;
                const wouldExceedMaxCategories = isBroadcast && !isSelected && form.clientCategoryIds.length >= 3;
                const isDisabled = exceedsLimit || wouldExceedMaxCategories;

                return (
                  <label 
                    key={cat.id} 
                    className={`flex items-center gap-2 py-2 cursor-pointer ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={e => {
                        if (e.target.checked) {
                          onChange("clientCategoryIds", [...form.clientCategoryIds, cat.id]);
                        } else {
                          onChange("clientCategoryIds", form.clientCategoryIds.filter(id => id !== cat.id));
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-gray-700">{cat.name}</span>
                      {cat.count !== undefined && cat.count !== null && (
                        <span className="text-xs text-gray-500 ml-2">
                          ({cat.count.toLocaleString()} clients)
                        </span>
                      )}
                    </div>
                    {exceedsLimit && (
                      <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        Exceeds 250k limit
                      </span>
                    )}
                    {wouldExceedMaxCategories && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        Max 3 categories
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>
          {sendVia === "broadcast" && form.clientCategoryIds.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              {form.clientCategoryIds.length}/3 categories selected
            </p>
          )}
        </div>

        <button
          onClick={onSend}
          disabled={isSending || form.clientCategoryIds.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSending ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Starting Agent...
            </>
          ) : (
            "Start Agent"
          )}
        </button>

        {sendError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700">{sendError}</p>
          </div>
        )}
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

      {/* Recipients */}
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Recipients
          {sendVia === "broadcast" && (
            <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Broadcast Mode: Max 3 categories, 250k each
            </span>
          )}
        </label>
        <div className="border border-gray-200 rounded-xl p-3 max-h-40 overflow-y-auto">
          {categories.length === 0 ? (
            <p className="text-sm text-gray-400">No categories available</p>
          ) : (
            categories.map(cat => {
              const isSelected = form.clientCategoryIds.includes(cat.id);
              const isBroadcast = sendVia === "broadcast";
              const exceedsLimit = isBroadcast && cat.count && cat.count > 250000;
              const wouldExceedMaxCategories = isBroadcast && !isSelected && form.clientCategoryIds.length >= 3;
              const isDisabled = exceedsLimit || wouldExceedMaxCategories;

              return (
                <label 
                  key={cat.id} 
                  className={`flex items-center gap-2 py-2 cursor-pointer ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isDisabled}
                    onChange={e => {
                      if (e.target.checked) {
                        onChange("clientCategoryIds", [...form.clientCategoryIds, cat.id]);
                      } else {
                        onChange("clientCategoryIds", form.clientCategoryIds.filter(id => id !== cat.id));
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <div className="flex-1">
                    <span className="text-sm text-gray-700">{cat.name}</span>
                    {cat.count !== undefined && cat.count !== null && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({cat.count.toLocaleString()} clients)
                      </span>
                    )}
                  </div>
                  {exceedsLimit && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                      Exceeds 250k limit
                    </span>
                  )}
                  {wouldExceedMaxCategories && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      Max 3 categories
                    </span>
                  )}
                </label>
              );
            })
          )}
        </div>
        {sendVia === "broadcast" && form.clientCategoryIds.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            {form.clientCategoryIds.length}/3 categories selected
          </p>
        )}
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
        disabled={form.clientCategoryIds.length === 0 || isSending}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSending ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {form.delivery === "now" ? "Sending..." : "Scheduling..."}
          </>
        ) : (
          form.delivery === "now" ? "Send Now" : "Schedule Broadcast"
        )}
      </button>

      {sendError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700">{sendError}</p>
        </div>
      )}
    </div>
  );
}

// ─── Root Composer ────────────────────────────────────────────────────────────

export function EmailComposerModal({ onClose, prefilled, templateId, brand, draftId }: Props) {
  const [step, setStep] = useState<ComposerStep>("compose");
  const [sent, setSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const { brandId } = useParams();
  const [templateLayout, setTemplateLayout] = useState<TemplateLayoutBlock[]>(() => safeBuildTemplateLayout(templateId));

  // Requirement #3: local override so the composer can seamlessly fall
  // back to the blank template when every section of a fixed template
  // gets removed, without needing the parent page to change its own
  // templateId prop. Clearing back to undefined whenever the *external*
  // templateId prop changes means a genuinely new template selection from
  // outside always wins over a stale internal fallback.
  const [templateOverride, setTemplateOverride] = useState<number | undefined>(undefined);
  const effectiveTemplateId = templateOverride !== undefined ? templateOverride : templateId;

  useEffect(() => {
    // Only clear templateOverride if we're not loading from a draft
    // When loading from a draft, templateOverride is set from prefilled.templateId
    // and should not be cleared by templateId prop changes
    if (draftId === undefined) {
      setTemplateOverride(undefined);
    }
  }, [templateId, draftId]);

  const composeCleanupRef = useRef<(() => Promise<void>) | null>(null);

  // Draft-related state
  const [currentDraftId, setCurrentDraftId] = useState<number | null>(draftId ?? null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update currentDraftId when draftId prop changes
  useEffect(() => {
    if (draftId !== undefined && draftId !== currentDraftId) {
      setCurrentDraftId(draftId);
    }
  }, [draftId, currentDraftId]);

  const [compose, setCompose] = useState<ComposeForm>({
    name: user ? `${user.first_name} ${user.last_name}` : "User",
    from: user?.email || "",
    to: "",
    subject: prefilled?.subject ?? "",
    preview: prefilled?.preview ?? "",
    body: prefilled?.body ?? "",
    attachments: [], // Initialize empty, will be synced from local attachments state
    footer: prefilled?.footer ?? "",
    address: prefilled?.address ?? "",
  });
  const [categories, setCategories] = useState<Category[]>([]);

  // Fetch categories for recipient selection in confirm step
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await clientService.getCategories();
        setCategories(cats);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    void fetchCategories();
  }, []);

  const [confirm, setConfirm] = useState<ConfirmForm>({
    testEmail: user?.email || "",
    delivery: "later",
    scheduleDate: "2023-05-16",
    scheduleTime: "23:39",
    clientCategoryIds: [],
    isFromAIFlow: prefilled?.aiResult ? true : false,
  });

  useEffect(() => {
    // Build initial template layout, but don't override if we have prefilled templateLayout
    // Use effectiveTemplateId instead of templateId to respect templateOverride from drafts
    if (prefilled?.templateLayout) {
      return;
    }

    const nextLayout = safeBuildTemplateLayout(effectiveTemplateId, prefilled?.aiResult);
    setTemplateLayout(nextLayout);

    if (effectiveTemplateId && effectiveTemplateId !== 0) {
      setCompose((current) => ({
        ...current,
        body: current.body || buildLayoutHtml(nextLayout, effectiveTemplateId),
      }));
    }
  }, [effectiveTemplateId, prefilled?.aiResult, prefilled?.templateLayout]);

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
    if (appliedPrefillSignatureRef.current === signature) {
      return;
    }
    appliedPrefillSignatureRef.current = signature;

    // First, restore draft-specific state if available
    if (prefilled.templateLayout) {
      setTemplateLayout(prefilled.templateLayout);
    }
    if (prefilled.templateId) {
      setTemplateOverride(prefilled.templateId);
    }
    // Note: attachments are handled by a separate effect to avoid conflicts
    if (prefilled.footer) {
      setCompose((current) => ({ ...current, footer: prefilled.footer || "" }));
    }
    if (prefilled.address) {
      setCompose((current) => ({ ...current, address: prefilled.address || "" }));
    }

    // Skip AI logic if we're restoring from a draft with template layout
    if (prefilled.templateLayout) {
      return;
    }

    const aiResult = prefilled.aiResult;
    const nextSubjectFromAi = aiResult ? resolveContentValue(aiResult, [
      "headline", "data.headline", "result.headline", "subject", "data.subject", "result.subject", "title",
    ]) : "";
    const nextPreviewFromAi = aiResult ? resolveContentValue(aiResult, [
      "preview", "data.preview", "result.preview", "description", "data.description", "result.description", "summary",
    ]) : "";
    const nextBodyFromAi = aiResult ? resolveContentValue(aiResult, [
      "html_body", "data.html_body", "result.html_body", "body", "data.body", "result.body", "content", "data.content", "result.content"], true
    ) : "";

    const hasExplicitPrefill = Boolean(prefilled.subject || prefilled.preview || prefilled.body);
    const hasAiPrefill = isNonEmptyAiResult(aiResult) || nextSubjectFromAi || nextPreviewFromAi || nextBodyFromAi;
    if (!hasExplicitPrefill && !hasAiPrefill) return;

    setCompose((current) => ({
      ...current,
      subject: (prefilled.subject ?? nextSubjectFromAi) || current.subject || "",
      preview: (prefilled.preview ?? nextPreviewFromAi) || current.preview || (prefilled?.subject ? `${prefilled.subject} — read more inside` : ""),
      body: (prefilled.body ?? nextBodyFromAi) || current.body || "",
    }));

    // Always rebuild template layout when AI content is present
    if (aiResult) {
      const newLayout = safeBuildTemplateLayout(templateId, {
        ...(aiResult ?? {}),
        headline: nextSubjectFromAi,
        preview: nextPreviewFromAi,
        body: nextBodyFromAi,
      });
      setTemplateLayout(newLayout);
    }
  }, [prefilled, templateId]);

  // ─── Draft Management ─────────────────────────────────────────────────────────────

  // Create or update draft based on current composer state
  const saveDraft = useCallback(async () => {
    console.log('[EmailComposer] saveDraft called');
    const brandIdNumber = brandId ? Number(brandId) : undefined;
    console.log('[EmailComposer] brandIdNumber:', brandIdNumber);

    if (!brandIdNumber) {
      console.warn('[EmailComposer] No brandId, skipping save');
      return;
    }

    try {
      setIsAutoSaving(true);

      const domainId = brand?.domains?.[0]?.id;
      console.log('[EmailComposer] domainId:', domainId);

      // Only create draft if we have a domain, otherwise skip
      if (!domainId) {
        console.warn('[EmailComposer] No domainId, skipping save');
        setIsAutoSaving(false);
        return;
      }
      
      // Extract sections content from template layout
      const sectionsContent = templateLayout.map(block => ({
        section_id: block.id,
        html: block.text || ''
      }));

      // Extract removed sections
      const removedSections = templateLayout.filter(block => block.removed).map(block => block.id);

      // Extract custom images from template layout
      const customImages = templateLayout
        .filter(block => block.role === 'image' && block.imageUrl)
        .map(block => ({
          id: block.id,
          url: block.imageUrl,
          width: block.imageWidth,
          position_x: block.imageOffsetX,
          link_url: block.imageLinkUrl,
          section_id: block.id,
          slot_id: block.id,
          is_custom: true,
          is_removed: block.removed || false
        }));

      const draftPayload: any = {
        brand_id: brandIdNumber,
        domain_id: domainId,
        template_id: effectiveTemplateId,
        from_name: compose.name,
        head: compose.subject,
        preview: compose.preview,
        template_layout: JSON.stringify(templateLayout),
        sections_content: JSON.stringify(sectionsContent),
        removed_sections: JSON.stringify(removedSections),
        custom_images: JSON.stringify(customImages),
        attachments: JSON.stringify(compose.attachments),
        html: compose.body,
        footer: compose.footer,
        address: compose.address,
      };

      // Only add AI metadata if they have actual values (not undefined)
      // NOTE: Backend currently requires these fields, so we provide minimal defaults if needed
      // This should be removed once backend makes these fields truly optional
      const aiAgentId = prefilled?.aiResult?.ai_agent_id;
      const aiGoal = prefilled?.aiResult?.ai_goal;
      const businessType = prefilled?.aiResult?.business_type;
      const toneId = prefilled?.aiResult?.tone_id;
      
      if (aiAgentId !== undefined) {
        draftPayload.ai_agent_id = aiAgentId;
      } else {
        // Backend requires this field - temporary default
        draftPayload.ai_agent_id = 1;
      }
      if (aiGoal !== undefined) {
        draftPayload.ai_goal = aiGoal;
      } else {
        // Backend requires this field - temporary default
        draftPayload.ai_goal = "General";
      }
      if (businessType !== undefined) {
        draftPayload.business_type = businessType;
      } else {
        // Backend requires this field - temporary default
        draftPayload.business_type = "General";
      }
      if (toneId !== undefined) {
        draftPayload.tone_id = toneId;
      } else {
        // Backend requires this field - temporary default
        draftPayload.tone_id = 1;
      }

      if (currentDraftId) {
        // Update existing draft
        console.log('[EmailComposer] Updating existing draft:', currentDraftId);
        console.log('[EmailComposer] Update payload:', draftPayload);
        await draftService.updateDraft(currentDraftId, draftPayload);
        console.log('[EmailComposer] Draft updated successfully');
      } else {
        // Create new draft
        console.log('[EmailComposer] Creating new draft...');
        // Extract sections content from template layout
        const sectionsContent = templateLayout.map(block => ({
          section_id: block.id,
          html: block.text || ''
        }));

        // Extract removed sections
        const removedSections = templateLayout.filter(block => block.removed).map(block => block.id);

        // Extract custom images from template layout
        const customImages = templateLayout
          .filter(block => block.role === 'image' && block.imageUrl)
          .map(block => ({
            id: block.id,
            url: block.imageUrl,
            width: block.imageWidth,
            position_x: block.imageOffsetX,
            link_url: block.imageLinkUrl,
            section_id: block.id,
            slot_id: block.id,
            is_custom: true,
            is_removed: block.removed || false
          }));

        const newDraftPayload: any = {
          brand_id: brandIdNumber,
          domain_id: brand?.domains?.[0]?.id,
          template_id: effectiveTemplateId,
          from_name: compose.name,
          head: compose.subject,
          preview: compose.preview,
          template_layout: JSON.stringify(templateLayout),
          sections_content: JSON.stringify(sectionsContent),
          removed_sections: JSON.stringify(removedSections),
          custom_images: JSON.stringify(customImages),
          attachments: JSON.stringify(compose.attachments),
          html: compose.body,
          footer: compose.footer,
          address: compose.address,
        };

        // Only add AI metadata if they have actual values (not undefined)
        // NOTE: Backend currently requires these fields, so we provide minimal defaults if needed
        // This should be removed once backend makes these fields truly optional
        const aiAgentId = prefilled?.aiResult?.ai_agent_id;
        const aiGoal = prefilled?.aiResult?.ai_goal;
        const businessType = prefilled?.aiResult?.business_type;
        const toneId = prefilled?.aiResult?.tone_id;

        if (aiAgentId !== undefined) {
          newDraftPayload.ai_agent_id = aiAgentId;
        } else {
          // Backend requires this field - temporary default
          newDraftPayload.ai_agent_id = 1;
        }
        if (aiGoal !== undefined) {
          newDraftPayload.ai_goal = aiGoal;
        } else {
          // Backend requires this field - temporary default
          newDraftPayload.ai_goal = "General";
        }
        if (businessType !== undefined) {
          newDraftPayload.business_type = businessType;
        } else {
          // Backend requires this field - temporary default
          newDraftPayload.business_type = "General";
        }
        if (toneId !== undefined) {
          newDraftPayload.tone_id = toneId;
        } else {
          // Backend requires this field - temporary default
          newDraftPayload.tone_id = 1;
        }

        console.log('[EmailComposer] Creating draft with payload:', newDraftPayload);
        const newDraft = await draftService.createDraft(newDraftPayload);
        console.log('[EmailComposer] New draft created:', newDraft);
        setCurrentDraftId(newDraft.id);
      }
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [brandId, compose, currentDraftId, prefilled, brand, effectiveTemplateId, templateLayout]);

  // Auto-save on composer changes with debouncing
  useEffect(() => {
    console.log('[EmailComposer] Compose changed, scheduling auto-save in 2s');
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      console.log('[EmailComposer] Auto-save timeout triggered');
      saveDraft();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [compose, saveDraft]);

  // Manual save handler
  const handleManualSave = useCallback(async () => {
    await saveDraft();
  }, [saveDraft]);

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
    setSendError(null);
    try {
      // Ensure draft is saved first
      if (!currentDraftId) {
        console.log('[EmailComposer] Saving draft before send...');
        await saveDraft();
      }

      const brandIdNumber = brandId ? Number(brandId) : undefined;
      const domainId = brand && brand.domains && brand.domains.length > 0 ? brand.domains[0].id : undefined;
      const draftIdNumber = currentDraftId;

      console.log('[EmailComposer] Send details:', {
        draftId: draftIdNumber,
        brandId: brandIdNumber,
        domainId: domainId,
        isFromAIFlow: confirm.isFromAIFlow,
        delivery: confirm.delivery,
        clientCategoryIds: confirm.clientCategoryIds,
      });

      if (!draftIdNumber || !brandIdNumber || !domainId) {
        throw new Error("Missing required draft, brand, or domain ID");
      }

      // Determine action and schedule date/time
      let action: "send now" | "send later" = "send later";
      let scheduleDate: string | null = null;
      let scheduleTime: string | null = null;

      if (confirm.isFromAIFlow && prefilled?.aiResult) {
        // AI agent scheduling - use start date from AI flow
        const aiStartDate = prefilled.aiResult.start_date as string;
        const aiStopDate = prefilled.aiResult.stop_date as string;
        if (aiStartDate) {
          scheduleDate = aiStartDate.split('T')[0];
          scheduleTime = aiStartDate.split('T')[1]?.substring(0, 5) || "00:00";
          action = "send later";
          console.log('[EmailComposer] Using AI agent schedule:', { scheduleDate, scheduleTime, stopDate: aiStopDate });
        }
      } else if (confirm.delivery === "now") {
        // Send now - use current date/time (backend expects valid strings)
        action = "send now";
        const now = new Date();
        scheduleDate = now.toISOString().split('T')[0];
        scheduleTime = now.toTimeString().substring(0, 5);
        console.log('[EmailComposer] Send now - using current date/time:', { scheduleDate, scheduleTime, now: now.toISOString() });
      } else {
        // Send later - use selected date/time
        action = "send later";
        scheduleDate = confirm.scheduleDate;
        scheduleTime = confirm.scheduleTime;
        console.log('[EmailComposer] Send later - raw values:', { 
          confirmScheduleDate: confirm.scheduleDate, 
          confirmScheduleTime: confirm.scheduleTime,
          scheduleDate, 
          scheduleTime 
        });
      }

      // Log current time for comparison
      const currentTime = new Date();
      console.log('[EmailComposer] Current time for comparison:', currentTime.toISOString());

      // Create delivery schedule
      console.log('[EmailComposer] Creating delivery schedule...');
      const schedulePayload = {
        brand_id: brandIdNumber,
        draft_id: draftIdNumber,
        domain_id: domainId,
        action,
        date: scheduleDate,
        time: scheduleTime,
      };
      console.log('[EmailComposer] Delivery schedule payload:', schedulePayload);
      const scheduleResult = await composerWorkflowService.createDeliverySchedule(schedulePayload);
      console.log('[EmailComposer] Delivery schedule created:', scheduleResult);

      // Send campaign with recipient categories
      if (confirm.clientCategoryIds.length > 0) {
        // Check brand send mode and validate accordingly
        const sendVia = brand?.sendVia;
        console.log('[EmailComposer] Brand send mode:', sendVia);

        // Append forced footer to email HTML before sending
        // Map backend footer fields to FooterSettings
        const footerSettings = brand?.unsuscribe_information || brand?.footer_address || brand?.newsletter_badge !== undefined ? {
          unsubscribeText: brand?.unsuscribe_information || "You are receiving this email because you opted in via our site.\n\nWant to change how you receive these emails?\nYou can unsubscribe from this list.",
          companyName: brand?.footer_address?.split('\n')[0] || "Company Name",
          address: brand?.footer_address?.split('\n')[1] || "99 Street Address",
          cityStateZip: brand?.footer_address?.split('\n')[2] || "City, STATE 000-000",
          removeBadge: !brand?.newsletter_badge,
        } : null;
        
        console.log('[EmailComposer] Footer settings from brand:', footerSettings);
        
        if (footerSettings) {
          const sendType = sendVia === "broadcast" ? "broadcast" : "campaign";
          console.log('[EmailComposer] Appending footer to email, send type:', sendType);
          
          // Use brand logo URL if available, otherwise use local logo
          const logoUrl = "https://ainewsletter-eta.vercel.app/favicon.png";
          console.log('[EmailComposer] Using logo URL:', logoUrl);
          
          // Get current draft HTML
          const currentDraft = await draftService.getDraft(draftIdNumber);
          console.log('[EmailComposer] Current draft HTML length:', currentDraft?.html?.length);
          
          if (currentDraft && currentDraft.html) {
            const emailHtmlWithFooter = appendFooterToEmail(
              currentDraft.html,
              footerSettings,
              sendType,
              logoUrl
            );
            
            console.log('[EmailComposer] Email HTML with footer length:', emailHtmlWithFooter.length);
            console.log('[EmailComposer] Footer HTML preview:', emailHtmlWithFooter.slice(-500));
            
            // Update draft with footer-included HTML
            console.log('[EmailComposer] Updating draft with footer-included HTML');
            await draftService.updateDraft(draftIdNumber, { 
              html: emailHtmlWithFooter,
              footer: footerSettings.unsubscribeText,
              address: `${footerSettings.companyName}\n${footerSettings.address}\n${footerSettings.cityStateZip}`
            });
            console.log('[EmailComposer] Draft updated successfully');
          } else {
            console.warn('[EmailComposer] No current draft or HTML found');
          }
        } else {
          console.warn('[EmailComposer] No footer settings found on brand');
        }

        // Validate broadcast mode restrictions
        if (sendVia === "broadcast") {
          const validation = validateBroadcastSelection(
            confirm.clientCategoryIds,
            categories,
            sendVia
          );
          
          if (!validation.isValid) {
            const errorMessage = getValidationErrorMessage(validation);
            console.error('[EmailComposer] Broadcast validation failed:', errorMessage);
            throw new Error(errorMessage);
          }
          
          console.log('[EmailComposer] Sending broadcast to categories:', confirm.clientCategoryIds);
          const broadcastPayload = {
            draft_id: draftIdNumber,
            client_cat_ids: confirm.clientCategoryIds,
          };
          console.log('[EmailComposer] Broadcast payload:', broadcastPayload);
          const broadcastResult = await composerWorkflowService.sendBroadcast(broadcastPayload);
          console.log('[EmailComposer] Broadcast sent successfully:', broadcastResult);
        } else {
          // Campaign mode (normal sending)
          console.log('[EmailComposer] Sending campaign to categories:', confirm.clientCategoryIds);
          const campaignPayload = {
            draft_id: draftIdNumber,
            client_category_ids: confirm.clientCategoryIds,
          };
          console.log('[EmailComposer] Campaign payload:', campaignPayload);
          const campaignResult = await composerWorkflowService.sendCampaign(campaignPayload);
          console.log('[EmailComposer] Campaign sent successfully:', campaignResult);
        }
      } else {
        console.warn('[EmailComposer] No recipient categories selected, skipping send');
      }

      console.log('[EmailComposer] Send completed successfully');
      setSent(true);
    } catch (error: any) {
      console.error("[EmailComposer] Failed to send newsletter workflow", error);
      // Extract error message from backend response if available
      let errorMessage = 'Unknown error';
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      setSendError(errorMessage);
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
            templateId={effectiveTemplateId}
            templateLayout={templateLayout}
            categories={categories}
            onTemplateLayoutChange={(value) => {
              setTemplateLayout(value);
            }}
            onSwitchToBlankTemplate={() => setTemplateOverride(0)}
            onRegisterCleanup={(cleanup) => {
              composeCleanupRef.current = cleanup;
            }}
            onSaveDraft={handleManualSave}
            isAutoSaving={isAutoSaving}
            prefilled={prefilled}
            draftId={currentDraftId ?? undefined}
          />
        ) : (
          <ConfirmStep
            form={confirm}
            onChange={(k, v) => setConfirm(f => ({ ...f, [k]: v }))}
            onSend={handleSend}
            sent={sent}
            categories={categories}
            isSending={isSending}
            sendError={sendError}
            sendVia={brand?.sendVia}
          />
        )}
      </div>
    </div>
  );
}