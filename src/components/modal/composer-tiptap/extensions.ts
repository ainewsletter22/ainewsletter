import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { mergeAttributes } from "@tiptap/core";
import { TextStyle } from "@tiptap/extension-text-style";

// Requirement #3: a link is always blue and its color can't be independently
// changed. We don't rely on a `color` mark for this at all -- the blue comes
// straight from this extension's own renderHTML, as an *inline* style (not a
// stylesheet class), because the sent email HTML has to survive email
// clients that strip <style> blocks and external CSS. ComposerEditorHandle's
// setLink() (in ComposerRichTextEditor.tsx) also strips any pre-existing
// `textStyle`/color mark off the range when a link is applied, and
// ComposerToolbar disables the color picker whenever the cursor is inside a
// link -- so there's no path, keyboard or mouse, to override this blue.
const LINK_COLOR = "#2563eb"; // same blue used elsewhere in the composer UI

export const LockedColorLink = Link.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        style: `color:${LINK_COLOR};text-decoration:underline;`,
      }),
      0,
    ];
  },
});

// Requirement #4 (image can be a link) + carries forward the width/offsetX
// resizing convention the fixed templates' image slots and the blank
// template already use elsewhere in EmailComposerModal.tsx. `href` isn't
// rendered onto the <img> itself -- when present, the whole node renders
// wrapped in a real <a> tag (so it behaves as an actual clickable link both
// in the editor and in the sent email), matching how LockedColorLink does
// text links.
export const ResizableLinkableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "45%",
        parseHTML: (element: HTMLElement) => element.style.width || element.getAttribute("width") || "45%",
      },
      offsetX: {
        // NOTE: this is a PERCENTAGE of the image's own rendered width, not
        // a pixel value. `transform: translateX(%)` is defined relative to
        // the transformed element's own border box, and that box is already
        // sized as a % of its container (see `width` above). So a
        // percentage offset scales proportionally wherever the image is
        // rendered -- composer editor pane, the preview pane, or eventually
        // an email client -- all of which have different container widths.
        // A raw px offset does NOT have this property: the same px shift is
        // a different fraction of a narrow vs. wide container, so the image
        // visibly drifts between composer and preview. See the "image
        // shifted left in preview" bug this replaces.
        default: 0,
        parseHTML: (element: HTMLElement) => {
          const match = /translateX\((-?\d+(?:\.\d+)?)%\)/.exec(element.style.transform || "");
          return match ? Number.parseFloat(match[1]) : 0;
        },
      },
      href: {
        default: null,
        parseHTML: (element: HTMLElement) => element.closest("a")?.getAttribute("href") || null,
      },
      height: {
        default: null, // null = auto (maintain aspect ratio)
        parseHTML: (element: HTMLElement) =>
          element.style.height && element.style.height !== "auto" ? element.style.height : null,
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const { width, offsetX, href, height, ...rest } = HTMLAttributes as Record<string, unknown>;
    const style = `width:${width || "45%"};height:${height || "auto"};${height ? "object-fit:cover;" : ""}max-width:100%;display:inline-block;vertical-align:middle;border-radius:8px;cursor:pointer;margin:0 4px;${
      offsetX ? ` transform:translateX(${offsetX}%);` : ""
    }`;

    const imgSpec = [
      "img",
      mergeAttributes(this.options.HTMLAttributes, rest as Record<string, unknown>, { style }),
    ] as const;

    if (href) {
      return ["a", { href, target: "_blank", rel: "noopener noreferrer", style: "display:inline-block;" }, imgSpec];
    }
    return imgSpec as unknown as ReturnType<typeof mergeAttributes> extends never ? never : any;
  },
});


export const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontSize || null,
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.fontSize) return {};
          return { style: `font-size:${attributes.fontSize}` };
        },
      },
    };
  },
});