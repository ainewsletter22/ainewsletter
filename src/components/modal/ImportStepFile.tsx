import { useRef, useState } from "react";
import Overlay from "../Overlay";
import { parseTextToRows } from "../../utils/importParser";
import type { ParsedImportData } from "../../types/domain";

function ImportStepFile({ onClose, onSuccess }: { onClose: () => void; onSuccess: (data: ParsedImportData) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = async (selectedFile: File) => {
    try {
      const text = await selectedFile.text();
      const parsed = parseTextToRows(text);
      if (parsed.rows.length === 0) {
        setError("The selected file does not contain any importable rows.");
        return;
      }
      onSuccess(parsed);
    } catch (err) {
      setError("Unable to read the file. Please choose a valid CSV or text file.");
      console.error(err);
    }
  };

  return (
    <Overlay>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-2xl">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-gray-900">Import Contacts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Choose a CSV or text file containing contact rows.</p>
        <p className="text-xs font-semibold text-gray-700 mt-10 mb-4">
          <span className="font-bold">DATA:</span> (CSV, TXT) with columns like Full Name, Phone Number, Email Address, Website
        </p>
        <div
          className="border-2 border-dashed border-gray-200 rounded-xl h-55 flex flex-col items-center justify-center gap-3 mb-6 cursor-pointer hover:border-blue-400 transition-colors bg-gray-50"
          onClick={() => inputRef.current?.click()}
          onDrop={e => { e.preventDefault(); setFile(e.dataTransfer.files[0]); }}
          onDragOver={e => e.preventDefault()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={e => {
              const next = e.target.files?.[0] ?? null;
              setFile(next);
              if (next) void readFile(next);
            }}
          />
          {file ? (
            <span className="text-sm text-blue-600 font-medium">{file.name}</span>
          ) : (
            <>
              <span className="text-sm text-gray-500">Drop file here or</span>
              <button className="border border-gray-300 text-gray-700 text-sm px-4 py-1.5 rounded-lg hover:bg-gray-100">Choose file</button>
            </>
          )}
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </div>
        <div className="flex gap-3 justify-center items-center">
          <button onClick={onClose} className="border border-gray-300 text-gray-700 text-sm font-semibold px-5 py-3 rounded-lg hover:bg-gray-50 w-30">Cancel</button>
          <button
            onClick={() => file && void readFile(file)}
            disabled={!file}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-3 rounded-lg transition-colors"
          >
            + Import File
          </button>
        </div>
      </div>
    </Overlay>
  );
}

export default ImportStepFile;