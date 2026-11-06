import { useState } from "react";
import Overlay from "../Overlay";

interface AddFolderModalProps {
    onClose: () => void;
    onAdd: (name: string) => Promise<void>;
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
    const [isLoading, setIsLoading] = useState(false);

    const isEditing = Boolean(folder);

    const handleSubmit = async () => {
        const trimmedName = name.trim();

        if (!trimmedName || isLoading) return;

        setIsLoading(true);

        try {
            await onAdd(trimmedName);
        } finally {
            setIsLoading(false);
        }
    };

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
                    disabled={isLoading}
                />

                {error && (
                    <div className="mb-4 text-sm text-red-600">{error}</div>
                )}

                <div className="flex justify-center gap-3">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!name.trim() || isLoading}
                        className="flex items-center gap-2 bg-[#337DD3] hover:bg-[#075ec3] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                    >
                        {isLoading ? (
                            <>
                                <svg
                                    className="animate-spin h-4 w-4"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                    />
                                </svg>
                                {isEditing ? "Saving..." : "Adding..."}
                            </>
                        ) : (
                            <>
                                <span className="text-lg leading-none">
                                    {isEditing ? "✓" : "+"}
                                </span>
                                {isEditing ? "Save Changes" : "Add New Group"}
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="border border-gray-300 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Overlay>
    );
}

export default AddFolderModal;