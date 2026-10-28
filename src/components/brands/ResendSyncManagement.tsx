import { useState, useEffect } from "react";
import { broadcastService } from "../../services/broadcastService";
import { clientService } from "../../services/clientService";
import type { Category } from "../../types/domain";

interface Props {
    brandId: number;
    disabled?: boolean;
}

export function ResendSyncManagement({
    brandId: _brandId,
    disabled = false,
}: Props) {
    const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
    const [deleting, setDeleting] = useState(false);
    const [message, setMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [syncedCategoryIds, setSyncedCategoryIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const MAX_SYNCED_CATEGORIES = 3;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [cats, syncedData] = await Promise.all([
                    clientService.getCategories(),
                    broadcastService.getSyncedCategories(),
                ]);
                setCategories(cats);
                const syncedIds = syncedData.synced_categories.map(cat => cat.client_cat_id);
                setSyncedCategoryIds(syncedIds);
            } catch (error) {
                console.error("Failed to fetch data:", error);
                setMessage({
                    type: "error",
                    text: "Failed to load categories. Please try again.",
                });
            } finally {
                setLoading(false);
            }
        };
        void fetchData();
    }, []);

    const handleDelete = async () => {
        if (selectedCategories.length === 0 || deleting) return;

        setDeleting(true);
        setMessage(null);

        try {
            const result =
                await broadcastService.deleteClientCategoriesFromResend(
                    selectedCategories,
                );
            console.log(result);

            // Refresh synced categories after successful deletion
            const syncedData = await broadcastService.getSyncedCategories();
            const syncedIds = syncedData.synced_categories.map(cat => cat.client_cat_id);
            setSyncedCategoryIds(syncedIds);

            setMessage({
                type: "success",
                text: `Successfully removed synced data for ${selectedCategories.length} categories from Email Server`,
            });
            setSelectedCategories([]);
        } catch (error: any) {
            console.error("Failed to delete from Email Server:", error);

            const errorMessage = error?.response?.data?.message || error?.message || "Failed to remove synced data from Resend. Please try again.";
            setMessage({
                type: "error",
                text: errorMessage,
            });
        } finally {
            setDeleting(false);
        }
    };

    const toggleCategory = (id: number) => {
        setSelectedCategories((prev) =>
            prev.includes(id)
                ? prev.filter((catId) => catId !== id)
                : [...prev, id],
        );
    };

    // Auto-select categories that are already synced
    useEffect(() => {
        setSelectedCategories(syncedCategoryIds);
    }, [syncedCategoryIds]);

    if (loading) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center">
                <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                        Email Server Sync Management
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                        Sync client categories to Email Server (Max {MAX_SYNCED_CATEGORIES} categories per plan)
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Selected: {selectedCategories.length}/{MAX_SYNCED_CATEGORIES}
                    </p>
                </div>
                <button
                    onClick={() => setSelectedCategories([])}
                    disabled={
                        disabled || deleting || selectedCategories.length === 0
                    }
                    className="w-full sm:w-auto sm:ml-auto py-2 px-4 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    Clear Selection
                </button>
            </div>

            {/* Category Selection */}
            <div className="space-y-2 mb-4">
                {categories.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                        No categories available
                    </p>
                ) : (
                    categories.map((category) => (
                        <label
                            key={category.id}
                            className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                selectedCategories.includes(category.id)
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 bg-white hover:border-gray-300"
                            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={selectedCategories.includes(
                                        category.id,
                                    )}
                                    onChange={() =>
                                        !disabled && toggleCategory(category.id)
                                    }
                                    disabled={disabled || deleting}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        {category.name}
                                    </p>
                                    {category.description && (
                                        <p className="text-xs text-gray-500">
                                            {category.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {syncedCategoryIds.includes(category.id) && (
                                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                                    Synced
                                </span>
                            )}
                        </label>
                    ))
                )}
            </div>

            {/* Message Display */}
            {message && (
                <div
                    className={`mb-4 p-3 rounded-lg text-sm ${
                        message.type === "success"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                >
                    {message.text}
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
                <button
                    onClick={handleDelete}
                    disabled={
                        disabled || deleting || selectedCategories.length === 0
                    }
                    className="flex-1 py-2 px-4 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {deleting
                        ? "Removing..."
                        : "Remove from Email Sending Server"}
                </button>
                {/* <button
                    onClick={handleSave}
                    disabled={
                        disabled || deleting || selectedCategories.length === 0
                    }
                    className="flex-1 py-2 px-4 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? "Saving..." : "Save to Email Sending Server"}
                </button> */}
            </div>

           
        </div>
    );
}
