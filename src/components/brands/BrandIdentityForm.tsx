import { useRef, useState, type ChangeEvent } from "react";
import type { BrandFormValues } from "../../types/Types";
import { Btn } from "../Modalshells";

interface Props {
  initial: BrandFormValues;
  onCancel: () => void;
  onSave: (values: BrandFormValues) => void;
  saving?: boolean;
  saveLabel?: string;
}

function BrandIdentityForm({ initial, onCancel, onSave, saving, saveLabel = "Save Changes" }: Props) {
  const [values, setValues] = useState<BrandFormValues>(initial);
  const [preview, setPreview] = useState<string | undefined>(initial.logo);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof BrandFormValues) => (e: ChangeEvent<HTMLInputElement>) =>
    setValues(v => ({ ...v, [key]: e.target.value }));

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setValues(v => ({ ...v, logo: url }));
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Brand name</label>
          <input
            value={values.name}
            onChange={set("name")}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">From name</label>
          <input
            value={values.fromName}
            onChange={set("fromName")}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">From email</label>
          <input
            value={values.fromEmail}
            onChange={set("fromEmail")}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Reply to email</label>
          <input
            value={values.replyToEmail}
            onChange={set("replyToEmail")}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Brand logo <span className="text-gray-400 font-normal">(32 x 32 pixel, jpeg, jpg, gif or png format)</span>
          </label>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif" className="hidden" onChange={handleFile} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Choose file
          </button>
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

      <div className="flex gap-3 mt-8">
        <Btn variant="outline" onClick={onCancel}>
          ✕ Cancel
        </Btn>
        <Btn onClick={() => onSave(values)} disabled={saving}>
          {saving ? "Saving..." : saveLabel}
        </Btn>
      </div>
    </div>
  );
}

export default BrandIdentityForm;