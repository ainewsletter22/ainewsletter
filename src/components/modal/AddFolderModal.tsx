import { useState } from "react";
import Overlay from "../Overlay";

function AddFolderModal({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <Overlay>
      <div className="bg-white shadow-2xl p-8 w-full max-w-lg ">
        <h2 className="text-xl font-bold text-gray-900 mb-10">Add New Group</h2>
        <label className="block text-sm font-medium text-gray-700 mb-5">Group Name :</label>
        <input
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-10"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Enter group name"
        />
        <div className="flex justify-center gap-3">
          <button
            onClick={() => { if (name.trim()) { onAdd(name.trim()); onClose(); } }}
            className="flex items-center gap-2 bg-[#337DD3] hover:bg-[#075ec3] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            <span className="text-lg leading-none">+</span> Add New Group
          </button>
          <button onClick={onClose} className="border border-gray-300 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </Overlay>
  );
}

export default AddFolderModal;