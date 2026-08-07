import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "../../components/Dashboardheader";
import type { Brand, BrandFormValues, FooterSettings } from "../../types/Types";
import { getApiErrorMessage } from "../../utils/api";
import { brandService } from "../../services/brandService";
import { domainService } from "../../services/domainService";
import { smtpService } from "../../services/smtpService";
import { lookupService } from "../../services/lookupService";
import BrandsTable from "../../components/brands/BrandsTable";
import BrandIdentityForm from "../../components/brands/BrandIdentityForm";
import { Accordion, icons } from "../../components/brands/Accordion";
import { AddDomainSection, FooterSettingsSection, PrivacySection, SendingLimitSection, SmtpSettingsSection } from "../../components/brands/BrandAccordionSections";
import { CreateBrandModal } from "../../components/modal/CreateBrandModal";

type SavingSection = "identity" | "smtp" | "privacy" | "sendingLimit" | "footer" | null;

interface LookupItem {
  id: number;
  name: string;
}

interface Lookups {
  regions: LookupItem[];
  smtpProviders: LookupItem[];
  securityProtocols: LookupItem[];
}

export default function BrandsPage() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBrand, setActiveBrand] = useState<Brand | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingSection, setSavingSection] = useState<SavingSection>(null);
  const [smtpError, setSmtpError] = useState<string | null>(null);
  const [lookups, setLookups] = useState<Lookups>({ regions: [], smtpProviders: [], securityProtocols: [] });

  useEffect(() => {
    const init = async () => {
      try {
        const allLookups = await lookupService.getAllLookups();
        setLookups({
          regions: allLookups.regions,
          smtpProviders: allLookups.smtpProviders,
          securityProtocols: allLookups.securityProtocols,
        });
      } catch (error) {
        console.error("Failed to load lookups:", error);
      }
      await fetchBrands();
    };
    init();
  }, []);

  const normalizeFooter = (b: any): FooterSettings => {
    const footerBlock = b.footer ?? {};
    const footerAddress = b.footer_address ?? footerBlock.footer_address ?? "";
    const addressLines = typeof footerAddress === "string"
      ? footerAddress.split(/\n/).map(line => line.trim()).filter(Boolean)
      : [];

    return {
      unsubscribeText: b.unsuscribe_information ?? footerBlock.unsubscribeText ?? footerBlock.unsuscribe_information ?? "",
      companyName: footerBlock.companyName ?? b.company_name ?? addressLines[0] ?? "",
      address: footerBlock.address ?? addressLines[1] ?? "",
      cityStateZip: footerBlock.cityStateZip ?? addressLines[2] ?? "",
      removeBadge: footerBlock.removeBadge ?? (b.newsletter_badge === false),
    };
  };

  // Ensure incoming brand objects have the fields our UI expects.
  const normalizeBrand = (b: any): Brand => {
    const rawPrivacy = {
      track_opens: b.privacy?.track_opens ?? b.track_opens,
      track_clicks: b.privacy?.track_clicks ?? b.track_clicks,
      set_campaign_notif: b.privacy?.set_campaign_notif ?? b.set_campaign_notif,
      notify_email: b.privacy?.notify_email ?? b.notify_email,
      trackOpens: b.privacy?.trackOpens,
      trackClicks: b.privacy?.trackClicks,
      notifyEmail: b.privacy?.notifyEmail,
    };

    const rawSendingLimit = {
      sending_limit: b.sendingLimit?.sending_limit ?? b.sending_limit,
      number_email_per_month: b.sendingLimit?.number_email_per_month ?? b.number_email_per_month,
      current_used_email_limits: b.sendingLimit?.current_used_email_limits ?? b.current_used_email_limits,
      reset_day_id: b.sendingLimit?.reset_day_id ?? b.reset_day_id,
      emailsPerMonth: b.sendingLimit?.emailsPerMonth,
      resetDay: b.sendingLimit?.resetDay,
    };

    return {
      id: b.id,
      name: b.brand_name ?? b.name ?? "Unnamed",
      fromName: b.from_name ?? b.fromName ?? "",
      fromEmail: b.from_email ?? b.fromEmail ?? "",
      replyToEmail: b.reply_to_email ?? b.replyToEmail ?? "",
      resendApiKey: b.resend_api_key ?? b.resendApiKey ?? undefined,
      logo: b.logo ?? b.logo_url ?? b.logoUrl ?? b.image ?? null,
      dateCreated: b.date_created ?? b.dateCreated ?? b.created_at ?? b.createdAt ?? new Date().toISOString(),
      totalCampaigns: b.total_campaigns ?? b.totalCampaigns ?? 0,
      sendsVia: b.send_via ?? b.sends_via ?? b.sendsVia ?? "",
      domains: b.domains ?? [],
      smtp: {
        provider: b.smtp?.provider ?? b.send_via ?? "",
        providerId: b.smtp?.providerId,
        host: b.smtp?.host ?? "",
        port: b.smtp?.port ?? "",
        security: b.smtp?.security ?? "SSL",
        securityId: b.smtp?.securityId,
        username: b.smtp?.username ?? "",
        password: b.smtp?.password,
      },
      privacy: {
        trackOpens:
          rawPrivacy.trackOpens ??
          (rawPrivacy.track_opens === false ? "No" : rawPrivacy.track_opens === true ? "Yes" : "Yes"),
        trackClicks:
          rawPrivacy.trackClicks ??
          (rawPrivacy.track_clicks === false ? "No" : rawPrivacy.track_clicks === true ? "Yes" : rawPrivacy.track_clicks === null || rawPrivacy.track_clicks === undefined ? "Yes" : "Anonymously"),
        notifyOnCampaign: Boolean(rawPrivacy.set_campaign_notif),
        notifyEmail: rawPrivacy.notifyEmail ?? rawPrivacy.notify_email ?? "",
      },
      sendingLimit: {
        limitType: rawSendingLimit.sending_limit ?? "Unlimited",
        emailsPerMonth: rawSendingLimit.number_email_per_month ?? rawSendingLimit.emailsPerMonth ?? undefined,
        currentlyUsed: rawSendingLimit.current_used_email_limits ?? 0,
        resetDay: rawSendingLimit.reset_day_id ?? rawSendingLimit.resetDay ?? 1,
      },
      footer: normalizeFooter(b),
    } as Brand;
  };



  const fetchBrands = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await brandService.listBrands();
      console.log('Fetched brands raw:', data);
      setBrands(data.map(normalizeBrand));
    } catch (error) {
      console.error("Failed to load brands", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const refreshActive = async (id: number) => {
    const updated = await brandService.getBrand(id);
    if (updated) setActiveBrand(normalizeBrand(updated));
    await fetchBrands(false);
  };

  const handleOpenBrandWorkspace = (brand: Brand) => {
    navigate(`/news-letter/brands/${brand.id}`);
  };

  const handleOpenBrandEditor = (brand: Brand) => {
    setActiveBrand(brand);
  };

  const handleCreateBrand = async (values: BrandFormValues) => {
    setCreating(true);
    try {
      const created = await brandService.createBrand(values);
      console.debug("Created brand:", created);
      // Don't rely on the create response to include the full brand payload — refresh from server
      await fetchBrands();
      setShowCreate(false);
      if (created?.id) navigate(`/news-letter/brands/${created.id}`);
    } catch (error) {
      console.error("Failed to create brand", error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBrand = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this brand?")) return;
    try {
      await brandService.deleteBrand(id);
      setBrands(prev => prev.filter(b => b.id !== id));
      if (activeBrand?.id === id) setActiveBrand(null);
    } catch (error) {
      console.error("Failed to delete brand", error);
    }
  };

  const handleSaveIdentity = async (values: BrandFormValues) => {
    if (!activeBrand) return;
    setSavingSection("identity");
    try {
      await brandService.updateBrandIdentity(activeBrand.id, values);
      await refreshActive(activeBrand.id);
    } catch (error) {
      console.error("Failed to save brand", error);
    } finally {
      setSavingSection(null);
    }
  };

  if (loading) {
    return (
      <>
        <DashboardHeader />
        <div className="max-w-7xl mx-auto px-6 py-20 text-center text-gray-400 text-sm">Loading brands…</div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader />

      {!activeBrand ? (
        <BrandsTable brands={brands} onView={handleOpenBrandWorkspace} onEdit={handleOpenBrandEditor} onDelete={handleDeleteBrand} onCreate={() => setShowCreate(true)} />
      ) : (
        <div className="max-w-5xl mx-auto px-6 py-6">
          <button onClick={() => setActiveBrand(null)} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
            ← Back to Brands
          </button>

          <p className="text-lg font-bold text-blue-600 mb-6">Edit Brand</p>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <BrandIdentityForm
              key={activeBrand.id}
              initial={{
                name: activeBrand.name,
                fromName: activeBrand.fromName,
                fromEmail: activeBrand.fromEmail,
                replyToEmail: activeBrand.replyToEmail,
                resendApiKey: activeBrand.resendApiKey,
                logo: activeBrand.logo,
              }}
              onCancel={() => setActiveBrand(null)}
              onSave={handleSaveIdentity}
              saving={savingSection === "identity"}
            />
          </div>

          <div className="space-y-3">
            <Accordion icon={icons.globe} title="Add domain">
              <AddDomainSection
                domains={activeBrand.domains}
                regions={lookups.regions}
                onAddDomain={async (name, regionId) => {
                  setSavingSection("addDomain" as any);
                  try {
                    const domain = await domainService.createDomain({
                      brand_id: activeBrand.id,
                      name,
                      region_id: regionId,
                      enable_open_tracking: false,
                      enable_click_tracking: false,
                    });
                    await refreshActive(activeBrand.id);
                    return domain;
                  } catch (error) {
                    const message = getApiErrorMessage(error, "Failed to add domain.");
                    console.error("Failed to add domain:", message, error);
                    throw new Error(message);
                  } finally {
                    setSavingSection(null);
                  }
                }}
                onDeleteDomain={async (domainId) => {
                  setSavingSection("addDomain" as any);
                  try {
                    await domainService.deleteDomain(domainId);
                    await refreshActive(activeBrand.id);
                  } catch (error) {
                    console.error("Failed to delete domain:", error);
                  } finally {
                    setSavingSection(null);
                  }
                }}
                onVerifyDomain={async () => {
                  setSavingSection("addDomain" as any);
                  try {
                    // Verification is typically async - poll the API to check if DNS records match
                    // For now, just refresh to show current status
                    await refreshActive(activeBrand.id);
                  } catch (error) {
                    console.error("Failed to verify domain:", error);
                  } finally {
                    setSavingSection(null);
                  }
                }}
              />
            </Accordion>

            <Accordion icon={icons.mail} title="SMTP Settings">
              <SmtpSettingsSection
                key={activeBrand.id}
                smtp={activeBrand.smtp}
                smtpProviders={lookups.smtpProviders}
                securityProtocols={lookups.securityProtocols}
                onCancel={() => setActiveBrand(null)}
                saving={savingSection === "smtp"}
                error={smtpError}
                onSave={async (smtp) => {
                  setSavingSection("smtp");
                  setSmtpError(null);
                  try {
                    await smtpService.createSMTPSettings({
                      brand_id: activeBrand.id,
                      smtp_prov_id: smtp.providerId ?? lookups.smtpProviders[0]?.id,
                      sec_prot_id: smtp.securityId ?? lookups.securityProtocols[0]?.id,
                      host: smtp.host,
                      port: Number(smtp.port),
                      username: smtp.username,
                      password: smtp.password ?? "",
                    });
                    await brandService.updateBrandSettings(activeBrand.id, {
                      send_via: smtp.provider,
                    });
                    await refreshActive(activeBrand.id);

                    setBrands(prev => prev.map(b =>
                      b.id === activeBrand.id
                        ? { ...b, sendsVia: smtp.provider }
                        : b
                    ));
                    setActiveBrand(prev => prev ? {
                      ...prev,
                      sendsVia: smtp.provider,
                      smtp: {
                        ...prev.smtp,
                        provider: smtp.provider,
                        providerId: smtp.providerId,
                        security: smtp.security,
                        securityId: smtp.securityId,
                        host: smtp.host,
                        port: smtp.port,
                        username: smtp.username,
                      },
                    } : prev);
                  } catch (error) {
                    const message = getApiErrorMessage(error, "Failed to save SMTP settings.");
                    setSmtpError(message);
                    console.error("Failed to save SMTP settings:", error);
                  } finally {
                    setSavingSection(null);
                  }
                }}
              />
            </Accordion>

            <Accordion icon={icons.bell} title="Privacy & Notifications">
              <PrivacySection
                key={activeBrand.id}
                privacy={activeBrand.privacy}
                loginEmail={activeBrand.privacy?.notifyEmail ?? "your@email.com"}
                onCancel={() => setActiveBrand(null)}
                saving={savingSection === "privacy"}
                onSave={async (privacy) => {
                  setSavingSection("privacy");
                  try {
                    // Map UI PrivacySettings to API payload
                    const payload = {
                      track_opens: privacy.trackOpens === "Yes",
                      track_clicks: privacy.trackClicks !== "No",
                      set_campaign_notif: privacy.notifyOnCampaign,
                    };
                    await brandService.updatePrivacySettings(activeBrand.id, payload);
                    await refreshActive(activeBrand.id);
                  } catch (error) {
                    console.error("Failed to save privacy settings:", error);
                  } finally {
                    setSavingSection(null);
                  }
                }}
              />
            </Accordion>

            <Accordion icon={icons.infinity} title="Sending Limit">
              <SendingLimitSection
                key={activeBrand.id}
                limit={activeBrand.sendingLimit}
                onCancel={() => setActiveBrand(null)}
                saving={savingSection === "sendingLimit"}
                onSave={async (limit) => {
                  setSavingSection("sendingLimit");
                  try {
                    // Map UI SendingLimitSettings to API payload
                    const payload: Record<string, any> = {
                      sending_limit: limit.limitType,
                    };
                    if (limit.emailsPerMonth) {
                      payload.number_email_per_month = limit.emailsPerMonth;
                    }
                    if (limit.resetDay) {
                      payload.reset_day_id = limit.resetDay;
                    }
                    await brandService.updateSendingLimit(activeBrand.id, payload);
                    await refreshActive(activeBrand.id);
                  } catch (error) {
                    console.error("Failed to save sending limit:", error);
                  } finally {
                    setSavingSection(null);
                  }
                }}
              />
            </Accordion>

            <Accordion icon={icons.frame} title="Footer Settings">
              <FooterSettingsSection
                key={activeBrand.id}
                footer={activeBrand.footer}
                onCancel={() => setActiveBrand(null)}
                saving={savingSection === "footer"}
                onSave={async (footer) => {
                  setSavingSection("footer");
                  try {
                    // Map UI FooterSettings to API payload
                    const payload = {
                      unsuscribe_information: footer.unsubscribeText, // Note: typo in API (unsuscribe not unsubscribe)
                      newsletter_badge: !footer.removeBadge, // Inverted: API uses newsletter_badge (show), UI uses removeBadge (hide)
                      footer_address: [footer.companyName, footer.address, footer.cityStateZip].filter(Boolean).join("\n"),
                    };
                    await brandService.updateFooterSettings(activeBrand.id, payload);
                    await refreshActive(activeBrand.id);
                  } catch (error) {
                    console.error("Failed to save footer settings:", error);
                  } finally {
                    setSavingSection(null);
                  }
                }}
              />
            </Accordion>
          </div>
        </div>
      )}

      {showCreate && <CreateBrandModal onClose={() => setShowCreate(false)} onCreate={handleCreateBrand} creating={creating} />}
    </>
  );
}