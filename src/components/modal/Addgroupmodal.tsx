import { useState } from "react";

interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (groupName: string) => void;
}

export default function AddGroupModal({ isOpen, onClose, onAdd }: AddGroupModalProps) {
  const [groupName, setGroupName] = useState("");

  const handleAdd = () => {
    if (groupName.trim()) {
      onAdd(groupName.trim());
      setGroupName("");
    }
  };

  const handleClose = () => {
    setGroupName("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white shadow-2xl w-full max-w-lg mx-4 px-15 py-20 z-10">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Add New Group</h2>

        {/* Group Name field */}
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Group Name :
        </label>
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white mb-8"
          placeholder=""
          autoFocus
        />

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg text-sm transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Add New Group
          </button>
          <button
            onClick={handleClose}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}