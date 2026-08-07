import { useMemo, useState } from "react";
import type { ImportedField, ParsedImportData } from "../../utils/importParser";
import { mapHeaderIndexes, extractRowValues } from "../../utils/importParser";

const FIELD_LABELS: Record<ImportedField, string> = {
  fullName: "Full Name",
  lastName: "Last Name",
  phone: "Phone Number",
  email: "Email Address",
  website: "Website",
};

function ImportStepReview({
  onClose,
  onBack,
  data,
  onImport,
}: {
  onClose: () => void;
  onBack: () => void;
  data: ParsedImportData;
  onImport: (rows: string[][], selectedFields: ImportedField[]) => void;
}) {
  const [selectedFields, setSelectedFields] = useState<ImportedField[]>(["fullName", "email", "phone"]);
  const headerMap = useMemo(() => (data.headers ? mapHeaderIndexes(data.headers) : undefined), [data.headers]);
  const previewRows = data.rows.slice(0, 5);

  const toggleField = (field: ImportedField) => {
    setSelectedFields(prev =>
      prev.includes(field) ? prev.filter(item => item !== field) : [...prev, field]
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-3xl">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-gray-900">Import Contacts</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-4xl leading-none">&times;</button>
      </div>
      <p className="text-sm text-gray-500 mb-4">Review and map your columns before importing.</p>
      <div className="grid grid-cols-1 gap-4 mb-6">
        <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50">
          <p className="text-sm font-semibold text-gray-700 mb-3">Mapped fields</p>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(FIELD_LABELS) as ImportedField[]).map((field) => (
              <button
                key={field}
                type="button"
                onClick={() => toggleField(field)}
                className={`rounded-xl border px-3 py-2 text-sm text-left transition ${selectedFields.includes(field) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600"}`}
              >
                <div className="font-semibold">{FIELD_LABELS[field]}</div>
                <div className="text-xs text-gray-500">{selectedFields.includes(field) ? "Included" : "Ignored"}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-200 p-3 bg-white">
          <table className="min-w-full text-left text-sm text-gray-700">
            <thead>
              <tr>
                {(data.headers ?? previewRows[0]?.map((_, index) => `Column ${index + 1}`)).map((header, index) => (
                  <th key={index} className="px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-gray-50" : ""}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 align-top whitespace-pre-wrap max-w-55">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50">
          <p className="text-sm font-semibold text-gray-700 mb-2">Auto-detected fields</p>
          {previewRows.map((row, index) => {
            const extracted = extractRowValues(row, selectedFields, headerMap);
            return (
              <div key={index} className="mb-3 rounded-xl bg-white p-3 border border-gray-200">
                <div className="text-xs uppercase text-gray-500 mb-2">Row {index + 1}</div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                  {Object.entries(extracted).map(([field, value]) => (
                    <div key={field} className="rounded-lg bg-gray-100 p-2">
                      <div className="font-semibold">{FIELD_LABELS[field as ImportedField]}</div>
                      <div>{value ?? "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button onClick={onBack} className="border border-gray-300 text-gray-700 text-sm font-semibold px-5 py-3 rounded-lg hover:bg-gray-50 transition-colors">Back</button>
        <button
          onClick={() => onImport(data.rows, selectedFields)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-3 rounded-lg transition-colors"
        >
          Import {data.rows.length} Contacts
        </button>
      </div>
    </div>
  );
}

export default ImportStepReview;
