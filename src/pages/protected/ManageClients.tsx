import { useCallback, useEffect, useState } from "react";
import ClientDetailView from "../../components/ClientDetailView";
import FolderTable from "../../components/FolderTable";
import AddFolderModal from "../../components/modal/AddFolderModal";
import AddClientModal from "../../components/modal/AddClientModal";
import ImportStep1 from "../../components/modal/ImportStep1";
import ImportStepFile from "../../components/modal/ImportStepFile";
import ImportStepPaste from "../../components/modal/ImportStepPaste";
import ImportStepReview from "../../components/modal/ImportStepReview";
import ImportSuccessModal from "../../components/modal/ImportSuccessModal";
import DashboardHeader from "../../components/Dashboardheader";
import { clientService } from "../../services/clientService";
import type { ClientUpdatePayload, ManagedClient, ParsedImportData, SavedClientRecord } from "../../types/domain";
import { buildClientPayloads } from "../../utils/importParser";

interface Folder {
  id: number;
  name: string;
  totalClients: number;
  createdDate: string;
}

type ImportFlow = "idle" | "step1" | "file" | "paste" | "review" | "success";

type ImportSource = "file" | "paste" | null;

function mapSavedClient(c: SavedClientRecord): ManagedClient {
  return {
    id: c.id,
    businessName: c.business_name || c.display_name || "Unnamed client",
    email: c.email || c.email_1 || "No email",
    phone: c.phone || "-",
    website: c.website || c.site || "-",
    gmb: c.google_maps_url || undefined,
    facebook: c.facebook_url || c.facebook || undefined,
    twitter: c.twitter_url || c.twitter || c.x_url || undefined,
    instagram: c.instagram_url || c.instagram || undefined,
    yelp: c.yelp_url || c.yelp || undefined,
    group: c.contacted ? "Contacted" : "Not Contacted",
    emailsSent: c.emails_count || 0,
  };
}
 
