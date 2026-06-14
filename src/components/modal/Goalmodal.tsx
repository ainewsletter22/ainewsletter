import { useState, useEffect } from "react";
import bot from '../../assets/botHead.png';
import aiPortrait from '../../assets/aiPortrait.png';
import aiWizard from '../../assets/aiWizard.png';
import logoBAW from '../../assets/logoBAW.png';
import { clientService } from "../../store/clientService";

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: (goal: string) => void;
  onDashboard: () => void;
}

export default function GoalModal({ isOpen, onClose, onContinue, onDashboard }: GoalModalProps) {
  const [selected, setSelected] = useState("");
  const [backendGoals, setBackendGoals] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      clientService.getOnboardingMeta().then((data) => {
        // Map backend goals to UI structure
        const mapped = data.goals.map((g: any) => {
          const name = g.name.toLowerCase();
          let icon = aiWizard; // Default fallback
          let desc = g.description || "Harness the power of AI.";

          if (name.includes("finder") || name.includes("client")) {
            icon = aiPortrait;
            desc = "AI identifies potential clients through data analysis.";
          } else if (name.includes("newsletter") || name.includes("email")) {
            icon = logoBAW;
            desc = "Enhance engagement with automated AI emails.";
          }

          return {
            id: g.id.toString(),
            title: g.name,
            description: desc,
            icon: icon
          };
        });
        setBackendGoals(mapped);
        if (mapped.length > 0) setSelected(mapped[0].id);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 px-8 py-8 z-10">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Robot icon */}
        <div className="flex justify-center mb-3">
          <div className="items-center justify-center">
            <img src={bot} className="bg-cover w-24" height="auto"  alt="" />
            
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 text-center mb-6">
          What's your goal for today?
        </h2>

        {/* Goal cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {backendGoals.map((goal) => (
            <button
              key={goal.id}
              onClick={() => setSelected(goal.id)}
              className={`flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all ${
                selected === goal.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <img src={goal.icon} className="mb-3 w-20" height="auto" alt="" />
              <p
                className={`text-sm font-semibold mb-1.5 ${
                  selected === goal.id ? "text-blue-600" : "text-gray-800"
                }`}
              >
                {goal.title}
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">{goal.description}</p>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => onContinue(selected)}
            className="px-8 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            Continue <span className="text-base">→</span>
          </button>
          <button
            onClick={onDashboard}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}