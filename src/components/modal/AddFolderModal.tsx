import { useState } from "react";
import Overlay from "../Overlay";

interface AddFolderModalProps {
    onClose: () => void;
    onAdd: (name: string) => void;
    error?: string;
    folder?: {
        id: number;
        name: string;
        totalClients: number;
        createdDate: string;
    } | null;
}

function AddFolderModal({
    onClose,
    onAdd,
    error,
    folder,
}: AddFolderModalProps) {
    const [name, setName] = useState(folder?.name ?? "");
    const isEditing = Boolean(folder);

    return (
        <Overlay>
            <div className="bg-white shadow-2xl p-8 w-full max-w-lg">
                <h2 className="text-xl font-bold text-gray-900 mb-10">
                    {isEditing ? "Edit Group" : "Add New Group"}
                </h2>

                <label
                    htmlFor="folder-name"
                    className="block text-sm font-medium text-gray-700 mb-3"
                >
                    Group Name:
                </label>

                <input
                    id="folder-name"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter group name"
                />

                {error && (
                    <div className="mb-4 text-sm text-red-600">{error}</div>
                )}

                <div className="flex justify-center gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            const trimmedName = name.trim();
                            if (trimmedName) {
                                onAdd(trimmedName);
                            }
                        }}
                        className="flex items-center gap-2 bg-[#337DD3] hover:bg-[#075ec3] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                    >
                        <span className="text-lg leading-none">
                            {isEditing ? "✓" : "+"}
                        </span>
                        {isEditing ? "Save Changes" : "Add New Group"}
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="border border-gray-300 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Overlay>
    );
}

export default AddFolderModal;
