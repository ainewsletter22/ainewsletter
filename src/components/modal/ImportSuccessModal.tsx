import Overlay from "../Overlay";
import importSuccess from "../../assets/successContact.png";

function ImportSuccessModal({ count, onClose }: { count: number; onClose: () => void }) {
  return (
    <Overlay>
      <div className="bg-white rounded-2xl shadow-2xl p-15 w-2xl text-center relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        <div className="border-2 border-blue-300 rounded-2xl p-8 py-15 mb-2 flex flex-col items-center justify-center">
          <div className="flex justify-center mb-6 w-20 h-20 relative bg-blue-100 rounded-full ">
            <img src={importSuccess} alt="Success" className="scale-125 absolute " />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Contacts Have Been<br />Imported Successfully.</h3>
          <p className="text-sm text-gray-500">Imported A Total Of {count.toLocaleString()} Contacts Into The System.</p>
        </div>
      </div>
    </Overlay>
  );
}

export default ImportSuccessModal;