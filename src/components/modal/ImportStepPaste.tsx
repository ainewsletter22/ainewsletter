import { useState } from "react";
import Overlay from "../Overlay";

function ImportStepPaste({ onClose, onSuccess }: { onClose: () => void; onSuccess: (count: number) => void }) {
  const [text, setText] = useState("");
  return (
    <Overlay>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-2xl">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-gray-900">Import Contacts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Type Or Paste Your Contacts Here.</p>
        <textarea
          className="w-full border border-gray-200 rounded-xl p-4 text-sm text-gray-600 resize-none h-55 focus:outline-none focus:ring-2 focus:ring-blue-500 my-7"
          placeholder="@email1, @email2, @email3...."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <div className="flex gap-3 justify-center items-center">
          <button onClick={onClose} className="border border-gray-300 text-gray-700 text-sm font-semibold px-5 py-3 rounded-lg hover:bg-gray-50 transition-colors w-30">Cancel</button>
          <button
            onClick={() => text.trim() && onSuccess(text.split(",").length)}
            disabled={!text.trim()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-3 rounded-lg transition-colors"
          >
            + Add Contact
          </button>
        </div>
      </div>
    </Overlay>
  );
}

export default ImportStepPaste;