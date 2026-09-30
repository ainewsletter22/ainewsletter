import { forwardRef, useEffect, useImperativeHandle } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { LockedColorLink, ResizableLinkableImage, FontSize } from "./extensions";

// The single editor engine for every editable region in the composer --
// fixed-template headline/body/footer blocks AND the blank template's body.
// One TipTap instance per region; ComposerToolbar drives whichever instance
// is currently focused via the handle this component exposes. Replaces both
// the old Quill wrapper and the old contentEditable + document.execCommand
// engine (that combination -- live DOM as source of truth, but re-synced
// against React state via refs/effects on every render -- was the actual
// cause of the "typed content deleted on highlight" bug).
export type ComposerEditorHandle = {
  editor: Editor | null;
  focus: () => void;
  getHtml: () => string;
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleUnderline: () => void;
  toggleStrike: () => void;
  setAlign: (align: "left" | "center" | "right") => void;
  toggleBulletList: () => void;
  toggleOrderedList: () => void;
  setColor: (color: string) => void;
  setFontSize: (size: string) => void;
  unsetFontSize: () => void;
  setLink: (url: string) => void;
  unsetLink: () => void;
  clearFormatting: () => void;
isActive: (nameOrAttrs: string | Record<string, unknown>, attrs?: Record<string, unknown>) => boolean;
  isLinkActive: () => boolean;
  insertImage: (url: string) => void;
  replaceImageSrc: (oldSrc: string, newSrc: string) => void;
  updateImageStyle: (src: string, updates: { width?: number; height?: number | null; offsetX?: number; href?: string | null }) => void;
  getSelectionRange: () => { from: number; to: number } | null;
  replaceRange: (from: number, to: number, text: string) => void;
};

interface ComposerRichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  // Only the blank template body needs the image node registered -- the 5
  // fixed templates' image *slots* are handled entirely outside the text
  // document (they're separate TemplateLayoutBlock entries, not inline
  // content), so keeping the Image extension out of their editors avoids
  // giving those instances a schema capability they never use.
  enableImages?: boolean;
  onFocus?: () => void;
  onSelectionChange?: (selectedText: string) => void;
}

function findImagePos(editor: Editor, src: string): number | null {
  let targetPos: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (targetPos !== null) return false;
    if (node.type.name === "image" && node.attrs.src === src) {
      targetPos = pos;
      return false;
    }
    return true;
  });
  return targetPos;
}

export const ComposerRichTextEditor = forwardRef<ComposerEditorHandle, ComposerRichTextEditorProps>(
  ({ content, onChange, placeholder, className, enableImages, onFocus, onSelectionChange }, ref) => {
    const editor = useEditor({
      immediatelyRender: false,
      editable: true,
      extensions: [
        StarterKit.configure({
          // Exclude link since we're adding custom LockedColorLink
          link: false,
          underline: false,
        }),
        Underline,
        FontSize,
        Color,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        Placeholder.configure({ placeholder: placeholder || "" }),
        LockedColorLink.configure({ openOnClick: false, autolink: false }),
        ...(enableImages ? [ResizableLinkableImage.configure({ inline: false })] : []),
      ],
      content,
      onUpdate: ({ editor: current }) => {
        onChange(current.getHTML());
      },
      onSelectionUpdate: ({ editor: current }) => {
        const { from, to } = current.state.selection;
        onSelectionChange?.(from === to ? "" : current.state.doc.textBetween(from, to, " "));
      },
      onFocus: () => {
        onFocus?.();
      },
      editorProps: {
        attributes: {
          class: `${className || ""} [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1`.trim(),
        },
      },
    });

    // Push external `content` (AI results landing, template switches, the
    // blank body being programmatically reset) into the doc -- but only
    // when it actually differs from what's already there. Every keystroke
    // already round-trips content -> onChange -> parent state -> back down
    // as this same `content` prop, so this MUST be a no-op in that case or
    // it would fight the user mid-type exactly like the old bug.
    // in the useImperativeHandle implementation:


        useEffect(() => {
        if (!editor || !editor.isEditable || !editor.view || !editor.schema) return;
            if (content !== undefined && content !== editor.getHTML()) {
                editor.commands.setContent(content || "", { emitUpdate: false });
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [content, editor]);

    useEffect(() => () => editor?.destroy(), [editor]);

    useImperativeHandle(
      ref,
      () => ({
        editor: editor ?? null,
        focus: () => editor?.chain().focus().run(),
        getHtml: () => {
          if (!editor || !editor.isEditable) return "";
          try {
            return editor.getHTML() || "";
          } catch (error) {
            console.error("Failed to get HTML from editor:", error);
            return "";
          }
        },
        toggleBold: () => editor?.chain().focus().toggleBold().run(),
        toggleItalic: () => editor?.chain().focus().toggleItalic().run(),
        toggleUnderline: () => editor?.chain().focus().toggleUnderline().run(),
        toggleStrike: () => editor?.chain().focus().toggleStrike().run(),
        setAlign: (align) => editor?.chain().focus().setTextAlign(align).run(),
        toggleBulletList: () => editor?.chain().focus().toggleBulletList().run(),
        toggleOrderedList: () => editor?.chain().focus().toggleOrderedList().run(),
        setColor: (color) => {
          // Requirement #3: locked while inside a link -- no path to override.
          if (!editor || editor.isActive("link")) return;
          editor.chain().focus().setColor(color).run();
        },
        setFontSize: (size) => {
          if (!editor || editor.isActive("link")) return;
          editor.chain().focus().setMark("textStyle", { fontSize: size }).run();
        },
        unsetFontSize: () => {
          editor?.chain().focus().setMark("textStyle", { fontSize: null }).run();
        },
          setLink: (url) => {
            if (!editor || !url) return;
            editor.chain().focus().extendMarkRange("link").unsetMark("textStyle").setLink({ href: url }).run();
          },
        unsetLink: () => editor?.chain().focus().unsetLink().run(),
        clearFormatting: () => editor?.chain().focus().clearNodes().unsetAllMarks().run(),
        isActive: (name, attrs) => editor?.isActive(name as any, attrs as any) || false,
        isLinkActive: () => editor?.isActive("link") || false,
        insertImage: (url) => {
          editor?.chain().focus().setImage({ src: url } as any).run();
        },
        replaceImageSrc: (oldSrc, newSrc) => {
          if (!editor) return;
          const pos = findImagePos(editor, oldSrc);
          if (pos === null) return;
          editor.chain().setNodeSelection(pos).updateAttributes("image", { src: newSrc }).run();
        },
        updateImageStyle: (src, updates) => {
          if (!editor) return;
          const pos = findImagePos(editor, src);
          if (pos === null) return;
          const attrs: Record<string, unknown> = {};
          if (typeof updates.width === "number") attrs.width = `${updates.width}%`;
          if (typeof updates.height === "number") attrs.height = `${updates.height}px`;
          else if (updates.height === null) attrs.height = null;
          // % of the image's own rendered width, not px -- see extensions.ts.
          if (typeof updates.offsetX === "number") attrs.offsetX = updates.offsetX;
          if (updates.href !== undefined) attrs.href = updates.href || null;
          editor.chain().setNodeSelection(pos).updateAttributes("image", attrs).run();
        },
        getSelectionRange: () => {
          if (!editor) return null;
          const { from, to } = editor.state.selection;
          return from === to ? null : { from, to };
        },
        replaceRange: (from, to, text) => {
          editor?.chain().focus().insertContentAt({ from, to }, text).run();
        },
      }),
      [editor]
    );

    return <EditorContent editor={editor} />;
  }
);

ComposerRichTextEditor.displayName = "ComposerRichTextEditor";