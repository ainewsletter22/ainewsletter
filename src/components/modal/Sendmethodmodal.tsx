import { useState } from "react";
import type { SendMethod } from "../../types/Types";
import { Overlay, ModalCard, Btn } from "../Modalshells";
import aiagentIcon from '../../assets/aiagent.png';
import aiagentIconDark from '../../assets/aiagentDark.png';
import scratchIcon from '../../assets/scratch.png';
import scratchIconDark from '../../assets/scratchDark.png';
import templateIcon from '../../assets/template.png';
import templateIconDark from '../../assets/templateDark.png';

interface Props {
  onClose: () => void;
  onContinue: (method: SendMethod) => void;
}

const OPTIONS: { id: SendMethod; icon: string; label: string; desc: string }[] = [
  { id: "ai", icon: "🤖", label: "Ai Agents", desc: "Use AI agents to reach potential clients quickly." },
  { id: "scratch", icon: "💬", label: "From Scratch", desc: "Easily craft personalized emails from scratch." },
  { id: "template", icon: "🖥️", label: "Easy Templates", desc: "Quickly send emails using customizable templates." },
];

export function SendMethodModal({ onClose, onContinue }: Props) {
  const [selected, setSelected] = useState<SendMethod>("ai");

  return (
    <Overlay onClose={onClose}>
      <ModalCard className="max-w-2xl p-8">
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>

        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          How do you want to{" "}
          <span className="text-blue-600">send</span>
          <br />
          <span className="text-blue-600">your Newsletter?</span>
        </h2>

        <div className="grid grid-cols-3 gap-4 mt-6 mb-8">
          {OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all text-center ${
                selected === opt.id
                  ? "border-blue-500 bg-white shadow-md"
                  : "border-transparent bg-gray-50 hover:border-gray-200"
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${selected === opt.id ? "bg-blue-50" : "bg-white"}`}>
                {opt.id === "ai" ? (
                  selected === opt.id ?
                  <img src={aiagentIcon} className="w-8 h-8" alt="aiagentIcon" />
                 : 
                  <img src={aiagentIconDark} className="w-8 h-8" alt="aiagentIcon" />
                ) : opt.id === "scratch" ? (
                 selected === opt.id ?
                  <img src={scratchIcon} className="w-8 h-8" alt="scratchIcon" />
                 : 
                  <img src={scratchIconDark} className="w-8 h-8" alt="scratchIcon" />
                ) : (
                 selected === opt.id ?
                  <img src={templateIcon} className="w-8 h-8" alt="templateIcon" />
                 : 
                  <img src={templateIconDark} className="w-8 h-8" alt="templateIcon" />
                )}
              </div>
              <div>
                <p className={`font-bold text-sm ${selected === opt.id ? "text-blue-700" : "text-gray-800"}`}>{opt.label}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3 justify-center">
          <Btn variant="outline" onClick={onClose}>
            <span>✕</span> Cancel
          </Btn>
          <Btn onClick={() => onContinue(selected)}>
            Continue <span>→</span>
          </Btn>
        </div>
      </ModalCard>
    </Overlay>
  );
}