export default function ManageClients() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [clients, setClients] = useState<ManagedClient[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [importFlow, setImportFlow] = useState<ImportFlow>("idle");
  const [importSource, setImportSource] = useState<ImportSource>(null);
  const [importCount, setImportCount] = useState(0);
  const [importData, setImportData] = useState<ParsedImportData | null>(null);

  const fetchFolders = useCallback(async () => {
    try {
      const [categories, stats] = await Promise.all([
        clientService.getCategories(),
        clientService.getSavedClients(),
      ]);

      const mapped = categories.map((f) => {
        const count = stats.filter((s) => Number(s.client_cat_id) === f.id).length;
        const createdAt = f.created_at || f.createdAt;

        return {
          id: f.id,
          name: f.name,
          totalClients: count,
          createdDate: createdAt
            ? new Date(createdAt).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" })
            : "N/A",
        };
      });

      setFolders(mapped);
    } catch (error) {
      console.error("Failed to fetch folders", error);
    }
  }, []);
 
  const fetchClients = useCallback(async (categoryId: number) => {
    try {
      const data = await clientService.getSavedClients(categoryId);
      setClients(data.map(mapSavedClient));
    } catch (error) {
      console.error("Failed to fetch clients", error);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchFolders(); }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchFolders]);

  useEffect(() => {
    if (!selectedFolder) return;
    const loadClients = async () => {
      await fetchClients(selectedFolder.id);
    };
    void loadClients();
  }, [fetchClients, selectedFolder]);

  const handleSaveFolder = async (name: string) => {
    try {
      if (editingFolder) {
        await clientService.updateCategory(editingFolder.id, name, "");
      } else {
        await clientService.createCategory(name, "");
      }
      fetchFolders();
      setShowAddFolder(false);
      setEditingFolder(null);
    } catch (error) {
      console.error("Failed to save folder", error);
    }
  };

  const handleEditFolder = (folder: Folder) => {
    setEditingFolder(folder);
    setShowAddFolder(true);
  };

  const handleDeleteFolder = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this folder?")) return;
    try {
      await clientService.deleteCategory(id);
      setFolders((prev) => prev.filter((folder) => folder.id !== id));
      if (selectedFolder?.id === id) setSelectedFolder(null);
    } catch (error) {
      console.error("Failed to delete folder", error);
    }
  };
 
  const handleAddClient = async (client: Partial<ManagedClient>) => {
    if (!selectedFolder) return;
    try {
      // Step 1: create minimal record (server only accepts business_name on create)
      const createdResp = await clientService.addClientManual({ business_name: client.businessName });
      const createdId = createdResp?.data?.id;
      if (!createdId) throw new Error("Failed to get created client id");

      // Step 2: update the newly created client with rest of fields
      const updatePayload: ClientUpdatePayload = {};
      if (client.email) updatePayload.email = client.email;
      if (client.phone) updatePayload.phone = client.phone;
      if (client.website) updatePayload.website = client.website;
      // use server-accepted category key
      updatePayload.client_cat_id = selectedFolder.id;

      await clientService.updateClient(createdId, updatePayload);

      // Refresh UI
      fetchClients(selectedFolder.id);
      setFolders((prev) => prev.map((folder) => (
        folder.id === selectedFolder.id ? { ...folder, totalClients: folder.totalClients + 1 } : folder
      )));
      setSelectedFolder((folder) => folder ? { ...folder, totalClients: folder.totalClients + 1 } : folder);
      setShowAddClient(false);
    } catch (error) {
      const axiosError = error as { response?: { data?: unknown; status?: number } };
      console.error("Failed to add client", axiosError?.response?.data || error);
    }
  };

  const handleUpdateClient = async (id: number, payload: ClientUpdatePayload) => {
    await clientService.updateClient(id, payload);
    if (selectedFolder) {
      fetchClients(selectedFolder.id);
    }
  };

  const handleDeleteClient = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;
    try {
      await clientService.deleteClient(id);
      setClients((prev) => prev.filter((client) => client.id !== id));
      if (selectedFolder) {
        setFolders((prev) => prev.map((folder) => (
          folder.id === selectedFolder.id ? { ...folder, totalClients: folder.totalClients - 1 } : folder
        )));
        setSelectedFolder((folder) => folder ? { ...folder, totalClients: folder.totalClients - 1 } : folder);
      }
    } catch (error) {
      console.error("Failed to delete client", error);
    }
  };
 
  const handleImportStep = (data: ParsedImportData, source: ImportSource) => {
    setImportData(data);
    setImportSource(source);
    setImportFlow("review");
  };

  const handleImportSuccess = async (count: number) => {
    if (!selectedFolder) return;
    setImportCount(count);
    setImportFlow("success");
    await fetchClients(selectedFolder.id);
    setFolders((prev) => prev.map((folder) => (
      folder.id === selectedFolder.id ? { ...folder, totalClients: folder.totalClients + count } : folder
    )));
    setSelectedFolder((folder) => folder ? { ...folder, totalClients: folder.totalClients + count } : folder);
  };

  const handleRunImport = async (rows: string[][], selectedFields: string[]) => {
    if (!selectedFolder) return;
    const clients = buildClientPayloads(rows, selectedFields as any, importData?.headers);
    try {
      await clientService.addClientsBatchManual(clients, selectedFolder.id);
      handleImportSuccess(clients.length);
    } catch (error) {
      console.error("Failed to import contacts", error);
      alert("Failed to import contacts. Please try again.");
    }
  };
 
  return (
    <>
      <DashboardHeader />

      {selectedFolder ? (
        <ClientDetailView
          folder={selectedFolder}
          clients={clients}
          onBack={() => setSelectedFolder(null)}
          onAddClient={() => setShowAddClient(true)}
          onImport={() => setImportFlow("step1")}
          onDeleteClient={handleDeleteClient}
          onUpdateClient={handleUpdateClient}
        />
      ) : (
        <FolderTable
          folders={folders}
          onSelect={(folder) => setSelectedFolder(folder)}
          onEdit={handleEditFolder}
          onDelete={handleDeleteFolder}
          onAddFolder={() => setShowAddFolder(true)}
        />
      )}
 
      {showAddFolder && (
        <AddFolderModal
          onClose={() => {
            setShowAddFolder(false);
            setEditingFolder(null);
          }}
          onAdd={handleSaveFolder}
        />
      )}
      {showAddClient && <AddClientModal onClose={() => setShowAddClient(false)} onAdd={handleAddClient} />}
      {importFlow === "step1" && (
        <ImportStep1
          onClose={() => {
            setImportFlow("idle");
            setImportSource(null);
            setImportData(null);
          }}
          onNext={(step) => {
            setImportSource(step);
            setImportFlow(step);
          }}
        />
      )}
      {importFlow === "file" && (
        <ImportStepFile
          onClose={() => {
            setImportFlow("idle");
            setImportSource(null);
            setImportData(null);
          }}
          onSuccess={(data) => handleImportStep(data, "file")}
        />
      )}
      {importFlow === "paste" && (
        <ImportStepPaste
          onClose={() => {
            setImportFlow("idle");
            setImportSource(null);
            setImportData(null);
          }}
          onSuccess={(data) => handleImportStep(data, "paste")}
        />
      )}
      {importFlow === "review" && importData && (
        <ImportStepReview
          onClose={() => {
            setImportFlow("idle");
            setImportSource(null);
            setImportData(null);
          }}
          onBack={() => {
            setImportFlow(importSource ?? "step1");
          }}
          data={importData}
          onImport={handleRunImport}
        />
      )}
      {importFlow === "success" && <ImportSuccessModal count={importCount} onClose={() => setImportFlow("idle")} />}
    </>
  );
}
