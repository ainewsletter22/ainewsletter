import { useState, useEffect } from "react";
import type { Newsletter, NewsletterStatus } from "../../types/Types";
import searchIcon from "../../assets/searchIconBAW.svg";
import stars from "../../assets/stars.svg";
import copyIcon from "../../assets/copyIcon.svg";
import { campaignService } from "../../services/campaignService";
import { broadcastService } from "../../services/broadcastService";

const STATUS_STYLES: Record<NewsletterStatus, string> = {
  Complete: "text-[#3A7D44] bg-[rgba(58,125,68,38%)]",
  Scheduled: "bg-purple-100 text-purple-700",
  Sending: "bg-amber-100 text-amber-700",
  Draft: "bg-gray-100 text-gray-600",
};

interface Props {
  onSendNew: () => void;
  onViewReport: (newsletter: Newsletter) => void;
  onPreview: (newsletter: Newsletter) => Promise<void>;
  onDuplicate: (newsletter: Newsletter) => void;
  brandId?: number;
}


// ─── Upgrade Banner ───────────────────────────────────────────────────────────
function UpgradeBanner() {
  return (
    <div className="w-fit mx-auto my-5 flex items-center gap-3 bg-gray-900 text-white rounded-full shadow-xl overflow-hidden">
      <span className="text-sm py-3 px-5">Want to send Unlimited Emails?</span>
      <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-3 px-5 transition-colors rounded-full">
        Upgrade To Members Area
      </button>
    </div>
  );
}


export function NewslettersTab({ onSendNew, onViewReport, onPreview, onDuplicate, brandId }: Props) {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchSentEmails = async () => {
      if (!brandId) return;
      
      setLoading(true);
      try {
        // Fetch both campaigns and broadcasts regardless of sendVia
        // This allows showing both types in the history
        const [campaigns, broadcasts] = await Promise.all([
          campaignService.getBrandCampaigns(brandId),
          broadcastService.getBrandBroadcasts(brandId),
        ]);

        const campaignNewsletters: Newsletter[] = campaigns.map(c => ({
          id: c.id,
          title: c.head || `Campaign #${c.id}`,
          subtitle: "Campaign",
          date: c.sent_at ? new Date(c.sent_at).toLocaleString() : (c.createdAt ? new Date(c.createdAt).toLocaleString() : "N/A"),
          opened: `${c.opened_count}/${c.total_recipients}`,
          clicked: `${c.clicked_count}/${c.total_recipients}`,
          status: c.status === 1 ? "Complete" : "Draft",
          type: "campaign",
          html: c.html,
          preview: c.preview,
          from_name: c.from_name,
          footer: c.footer,
          address: c.address,
        }));

        const broadcastNewsletters: Newsletter[] = broadcasts.map(b => ({
          id: b.id,
          title: b.head || b.Draft?.head || `Broadcast #${b.id}`,
          subtitle: "Broadcast",
          date: b.sent_at ? new Date(b.sent_at).toLocaleString() : (b.createdAt ? new Date(b.createdAt).toLocaleString() : "N/A"),
          opened: `${b.opened_count}/${b.total_recipients}`,
          clicked: `${b.clicked_count}/${b.total_recipients}`,
          status: b.BroadcastStatus?.name === "sent" ? "Complete" :
                 b.BroadcastStatus?.name === "draft" ? "Draft" :
                 b.BroadcastStatus?.name === "scheduled" ? "Scheduled" : "Sending",
          type: "broadcast",
          html: b.html || b.Draft?.html,
          preview: b.preview || b.Draft?.preview,
          from_name: b.from_name || b.Draft?.from_name,
          footer: b.footer || b.Draft?.footer,
          address: b.address ?? b.Draft?.address ?? undefined,
        }));

        // Combine and sort by date (newest first)
        const allNewsletters = [...campaignNewsletters, ...broadcastNewsletters].sort((a, b) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        setNewsletters(allNewsletters);
      } catch (error) {
        console.error("Failed to fetch sent emails:", error);
      } finally {
        setLoading(false);
      }
    };
    void fetchSentEmails();
  }, [brandId]);

  const filtered = newsletters.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSelect = (id: number) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const toggleAll = () => {
    setSelected(s => s.length === filtered.length ? [] : filtered.map(n => n.id));
  };

  const deleteNewsletter = async (id: number) => {
    const newsletter = newsletters.find(n => n.id === id);
    if (!newsletter) return;

    try {
      if (newsletter.type === "broadcast") {
        await broadcastService.deleteBroadcast(id);
      } else {
        await campaignService.deleteCampaign(id);
      }
      setNewsletters(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error("Failed to delete newsletter:", error);
    }
  };

  return (
    <div>
      {/* Stats + actions row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 shrink-0 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
            {newsletters.length}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Total Email Sent</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-auto">
            <img src={searchIcon} alt="Search" className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              className="w-full sm:w-52 pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder:text-gray-400"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={onSendNew}
            className="w-full sm:w-auto whitespace-nowrap bg-[#337DD3] hover:bg-[#0d6cda] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            + Send New Newsletter
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 w-10">
                <div
                  onClick={toggleAll}
                  className={`w-5 h-5 rounded border-2 cursor-pointer flex items-center justify-center transition-colors ${selected.length === filtered.length && filtered.length > 0 ? "bg-blue-600 border-blue-600" : "border-gray-300 hover:border-blue-400"}`}
                >
                  {selected.length === filtered.length && filtered.length > 0 && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </th>
              {["Title", "Date", "Opened", "Clicked", "Status"].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                  No sent emails found
                </td>
              </tr>
            ) : (
              paginated.map((n, i) => (
                <tr key={n.id} className={`border-b border-gray-50 last:border-0 hover:bg-blue-50/20 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                  <td className="px-4 py-4 ">
                    <div
                      onClick={() => toggleSelect(n.id)}
                      className={`w-5 h-5 rounded border-2 cursor-pointer flex items-center justify-center transition-colors ${selected.includes(n.id) ? "bg-blue-600 border-blue-600" : "border-gray-300 hover:border-blue-400"}`}
                    >
                      {selected.includes(n.id) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 mt-0.5 shrink-0">
                        <img src={stars} alt="" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">{n.title}</p>
                        <p className={`text-xs mt-0.5 ${n.type === "broadcast" ? "text-purple-600" : "text-blue-600"}`}>{n.subtitle}</p>
                      </div>
                    </div>
                  </td>
                  <td className=" py-4">
                    <span className="text-sm text-gray-500 font-bold">{n.date.split(" ")[0]}</span>
                    <span className="text-sm text-gray-500"> {n.date.split(" ")[1]}</span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">{n.opened}</td>
                  <td className="px-4 py-4 text-sm text-gray-700">{n.clicked}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-block text-center px-2 text-xs font-semibold w-full py-2 rounded-lg ${STATUS_STYLES[n.status]}`}>{n.status}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onViewReport(n)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline"
                      >
                        View Report
                      </button>
                      <button
                        onClick={() => onDuplicate(n)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Duplicate"
                      >
                       <img src={copyIcon} alt="Duplicate" className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onPreview(n)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Preview"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteNewsletter(n.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1.5 text-sm border rounded-lg ${
                  currentPage === page
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Upgrade banner */}
      <UpgradeBanner />
    </div>
  );
}