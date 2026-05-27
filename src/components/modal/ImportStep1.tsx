import { useState } from "react";
import Overlay from "../Overlay";
import upload from "../../assets/upload.svg";
import uploadDark from "../../assets/uploadDark.svg";
import typePaste from "../../assets/typePaste.svg";
import typePasteLight from "../../assets/typePasteLight.svg";

function ImportStep1({ onClose, onNext }: { onClose: () => void; onNext: (type: "file" | "paste") => void }) {
  const [checked, setChecked] = useState(false);
  const [selected, setSelected] = useState<"file" | "paste" | null>(null);
  return (
    <Overlay>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-3xl">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-gray-900">Import Contacts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-4xl leading-none">&times;</button>
        </div>
        <p className="text-sm text-gray-500 mb-6">Choose Import Style</p>
            <div className="md:px-25">
                <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                    { type: "file" as const, icon: selected === "file" ? upload : uploadDark, label: "Upload contacts from file", sub: "(xlsx, csv, json, xml)" },
                    { type: "paste" as const, icon: selected === "paste" ? typePasteLight : typePaste, label: "Type or paste your contacts here.", sub: "" },
                ].map(o => (
                    <button
                    key={o.type}
                    onClick={() => setSelected(o.type)}
                    className={`border-2 rounded-xl p-10 flex flex-col items-center gap-2 transition-all ${selected === o.type ? "border-blue-500 bg-blue-50" : "border-gray-100 hover:border-blue-300 bg-gray-100"}`}
                    >
                    <div className={`p-5 rounded-full ${selected === o.type ? "bg-[#337DD3]" : "bg-gray-200"}`}>
                        <img className="w-10 h-10  flex items-center justify-center " src={o.icon} alt={o.label} />
                    </div>
                    <span className={`text-sm ${selected === o.type ? "text-blue-600" : "text-gray-600"} font-medium text-center`}>{o.label}</span>
                    {o.sub && <span className={`text-xs ${selected === o.type ? "text-blue-400" : "text-gray-400" }`}>{o.sub}</span>}
                    </button>
                ))}
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600 mb-6 cursor-pointer">
                <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="w-4 h-4 rounded border-gray-300 accent-blue-600" />
                I Verify That These Contacts Have Agreed To Receive My Messages.
                </label>
                <div className="flex gap-3 justify-center items-center">
                <button onClick={onClose} className="border border-gray-300 text-gray-700 text-sm font-semibold px-5 py-3 rounded-lg hover:bg-gray-50 transition-colors w-30">Cancel</button>
                <button
                    onClick={() => selected && checked && onNext(selected)}
                    disabled={!selected || !checked}
                    className="flex items-center justify-between gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors w-30"
                >
                    Next <span>⟶</span>
                </button>
                </div>
            </div>
      </div>
    </Overlay>
  );
}

export default ImportStep1;