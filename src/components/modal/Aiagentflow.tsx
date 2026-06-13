import { useState } from "react";
import type { AIAgentForm, AIContentForm, AIScheduleForm } from "../../types/Types";
import { SkyOverlay, ModalCard, Btn } from "../Modalshells";
import { Select, Toggle, DateTimeInput } from "./Formcontrols";
import {
  AI_AGENTS, BUSINESS_TYPES, GOALS, TONES,
  STOP_POST_OPTIONS, FREQUENCY_UNITS, SENDER_NAMES,
} from "../../types/Mockdata";

type AIStep = "config" | "content" | "schedule" | "loading";

interface Props {
  onClose: () => void;
  onDone: (prefilled: { subject: string; body: string }) => void;
}

// ─── Step 1: Agent Config ─────────────────────────────────────────────────────

function AgentConfigStep({
  form, onChange, onBack, onContinue,
}: {
  form: AIAgentForm;
  onChange: (k: keyof AIAgentForm, v: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <ModalCard className="max-w-xl p-8">
      <button onClick={onBack} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
      <h2 className="text-2xl font-bold text-gray-900">Let Ai do the work</h2>
      <p className="text-sm text-gray-500 mt-1 mb-6">Smart Agents that can create an advanced newsletter campaign.</p>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Select your AI Agent</label>
          <Select value={form.agent} onChange={v => onChange("agent", v)} options={AI_AGENTS} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Sender Name</label>
          <Select value={form.senderName} onChange={v => onChange("senderName", v)} options={SENDER_NAMES} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Business Type</label>
          <Select value={form.businessType} onChange={v => onChange("businessType", v)} options={BUSINESS_TYPES} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Goals</label>
          <Select value={form.goals} onChange={v => onChange("goals", v)} options={GOALS} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Tone</label>
          <Select value={form.tone} onChange={v => onChange("tone", v)} options={TONES} />
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <Btn variant="outline" onClick={onBack}><span>✕</span> Back</Btn>
        <Btn onClick={onContinue} disabled={!form.agent || !form.senderName}>Continue <span>→</span></Btn>
      </div>
    </ModalCard>
  );
}

// ─── Step 2: Content ──────────────────────────────────────────────────────────

function ContentStep({
  form, onChange, onBack, onContinue,
}: {
  form: AIContentForm;
  onChange: <K extends keyof AIContentForm>(k: K, v: AIContentForm[K]) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const LIMIT = 8;

  const addHeadline = () => {
    if (!form.currentHeadline.trim() || form.headlines.length >= LIMIT) return;
    onChange("headlines", [...form.headlines, form.currentHeadline.trim()]);
    onChange("currentHeadline", "");
  };

  const removeHeadline = (i: number) => {
    onChange("headlines", form.headlines.filter((_:any, idx:any) => idx !== i));
  };

  return (
    <ModalCard className="max-w-xl p-8">
      <button onClick={onBack} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
      <h2 className="text-2xl font-bold text-gray-900">Let Ai do the work</h2>
      <p className="text-sm text-gray-500 mt-1 mb-6">Smart Agents that can create an advanced newsletter campaign.</p>

      <div className="space-y-5">
        {/* Headline input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-800">+Add Headline</label>
            <button
              onClick={addHeadline}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              +Add New
            </button>
          </div>
          <input
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Exciting News: Unlock Exclusive Benefits Today!"
            value={form.currentHeadline}
            onChange={e => onChange("currentHeadline", e.target.value)}
            onKeyDown={e => e.key === "Enter" && addHeadline()}
          />
        </div>

        {/* Added headlines */}
        {form.headlines.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500">Your Headlines</span>
              <span className="text-xs text-gray-400">limit: {LIMIT}</span>
            </div>
            <div className="space-y-2">
              {form.headlines.map((h:any, i:any) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                  <span className="text-sm text-gray-700 flex-1 truncate">{h}</span>
                  <button onClick={() => removeHeadline(i)} className="text-gray-400 hover:text-red-500 ml-2 text-lg leading-none">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Short Description <span className="text-gray-400 font-normal italic">(Optional)</span>
          </label>
          <textarea
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="compose write an energetic, motivational email letter for my fitness brand"
            value={form.description}
            onChange={e => onChange("description", e.target.value)}
          />
        </div>

        {/* Product link */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            + Add Product Link <span className="text-gray-400 font-normal">Optional</span>
          </label>
          <input
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/product"
            value={form.productLink}
            onChange={e => onChange("productLink", e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <Btn variant="outline" onClick={onBack}><span>✕</span> Back</Btn>
        <Btn onClick={onContinue}>Continue <span>→</span></Btn>
      </div>
    </ModalCard>
  );
}

// ─── Step 3: Schedule ─────────────────────────────────────────────────────────

function ScheduleStep({
  form, onChange, onBack, onGenerate,
}: {
  form: AIScheduleForm;
  onChange: <K extends keyof AIScheduleForm>(k: K, v: AIScheduleForm[K]) => void;
  onBack: () => void;
  onGenerate: () => void;
}) {
  return (
    <ModalCard className="max-w-xl p-8">
      <button onClick={onBack} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
      <h2 className="text-2xl font-bold text-gray-900">Let Ai do the work</h2>
      <p className="text-sm text-gray-500 mt-1 mb-6">Smart Agents that can create an advanced newsletter campaign.</p>

      <div className="space-y-5">
        <Toggle
          checked={form.campaignFrequency}
          onChange={v => onChange("campaignFrequency", v)}
          label="Campaign frequency"
          description="Set a frequency at which your campaign would run"
        />

        {form.campaignFrequency && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 w-24">Post Every</span>
            <div className="flex gap-2 flex-1">
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 gap-1 w-24">
                <input
                  type="number"
                  min={1}
                  value={form.postEveryAmount}
                  onChange={e => onChange("postEveryAmount", Number(e.target.value))}
                  className="w-12 bg-transparent text-sm text-gray-800 focus:outline-none"
                />
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => onChange("postEveryAmount", form.postEveryAmount + 1)} className="text-gray-400 hover:text-gray-700 text-xs leading-none">▲</button>
                  <button onClick={() => onChange("postEveryAmount", Math.max(1, form.postEveryAmount - 1))} className="text-gray-400 hover:text-gray-700 text-xs leading-none">▼</button>
                </div>
              </div>
              <Select
                value={form.postEveryUnit}
                onChange={v => onChange("postEveryUnit", v)}
                options={FREQUENCY_UNITS}
                className="flex-1"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 w-24">Stop Post</span>
          <Select
            value={form.stopPost}
            onChange={v => onChange("stopPost", v)}
            options={STOP_POST_OPTIONS}
            className="flex-1"
          />
        </div>

        <Toggle
          checked={form.regenerateSubject}
          onChange={v => onChange("regenerateSubject", v)}
          label="Regenerate New Subject Headline"
        />
        <Toggle
          checked={form.regenerateBody}
          onChange={v => onChange("regenerateBody", v)}
          label="Regenerate New Email Body"
        />

        <DateTimeInput
          label="Start Date:"
          date={form.startDate}
          time={form.startTime}
          onDateChange={v => onChange("startDate", v)}
          onTimeChange={v => onChange("startTime", v)}
        />
        <DateTimeInput
          label="Stop Date"
          date={form.stopDate}
          time={form.stopTime}
          onDateChange={v => onChange("stopDate", v)}
          onTimeChange={v => onChange("stopTime", v)}
        />
      </div>

      <div className="flex gap-3 mt-8">
        <Btn variant="outline" onClick={onBack}><span>✕</span> Back</Btn>
        <Btn onClick={onGenerate}>Generate <span>→</span></Btn>
      </div>
    </ModalCard>
  );
}

// ─── Loading Screen ───────────────────────────────────────────────────────────

function LoadingStep() {
  return (
    <ModalCard className="max-w-xl p-8 min-h-80 flex flex-col items-center justify-center">
      <button className="absolute top-4 right-4 text-gray-400 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
      <h2 className="text-2xl font-bold text-gray-900 self-start mb-1">Let Ai do the work</h2>
      <p className="text-sm text-gray-500 self-start mb-12">Smart Agents that can create an advanced newsletter campaign.</p>
      <div className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 relative">
          <div className="absolute inset-0 rounded-2xl bg-blue-100 flex items-center justify-center">
            <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
              <rect x="6" y="8" width="28" height="24" rx="4" stroke="#2563eb" strokeWidth="2"/>
              <path d="M13 16h14M13 20h10" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"/>
              <path d="M28 26l4-4-4-4" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full animate-bounce" />
        </div>
        <p className="text-sm text-gray-600 font-medium">A little patience and we are done!</p>
        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </ModalCard>
  );
}

// ─── Root AI Flow ─────────────────────────────────────────────────────────────

export function AIAgentFlow({ onClose, onDone }: Props) {
  const [step, setStep] = useState<AIStep>("config");
  const [agentForm, setAgentForm] = useState<AIAgentForm>({
    agent: "Spam-Check Agent",
    senderName: "Mandem tooneet",
    businessType: "E-commerce / Online Store",
    goals: "Spam-Check Agent",
    tone: "Energetic",
  });
  const [contentForm, setContentForm] = useState<AIContentForm>({
    headlines: [],
    currentHeadline: "",
    description: "",
    productLink: "",
  });
  const [scheduleForm, setScheduleForm] = useState<AIScheduleForm>({
    campaignFrequency: true,
    postEveryAmount: 1,
    postEveryUnit: "Hour",
    stopPost: "After 4 campaigns",
    regenerateSubject: true,
    regenerateBody: true,
    startDate: "2025-10-09",
    startTime: "06:56",
    stopDate: "2025-12-09",
    stopTime: "06:56",
  });

  const handleGenerate = () => {
    setStep("loading");
    setTimeout(() => {
      onDone({
        subject: "Exciting News: Unlock Exclusive Benefits Today!",
        body: `<h2>🤌 My Summer Slash Design Package Is Here And You're Invited To Join!</h2><ul><li>Research: You can use the right-side search to find stuff, highlight it, and then paste it here.</li><li>Write Assist: Use the keyboard shortcuts Ctrl + Space (Windows) or Ctrl + Shift + Spacebar to get content suggestions when right-clicking (Mac).</li><li>To paraphrase a passage of text, highlight it and use the right-click menu.</li></ul><p><a href="#">Click here To Learn More</a></p>`,
      });
    }, 2500);
  };

  return (
    <SkyOverlay>
      {step === "config" && (
        <AgentConfigStep
          form={agentForm}
          onChange={(k, v) => setAgentForm((f: AIAgentForm) => ({ ...f, [k]: v }))}
          onBack={onClose}
          onContinue={() => setStep("content")}
        />
      )}
      {step === "content" && (
        <ContentStep
          form={contentForm}
          onChange={(k, v) => setContentForm((f: AIContentForm) => ({ ...f, [k]: v }))}
          onBack={() => setStep("config")}
          onContinue={() => setStep("schedule")}
        />
      )}
      {step === "schedule" && (
        <ScheduleStep
          form={scheduleForm}
          onChange={(k, v) => setScheduleForm((f: AIScheduleForm) => ({ ...f, [k]: v }))}
          onBack={() => setStep("content")}
          onGenerate={handleGenerate}
        />
      )}
      {step === "loading" && <LoadingStep />}
    </SkyOverlay>
  );
}