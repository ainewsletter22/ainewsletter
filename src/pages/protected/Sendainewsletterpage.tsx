import { useState } from "react";
import type { Newsletter, SendMethod } from "../../types/Types";
import { NewslettersTab } from "./Newsletterstab";
import { TemplatesTab } from "./Templatestab";
import { DraftsTab } from "./Draftstab";
import { SendMethodModal } from "../../components/modal/Sendmethodmodal";
import { AIAgentFlow } from "../../components/modal/Aiagentflow";
import { EmailComposerModal } from "../../components/modal/Emailcomposermodal";
import { ViewReportModal } from "../../components/modal/Viewreportmodal";
import { EmailPreviewModal } from "../../components/modal/Emailpreviewmodal";
import DashboardHeader from "../../components/Dashboardheader";

// ─── Active modal union ───────────────────────────────────────────────────────
type ActiveModal =
  | { type: "none" }  
  | { type: "send_method" }
  | { type: "ai_flow" }
  | { type: "composer"; prefilled?: { subject?: string; body?: string } }
  | { type: "report"; newsletter: Newsletter }
  | { type: "preview"; newsletter: Newsletter };

type Tab = "newsletters" | "templates" | "drafts";

// ─── Hero Banner ──────────────────────────────────────────────────────────────
function HeroBanner({ onCreateNewsletter }: { onCreateNewsletter: () => void }) {
  return (
    <div
      className="rounded-2xl mx-0 mb-6 px-8 py-12 text-center"
      style={{
        background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #1d4ed8 100%)",
      }}
    >
      <h1 className="text-3xl font-bold text-white mb-2 leading-tight">
        Easily Send A.I Email Newsletters<br />
        To Your Leads Without Any Hassle.
      </h1>
      <button
        onClick={onCreateNewsletter}
        className="mt-6 inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold px-7 py-3 rounded-xl transition-colors shadow-lg"
      >
        + Create A.I Newsletter
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SendAINewsletterPage() {
  const [activeTab, setActiveTab] = useState<Tab>("newsletters");
  const [modal, setModal] = useState<ActiveModal>({ type: "none" });

  const closeModal = () => setModal({ type: "none" });

  const handleCreateNewsletter = () => setModal({ type: "send_method" });

  const handleMethodSelected = (method: SendMethod) => {
    if (method === "ai") {
      setModal({ type: "ai_flow" });
    } else if (method === "scratch") {
      setModal({ type: "composer" });
    } else {
      // Easy templates → switch to templates tab
      closeModal();
      setActiveTab("templates");
    }
  };

  const handleAIDone = (prefilled: { subject: string; body: string }) => {
    setModal({ type: "composer", prefilled });
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "newsletters", label: "Newsletters" },
    { id: "templates", label: "Templates" },
    { id: "drafts", label: "Drafts" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Hero */}
        <HeroBanner onCreateNewsletter={handleCreateNewsletter} />

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex gap-6">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-semibold transition-colors relative ${
                  activeTab === tab.id
                    ? "text-blue-600 border-b-2 border-blue-600 -mb-px"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === "newsletters" && (
          <NewslettersTab
            onSendNew={() => setModal({ type: "send_method" })}
            onViewReport={(n: any) => setModal({ type: "report", newsletter: n })}
            onPreview={(n: any) => setModal({ type: "preview", newsletter: n })}
          />
        )}
        {activeTab === "templates" && (
          <TemplatesTab
            onSelectTemplate={() => setModal({ type: "composer" })}
            onCreateBlank={() => setModal({ type: "composer" })}
          />
        )}
        {activeTab === "drafts" && (
          <DraftsTab
            onSelectDraft={() => setModal({ type: "composer" })}
          />
        )}
      </div>

      {/* ── Modals ── */}

      {modal.type === "send_method" && (
        <SendMethodModal
          onClose={closeModal}
          onContinue={handleMethodSelected}
        />
      )}

      {modal.type === "ai_flow" && (
        <AIAgentFlow
          onClose={closeModal}
          onDone={handleAIDone}
        />
      )}

      {modal.type === "composer" && (
        <EmailComposerModal
          onClose={closeModal}
          prefilled={modal.type === "composer" ? modal.prefilled : undefined}
        />
      )}

      {modal.type === "report" && (
        <ViewReportModal
          subject={modal.newsletter.title}
          onClose={closeModal}
        />
      )}
 
      {modal.type === "preview" && (
        <EmailPreviewModal onClose={closeModal} />
      )}
    </div>
  );
}