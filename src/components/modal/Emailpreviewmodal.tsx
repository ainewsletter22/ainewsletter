interface Props {
  onClose: () => void;
}

export function EmailPreviewModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Email content */}
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🤌 My Summer Slash Design Package<br />Is Here And You'reInvited To Join!
          </h2>

          <ul className="text-sm text-gray-600 text-left list-disc list-inside space-y-2 mb-6">
            <li>Research: You can use the right-side search to find stuff, highlight it, and then paste it here.</li>
            <li>Write Assist: Use the keyboard shortcuts Ctrl + Space (Windows) or Ctrl + Shift + Spacebar to get content suggestions when right-clicking (Mac).</li>
            <li>To paraphrase a passage of text, highlight it and use the right-click menu.</li>
          </ul>

          {/* Placeholder image */}
          <div className="rounded-2xl overflow-hidden mb-6 mx-auto max-w-md" style={{ background: "linear-gradient(135deg, #f97316, #a855f7, #ec4899, #eab308)" }}>
            <div className="h-48 flex items-center justify-center text-white text-4xl opacity-80">
              🎨
            </div>
          </div>

          <ul className="text-sm text-gray-600 text-left list-disc list-inside space-y-2 mb-6">
            <li>Research: You can use the right-side search to find stuff, highlight it, and then paste it here.</li>
            <li>Write Assist: Use the keyboard shortcuts Ctrl + Space (Windows) or Ctrl + Shift + Spacebar to get content suggestions when right-clicking (Mac).</li>
            <li>To paraphrase a passage of text, highlight it and use the right-click menu.</li>
          </ul>

          <a href="#" className="text-blue-600 font-medium text-sm hover:underline">Click here To Learn More</a>
        </div>

        {/* Footer */}
        <div className="bg-blue-700 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 20 20" className="w-4 h-4 text-white" fill="currentColor">
                <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5z"/>
              </svg>
            </div>
            <span className="text-sm font-semibold">Ai Newsletter</span>
          </div>
          <div className="text-center">
            <p className="text-blue-200 text-xs">1201 North Orange Street Wilmington</p>
            <p className="text-blue-200 text-xs">Delaware 19801 USA.</p>
          </div>
          <button className="text-blue-200 hover:text-white text-xs underline">Unsubscribe From My Newsletter</button>
        </div>
      </div>
    </div>
  );
}