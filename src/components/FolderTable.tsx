import { useState } from "react";
import searchIcon from "../assets/searchIconBAW.svg";
import editIcon from "../assets/editIcon.svg";
import viewIcon from "../assets/viewableIcon.svg";
import deleteIcon from "../assets/trashIcon.svg";

interface Folder {
  id: number;
  name: string;
  totalClients: number;
  createdDate: string;
}

function FolderTable({
  folders, onSelect, onEdit, onDelete, onAddFolder,
}: {
  folders: Folder[];
  onSelect: (f: Folder) => void;
  onEdit: (f: Folder) => void;
  onDelete: (id: number) => void;
  onAddFolder: () => void;
}) {
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(8);
  const [page, setPage] = useState(1);
 
  const filtered = folders.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / show);
  const paginated = filtered.slice((page - 1) * show, page * show);
 
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Manage Clients</h1>
          <p className="text-gray-500 text-sm mt-1">Organize and manage your saved Clients</p>
        </div>
 
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onAddFolder}
            className="flex items-center gap-2 bg-[#337DD3] hover:bg-[#0958b4] text-white text-sm font-semibold px-4 py-4 rounded-lg transition-colors shadow-sm"
          >
            <span className="text-lg leading-none">+</span> Add New Folder
          </button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"><img src={searchIcon} alt="Search" /></span>
              <input
                className="pl-9 pr-4 py-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56 bg-white"
                placeholder="Search..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <span className="text-sm text-gray-500">Show</span>
            <select
              value={show}
              onChange={e => { setShow(Number(e.target.value)); setPage(1); }}
              className="border border-gray-200 rounded-lg px-4 py-4 text-sm focus:outline-none bg-white"
            >
              {[8, 16, 24].map(n => <option key={n}>{n}</option>)}
            </select>
            <span className="text-sm text-gray-500">Entries</span>
          </div>
        </div>
 
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["#", "My Client Folder", "Total Clients", "Created Date", "Actions"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((f, i) => (
                <tr key={f.id} className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                  <td className="px-4 py-3 text-sm text-gray-500">{(page - 1) * show + i + 1}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => onSelect(f)} className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium text-left">
                      {f.name}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => onSelect(f)} className="text-sm text-blue-600 hover:underline">{f.totalClients}</button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{f.createdDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => onEdit(f)} className="p-2 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors" title="Edit"><img src={editIcon} className="w-5 h-5" alt="Edit" /></button>
                      <button onClick={() => onDelete(f.id)} className="p-2 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors" title="Delete"><img src={deleteIcon} className="w-5 h-5" alt="Delete" /></button>
                      <button onClick={() => onSelect(f)} className="p-2 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors" title="View"><img src={viewIcon} className="w-5 h-5" alt="View" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
 
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100">
            <span className="text-sm text-gray-500">Showing {(page - 1) * show + 1} to {Math.min(page * show, filtered.length)} of {filtered.length} entries</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">←</button>
              {Array.from({ length: Math.min(totalPages, 6) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                >
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">→</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FolderTable;