import { useState, useEffect } from "react";
import type { ComposeForm, ConfirmForm } from "../../types/Types";
import "react-quill-new/dist/quill.snow.css";

// ─── Quill dynamic import ─────────────────────────────────────────────────────
// NOTE: Install with: npm install react-quill quill
// Then import at the top of your app: import 'react-quill/dist/quill.snow.css';

type ComposerStep = "compose" | "confirm" | "sent";

interface Props {
  onClose: () => void;
  prefilled?: { subject?: string; body?: string };
}

// ─── Rich Text Editor (Quill wrapper) ────────────────────────────────────────

function RichEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let isMounted = true;
    import("react-quill-new").then(() => {
      if (!isMounted) return;
      // Store for type access — rendered via state
      setMounted(true);
    });
    return () => { isMounted = false; };
  }, []);

  // We render a textarea fallback until Quill loads, then switch
  if (!mounted) {
    return (
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex gap-2 text-gray-400 text-sm">
          <span>H2</span><span>B</span><span>I</span><span>U</span><span>≡</span><span>⚡</span>
        </div>
        <textarea
          className="w-full min-h-72 p-4 text-sm text-gray-800 focus:outline-none resize-none"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Start typing your email content..."
        />
      </div>
    );
  }

  // Dynamically rendered Quill
  return <QuillEditor value={value} onChange={onChange} />;
}

// Separate component so dynamic import works cleanly
function QuillEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [ReactQuill, setReactQuill] = useState<any>(null);

  useEffect(() => {
    import("react-quill-new").then(mod => setReactQuill(() => mod.default));
  }, []);

  const modules = {
    toolbar: [
      [{ header: [2, 3, false] }],
      ["bold", "italic", "underline"],
      [{ color: [] }],
      ["blockquote", "link", "clean"],
      [{ align: [] }],
      [{ list: "bullet" }, { list: "ordered" }],
      [{ indent: "-1" }, { indent: "+1" }],
    ],
  };

  const formats = ["header", "bold", "italic", "underline", "color", "blockquote", "link", "align", "list", "indent"];

  if (!ReactQuill) {
    return (
      <div className="border border-gray-200 rounded-xl min-h-72 flex items-center justify-center text-gray-400 text-sm">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        className="min-h-60"
      />
    </div>
  );
}

// ─── AI Writer Popup ──────────────────────────────────────────────────────────

