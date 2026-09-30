import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Brand, Newsletter, SendMethod } from "../../types/Types";
import { NewslettersTab } from "./Newsletterstab";
import { TemplatesTab } from "./Templatestab";
import { DraftsTab, type DraftsTabRef } from "./Draftstab";
import { SendMethodModal } from "../../components/modal/Sendmethodmodal";
import { AIAgentFlow } from "../../components/modal/Aiagentflow";
import { EmailComposerModal } from "../../components/modal/Emailcomposermodal";
import { ViewReportModal } from "../../components/modal/Viewreportmodal";
import { EmailPreviewModal } from "../../components/modal/Emailpreviewmodal";
import DashboardHeader from "../../components/Dashboardheader";
import { brandService } from "../../services/brandService";
import { domainService } from "../../services/domainService";
import { restoreDraftLayout } from "../../utils/Draftlayout";
import { campaignService } from "../../services/campaignService";
import { broadcastService } from "../../services/broadcastService";
import { draftService } from "../../services/draftService";

// ─── Active modal union ───────────────────────────────────────────────────────
type ActiveModal =
  | { type: "none" }
  | { type: "send_method" }
  | { type: "ai_flow" }
  | { type: "composer"; prefilled?: {
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
    draftId?: number;
  }
  | { type: "report"; newsletter: Newsletter }
  | { type: "preview"; newsletter: Newsletter };

type Tab = "newsletters" | "templates" | "drafts";

// ─── Hero Banner ──────────────────────────────────────────────────────────────
function HeroBanner({ onCreateNewsletter, brandName }: { onCreateNewsletter: () => void; brandName?: string }) {
  return (
    <div
      className="rounded-2xl mx-0 mb-6 px-8 py-12 text-center"
      style={{
        background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #1d4ed8 100%)",
      }}
    >
      <h1 className="text-3xl font-bold text-white mb-2 leading-tight">
        {brandName
          ? `Create and manage newsletters for ${brandName}`
          : "Easily Send A.I Email Newsletters\nTo Your Leads Without Any Hassle."}
      </h1>
      <button
        onClick={onCreateNewsletter}
        className="mt-6 inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold px-7 py-3 rounded-xl transition-colors shadow-lg"
      >
         Create A.I Newsletter
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SendAINewsletterPage() {
  const navigate = useNavigate();
  const { brandId } = useParams();
  const [activeTab, setActiveTab] = useState<Tab>("newsletters");
  const [modal, setModal] = useState<ActiveModal>({ type: "none" });
  const [brand, setBrand] = useState<Brand | null>(null);
  const draftsTabRef = useRef<DraftsTabRef>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    const loadBrand = async () => {
      if (!brandId) {
        setBrand(null);
        return;
      }

      try {
        const selectedBrand = await brandService.getBrand(Number(brandId));
        // Normalize the brand to map backend send_via to frontend sendVia
        const normalizedBrand = selectedBrand ? {
          ...selectedBrand,
          sendVia: ((selectedBrand as any).send_via ?? (selectedBrand as any).sends_via ?? selectedBrand.sendsVia) as "campaign" | "broadcast" | undefined,
        } : null;
        setBrand(normalizedBrand ?? null);
        if (normalizedBrand) {
          console.log("Brand sendVia setting:", normalizedBrand.sendVia || normalizedBrand.sendsVia);
        }
      } catch (error) {
        console.error("Failed to load brand for workspace:", error);
        
        // Fallback: Try to load domains separately
        try {
          const allDomains = await domainService.listDomains();
          const brandDomains = allDomains.filter(d => d.brand_id === Number(brandId));
          
          console.log('[SendAINewsletterPage] Fallback loaded domains for brand:', Number(brandId), brandDomains);
          
          // Create a minimal brand object with the loaded domains
          const minimalBrand = {
            id: Number(brandId),
            name: `Brand ${brandId}`,
            fromName: '',
            fromEmail: '',
            replyToEmail: '',
            logo: undefined,
            resendApiKey: undefined,
            dateCreated: new Date().toISOString(),
            totalCampaigns: 0,
            sendsVia: '',
            domains: brandDomains,
            smtp: {
              provider: '',
              providerId: undefined,
              securityId: undefined,
              host: '',
              port: '',
              security: 'SSL' as const,
              username: '',
              password: undefined,
            },
            privacy: {
              trackOpens: 'Yes' as const,
              trackClicks: 'Yes' as const,
              notifyOnCampaign: false,
              notifyEmail: '',
            },
            sendingLimit: {
              limitType: 'Unlimited' as const,
              emailsPerMonth: undefined,
              currentlyUsed: 0,
              resetDay: 1,
            },
            footer: {
              unsubscribeText: '',
              companyName: '',
              address: '',
              cityStateZip: '',
              removeBadge: false,
            },
          };
          setBrand(minimalBrand);
        } catch (domainError) {
          console.error('Fallback domain loading also failed:', domainError);
          setBrand(null);
        }
      }
    };

    void loadBrand();
  }, [brandId]);

  // If brand is set but has no domains, try to load them via fallback
  useEffect(() => {
    if (brand && (!brand.domains || brand.domains.length === 0)) {
      const loadDomainsForBrand = async () => {
        try {
          const allDomains = await domainService.listDomains();
          const brandDomains = allDomains.filter(d => d.brand_id === brand.id);
          
          console.log('[SendAINewsletterPage] Loading domains for brand:', brand.id, brandDomains);
          
          if (brandDomains.length > 0) {
            setBrand(prev => prev ? { ...prev, domains: brandDomains } : null);
          }
        } catch (error) {
          console.error('Failed to load domains for brand:', error);
        }
      };
      loadDomainsForBrand();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand?.id]);

  const closeModal = () => {
    setModal({ type: "none" });
    // Refresh drafts when closing the composer modal to show latest updates
    setTimeout(() => {
      if (draftsTabRef.current) {
        draftsTabRef.current.refresh();
      }
    }, 100);
  };

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

  const handleAIDone = (prefilled: { subject: string; body: string; preview?: string; aiResult?: Record<string, unknown>; draftId?: number }) => {
    setModal({ type: "composer", prefilled, templateId: 5, draftId: prefilled.draftId });
  };

  const handleTemplateSelect = (template: number | { id: number }) => {
    const templateId = typeof template === 'number' ? template : template.id;
    setModal({ type: "composer", templateId: templateId ?? 0 });
  };

  const handlePreview = async (newsletter: Newsletter) => {
    setLoadingPreview(true);
    try {
      let fullNewsletter = { ...newsletter };

      // Fetch full data from backend to get HTML content
      if (newsletter.type === "broadcast") {
        const broadcast = await broadcastService.getBroadcast(newsletter.id);
        fullNewsletter = {
          ...newsletter,
          html: broadcast.html,
          preview: broadcast.preview,
          from_name: broadcast.from_name,
          footer: broadcast.footer,
          address: broadcast.address,
        };
      } else {
        const campaign = await campaignService.getCampaign(newsletter.id);
        fullNewsletter = {
          ...newsletter,
          html: campaign.html,
          preview: campaign.preview,
          from_name: campaign.from_name,
          footer: campaign.footer,
          address: campaign.address,
        };
      }

      setModal({ type: "preview", newsletter: fullNewsletter });
    } catch (error) {
      console.error("Failed to fetch newsletter for preview:", error);
      // Still show the modal with the data we have
      setModal({ type: "preview", newsletter });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDuplicate = async (newsletter: Newsletter) => {
    if (!brand) return;

    try {
      let campaignOrBroadcast: any;

      // Fetch the full campaign or broadcast data
      if (newsletter.type === "broadcast") {
        campaignOrBroadcast = await broadcastService.getBroadcast(newsletter.id);
      } else {
        campaignOrBroadcast = await campaignService.getCampaign(newsletter.id);
      }

      console.log("[SendAINewsletterPage] Campaign/Broadcast data:", campaignOrBroadcast);

      // Create a new draft directly from the campaign/broadcast data
      // This doesn't rely on the original draft existing
      const draftPayload = {
        brand_id: brand.id,
        domain_id: campaignOrBroadcast.domain_id || undefined,
        template_id: campaignOrBroadcast.template_id || undefined,
        from_name: campaignOrBroadcast.from_name || undefined,
        head: campaignOrBroadcast.head || undefined,
        preview: campaignOrBroadcast.preview || undefined,
        template_layout: campaignOrBroadcast.template_layout || undefined,
        sections_content: campaignOrBroadcast.sections_content || undefined,
        removed_sections: campaignOrBroadcast.removed_sections || undefined,
        custom_images: campaignOrBroadcast.custom_images || undefined,
        attachments: campaignOrBroadcast.attachments || undefined,
        html: campaignOrBroadcast.html,
        footer: campaignOrBroadcast.footer || undefined,
        address: campaignOrBroadcast.address || undefined,
        ai_agent_id: campaignOrBroadcast.ai_agent_id || undefined,
        ai_goal: campaignOrBroadcast.ai_goal || undefined,
        business_type: campaignOrBroadcast.business_type || undefined,
        tone_id: campaignOrBroadcast.tone_id || undefined,
        post_every_id: campaignOrBroadcast.post_every_id || undefined,
        stop_post_id: campaignOrBroadcast.stop_post_id || undefined,
        duration_id: campaignOrBroadcast.duration_id || undefined,
        start_date: campaignOrBroadcast.start_date || undefined,
        stop_date: campaignOrBroadcast.stop_date || undefined,
      };

      console.log("[SendAINewsletterPage] Draft payload:", draftPayload);

      const newDraft = await draftService.createDraft(draftPayload);

      console.log("[SendAINewsletterPage] Created new draft from newsletter:", newDraft.id);

      // Parse the draft data to pass as prefilled
      const templateLayout = newDraft.template_layout ? JSON.parse(newDraft.template_layout) : undefined;

      // Open the email composer with the new draft and prefilled content
      setModal({
        type: "composer",
        draftId: newDraft.id,
        templateId: campaignOrBroadcast.template_id || undefined,
        prefilled: {
          subject: newDraft.head || undefined,
          body: newDraft.html,
          preview: newDraft.preview || undefined,
          templateLayout,
          footer: newDraft.footer || undefined,
          address: newDraft.address || undefined,
        },
      });
    } catch (error: any) {
      console.error("Failed to duplicate newsletter:", error);
      console.error("Error response:", error.response?.data);
    }
  };

  const isBrandWorkspace = Boolean(brandId);

  const TABS: { id: Tab; label: string }[] = [
    { id: "newsletters", label: "Newsletters" },
    { id: "templates", label: "Templates" },
    { id: "drafts", label: "Drafts" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <div className="max-w-5xl mx-auto px-6 py-6">
        {isBrandWorkspace && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <button onClick={() => navigate("/news-letter/brands")} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              ← Back to Brands
            </button>
            <span className="text-sm font-semibold text-blue-600">{brand?.name || "Brand Workspace"}</span>
          </div>
        )}

        {/* Hero */}
        <HeroBanner onCreateNewsletter={handleCreateNewsletter} brandName={brand?.name} />

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex items-center justify-between">
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
            {!isBrandWorkspace && (
              <button
                onClick={() => navigate("/news-letter/brands")}
                className="pb-3 text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1"
              >
                Manage Brands →
              </button>
            )}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === "newsletters" && (
          <NewslettersTab
            onSendNew={() => setModal({ type: "send_method" })}
            onViewReport={(newsletter) => setModal({ type: "report", newsletter })}
            onPreview={handlePreview}
            onDuplicate={handleDuplicate}
            brandId={brand ? brand.id : undefined}
          />
        )}
        {activeTab === "templates" && (
          <TemplatesTab
            onSelectTemplate={handleTemplateSelect}
            onCreateBlank={() => handleTemplateSelect(0)}
          />
        )}
        {activeTab === "drafts" && (
          <DraftsTab
            ref={draftsTabRef}
            brandId={brand ? brand.id : undefined}
            onSelectDraft={(draft) => {
              // Use the shared restoreDraftLayout function to merge sections_content and custom_images
              const restoredLayout = restoreDraftLayout(draft);

              // Only include aiResult if the draft was actually created via AI flow
              // Check if it has start_date/stop_date (these are only set by AI flow)
              const isAIGenerated = !!(draft.start_date && draft.stop_date);

              setModal({ type: "composer", prefilled: {
                subject: draft.head || undefined,
                preview: draft.preview || undefined,
                body: draft.html,
                templateId: draft.template_id || undefined,
                templateLayout: restoredLayout,
                attachments: draft.attachments ? JSON.parse(draft.attachments) : undefined,
                footer: draft.footer || undefined,
                address: draft.address || undefined,
                aiResult: isAIGenerated ? {
                  ai_agent_id: draft.ai_agent_id,
                  ai_goal: draft.ai_goal,
                  business_type: draft.business_type,
                  tone_id: draft.tone_id,
                  start_date: draft.start_date,
                  start_time: draft.start_date ? new Date(draft.start_date).toTimeString().substring(0, 5) : undefined,
                } : undefined,
              }, draftId: draft.id });
            }}
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
          brandId={brand ? brand.id : undefined}
          domainId={brand && brand.domains && brand.domains.length > 0 ? brand.domains[0].id : undefined}
        />
      )}

      {modal.type === "composer" && (
        <EmailComposerModal
          onClose={closeModal}
          prefilled={modal.type === "composer" ? modal.prefilled : undefined}
          templateId={modal.type === "composer" ? modal.templateId : undefined}
          brand={brand}
          draftId={modal.type === "composer" ? modal.draftId : undefined}
        />
      )}

      {modal.type === "report" && (
        <ViewReportModal
          newsletter={modal.newsletter}
          onClose={closeModal}
        />
      )}
 
      {modal.type === "preview" && (
        <EmailPreviewModal newsletter={modal.newsletter} onClose={closeModal} loading={loadingPreview} />
      )}
    </div>
  );
}