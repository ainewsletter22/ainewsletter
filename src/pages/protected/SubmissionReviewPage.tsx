import { useLocation, useNavigate } from "react-router-dom";
import DashboardHeader from "../../components/Dashboardheader";

interface AppealResultState {
    success: boolean;
}

export default function SubmissionReviewPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const result = location.state as AppealResultState | null;
    const success = result?.success; //success state is extracted from account review page to determine if appeal was sent successfully

    // No result state: user visited the page directly or state is missing
    if (success === undefined || success === null) {
        console.log(success);
        return (
            <>
                <DashboardHeader />
                <div className="min-h-screen w-full bg-[#f0f1f5] flex justify-center">
                    <main className="w-full max-w-193.25 min-h-screen bg-white px-4 pt-11 flex flex-col items-center">
                        <section
                            role="status"
                            className="w-full max-w-124.5 rounded-3xl border border-gray-300 px-6 pt-4 pb-8 flex flex-col items-center text-center"
                        >
                            <span className="w-7.5 h-7.5 rounded-full bg-gray-200 flex items-center justify-center">
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#6b7280"
                                    strokeWidth="2.4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <circle cx="12" cy="12" r="9" />
                                    <path d="M12 8v4M12 16h.01" />
                                </svg>
                            </span>

                            <h1 className="mt-3 text-base font-semibold text-gray-900 leading-6">
                                No submission result found
                            </h1>

                            <p className="mt-1 max-w-90 text-xs leading-3.75 text-gray-500">
                                We couldn't find a submission result. Please
                                return to the appeal form and submit your
                                information.
                            </p>
                        </section>

                        <button
                            type="button"
                            onClick={() => navigate("/account-review")}
                            className="mt-3 h-7 px-3 rounded-md border border-gray-400 bg-white text-[9px] text-gray-800 flex items-center gap-2 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                        >
                            Return to Appeal Form
                        </button>
                    </main>
                </div>
            </>
        );
    }

    // Failure state
    if (success === false) {
        console.log(success);

        return (
            <>
                <DashboardHeader />
                <div className="min-h-screen w-full bg-[#f0f1f5] flex justify-center">
                    <main className="w-full max-w-193.25 min-h-screen bg-white px-4 pt-11 flex flex-col items-center">
                        <section
                            role="alert"
                            className="w-full max-w-124.5 rounded-3xl border border-gray-300 px-6 pt-4 pb-8 flex flex-col items-center text-center"
                        >
                            <span className="w-7.5 h-7.5 rounded-full bg-red-100 flex items-center justify-center">
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#ef4444"
                                    strokeWidth="2.4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M18 6 6 18M6 6l12 12" />
                                </svg>
                            </span>

                            <h1 className="mt-3 text-base font-semibold text-gray-900 leading-6">
                                We couldn't submit your appeal
                            </h1>

                            <p className="mt-1 max-w-90 text-xs leading-3.75 text-gray-500">
                                Something went wrong while submitting your
                                information. Please try again later.
                            </p>
                        </section>

                        <button
                            type="button"
                            onClick={() => navigate("/account-review")}
                            className="mt-3 h-7 px-3 rounded-md border border-gray-400 bg-white text-[9px] text-gray-800 flex items-center gap-2 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                        >
                            Try Again
                        </button>
                    </main>
                </div>
            </>
        );
    }

    //success page
    else {
        return (
            <>
                <DashboardHeader />
                <div className="min-h-screen w-full bg-[#f0f1f5] flex justify-center">
                    {/* White content column */}
                    <main className="w-full max-w-193.25 min-h-screen bg-white px-4 pt-11 flex flex-col items-center">
                        {/* Confirmation card */}
                        <section
                            role="status"
                            className="w-full max-w-124.5 rounded-3xl border border-gray-300 px-6 pt-4 pb-8 flex flex-col items-center text-center"
                        >
                            <span className="w-7.5 h-7.5 rounded-full bg-green-200 flex items-center justify-center">
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#22c55e"
                                    strokeWidth="2.4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M5 12.5 10 17.5 19 7.5" />
                                </svg>
                            </span>

                            <h1 className="mt-3 text-base font-semibold text-gray-900 leading-6">
                                Thanks! We're reviewing your submission
                            </h1>

                            <p className="mt-1 max-w-90 text-xs leading-3.75 text-gray-500">
                                We'll review the information you provided and
                                reply by email. Most reviews are completed
                                within one business day.
                            </p>
                        </section>

                        {/* Back button */}
                        <button
                            type="button"
                            onClick={() => navigate("/dashboard")}
                            className="mt-3 h-7 px-3 rounded-md border border-gray-400 bg-white text-[9px] text-gray-800 flex items-center gap-2 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                        >
                            <svg
                                width="20"
                                height="8"
                                viewBox="0 0 20 8"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="0.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <path d="M19 4H1M4 1 1 4l3 3" />
                            </svg>
                            Back to Dashboard
                        </button>
                    </main>
                </div>
            </>
        );
    }
}
