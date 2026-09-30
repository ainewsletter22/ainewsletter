import type { TemplateLayoutBlock } from "../types/Types";
import type { Draft } from "../services/draftService";

// A saved draft stores its template in two layers:
//   - template_layout: the original block structure (ids, roles, placeholders)
//   - sections_content / custom_images: the deltas -- what the user actually
//     typed and which images they actually set, keyed by section id
//
// Anything that wants to show "what this draft really looks like" (the
// composer, and now the drafts list thumbnail) has to merge these back
// together. Previously only Sendainewsletterpage's onSelectDraft did this
// merge (when loading a draft into the composer) -- DraftsTab read
// template_layout raw, so its cards only ever showed the template's
// placeholder text/images, never the user's actual edits.

type DraftLayoutSource = Pick<Draft, "template_layout" | "sections_content" | "custom_images">;

function safeParseArray(json: string): any[] | undefined {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function restoreDraftLayout(draft: DraftLayoutSource): TemplateLayoutBlock[] | undefined {
  if (!draft.template_layout) return undefined;

  let layout: TemplateLayoutBlock[];
  try {
    const parsed = JSON.parse(draft.template_layout);
    if (!Array.isArray(parsed) || parsed.length === 0) return undefined;
    layout = parsed;
  } catch {
    return undefined;
  }

  const sectionsContent = draft.sections_content ? safeParseArray(draft.sections_content) : undefined;
  const customImages = draft.custom_images ? safeParseArray(draft.custom_images) : undefined;

  let restored = layout;

  if (sectionsContent) {
    restored = restored.map((block) => {
      const sectionData = sectionsContent.find((s: any) => s.section_id === block.id);
      return sectionData ? { ...block, text: sectionData.html } : block;
    });
  }

  if (customImages) {
    restored = restored.map((block) => {
      if (block.role !== "image") return block;
      const imageData = customImages.find((img: any) => img.section_id === block.id);
      if (!imageData) return block;
      return {
        ...block,
        imageUrl: imageData.url,
        imageWidth: imageData.width,
        imageOffsetX: imageData.position_x,
        imageLinkUrl: imageData.link_url,
        removed: imageData.is_removed ?? block.removed,
      };
    });
  }

  return restored;
}

export function parseAttachmentCount(attachments?: string | null): number {
  if (!attachments) return 0;
  const parsed = safeParseArray(attachments);
  return parsed ? parsed.length : 0;
}