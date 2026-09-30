import { useState } from "react";
import type { SendVia } from "../../types/Types";
import { brandService } from "../../services/brandService";

interface Props {
  brandId: number;
  currentMode: SendVia | undefined;
  onModeChange: (mode: SendVia) => void;
  disabled?: boolean;
}

export function SendModeSwitch({ brandId, currentMode, onModeChange, disabled = false }: Props) {
  const [saving, setSaving] = useState(false);
  const [localMode, setLocalMode] = useState<SendVia>(currentMode || "campaign");

  const handleModeChange = async (newMode: SendVia) => {
    if (disabled || saving) return;
    
    setSaving(true);
    try {
      await brandService.updateSendVia(brandId, newMode);
      setLocalMode(newMode);
      onModeChange(newMode);
    } catch (error) {
      console.error("Failed to update send mode:", error);
      // Revert on error
      setLocalMode(currentMode || "campaign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Send Mode</h3>
          <p className="text-xs text-gray-500 mt-1">
            Choose between broadcast (transactional) or campaign sending
          </p>
        </div>
        {saving && (
          <span className="text-xs text-blue-600 font-medium">Saving...</span>
        )}
      </div>

      {/* Placeholder Design - Toggle Switch */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => handleModeChange("broadcast")}
          disabled={disabled || saving}
          className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
            localMode === "broadcast"
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
          } ${disabled || saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="font-semibold">Broadcast</span>
            <span className="text-xs opacity-75">Transactional Pool</span>
          </div>
        </button>

        <button
          onClick={() => handleModeChange("campaign")}
          disabled={disabled || saving}
          className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
            localMode === "campaign"
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
          } ${disabled || saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="font-semibold">Campaign</span>
            <span className="text-xs opacity-75">Normal Sending</span>
          </div>
        </button>
      </div>

      {/* Mode Info Cards */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className={`p-3 rounded-lg text-xs ${localMode === "broadcast" ? "bg-blue-50 border border-blue-200" : "bg-gray-50 border border-gray-200"}`}>
          <p className="font-semibold text-gray-800 mb-1">Broadcast Limits:</p>
          <ul className="space-y-1 text-gray-600">
            <li>• Max 250k clients/category</li>
            <li>• Max 3 categories/send</li>
            <li>• Transactional pool</li>
          </ul>
        </div>
        <div className={`p-3 rounded-lg text-xs ${localMode === "campaign" ? "bg-blue-50 border border-blue-200" : "bg-gray-50 border border-gray-200"}`}>
          <p className="font-semibold text-gray-800 mb-1">Campaign Limits:</p>
          <ul className="space-y-1 text-gray-600">
            <li>• Up to 2.5M clients</li>
            <li>• No category limits</li>
            <li>• Campaign pool</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
