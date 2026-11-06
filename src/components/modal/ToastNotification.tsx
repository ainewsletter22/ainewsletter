import { useEffect, useState } from "react";

type ToastType = "success" | "error";

export function useToast() {
    const [toast, setToast] = useState({
        isOpen: false,
        message: "",
        type: "success" as ToastType,
    });

    const showToast = (message: string, type: ToastType = "success") => {
        setToast({
            isOpen: true,
            message,
            type,
        });
    };

    const hideToast = () => {
        setToast((prev) => ({
            ...prev,
            isOpen: false,
        }));
    };

    // Automatically close the toast after the duration
    useEffect(() => {
        if (!toast.isOpen) return;

        const timer = setTimeout(() => {
            setToast((prev) => ({
                ...prev,
                isOpen: false,
            }));
        }, 4500);

        return () => clearTimeout(timer);
    }, [toast.isOpen, toast.message]);

    const ToastNotification = () => {
        const [isVisible, setIsVisible] = useState(false);

        useEffect(() => {
            if (!toast.isOpen) {
                setIsVisible(false);
                return;
            }

            const timer = setTimeout(() => setIsVisible(true), 10);

            return () => clearTimeout(timer);
        }, [toast.isOpen]);

        if (!toast.isOpen) return null;

        return (
            <div
                className={`fixed left-1/2 top-5 z-[900] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-xl bg-white px-5 py-4 text-blue-500 shadow-lg transition-all duration-300 ease-out ${
                    isVisible
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-24 opacity-0"
                    
                    } 
                    ${toast.type === "success" 
                        ? "border-blue-500 text-blue-500" 
                        : "border-red-500 text-red-500"
                    }
                    `
                    
                    }
                role={toast.type === "error" ? "alert" : "status"}
            >
                {toast.type === "success" ? (
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 20 20"
                        fill="none"
                        aria-hidden="true"
                        className="shrink-0"
                    >
                        <circle
                            cx="10"
                            cy="10"
                            r="7.5"
                            stroke="currentColor"
                            strokeWidth="1.4"
                        />
                        <path
                            d="M6.5 10.2l2.3 2.3 4.7-5"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                ) : (
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 20 20"
                        fill="none"
                        aria-hidden="true"
                        className="shrink-0"
                    >
                        <circle
                            cx="10"
                            cy="10"
                            r="7.5"
                            stroke="currentColor"
                            strokeWidth="1.4"
                        />
                        <path
                            d="M10 6.5v4.5"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                        />
                        <circle cx="10" cy="13.8" r="0.8" fill="currentColor" />
                    </svg>
                )}

                <p className="text-sm font-medium">{toast.message}</p>
            </div>
        );
    };

    return {
        showToast,
        hideToast,
        ToastNotification,
    };
}
