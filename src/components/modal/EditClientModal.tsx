import { useState, useEffect } from "react";

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
}

interface EditClientModalProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, payload: any) => Promise<void>;
}

const Input = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (val: string) => void; type?: string }) => (
  <div className="mb-3">
    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{label}</label>
    <input
      type={type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
    />
  </div>
);

export default function EditClientModal({ client, isOpen, onClose, onSave }: EditClientModalProps) {
  const [formData, setFormData] = useState({ ...client });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData({ ...client });
  }, [client]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Map frontend keys to backend snake_case
      // Using "Kitchen Sink" approach to satisfy inconsistent backend naming
      const payload = {
        display_name: formData.businessName,
        business_name: formData.businessName,
        email_1: formData.email,
        email: formData.email,
        phone: formData.phone,
        site: formData.website,
        website: formData.website,
        google_maps_url: formData.gmb,
        facebook_url: formData.facebook,
        twitter_url: formData.twitter,
        instagram_url: formData.instagram,
        yelp_url: formData.yelp,
      };
      await onSave(client.id, payload);
      onClose();
    } catch (error) {
      // Extract specific error message from backend if available
      const axiosError = error as any;
      const serverMessage = axiosError.response?.data?.message || axiosError.response?.data?.error;
      
      console.error("Update failed detail:", axiosError.response?.data || axiosError);
      alert(`Failed to update: ${serverMessage || "Check console for validation errors"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Edit Client Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 overflow-y-auto max-h-[60vh] pr-2">
            <div className="col-span-full">
              <Input label="Business Name" value={formData.businessName} onChange={(v) => setFormData({ ...formData, businessName: v })} />
            </div>
            <Input label="Email Address" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} type="email" />
            <Input label="Phone Number" value={formData.phone || ""} onChange={(v) => setFormData({ ...formData, phone: v })} />
            <Input label="Website" value={formData.website || ""} onChange={(v) => setFormData({ ...formData, website: v })} />
            <Input label="Google Maps (GMB) URL" value={formData.gmb || ""} onChange={(v) => setFormData({ ...formData, gmb: v })} />
            
            <div className="col-span-full mt-4 mb-2">
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest border-b border-blue-50 pb-1">Social Media Handles</h3>
            </div>
            
            <Input label="Facebook URL" value={formData.facebook || ""} onChange={(v) => setFormData({ ...formData, facebook: v })} />
            <Input label="Twitter (X) URL" value={formData.twitter || ""} onChange={(v) => setFormData({ ...formData, twitter: v })} />
            <Input label="Instagram URL" value={formData.instagram || ""} onChange={(v) => setFormData({ ...formData, instagram: v })} />
            <Input label="Yelp URL" value={formData.yelp || ""} onChange={(v) => setFormData({ ...formData, yelp: v })} />
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-all shadow-md disabled:opacity-50"
            >
              {loading ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}