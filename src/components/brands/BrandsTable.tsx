import { useState } from "react";
import searchIcon from "../../assets/searchIconBAW.svg";
import editIcon from "../../assets/editIcon.svg";
import viewIcon from "../../assets/viewableIcon.svg";
import deleteIcon from "../../assets/trashIcon.svg";
import type { Brand } from "../../types/Types";
import { MAX_BRANDS } from "../../types/Mockdata";

interface Props {
  brands: Brand[];
  onView: (b: Brand) => void;
  onEdit: (b: Brand) => void;
  onDelete: (id: number) => void;
  onCreate: () => void;
}

function BrandsTable({ brands, onView, onEdit, onDelete, onCreate }: Props) {
  const [search, setSearch] = useState("");
  const filtered = brands.filter(b => (b.name ?? "").toLowerCase().includes(search.toLowerCase()));
  const remaining = Math.max(0, MAX_BRANDS - brands.length);

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <p className="text-sm font-semibold text-blue-600 mb-3">Brands</p>
      <div className="border-t border-gray-100 mb-6" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold shrink-0">
            {brands.length}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Total Brands Created</p>
            <p className="text-xs text-gray-400">{remaining} Remaining</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2">
              <img src={searchIcon} alt="" className="w-4 h-4" />
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56 bg-white"
            />
          </div>
          <button
            onClick={onCreate}
            disabled={remaining === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <span className="text-lg leading-none">+</span> Create New Brand
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="w-full min-w-225">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" />
              </th>
              {["Brand Name", "Date Created", "Total Campaigns", "Sends via", "Sending limits", "Limit Used", "Actions"].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((b, i) => {
              const name = b.name ?? "(unnamed)";
              const totalCampaigns = Number(b.totalCampaigns ?? 0);
              const sendsVia = b.sendsVia ?? "";
              const dateCreated = b.dateCreated ?? "";
              const sendingLimit = b.sendingLimit ?? { limitType: "Unlimited", emailsPerMonth: 0, currentlyUsed: 0 };

              return (
                <tr
                  key={b.id}
                  className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                  }`}
                >
                  <td className="px-4 py-3">
                    <input type="checkbox" />
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => onView(b)} className="flex items-center gap-2 text-sm text-blue-600 hover:underline font-medium text-left">
                      <span className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center overflow-hidden shrink-0">
                        {b.logo ? <img src={b.logo} className="w-full h-full object-cover" alt="" /> : "🏳️"}
                      </span>
                      {name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{dateCreated}</td>
                  <td className="px-4 py-3">
                    {totalCampaigns > 0 ? (
                      <span className="text-sm text-blue-600 font-medium">{totalCampaigns.toLocaleString()}</span>
                    ) : (
                      <span className="text-sm text-amber-500 font-medium">No Campaigns Yet</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{sendsVia}</td>
                  <td className="px-4 py-3 text-sm">
                    {sendingLimit.limitType === "Unlimited" ? (
                      <span className="text-blue-600 font-medium">∞ Unlimited</span>
                    ) : (
                      <span className="text-blue-600 font-medium">{(sendingLimit.emailsPerMonth ?? 0).toLocaleString()}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {sendingLimit.limitType === "Unlimited" ? (
                      <span className="text-blue-600 font-medium">∞ Unlimited</span>
                    ) : (
                      <span className="text-blue-600 font-medium">{(sendingLimit.currentlyUsed ?? 0).toLocaleString()}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => onView(b)} className="p-2 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors" title="View">
                        <img src={viewIcon} className="w-5 h-5" alt="View" />
                      </button>
                      <button onClick={() => onEdit(b)} className="p-2 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                        <img src={editIcon} className="w-5 h-5" alt="Edit" />
                      </button>
                      <button onClick={() => onDelete(b.id)} className="p-2 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                        <img src={deleteIcon} className="w-5 h-5" alt="Delete" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-sm text-gray-400 py-10">
                  No brands found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {remaining > 0 && (
        <div className="mt-8 bg-gray-900 rounded-full fixed bottom-5 left-1/3 flex flex-col sm:flex-row items-center justify-center gap-3 text-white text-sm w-fit mx-auto pl-8">
          <span>Want to create Unlimited Brands?</span>
          <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold p-3 px-7 transition-colors rounded-full">
            Upgrade To Members Area
          </button>
        </div>
      )}
    </div>
  );
}

export default BrandsTable;