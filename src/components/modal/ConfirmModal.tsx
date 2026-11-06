import { useEffect } from "react";

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    loading?: boolean;
    error?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmLabel = "Delete",
    loading = false,
    error,
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !loading) onCancel();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, loading, onCancel]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/40"
                onClick={loading ? undefined : onCancel}
            />
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                aria-describedby="confirm-message"
                className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            >
                <h2 id="confirm-title" className="mb-2 text-lg font-bold text-gray-900">
                    {title}
                </h2>
                <p id="confirm-message" className="mb-5 text-sm text-gray-600">
                    {message}
                </p>

                {error && (
                    <p role="alert" className="mb-4 rounded-lg border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {error}
                    </p>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="cursor-pointer rounded-lg px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        autoFocus
                        className="cursor-pointer rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                        {loading ? "Deleting..." : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}