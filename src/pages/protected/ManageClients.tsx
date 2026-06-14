import { useState, useEffect } from "react";
import ClientDetailView from "../../components/ClientDetailView";
import FolderTable from "../../components/FolderTable";
import AddFolderModal from "../../components/modal/AddFolderModal";
import AddClientModal from "../../components/modal/AddClientModal";
import ImportStep1 from "../../components/modal/ImportStep1";
import ImportStepFile from "../../components/modal/ImportStepFile";
import ImportStepPaste from "../../components/modal/ImportStepPaste";
import ImportSuccessModal from "../../components/modal/ImportSuccessModal";
import DashboardHeader from "../../components/Dashboardheader";
import { clientService } from "../../store/clientService";

interface Folder {
  id: number;
  name: string;
  totalClients: number;
  createdDate: string;
}

interface Client {
  id: number;
  businessName: string;
  email: string;
  phone?: string;
  website?: string;
  gmb?: string;
  facebook?: string;
  twitter?: string;
  instagram?: string;
  yelp?: string;
  group: "Contacted" | "Not Contacted";
  emailsSent: number;
}

type ImportFlow = "idle" | "step1" | "file" | "paste" | "success";
 
export default function ManageClients() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
 
  // Modals
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [importFlow, setImportFlow] = useState<ImportFlow>("idle");
  const [importCount, setImportCount] = useState(0);
 
  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    if (selectedFolder) {
      fetchClients(selectedFolder.id);
    }
  }, [selectedFolder]);

  const fetchFolders = async () => {
    try {
      // Fetch categories and stats (counts) in parallel
      const [categories, stats] = await Promise.all([
        clientService.getCategories(),
        clientService.getSavedClients() // Hits /clients/list which returns grouped counts
      ]);

      console.log("DEBUG: Raw Categories:", categories);
      console.log("DEBUG: Raw Stats from /clients/list:", stats);

      const mapped = categories.map((f: any) => {
        // The stats array is actually a list of clients. 
        // We count how many clients have a client_cat_id matching this folder's ID.
        const count = Array.isArray(stats) 
          ? stats.filter((s: any) => Number(s.client_cat_id) === f.id).length 
          : 0;
        
        return {
          id: f.id,
          name: f.name,
          totalClients: count,
        createdDate: (f.created_at || f.createdAt) 
          ? new Date(f.created_at || f.createdAt).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" }) 
          : "N/A"
        };
      });

      setFolders(mapped);
    } catch (error) {
      console.error("Failed to fetch folders", error);
    }
  };
 
  const fetchClients = async (catId: number) => {
    try {
      const data = await clientService.getSavedClients(catId);
      const mapped = data.map((c: any) => ({
        id: c.id,
        businessName: c.business_name || c.display_name,
        email: c.email || c.email_1 || "No email",
        phone: c.phone || "—",
        website: c.website || c.site || "—",
        gmb: c.google_maps_url,
        facebook: c.facebook_url || c.facebook,
        twitter: c.twitter_url || c.twitter || c.x_url,
        instagram: c.instagram_url || c.instagram,
        yelp: c.yelp_url || c.yelp,
        group: c.contacted ? "Contacted" : "Not Contacted",
        emailsSent: c.emails_count || 0
      }));
      setClients(mapped);
    } catch (error) {
      console.error("Failed to fetch clients", error);
    }
  };

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

  const handleEditFolder = (f: Folder) => {
    setEditingFolder(f);
    setShowAddFolder(true);
  };

  const handleDeleteFolder = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this folder?")) return;
    try {
      await clientService.deleteCategory(id);
      setFolders(prev => prev.filter(f => f.id !== id));
      if (selectedFolder?.id === id) setSelectedFolder(null);
    } catch (error) {
      console.error("Failed to delete folder", error);
    }
  };
 
  const handleAddClient = async (c: Partial<Client>) => {
    if (!selectedFolder) return;
    try {
      const payload = {
        display_name: c.businessName!,
        phone: c.phone || "",
        email_1: c.email!,
        site: c.website || "",
        client_category_id: selectedFolder.id
      };
      await clientService.addClientManual(payload);
      fetchClients(selectedFolder.id);
      setFolders(prev => prev.map(f => f.id === selectedFolder.id ? { ...f, totalClients: f.totalClients + 1 } : f));
      setSelectedFolder(f => f ? { ...f, totalClients: f.totalClients + 1 } : f);
      setShowAddClient(false);
    } catch (error) {
      console.error("Failed to add client", error);
    }
  };

  const handleUpdateClient = async (id: number, payload: any) => {
    await clientService.updateClient(id, payload);
    if (selectedFolder) {
      fetchClients(selectedFolder.id);
    }
  };

  const handleDeleteClient = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;
    try {
      await clientService.deleteClient(id);
      setClients(prev => prev.filter(c => c.id !== id));
      if (selectedFolder) {
        setFolders(prev => prev.map(f => f.id === selectedFolder.id ? { ...f, totalClients: f.totalClients - 1 } : f));
        setSelectedFolder(f => f ? { ...f, totalClients: f.totalClients - 1 } : f);
      }
    } catch (error) {
      console.error("Failed to delete client", error);
    }
  };
 
  const handleImportSuccess = (count: number) => {
    setImportCount(count);
    setImportFlow("success");
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
          onSelect={f => setSelectedFolder(f)}
          onEdit={handleEditFolder}
          onDelete={handleDeleteFolder}
          onAddFolder={() => setShowAddFolder(true)}
        />
      )}
 
      {/* Modals */}
      {showAddFolder && <AddFolderModal onClose={() => { setShowAddFolder(false); setEditingFolder(null); }} onAdd={handleSaveFolder} />}
      {showAddClient && <AddClientModal onClose={() => setShowAddClient(false)} onAdd={handleAddClient} />}
      {importFlow === "step1" && <ImportStep1 onClose={() => setImportFlow("idle")} onNext={t => setImportFlow(t)} />}
      {importFlow === "file" && <ImportStepFile onClose={() => setImportFlow("idle")} onSuccess={handleImportSuccess} />}
      {importFlow === "paste" && <ImportStepPaste onClose={() => setImportFlow("idle")} onSuccess={handleImportSuccess} />}
      {importFlow === "success" && <ImportSuccessModal count={importCount} onClose={() => setImportFlow("idle")} />}
    </>
  );
}