import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "../../components/Dashboardheader";
import { setAccountReviewRequired } from "../../utils/accountReview";

const EMAIL_TYPES = ["Transactional", "Marketing", "Notifications", "Other"] as const;
type EmailType = (typeof EMAIL_TYPES)[number];

export default function AccountReviewPage() {
  const navigate = useNavigate();

  const [website, setWebsite] = useState("");
  const [signupUrl, setSignupUrl] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [emailTypes, setEmailTypes] = useState<EmailType[]>([]);
  const [usageExplanation, setUsageExplanation] = useState("");

  const toggleEmailType = (type: EmailType) => {
    setEmailTypes(prev => (prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]));
  };

  const handleSubmit = () => {
    // TODO: send { website, signupUrl, companyDescription, emailTypes, usageExplanation }
    // to the real account-review endpoint once one exists.
    setAccountReviewRequired(false);
    navigate("/submission-review");
  };

  return (
    <>
      <DashboardHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <h1 className="text-xl font-bold text-gray-900">Account Review</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            We've detected unusual behavior on your account, and it has been temporarily suspended. To reactivate your Brand, provide
            more context about your company and how you plan to send emails with AI Newsletter. Our team will review your submission as
            soon as possible.
          </p>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Your Brand/ company website</label>
              <input
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Website where your recipients provide their email</label>
              <input
                value={signupUrl}
                onChange={e => setSignupUrl(e.target.value)}
                placeholder="https://example.com/signup"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Briefly describe what your company does and who it's for</label>
              <textarea
                value={companyDescription}
                onChange={e => setCompanyDescription(e.target.value)}
                rows={4}
                placeholder="We help small businesses..."
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-gray-700">What types of emails are you planning to send?</label>
              <div className="space-y-2.5">
                {EMAIL_TYPES.map(type => (
                  <label key={type} className="flex items-center gap-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={emailTypes.includes(type)}
                      onChange={() => toggleEmailType(type)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Explain how you plan to use AI Newsletter</label>
              <textarea
                value={usageExplanation}
                onChange={e => setUsageExplanation(e.target.value)}
                rows={4}
                placeholder="Tell us about the emails you plan to send, your audience, and how you collect their consent..."
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
            >
              Submit for review
            </button>
          </div>
        </div>
      </main>
    </>
  );
}