import { useEffect, useState } from "react";
import type { AIAgentForm, AIContentForm, AIScheduleForm } from "../../types/Types";
import { SkyOverlay, ModalCard, Btn } from "../Modalshells";
import { Select, Toggle, DateTimeInput } from "./Formcontrols";
import { lookupService } from "../../services/lookupService";
import { brandService } from "../../services/brandService";
import { aiWriterService, type AiWriterGeneratePayload } from "../../services/aiWriterService";
import { headlineService } from "../../services/headlineService";
import { draftService } from "../../services/draftService";
import { useParams } from "react-router-dom";
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

type AIStep = "config" | "content" | "schedule" | "loading";

interface Props {
  onClose: () => void;
  onDone: (prefilled: { subject: string; body: string; preview?: string; aiResult?: Record<string, unknown>; draftId?: number }) => void;
  brandId?: number;
  domainId?: number;
}

// ─── Step 1: Agent Config ─────────────────────────────────────────────────────

function AgentConfigStep({
  form, onChange, onBack, onContinue, options,
}: {
  form: AIAgentForm;
  onChange: (k: keyof AIAgentForm, v: string | number) => void;
  onBack: () => void;
  onContinue: () => void;
  options: {
    agentOptions: { id: number; name: string }[];
    businessTypeOptions: { id: number; name: string }[];
    goalOptions: { id: number; name: string }[];
    toneOptions: { id: number; name: string }[];
  };
}) {
  return (
    <ModalCard className="max-w-xl p-8">
      <button onClick={onBack} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
      <h2 className="text-2xl font-bold text-gray-900">Let Ai do the work</h2>
      <p className="text-sm text-gray-500 mt-1 mb-6">Smart Agents that can create an advanced newsletter campaign.</p>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Select your AI Agent</label>
          <Select 
            value={form.agent} 
            onChange={v => {
              const selectedOption = options.agentOptions.find(opt => opt.name === v);
              onChange("agent", v);
              onChange("agentId", selectedOption?.id || 0);
            }} 
            options={options.agentOptions.map(option => option.name)} 
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Sender Name</label>
          <input
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.senderName}
            onChange={e => onChange("senderName", e.target.value)}
            placeholder="Enter sender name"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Business Type</label>
          <Select 
            value={form.businessType} 
            onChange={v => {
              const selectedOption = options.businessTypeOptions.find(opt => opt.name === v);
              onChange("businessType", v);
              onChange("businessTypeId", selectedOption?.id || 0);
            }} 
            options={options.businessTypeOptions.map(option => option.name)} 
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Goals</label>
          <Select 
            value={form.goals} 
            onChange={v => {
              const selectedOption = options.goalOptions.find(opt => opt.name === v);
              onChange("goals", v);
              onChange("goalId", selectedOption?.id || 0);
            }} 
            options={options.goalOptions.map(option => option.name)} 
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Tone</label>
          <Select 
            value={form.tone} 
            onChange={v => {
              const selectedOption = options.toneOptions.find(opt => opt.name === v);
              onChange("tone", v);
              onChange("toneId", selectedOption?.id || 0);
            }} 
            options={options.toneOptions.map(option => option.name)} 
          />
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
  form, onChange, onBack, onContinue, brandId,
}: {
  form: AIContentForm;
  onChange: <K extends keyof AIContentForm>(k: K, v: AIContentForm[K]) => void;
  onBack: () => void;
  onContinue: () => void;
  brandId?: number;
}) {
  const LIMIT = 8;
  const [editingHeadlineId, setEditingHeadlineId] = useState<number | null>(null);
  const [editingHeadlineName, setEditingHeadlineName] = useState("");

  const addHeadline = async (draftId?: number) => {
    const trimmed = form.currentHeadline.trim();
    if (!trimmed || form.headlines.length >= LIMIT) return;
    
    // In AI flow, we don't create headlines until the draft is generated
    // Just add to the form state temporarily
    onChange("headlines", [...form.headlines, { id: undefined, name: trimmed, brandId: brandId, draft_id: draftId, status: 1 }] as any);
    onChange("currentHeadline", "");
  };

  const removeHeadline = async (headline: { id?: number; name: string; brandId?: number; draft_id?: number; status?: number }) => {
    // In AI flow, just remove from form state
    // Headlines are only created when draft is generated
    onChange("headlines", form.headlines.filter(item => item.name !== headline.name));
  };

  const startEditingHeadline = (headline: { id?: number; name: string; brandId?: number; draft_id?: number; status?: number }) => {
    setEditingHeadlineId(headline.id ?? null);
    setEditingHeadlineName(headline.name);
  };

  const saveEditedHeadline = async () => {
    if (!editingHeadlineName.trim()) return;
    // In AI flow, just update form state
    onChange("headlines", form.headlines.map(item => (item.id === editingHeadlineId ? { ...item, name: editingHeadlineName.trim() } : item)));
    setEditingHeadlineId(null);
    setEditingHeadlineName("");
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
              onClick={() => addHeadline()}
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
              {form.headlines.map((headline, index) => (
                <div key={headline.id ?? index} className="flex flex-col gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 flex-1 truncate">{headline.name}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEditingHeadline(headline)} className="text-xs text-blue-600 hover:text-blue-700">Edit</button>
                      <button onClick={() => removeHeadline(headline)} className="text-gray-400 hover:text-red-500 ml-2 text-lg leading-none">✕</button>
                    </div>
                  </div>
                  {editingHeadlineId === headline.id && (
                    <div className="flex items-center gap-2">
                      <input
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editingHeadlineName}
                        onChange={e => setEditingHeadlineName(e.target.value)}
                      />
                      <button onClick={saveEditedHeadline} className="text-xs font-semibold text-white bg-blue-600 rounded-lg px-3 py-2">Save</button>
                    </div>
                  )}
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

// Helper function to validate schedule feasibility
function validateSchedule(form: AIScheduleForm): { isValid: boolean; error: string | null } {
  if (!form.startDate || !form.startTime || !form.stopDate || !form.stopTime) {
    return { isValid: false, error: "Please fill in all date and time fields" };
  }

  // Parse stop post to get number of campaigns
  const stopPostLower = form.stopPost.toLowerCase();
  let campaignCount = 1;
  if (stopPostLower.includes("never")) {
    campaignCount = 999; // Effectively unlimited
  } else {
    // Extract number from string (e.g., "After 14 campaigns" -> 14)
    const numberMatch = stopPostLower.match(/\d+/);
    if (numberMatch) {
      campaignCount = Number(numberMatch[0]);
    }
  }

  // If campaign frequency is enabled, calculate required time
  if (form.campaignFrequency) {
    const intervalAmount = form.postEveryAmount || 1;
    const intervalUnit = form.postEveryUnit?.toLowerCase() || "hour";

    // Convert interval to hours
    let intervalHours = intervalAmount;
    if (intervalUnit.includes("day")) intervalHours = intervalAmount * 24;
    else if (intervalUnit.includes("month")) intervalHours = intervalAmount * 24 * 30;
    else if (intervalUnit.includes("year")) intervalHours = intervalAmount * 24 * 365;

    // Calculate required time (campaigns - 1) * interval
    const requiredHours = (campaignCount - 1) * intervalHours;

    // Calculate available time between start and stop
    const start = new Date(`${form.startDate}T${form.startTime}`);
    const stop = new Date(`${form.stopDate}T${form.stopTime}`);
    const availableHours = (stop.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (availableHours < requiredHours) {
      const requiredDays = (requiredHours / 24).toFixed(1);
      const availableDays = (availableHours / 24).toFixed(1);
      return {
        isValid: false,
        error: `Impossible schedule: sending ${campaignCount} emails at ${intervalAmount} ${intervalUnit}(s) interval requires at least ${requiredDays} day(s) between start and stop date, but only ${availableDays} day(s) were provided. Either widen the date range, reduce the campaign count, or shorten the interval.`
      };
    }
  }

  // Validate that stop date is after start date
  const start = new Date(`${form.startDate}T${form.startTime}`);
  const stop = new Date(`${form.stopDate}T${form.stopTime}`);
  if (stop <= start) {
    return { isValid: false, error: "Stop date must be after start date" };
  }

  return { isValid: true, error: null };
}

function ScheduleStep({
  form, onChange, onBack, onGenerate, errorMessage, postEveries, stopPostAfters, durations,
}: {
  form: AIScheduleForm;
  onChange: <K extends keyof AIScheduleForm>(k: K, v: AIScheduleForm[K]) => void;
  onBack: () => void;
  onGenerate: () => void;
  errorMessage: string | null;
  postEveries?: { id: number; name: string; number?: number }[];
  stopPostAfters?: { id: number; name: string }[];
  durations?: { id: number; name: string }[];
}) {
  const scheduleValidation = validateSchedule(form);
  return (
    <ModalCard className="max-w-xl p-8">
      <button onClick={onBack} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
      <h2 className="text-2xl font-bold text-gray-900">Let Ai do the work</h2>
      <p className="text-sm text-gray-500 mt-1 mb-6">Smart Agents that can create an advanced newsletter campaign.</p>

      <div className="space-y-5">
        {(errorMessage || !scheduleValidation.isValid) && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage || scheduleValidation.error}
          </div>
        )}
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
              <Select
                value={String(form.postEveryAmount || 2)}
                onChange={v => {
                  const amount = Number(v);
                  const match = (postEveries || []).find(i => Number((i as any).number ?? i.name) === amount);
                  onChange("postEveryAmount", amount);
                  onChange("postEveryId", match?.id as any);
                }}
                options={(postEveries && postEveries.length > 0)
                  ? postEveries.map(o => String((o as any).number ?? o.name ?? "")).filter(v => v !== "1")
                  : [ "2", "3", "4", "5", "6", "7", "8", "9", "10"]}
                className="flex-1"
              />
              <Select
                value={form.postEveryUnit || (durations && durations.length > 0 ? durations[0].name : "Hour")}
                onChange={v => {
                  const match = (durations || []).find(i => i.name.toLowerCase() === v.toLowerCase());
                  onChange("postEveryUnit", v);
                  onChange("durationId", match?.id as any);
                }}
                options={(durations && durations.length > 0) ? durations.map(o => o.name) : ["Hour", "Day", "Month", "Yearly"]}
                className="flex-1"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 w-24">Stop Post</span>
          <Select
            value={form.stopPost}
            onChange={v => {
              const match = (stopPostAfters || []).find(i => i.name === v);
              onChange("stopPost", v);
              onChange("stopPostId", match?.id as any);
            }}
            options={(stopPostAfters && stopPostAfters.length > 0) ? stopPostAfters.map(o => o.name) : ["After 1 campaign", "After 2 campaigns", "After 4 campaigns", "After 10 campaigns", "Never"]}
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
        <Btn
          onClick={onGenerate}
          disabled={!form.startDate || !form.startTime || !form.stopDate || !form.stopTime || !scheduleValidation.isValid}
          className={!form.startDate || !form.startTime || !form.stopDate || !form.stopTime || !scheduleValidation.isValid ? "opacity-50 cursor-not-allowed" : ""}
        >
          Generate <span>→</span>
        </Btn>
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

export function AIAgentFlow({ onClose, onDone, brandId: propBrandId, domainId: propDomainId }: Props) {
  const { brandId: paramBrandId } = useParams();
  const brandId = propBrandId ? Number(propBrandId) : (paramBrandId ? Number(paramBrandId) : undefined);
  const domainId = propDomainId ? Number(propDomainId) : undefined;
  const [step, setStep] = useState<AIStep>("config");

  useEffect(() => {
    if (!brandId) {
      setAgentForm((current) => ({
        ...current,
        senderName: "",
      }));
      return;
    }

    let isMounted = true;

    const loadBrandName = async () => {
      try {
        const brand = await brandService.getBrand(Number(brandId));
        if (!isMounted) return;

        const resolvedBrandName = (
          (brand as { brand_name?: string; name?: string } | undefined)?.brand_name ??
          (brand as { brand_name?: string; name?: string } | undefined)?.name ??
          ""
        ).trim();

        if (resolvedBrandName) {
          setAgentForm((current) => ({
            ...current,
            senderName: current.senderName || resolvedBrandName,
          }));
        }
      } catch (error) {
        console.error("Failed to load brand name for sender field:", error);
      }
    };

    void loadBrandName();

    return () => {
      isMounted = false;
    };
  }, [brandId]);
  const [agentForm, setAgentForm] = useState<AIAgentForm>({
    agent: "",
    agentId: 0,
    senderName: "",
    businessType: "",
    businessTypeId: 0,
    goals: "",
    goalId: 0,
    tone: "",
    toneId: 0,
  });
  const [lookupOptions, setLookupOptions] = useState({
    agentOptions: [] as { id: number; name: string }[],
    businessTypeOptions: [] as { id: number; name: string }[],
    goalOptions: [] as { id: number; name: string }[],
    toneOptions: [] as { id: number; name: string }[],
    postEveries: [] as { id: number; name: string; number?: number }[],
    stopPostAfters: [] as { id: number; name: string }[],
    durations: [] as { id: number; name: string }[],
  });
  const [contentForm, setContentForm] = useState<AIContentForm>({
    headlines: [],
    currentHeadline: "",
    description: "",
    productLink: "",
  });
  const [scheduleForm, setScheduleForm] = useState<AIScheduleForm>({
    campaignFrequency: false,
    postEveryAmount: 2,
    postEveryUnit: "",
    postEveryId: undefined,
    durationId: undefined,
    stopPost: "",
    regenerateSubject: true,
    regenerateBody: true,
    startDate: "",
    startTime: "",
    stopDate: "",
    stopTime: "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  useEffect(() => {
    if (isInitialized && !token) {
      navigate('/signIn', { replace: true });
    }
  }, [isInitialized, token, navigate]);

  useEffect(() => {
    let isMounted = true;

    const loadLookupOptions = async () => {
      try {
          const [agents, businessTypes, goals, tones, postEveries, stopPostAfters, durations] = await Promise.all([
            lookupService.getAIAgents(),
            lookupService.getBusinessTypes(),
            lookupService.getCampaignGoals(),
            lookupService.getAITones(),
            lookupService.getPostEveries(),
            lookupService.getStopPostAfters(),
            lookupService.getDurations(),
          ]);

        if (!isMounted) return;

        const nextOptions = {
          agentOptions: agents,
          businessTypeOptions: businessTypes,
          goalOptions: goals,
          toneOptions: tones,
          postEveries,
          stopPostAfters,
          durations,
        };

        setLookupOptions(nextOptions);

        setAgentForm((current) => ({
          ...current,
          agent: current.agent || nextOptions.agentOptions[0]?.name || "",
          agentId: current.agentId || nextOptions.agentOptions[0]?.id || 0,
          businessType: current.businessType || nextOptions.businessTypeOptions[0]?.name || "",
          businessTypeId: current.businessTypeId || nextOptions.businessTypeOptions[0]?.id || 0,
          goals: current.goals || nextOptions.goalOptions[0]?.name || "",
          goalId: current.goalId || nextOptions.goalOptions[0]?.id || 0,
          tone: current.tone || nextOptions.toneOptions[0]?.name || "",
          toneId: current.toneId || nextOptions.toneOptions[0]?.id || 0,
        }));

        const firstPostEveryValue = nextOptions.postEveries[0]
          ? Number((nextOptions.postEveries[0] as any).number ?? (nextOptions.postEveries[0] as any).name ?? 1)
          : 1;
        const firstDuration = nextOptions.durations[0];

        setScheduleForm((current) => ({
          ...current,
          postEveryAmount: current.postEveryAmount || firstPostEveryValue || 2,
          postEveryId: current.postEveryId ?? nextOptions.postEveries[0]?.id,
          postEveryUnit: current.postEveryUnit || firstDuration?.name || "",
          durationId: current.durationId ?? firstDuration?.id,
          stopPost: current.stopPost || nextOptions.stopPostAfters[0]?.name || "",
          stopPostId: current.stopPostId ?? nextOptions.stopPostAfters[0]?.id,
        }));
      } catch (error) {
        console.error("Failed to load AI agent lookup options:", error);
      }
    };

    void loadLookupOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    // In AI flow, we don't load headlines from backend since brand-based endpoint doesn't exist
    // Headlines are only created when draft is generated
    return () => {};
  }, []);

  const handleGenerate = async () => {
    // Validate schedule before proceeding
    const scheduleValidation = validateSchedule(scheduleForm);
    if (!scheduleValidation.isValid) {
      setErrorMessage(scheduleValidation.error);
      return;
    }

    setStep("loading");
    setErrorMessage(null);
    try {
      const brandIdNumber = brandId ? Number(brandId) : undefined;
      const agentLookup = lookupOptions.agentOptions.find(option => option.name === agentForm.agent);
      const toneLookup = lookupOptions.toneOptions.find(option => option.name === agentForm.tone);
      const businessTypeLookup = lookupOptions.businessTypeOptions.find(option => option.name === agentForm.businessType);
      const goalLookup = lookupOptions.goalOptions.find(option => option.name === agentForm.goals);

      // combine date + time into ISO-like string when time is provided
      const combineDateTime = (date?: string, time?: string) => {
        if (!date) return undefined;
        if (!time) return date; // keep date-only if no time provided
        // date is YYYY-MM-DD, time is HH:MM => produce YYYY-MM-DDTHH:MM:00
        return `${date}T${time}:00`;
      };

      const start_date_combined = combineDateTime(scheduleForm.startDate, scheduleForm.startTime);
      const stop_date_combined = combineDateTime(scheduleForm.stopDate, scheduleForm.stopTime);

      // use selected lookup ids stored in scheduleForm
      const postEveryLookup = lookupOptions.postEveries.find(option => option.id === scheduleForm.postEveryId || Number((option as any).number ?? option.name) === scheduleForm.postEveryAmount);
      const durationLookup = lookupOptions.durations.find(option => option.id === scheduleForm.durationId || option.name.toLowerCase() === scheduleForm.postEveryUnit.toLowerCase());
      const post_every_id = postEveryLookup?.id;
      const duration_id = durationLookup?.id;
      const stop_post_id = scheduleForm.stopPostId;

      // STEP 1: Create a draft first to get draft_id
      if (!brandIdNumber) {
        throw new Error('Brand ID is required');
      }

      const initialDraftPayload = {
        brand_id: brandIdNumber,
        domain_id: domainId,
        from_name: agentForm.senderName,
        ai_agent_id: agentLookup?.id,
        ai_goal: goalLookup?.name || agentForm.goals,
        business_type: businessTypeLookup?.name || agentForm.businessType,
        tone_id: toneLookup?.id,
        post_every_id: post_every_id,
        duration_id: duration_id,
        stop_post_id: stop_post_id,
        start_date: start_date_combined || undefined,
        stop_date: stop_date_combined || undefined,
        html: "<div>AI-generated content will appear here</div>", // Placeholder HTML
        head: "AI Draft",
        preview: "AI-generated draft",
      };

      const createdDraft = await draftService.createDraft(initialDraftPayload);

      // STEP 2: Create headlines using draft-based endpoint
      for (const headline of contentForm.headlines) {
        try {
          await headlineService.createDraftHeadline(createdDraft.id, headline.name);
        } catch (error) {
          console.error('[AIAgentFlow] Failed to create headline for draft:', error);
        }
      }

      // STEP 3: Call AI writer with draft_id
      const headlineName = contentForm.headlines[0]?.name || contentForm.currentHeadline || "Newsletter draft";
      const subject = headlineName;
      const preview = contentForm.description || "Your campaign draft is ready.";
      const productText = contentForm.productLink ? `\n\nProduct link: ${contentForm.productLink}` : "";
      const body = `<h2>${headlineName}</h2><p>${preview}</p>${contentForm.productLink ? `<p><a href="${contentForm.productLink}">Learn more</a></p>` : ""}`;

      const aiPayload: AiWriterGeneratePayload = {
        prompt: `${subject}\n\n${preview}\n\n${contentForm.description}${productText}`,
        brand_id: brandIdNumber,
        ai_agent_id: agentLookup?.id,
        draft_id: createdDraft.id, // Include draft_id
        template_id: 5,
        ai_tone_id: toneLookup?.id,
        campaign_goal_id: goalLookup?.id,
        business_type_id: businessTypeLookup?.id,
      };

      const response = await aiWriterService.generate(aiPayload);

      const resolveGeneratedResultId = (payload: Record<string, unknown> | undefined) => {
        const candidates = [
          payload?.id,
          payload?.result_id,
          payload?.generated_result_id,
          payload?.ai_generated_result_id,
        ];

        for (const candidate of candidates) {
          if (typeof candidate === 'number') return candidate;
          if (typeof candidate === 'string' && candidate.trim()) return Number(candidate);
        }

        return undefined;
      };

      const generatedResultId = resolveGeneratedResultId(response as Record<string, unknown> | undefined);
      let generatedResult: Record<string, unknown> | null = null;

      if (generatedResultId) {
        try {
          generatedResult = await aiWriterService.getGeneratedResult(generatedResultId);
        } catch (resultError) {
          console.error('[AIAgentFlow] failed to load generated result', resultError);
        }
      }

      const resultPayload = (generatedResult ?? response ?? {}) as Record<string, unknown>;
      const nextSubject = typeof resultPayload.headline === 'string' ? resultPayload.headline : (typeof response?.subject === 'string' ? response.subject : subject);
      const nextBody = typeof resultPayload.html_body === 'string' ? resultPayload.html_body : (typeof response?.body === 'string' ? response.body : body);
      const nextPreview = typeof resultPayload.preview === 'string' ? resultPayload.preview : (typeof response?.preview === 'string' ? response.preview : preview);

      // STEP 3: Update the draft with AI-generated content
      const updateDraftPayload = {
        brand_id: brandIdNumber,
        domain_id: domainId,
        html: nextBody,
        head: nextSubject,
        preview: nextPreview,
        from_name: agentForm.senderName,
        ai_agent_id: agentLookup?.id,
        ai_goal: goalLookup?.name || agentForm.goals,
        business_type: businessTypeLookup?.name || agentForm.businessType,
        tone_id: toneLookup?.id,
        post_every_id: post_every_id,
        duration_id: duration_id,
        stop_post_id: stop_post_id,
        start_date: start_date_combined || undefined,
        stop_date: stop_date_combined || undefined,
      };

      await draftService.updateDraft(createdDraft.id, updateDraftPayload);

      onDone({
        subject: nextSubject,
        body: nextBody,
        preview: nextPreview,
        aiResult: {
          ...resultPayload,
          start_date: start_date_combined,
          start_time: scheduleForm.startTime,
        },
        draftId: createdDraft.id,
      });
    } catch (error) {
      console.error('[AIAgentFlow] generate failed', error);
      const message = error instanceof Error ? error.message : 'Unable to generate AI content.';
      setErrorMessage(message);
      setStep('schedule');
      return;
    }
  };

  return (
    <SkyOverlay>
      {step === "config" && (
        <AgentConfigStep
          form={agentForm}
          onChange={(k, v) => setAgentForm((f: AIAgentForm) => ({ ...f, [k]: v }))}
          onBack={onClose}
          onContinue={() => setStep("content")}
          options={lookupOptions}
        />
      )}
      {step === "content" && (
        <ContentStep
          form={contentForm}
          onChange={(k, v) => setContentForm((f: AIContentForm) => ({ ...f, [k]: v }))}
          onBack={() => setStep("config")}
          onContinue={() => setStep("schedule")}
          brandId={brandId ? Number(brandId) : undefined}
        />
      )}
      {step === "schedule" && (
        <ScheduleStep
          form={scheduleForm}
          onChange={(k, v) => setScheduleForm((f: AIScheduleForm) => ({ ...f, [k]: v }))}
          onBack={() => setStep("content")}
          onGenerate={handleGenerate}
          errorMessage={errorMessage}
          postEveries={lookupOptions.postEveries}
          stopPostAfters={lookupOptions.stopPostAfters}
          durations={lookupOptions.durations}
        />
      )}
      {step === "loading" && <LoadingStep />}
    </SkyOverlay>
  );
}