import { useCallback, useRef, useState } from "react";
import type { ComposerEditorHandle } from "./ComposerRichTextEditor";

// Requirement #6: highlight text anywhere in the composer -> it flows into
// the AI Writer prompt -> "Approve" writes the rewrite back into exactly
// where it was highlighted, on whichever editor instance it came from.
//
// This replaces the old approach of reading window.getSelection() against a
// raw DOM node at write-back time (fragile -- the selection could easily be
// gone by the time "Approve" was clicked, e.g. after focusing the AI Writer
// input). Instead we capture TipTap's own {from, to} document position range
// the moment the highlight happens, plus a reference to which editor
// instance owns it, and use that position range directly at write-back time
// via replaceRange -- no live browser selection required.
type CapturedSelection = {
  handle: ComposerEditorHandle;
  range: { from: number; to: number };
  text: string;
};

export function useAiWriterBridge() {
  const capturedRef = useRef<CapturedSelection | null>(null);
  const [highlightedText, setHighlightedText] = useState<string>("");

  const captureSelection = useCallback((handle: ComposerEditorHandle, selectedText: string) => {
    const range = handle.getSelectionRange();
    if (!range || !selectedText.trim()) return;
    capturedRef.current = { handle, range, text: selectedText };
    setHighlightedText(selectedText);
  }, []);

  const clearSelection = useCallback(() => {
    capturedRef.current = null;
    setHighlightedText("");
  }, []);

  // Returns false if the originally-highlighted range is no longer valid
  // (e.g. the user edited the document elsewhere in between) -- caller
  // should fall back to "copy this instead" in that case.
  const approveReplacement = useCallback(
    (newText: string): boolean => {
      const captured = capturedRef.current;
      if (!captured) return false;

      const { handle, range } = captured;
      const editor = handle.editor;
      if (!editor) return false;

      const docSize = editor.state.doc.content.size;
      if (range.from < 0 || range.to > docSize || range.from > range.to) {
        clearSelection();
        return false;
      }

      handle.replaceRange(range.from, range.to, newText);
      clearSelection();
      return true;
    },
    [clearSelection]
  );

  return { highlightedText, captureSelection, approveReplacement, clearSelection };
}