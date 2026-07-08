import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "../../components/Dashboardheader";
import type { Brand, BrandFormValues } from "../../types/Types";
import { brandService } from "../../store/brandService";
import BrandsTable from "../../components/brands/BrandsTable";
import BrandIdentityForm from "../../components/brands/BrandIdentityForm";
import { Accordion, icons } from "../../components/brands/Accordion";
import { AddDomainSection, FooterSettingsSection, PrivacySection, SendingLimitSection, SmtpSettingsSection } from "../../components/brands/BrandAccordionSections";
import { CreateBrandModal } from "../../components/modal/CreateBrandModal";

type SavingSection = "identity" | "smtp" | "privacy" | "sendingLimit" | "footer" | null;

export default function BrandsPage() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBrand, setActiveBrand] = useState<Brand | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingSection, setSavingSection] = useState<SavingSection>(null);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await brandService.listBrands();
      setBrands(data);
    } catch (error) {
      console.error("Failed to load brands", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const refreshActive = async (id: number) => {
    const updated = await brandService.getBrand(id);
    if (updated) setActiveBrand(updated);
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
      const brand = await brandService.createBrand(values);
      setBrands(prev => [...prev, brand]);
      setShowCreate(false);
      navigate(`/news-letter/brands/${brand.id}`);
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
                onAddDomain={async (name, region) => {
                  const domain = await brandService.addDomain(activeBrand.id, name, region);
                  await refreshActive(activeBrand.id);
                  return domain;
                }}
                onDeleteDomain={async domainId => {
                  await brandService.deleteDomain(activeBrand.id, domainId);
                  await refreshActive(activeBrand.id);
                }}
                onVerifyDomain={async domainId => {
                  await brandService.verifyDomain(activeBrand.id, domainId);
                  await refreshActive(activeBrand.id);
                }}
              />
            </Accordion>

            <Accordion icon={icons.mail} title="SMTP Settings">
              <SmtpSettingsSection
                key={activeBrand.id}
                smtp={activeBrand.smtp}
                onCancel={() => setActiveBrand(null)}
                saving={savingSection === "smtp"}
                onSave={async smtp => {
                  setSavingSection("smtp");
                  await brandService.updateSmtp(activeBrand.id, smtp);
                  await refreshActive(activeBrand.id);
                  setSavingSection(null);
                }}
              />
            </Accordion>

            <Accordion icon={icons.bell} title="Privacy & Notifications">
              <PrivacySection
                key={activeBrand.id}
                privacy={activeBrand.privacy}
                loginEmail={activeBrand.privacy.notifyEmail || "your@email.com"}
                onCancel={() => setActiveBrand(null)}
                saving={savingSection === "privacy"}
                onSave={async privacy => {
                  setSavingSection("privacy");
                  await brandService.updatePrivacy(activeBrand.id, privacy);
                  await refreshActive(activeBrand.id);
                  setSavingSection(null);
                }}
              />
            </Accordion>

            <Accordion icon={icons.infinity} title="Sending Limit">
              <SendingLimitSection
                key={activeBrand.id}
                limit={activeBrand.sendingLimit}
                onCancel={() => setActiveBrand(null)}
                saving={savingSection === "sendingLimit"}
                onSave={async limit => {
                  setSavingSection("sendingLimit");
                  await brandService.updateSendingLimit(activeBrand.id, limit);
                  await refreshActive(activeBrand.id);
                  setSavingSection(null);
                }}
              />
            </Accordion>

            <Accordion icon={icons.frame} title="Footer Settings">
              <FooterSettingsSection
                key={activeBrand.id}
                footer={activeBrand.footer}
                onCancel={() => setActiveBrand(null)}
                saving={savingSection === "footer"}
                onSave={async footer => {
                  setSavingSection("footer");
                  await brandService.updateFooter(activeBrand.id, footer);
                  await refreshActive(activeBrand.id);
                  setSavingSection(null);
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