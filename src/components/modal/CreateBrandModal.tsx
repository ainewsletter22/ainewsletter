import { useState, type ChangeEvent } from "react";
import { Overlay, ModalCard, Btn } from "../Modalshells";
import type { BrandFormValues } from "../../types/Types";

interface Props {
  onClose: () => void;
  onCreate: (values: BrandFormValues) => void;
  creating?: boolean;
}

const EMPTY: BrandFormValues = { name: "", fromName: "", fromEmail: "", replyToEmail: "", resendApiKey: "" };

export function CreateBrandModal({ onClose, onCreate, creating }: Props) {
  const [values, setValues] = useState<BrandFormValues>(EMPTY);
  const [preview, setPreview] = useState<string | undefined>();

  const set = (key: Exclude<keyof BrandFormValues, 'logo'>) => (e: ChangeEvent<HTMLInputElement>) =>
    setValues(v => ({ ...v, [key]: e.target.value }));

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setValues(v => ({ ...v, logo: file }));
  };

  const canContinue = Boolean(values.name.trim() && values.fromName.trim() && values.fromEmail.trim() && values.replyToEmail.trim());

  return (
    <Overlay onClose={onClose}>
      <ModalCard className="max-w-2xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          Create A <span className="text-blue-600">New Brand</span>
        </h2>
        <p className="text-sm font-semibold text-blue-600 mb-8">Edit Brand</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Brand name</label>
            <input value={values.name} onChange={set("name")} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From name</label>
            <input value={values.fromName} onChange={set("fromName")} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From email</label>
            <input value={values.fromEmail} onChange={set("fromEmail")} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reply to email</label>
            <input value={values.replyToEmail} onChange={set("replyToEmail")} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Resend API key</label>
            <input value={values.resendApiKey ?? ""} onChange={set("resendApiKey")} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional: API key for resend service" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand logo
              <span className="text-gray-400 font-normal block text-xs">(32 x 32 pixel, jpeg, jpg, gif or png format)</span>
            </label>
            <label className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-500 cursor-pointer hover:bg-gray-50 w-fit">
              Choose file
              <input type="file" accept="image/png,image/jpeg,image/gif" className="hidden" onChange={handleFile} />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
            <div className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
              {preview ? (
                <img src={preview} alt="Brand logo preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-300 text-2xl">🖼</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center mt-10">
          <Btn variant="outline" onClick={onClose}>
            ✕ Cancel
          </Btn>
          <Btn onClick={() => canContinue && onCreate(values)} disabled={!canContinue || creating}>
            {creating ? "Creating..." : "Continue"} <span>→</span>
          </Btn>
        </div>
      </ModalCard>
    </Overlay>
  );
}