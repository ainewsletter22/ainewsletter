import { useState } from "react";
import clientBadge from "../assets/clientBadge.svg";
import clientBadgeDark from "../assets/clientBadgeDark.svg";
import emailBadge from "../assets/emailBadge.svg";
import emailBadgeLight from "../assets/emailBadgeLight.svg";
import email from "../assets/email.svg";
import exportContact from "../assets/exportContact.svg";
import importContact from "../assets/importContact.svg";
import searchIcon from "../assets/searchIconBAW.svg";
import trashIcon from "../assets/trashIcon.svg";

// type ImportFlow = "idle" | "step1" | "file" | "paste" | "success";

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

function ClientDetailView({
  folder, clients, onBack, onAddClient, onImport, onDeleteClient,
}: {
  folder: Folder;
  clients: Client[];
  onBack: () => void;
  onAddClient: () => void;
  onImport: () => void;
  onDeleteClient: (id: number) => void;
}) {
  const [activeTab, setActiveTab] = useState<"clients" | "emails">("clients");
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(10);
  const [page, setPage] = useState(1);
 
  const emailsSentCount = clients.filter(c => c.group === "Contacted").length;
  const filtered = clients.filter(c =>
    c.businessName.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / show);
  const paginated = filtered.slice((page - 1) * show, page * show);
 
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Clients</h1>
          <p className="text-gray-500 text-sm mt-1">Organize and manage your saved Clients</p>
        </div>
 
        {/* Stats tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab("clients")}
              className={`flex items-center gap-3 px-7 py-5 rounded-xl font-semibold text-sm transition-all ${activeTab === "clients" ? "bg-[#337DD3] text-white shadow-md" : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300"}`}
            >
              <span className="text-xl"><img src={activeTab === "clients" ? clientBadge : clientBadgeDark} alt="Client Badge" /></span>
              <div className="text-left">
                <div className="text-lg font-bold leading-none">{folder.totalClients}</div>
                <div className={`text-xs ${activeTab === "clients" ? "text-blue-100" : "text-gray-400"}`}>Clients</div>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("emails")}
              className={`flex items-center gap-3 px-7 py-5 rounded-xl font-semibold text-sm transition-all ${activeTab === "emails" ? "bg-[#337DD3] text-white shadow-md" : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300"}`}
            >
              <span className="text-xl"><img src={activeTab === "emails" ? emailBadgeLight : emailBadge} alt="Email Badge" /></span>
              <div className="text-left">
                <div className="text-lg font-bold leading-none">120</div>
                <div className={`text-xs ${activeTab === "emails" ? "text-blue-100" : "text-gray-400"}`}>Emails</div>
              </div>
            </button>
          </div>
          <button onClick={onBack} className="border border-gray-300 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors bg-white">
            Back to folder
          </button>
        </div>
 
        {/* Client table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-13 h-13 rounded-full flex items-center justify-center text-white font-bold text-sm ${emailsSentCount > 0 ? "bg-blue-600" : "bg-gray-300"}`}>
                {emailsSentCount}
              </div>
              <span className="text-sm font-medium text-gray-700">Emails Sent</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => {}} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-xs font-semibold px-3 py-4 rounded-lg hover:bg-gray-50 transition-colors">
                    <img src={exportContact} className="w-5 h-5" alt="Export Contacts" /> EXPORT CONTACTS
              </button>
              <button onClick={onImport} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-xs font-semibold px-3 py-4 rounded-lg hover:bg-gray-50 transition-colors">
                <img src={importContact} className="w-5 h-5" alt="Import Contact" /> IMPORT CONTACT
              </button>
              <button onClick={onAddClient} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-4 rounded-lg transition-colors">
                + ADD NEW CLIENT
              </button>
              <span className="text-xs text-gray-400">Show</span>
              <select value={show} onChange={e => { setShow(Number(e.target.value)); setPage(1); }} className="border border-gray-200 rounded-lg px-4 py-4 text-xs focus:outline-none bg-white">
                {[10, 25, 50].map(n => <option key={n}>{n}</option>)}
              </select>
              <span className="text-xs text-gray-400">Entries</span>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"><img src={searchIcon} className="w-5 h-5" alt="Search" /></span>
                <input
                  className="pl-7 pr-3 py-4 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-70 bg-white"
                  placeholder="Search..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
            </div>
          </div>
 
          {activeTab === "clients" ? (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Client Name", "Email", "Phone", "Website", "GMB", "Facebook", "X (twitter)", "Instagram", "Yelp", "Action"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((c, i) => (
                  <tr key={c.id} className={`border-b border-gray-50 hover:bg-blue-50/20 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                    <td className="px-3 py-5 text-sm text-gray-800 font-medium whitespace-nowrap">{c.businessName}</td>
                    <td className="px-3 py-5 text-sm text-gray-600 whitespace-nowrap">{c.email}</td>
                    <td className="px-3 py-5 text-sm text-blue-600 whitespace-nowrap">{c.phone ?? "—"}</td>
                    <td className="px-3 py-5 text-sm text-blue-600 whitespace-nowrap">{c.website ?? "—"}</td>
                    {["GMB", "FB", "X", "IG", "Yelp"].map((s, si) => (
                      <td key={s} className="px-3 py-5">
                        <button className={`text-xs font-medium px-5 py-2 rounded-lg ${["bg-[rgba(219,142,17,0.18)] text-[#DB8E11]", "bg-[rgba(33,79,212,0.18)] text-[#214FD4]", "bg-[rgba(105,105,105,0.18)] text-[#696969]", "bg-[rgba(222,89,107,0.18)] text-[#DE596B]", "bg-[rgba(250,63,63,0.18)] text-[#FA3F3F]"][si]}`}>
                          Visit
                        </button>
                      </td>
                    ))}
                    <td className="px-3 py-5">
                      <button onClick={() => onDeleteClient(c.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors" title="Delete"><img src={trashIcon} alt="trash" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Business Name", "Email", "Group", <img src={emailBadge} alt="Email" />, "Actions"].map((h, index) => (
                    <th key={index} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((c, i) => (
                  <tr key={c.id} className={`border-b border-gray-50 hover:bg-blue-50/20 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                    <td className="px-4 py-5 text-sm text-gray-800 font-medium">{c.businessName}</td>
                    <td className="px-4 py-5 text-sm text-gray-600">{c.email}</td>
                    <td className="px-4 py-5">
                      <button className={`text-sm font-medium px-1 ${c.group === "Contacted" ? "text-green-600" : "text-blue-500"}`}>{c.group}</button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.emailsSent}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"><img src={email} className="h-5 w-5" alt="Email" /></button>
                        <button onClick={() => onDeleteClient(c.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"><img src={trashIcon} className="h-5 w-5" alt="trash" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
 
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100">
            <span className="text-sm text-gray-500">Showing {(page - 1) * show + 1} to {Math.min(page * show, filtered.length)} of {filtered.length} entries</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">←</button>
              {Array.from({ length: Math.min(totalPages, 6) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">→</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClientDetailView;