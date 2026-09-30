import type { MouseEvent } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link as LinkIcon,
  Eraser,
} from "lucide-react";
import type { ComposerEditorHandle } from "./ComposerRichTextEditor";

// Shared external toolbar -- one instance mounted per side panel, driven by
// whichever ComposerRichTextEditor last reported focus (activeEditorHandle
// in ComposeStep). Every button calls the handle's own command methods
// directly; there's no blockId/format-string dispatcher to keep in sync
// with a live DOM node anymore (that dispatcher, and the execCommand calls
// inside it, is what the old CustomToolbar did and is gone).
export function ComposerToolbar({
  activeEditor,
  disabled,
}: {
  activeEditor: ComposerEditorHandle | null;
  disabled?: boolean;
}) {
  const isDisabled = disabled || !activeEditor;
  const linkActive = activeEditor?.isLinkActive() ?? false;

  const preventBlur = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLInputElement;
    if (target.tagName === "INPUT" && target.type === "color") return;
    event.preventDefault();
  };

  const btnClass = (active?: boolean) =>
    `flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${
      active ? "border-blue-200 bg-blue-50 text-blue-700" : "border-transparent text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div className={isDisabled ? "opacity-50" : undefined}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-gray-200 bg-white p-2">
          <button type="button" disabled={isDisabled} onMouseDown={preventBlur} onClick={() => activeEditor?.toggleBold()} className={btnClass(activeEditor?.isActive("bold"))} title="Bold">
            <Bold className="h-4 w-4" />
          </button>
          <button type="button" disabled={isDisabled} onMouseDown={preventBlur} onClick={() => activeEditor?.toggleItalic()} className={btnClass(activeEditor?.isActive("italic"))} title="Italic">
            <Italic className="h-4 w-4" />
          </button>
          <button type="button" disabled={isDisabled} onMouseDown={preventBlur} onClick={() => activeEditor?.toggleUnderline()} className={btnClass(activeEditor?.isActive("underline"))} title="Underline">
            <UnderlineIcon className="h-4 w-4" />
          </button>
          <button type="button" disabled={isDisabled} onMouseDown={preventBlur} onClick={() => activeEditor?.toggleStrike()} className={btnClass(activeEditor?.isActive("strike"))} title="Strikethrough">
            <Strikethrough className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white p-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            Text
            <input
              type="color"
              disabled={isDisabled || linkActive}
              onMouseDown={preventBlur}
              onChange={(event) => activeEditor?.setColor(event.target.value)}
              className="h-6 w-8 cursor-pointer rounded border border-gray-200 p-0 disabled:cursor-not-allowed"
              title={linkActive ? "Links are always blue and can't be recolored" : "Text color"}
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            Size
            <select
              disabled={isDisabled || linkActive}
              onChange={(event) => {
                const size = event.target.value;
                if (size === "normal") {
                  activeEditor?.unsetFontSize();
                } else {
                  activeEditor?.setFontSize(size);
                }
              }}
              className="h-6 cursor-pointer rounded border border-gray-200 px-2 text-xs disabled:cursor-not-allowed"
              title={linkActive ? "Cannot change font size inside links" : "Font size"}
            >
              <option value="normal">Normal</option>
              <option value="12px">Small</option>
              <option value="14px">Medium</option>
              <option value="16px">Large</option>
              <option value="18px">X-Large</option>
              <option value="24px">XX-Large</option>
            </select>
          </label>
        </div>

        {/* Requirement #1 */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-gray-200 bg-white p-2">
          <button type="button" disabled={isDisabled} onMouseDown={preventBlur} onClick={() => activeEditor?.setAlign("left")} className={btnClass(activeEditor?.isActive({ textAlign: "left" }))} title="Align left">
            <AlignLeft className="h-4 w-4" />
          </button>
          <button type="button" disabled={isDisabled} onMouseDown={preventBlur} onClick={() => activeEditor?.setAlign("center")} className={btnClass(activeEditor?.isActive({ textAlign: "center" }))} title="Align center">
            <AlignCenter className="h-4 w-4" />
          </button>
          <button type="button" disabled={isDisabled} onMouseDown={preventBlur} onClick={() => activeEditor?.setAlign("right")} className={btnClass(activeEditor?.isActive({ textAlign: "right" }))} title="Align right">
            <AlignRight className="h-4 w-4" />
          </button>
        </div>

        {/* Requirement #2 */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-gray-200 bg-white p-2">
          <button type="button" disabled={isDisabled} onMouseDown={preventBlur} onClick={() => activeEditor?.toggleBulletList()} className={btnClass(activeEditor?.isActive("bulletList"))} title="Bullet list">
            <List className="h-4 w-4" />
          </button>
          <button type="button" disabled={isDisabled} onMouseDown={preventBlur} onClick={() => activeEditor?.toggleOrderedList()} className={btnClass(activeEditor?.isActive("orderedList"))} title="Numbered list">
            <ListOrdered className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-gray-200 bg-white p-2">
          <button
            type="button"
            disabled={isDisabled}
            onMouseDown={preventBlur}
            onClick={() => {
              if (!activeEditor) return;
              if (linkActive) {
                activeEditor.unsetLink();
                return;
              }
              const url = window.prompt("Link URL");
              if (!url) return;
              let absoluteUrl = url.trim();
              if (absoluteUrl && !absoluteUrl.startsWith("http://") && !absoluteUrl.startsWith("https://")) {
                absoluteUrl = `https://${absoluteUrl}`;
              }
              // Requirement #3: no color argument -- LockedColorLink owns
              // the color entirely.
              activeEditor.setLink(absoluteUrl);
            }}
            className={btnClass(linkActive)}
            title={linkActive ? "Remove link" : "Insert link"}
          >
            <LinkIcon className="h-4 w-4" />
          </button>
          <button type="button" disabled={isDisabled} onMouseDown={preventBlur} onClick={() => activeEditor?.clearFormatting()} className={btnClass(false)} title="Clear formatting">
            <Eraser className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}