function AIWriterPopup({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState("A.I Writer");
  const [prompt, setPrompt] = useState("");

  console.log(setMode);

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-140 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 z-10">
      <button onClick={onClose} className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-gray-200 rounded-full text-gray-500 text-xs flex items-center justify-center hover:bg-gray-50">✕</button>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          <span className="text-sm font-medium text-gray-700">{mode}</span>
          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <input
          className="flex-1 text-sm text-gray-700 bg-transparent focus:outline-none placeholder-gray-400"
          placeholder="Enter A Prompt Here"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />
        <button className="text-gray-400 hover:text-blue-600 transition-colors">🎤</button>
        <button className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Compose Step ─────────────────────────────────────────────────────────────

function ComposeStep({
  form, onChange, onNext,
}: {
  form: ComposeForm;
  onChange: <K extends keyof ComposeForm>(k: K, v: ComposeForm[K]) => void;
  onClose: () => void;
  onNext: () => void;
}) {
  const [showAIWriter, setShowAIWriter] = useState(false);

  return (
    <div className="flex flex-col h-full relative">
      {/* Toolbar header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold">J</div>
          <div>
            <span className="text-xs text-gray-500">Name:</span>
            <input
              className="ml-1 text-sm font-medium text-gray-800 bg-transparent focus:outline-none border-b border-transparent focus:border-gray-300"
              value={form.name}
              onChange={e => onChange("name", e.target.value)}
            />
          </div>
          <div className="ml-4">
            <span className="text-xs text-gray-500">From:</span>
            <div className="inline-flex items-center gap-1 ml-1">
              <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs">J</div>
              <input
                className="text-sm text-gray-700 bg-transparent focus:outline-none border-b border-transparent focus:border-gray-300 w-44"
                value={form.from}
                onChange={e => onChange("from", e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="border border-gray-200 text-gray-600 text-sm px-4 py-1.5 rounded-lg hover:bg-gray-50">Preview</button>
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

      {/* To row */}
      <div className="flex items-center px-6 py-3 border-b border-gray-100">
        <span className="text-sm text-gray-500 w-10">To:</span>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">B</div>
          <span className="text-sm font-medium text-gray-700">{form.to || "Balompiê Café"}</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Subject */}
      <div className="flex items-center px-6 py-3 border-b border-gray-100 gap-3">
        <span className="text-sm text-gray-500 w-16">Subject:</span>
        <input
          className="flex-1 text-sm font-medium text-gray-800 focus:outline-none"
          value={form.subject}
          onChange={e => onChange("subject", e.target.value)}
          placeholder="Email subject line"
        />
        <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
          ✨ Rewrite
        </button>
      </div>

      {/* Preview */}
      <div className="flex items-center px-6 py-3 border-b border-gray-100 gap-3">
        <span className="text-sm text-gray-500 w-16">Preview:</span>
        <input
          className="flex-1 text-sm text-gray-600 focus:outline-none"
          value={form.preview}
          onChange={e => onChange("preview", e.target.value)}
          placeholder="Email preview text"
        />
      </div>

      {/* Rich editor */}
      <div className="flex-1 px-6 pt-4 pb-2 overflow-y-auto relative">
        <RichEditor value={form.body} onChange={v => onChange("body", v)} />
        {showAIWriter && <AIWriterPopup onClose={() => setShowAIWriter(false)} />}
      </div>

      {/* Right sidebar tools */}
      <div className="absolute right-0 top-36 flex flex-col gap-2 p-2">
        <button className="flex flex-col items-center gap-1 w-14 p-2 hover:bg-gray-50 rounded-xl group">
          <div className="w-9 h-9 rounded-xl bg-gray-100 group-hover:bg-blue-50 flex items-center justify-center text-gray-500 text-base">📎</div>
          <span className="text-xs text-gray-500">Add File</span>
        </button>
        <button className="flex flex-col items-center gap-1 w-14 p-2 hover:bg-gray-50 rounded-xl group">
          <div className="w-9 h-9 rounded-xl bg-gray-100 group-hover:bg-blue-50 flex items-center justify-center text-gray-500 text-base">🖼️</div>
          <span className="text-xs text-gray-500">Add Image</span>
        </button>
        <button
          onClick={() => setShowAIWriter(v => !v)}
          className="flex flex-col items-center gap-1 w-14 p-2 hover:bg-blue-50 rounded-xl group"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white text-base">✨</div>
          <span className="text-xs text-blue-600 font-medium">A.I Writer</span>
        </button>
      </div>
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

export function EmailComposerModal({ onClose, prefilled }: Props) {
  const [step, setStep] = useState<ComposerStep>("compose");
  const [sent, setSent] = useState(false);

  const [compose, setCompose] = useState<ComposeForm>({
    name: "Jamson rason",
    from: "Jamsonrason01@gmail.com",
    to: "Balompiê Café",
    subject: prefilled?.subject ?? "Website Design Proposal",
    preview: prefilled?.subject ? `${prefilled.subject} — read more inside` : "My Summer Slash Design Package Is Here And You'reInvited To Join!",
    body: prefilled?.body ?? "",
  });

  const [confirm, setConfirm] = useState<ConfirmForm>({
    testEmail: "Jamsonrason01@gmail.com",
    delivery: "later",
    scheduleDate: "2023-05-16",
    scheduleTime: "23:39",
  });

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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
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
            onClose={onClose}
            onNext={() => setStep("confirm")}
          />
        ) : (
          <ConfirmStep
            form={confirm}
            onChange={(k, v) => setConfirm(f => ({ ...f, [k]: v }))}
            onSend={() => setSent(true)}
            sent={sent}
          />
        )}
      </div>
    </div>
  );
}