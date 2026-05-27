import { useState } from "react";
import ClientDetailView from "../../components/ClientDetailView";
import FolderTable from "../../components/FolderTable";
import AddFolderModal from "../../components/modal/AddFolderModal";
import AddClientModal from "../../components/modal/AddClientModal";
import ImportStep1 from "../../components/modal/ImportStep1";
import ImportStepFile from "../../components/modal/ImportStepFile";
import ImportStepPaste from "../../components/modal/ImportStepPaste";
import ImportSuccessModal from "../../components/modal/ImportSuccessModal";
import DashboardHeader from "../../components/Dashboardheader";

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

const initialFolders: Folder[] = [
  { id: 1, name: "Plumbers in pittsburgh USA", totalClients: 1, createdDate: "01/07/20" },
  { id: 2, name: "[FB] Plumbers pittsburgh USA", totalClients: 55, createdDate: "01/07/20" },
  { id: 3, name: "Coffee shops in Boulder CO", totalClients: 55, createdDate: "01/07/20" },
  { id: 4, name: "[FB] Plumbers pittsburgh USA", totalClients: 55, createdDate: "01/07/20" },
  { id: 5, name: "Plumbers in pittsburgh USA", totalClients: 55, createdDate: "01/07/20" },
  { id: 6, name: "[FB] Plumbers pittsburgh USA", totalClients: 55, createdDate: "01/07/20" },
  { id: 7, name: "Coffee shops in Boulder CO", totalClients: 55, createdDate: "01/07/20" },
  { id: 8, name: "[FB] Plumbers pittsburgh USA", totalClients: 55, createdDate: "01/07/20" },
  { id: 9, name: "Plumbers in pittsburgh USA", totalClients: 1, createdDate: "01/07/20" },
  { id: 10, name: "[FB] Plumbers pittsburgh USA", totalClients: 55, createdDate: "01/07/20" },
  { id: 11, name: "Coffee shops in Boulder CO", totalClients: 55, createdDate: "01/07/20" },
  { id: 12, name: "[FB] Plumbers pittsburgh USA", totalClients: 55, createdDate: "01/07/20" },
  { id: 13, name: "Plumbers in pittsburgh USA", totalClients: 55, createdDate: "01/07/20" },
  { id: 14, name: "[FB] Plumbers pittsburgh USA", totalClients: 55, createdDate: "01/07/20" },
  { id: 15, name: "Coffee shops in Boulder CO", totalClients: 55, createdDate: "01/07/20" },
  { id: 16, name: "[FB] Plumbers pittsburgh USA", totalClients: 55, createdDate: "01/07/20" },
];
 
const initialClients: Client[] = [
  { id: 1, businessName: "Acme Co.", email: "willie.jennings@example.com", phone: "(+1) 234 5678 21", website: "www.inforgrwoth.com", group: "Not Contacted", emailsSent: 0 },
  { id: 2, businessName: "Big Kahuna Burger Ltd.", email: "alma.lawson@example.com", phone: "(+1) 234 5678 21", website: "www.inforgrwoth.com", group: "Contacted", emailsSent: 0 },
  { id: 3, businessName: "Beasley Plumbing", email: "servicemgr@beasleyplumbing.com", group: "Not Contacted", emailsSent: 0 },
  { id: 4, businessName: "Beasley Plumbing", email: "servicemgr@beasleyplumbing.com", group: "Contacted", emailsSent: 0 },
  { id: 5, businessName: "Beasley Plumbing", email: "servicemgr@beasleyplumbing.com", group: "Not Contacted", emailsSent: 0 },
  { id: 6, businessName: "Beasley Plumbing", email: "servicemgr@beasleyplumbing.com", group: "Contacted", emailsSent: 0 },
];
 
export default function ManageClients() {
  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
 
  // Modals
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [importFlow, setImportFlow] = useState<ImportFlow>("idle");
  const [importCount, setImportCount] = useState(0);
 
  const handleAddFolder = (name: string) => {
    setFolders(prev => [...prev, { id: Date.now(), name, totalClients: 0, createdDate: new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" }) }]);
  };
 
  const handleDeleteFolder = (id: number) => {
    setFolders(prev => prev.filter(f => f.id !== id));
    if (selectedFolder?.id === id) setSelectedFolder(null);
  };
 
  const handleAddClient = (c: Partial<Client>) => {
    const newClient: Client = { id: Date.now(), businessName: c.businessName!, email: c.email!, phone: c.phone, website: c.website, group: "Not Contacted", emailsSent: 0 };
    setClients(prev => [...prev, newClient]);
    if (selectedFolder) {
      setFolders(prev => prev.map(f => f.id === selectedFolder.id ? { ...f, totalClients: f.totalClients + 1 } : f));
      setSelectedFolder(f => f ? { ...f, totalClients: f.totalClients + 1 } : f);
    }
  };
 
  const handleDeleteClient = (id: number) => {
    setClients(prev => prev.filter(c => c.id !== id));
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
        />
      ) : (
        <FolderTable
          folders={folders}
          onSelect={f => setSelectedFolder(f)}
          onEdit={f => console.log("edit", f)}
          onDelete={handleDeleteFolder}
          onAddFolder={() => setShowAddFolder(true)}
        />
      )}
 
      {/* Modals */}
      {showAddFolder && <AddFolderModal onClose={() => setShowAddFolder(false)} onAdd={handleAddFolder} />}
      {showAddClient && <AddClientModal onClose={() => setShowAddClient(false)} onAdd={handleAddClient} />}
      {importFlow === "step1" && <ImportStep1 onClose={() => setImportFlow("idle")} onNext={t => setImportFlow(t)} />}
      {importFlow === "file" && <ImportStepFile onClose={() => setImportFlow("idle")} onSuccess={handleImportSuccess} />}
      {importFlow === "paste" && <ImportStepPaste onClose={() => setImportFlow("idle")} onSuccess={handleImportSuccess} />}
      {importFlow === "success" && <ImportSuccessModal count={importCount} onClose={() => setImportFlow("idle")} />}
    </>
  );
}