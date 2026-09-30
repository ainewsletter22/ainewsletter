import { useState } from "react";
import Overlay from "../Overlay";

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
 

function AddClientModal({ onClose, onAdd, error: externalError }: { onClose: () => void; onAdd: (c: Partial<Client>) => Promise<void>; error?: string }) {
  const [form, setForm] = useState({ businessName: "", phone: "", email: "", website: "" });
  const [error, setError] = useState("");
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    if (error) setError("");
  };

  const isValidUrl = (url: string) => {
    if (!url.trim()) return true; // Empty is allowed
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    setError("");
    if (!form.businessName.trim() || !form.email.trim()) {
      setError("Client name and email are required.");
      return;
    }

    if (form.website.trim() && !isValidUrl(form.website)) {
      setError("Website must be a valid URL with protocol (e.g., https://example.com).");
      return;
    }

    await onAdd({ ...form, group: "Not Contacted", emailsSent: 0 });
  };

  return (
    <Overlay>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Add New Client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="grid grid-cols-2 gap-10 mb-7">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Full Name</label>
            <input className="w-full bg-gray-100 rounded-lg px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Client Name" value={form.businessName} onChange={set("businessName")} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Phone</label>
            <input className="w-full bg-gray-100 rounded-lg px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Client Phone number" value={form.phone} onChange={set("phone")} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Email Address</label>
            <input className="w-full bg-gray-100 rounded-lg px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Client Email" value={form.email} onChange={set("email")} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 flex justify-between items-center">Website <span className="text-gray-400">Optional</span></label>
            <input className="w-full bg-gray-100 rounded-lg px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Client Website" value={form.website} onChange={set("website")} />
          </div>
        </div>
        {(error || externalError) ? <div className="mb-4 text-sm text-red-600">{error || externalError}</div> : null}
        <button
          onClick={handleSave}
          className="bg-[#337DD3] hover:bg-[#0a65cd] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          + Save Client
        </button>
      </div>
    </Overlay>
  );
}

export default AddClientModal;