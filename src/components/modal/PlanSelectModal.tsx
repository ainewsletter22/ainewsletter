import { useEffect, useState } from "react";
import { plansService } from "../../services/plansService"; // adjust path

interface PlanSelectionModalProps {
    isOpen?: boolean;
    onClose?: () => void;
    onSelect?: (planId: number) => void;
}

interface PlanDetails {
    title: string;
    description: string;
    features: string[];
    featured: boolean;
}

interface DisplayPlan extends PlanDetails {
    // inherits everything from PlanDetails, while adding two new fields.
    id: number;
    name: string;
}

// Keyed by lowercase API plan name
const PLAN_DETAILS: Record<string, PlanDetails> = {
    marketing: {
        title: "Email Marketing Made Easy",
        description:
            "Engage your audience with beautiful emails that drive results and are simple to create.",
        features: [
            "AI Agent Auto-Generation, Sending and Scheduling.",
            "Create AI Agents That Run Campaigns For You.",
            "Everything you need in one place.",
            "Bring your list and grow further.",
            "View and control unsubscribe status.",
            "Audience metrics.",
            "Automatic unsubscribes.",
            "Analyze and track performance.",
            "One platform for all your email needs.",
            "Do more with your time.",
        ],
        featured: false,
    },
    transactional: {
        title: "From Idea To Email Delivered",
        description: "Start sending transactional emails with a robust API.",
        features: [
            "Send emails with your favorite Agents.",
            "Connect easily with any service.",
            "Bring your list and grow further.",
            "Complete visibility of your API calls.",
            "View and control unsubscribe status.",
            "Audience metrics.",
            "Automatic unsubscribes.",
            "Analyze and track performance.",
            "Ready for every use case (Password Reset, Receipt, Notifications, Alert, Welcome, Legal, User Invitation, Invoice and Trial Emails).",
            "Do more than sending emails.",
        ],
        featured: true,
    },
};

function CheckIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500"
            aria-hidden="true"
        >
            <circle cx="8" cy="8" r="8" fill="currentColor" />
            <path
                d="m4.5 8.2 2.3 2.3 4.7-4.7"
                stroke="white"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function ArrowIcon() {
    return (
        <svg
            width="28"
            height="14"
            viewBox="0 0 28 14"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M0 7h26M20 1l6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function FeatureList({ items }: { items: string[] }) {
    return (
        <ul className="space-y-1.5 text-xs leading-5 text-gray-600 sm:text-sm sm:leading-5">
            {items.map((item) => (
                <li key={item} className="flex items-start gap-2">
                    <CheckIcon />
                    <span className="min-w-0">{item}</span>
                </li>
            ))}
        </ul>
    );
}

export default function PlanSelectModal({
    isOpen = false,
    onClose,
    onSelect,
}: PlanSelectionModalProps) {
    const [plans, setPlans] = useState<DisplayPlan[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;

        setLoading(true);
        setError(false);

        plansService
            .getPlans()
            .then((data) => {
                if (cancelled) return;
                // Take id + name from the API, everything else from PLAN_DETAILS
                const merged = data.flatMap((p) => {
                    const details = PLAN_DETAILS[p.name.toLowerCase()];
                    return details
                        ? [{ id: p.id, name: p.name, ...details }]
                        : [];
                });
                setPlans(merged);
            })
            .catch(() => {
                if (!cancelled) setError(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-5">
            {/* Modal */}
            <div className="relative z-10 my-auto max-h-[95dvh] w-full max-w-5xl bg-white shadow-2xl sm:rounded-3xl px-0 py-0 overflow-hidden ">
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="plan-modal-title"
                    className="relative z-10 my-auto max-h-[95dvh] w-full max-w-5xl overflow-y-auto scrollbar-thin rounded-2xl bg-white px-4 py-8 shadow-2xl sm:rounded-3xl sm:px-8 sm:py-10 md:px-12"
                >
                    {/* Heading */}
                    <h2
                        id="plan-modal-title"
                        className="mb-7 px-5 text-center text-xl font-bold leading-tight tracking-tight text-black sm:mb-9 sm:text-2xl md:mb-11 md:text-3xl lg:text-4xl"
                    >
                        Select your preferred plan
                    </h2>
                    {/* Plan cards */}
                    {loading && (
                        <p className="text-center text-sm text-gray-500">
                            Loading plans...
                        </p>
                    )}
                    {error && (
                        <p className="text-center text-sm text-red-600">
                            Could not load plans. Please check your connection
                            and try again.
                        </p>
                    )}

                    {!loading && !error && (
                        <div className="mx-auto grid max-w-4xl grid-cols-1 items-stretch gap-5 sm:gap-6 md:grid-cols-2 md:gap-5 lg:gap-8">
                            {plans.map((plan) => (
                                <section
                                    key={plan.id}
                                    className={`group flex min-w-0 flex-col rounded-xl border p-4 transition-colors duration-200 sm:rounded-2xl sm:p-5 lg:p-6 ${
                                        plan.featured
                                            ? "border-transparent bg-blue-50 hover:border-blue-500"
                                            : "border-transparent bg-gray-100 hover:border-blue-500"
                                    }`}
                                >
                                    {/* Plan name */}
                                    <div className="mb-4 sm:mb-5">
                                        <span
                                            className={`inline-flex max-w-full items-center rounded-full border px-4 py-2 text-xs font-medium sm:px-5 sm:text-sm ${
                                                plan.featured
                                                    ? "border-blue-600 bg-blue-600 text-white"
                                                    : "border-blue-600 bg-white text-blue-600"
                                            }`}
                                        >
                                            {plan.name} Email
                                        </span>
                                    </div>
                                    {/* Title */}
                                    <h3 className="mb-2 text-xl font-bold leading-tight text-blue-600 sm:text-2xl lg:text-[28px]">
                                        {plan.title}
                                    </h3>
                                    {/* Description */}
                                    <p className="mb-5 text-xs leading-5 text-gray-600 sm:mb-6 sm:text-sm">
                                        {plan.description}
                                    </p>
                                    {/* Features */}
                                    <div className="mb-6 flex-1 sm:mb-7">
                                        <FeatureList items={plan.features} />
                                    </div>
                                    {/* CTA */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onSelect?.(plan.id);
                                        }}
                                        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:min-h-12 sm:px-5 sm:text-base cursor-pointer ${
                                            plan.featured
                                                ? "bg-black hover:bg-gray-800"
                                                : "bg-blue-600 hover:bg-blue-700"
                                        }`}
                                    >
                                        <span >Get Started</span>
                                        <ArrowIcon />
                                    </button>
                                </section>
                            ))}
                        </div>
                    )}
                    <span className="text-sm text-red-600" > Please note: you will be unable to change from your selected plan until you purchase a higher package</span>
                    <br/>
                    <button
                        onClick={onClose}
                        className="whitespace-pre-line"
                    >
                        skip
                    </button>
                </div>
            </div>
        </div>
        // </div>
    );
}
