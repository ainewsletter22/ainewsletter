// ── Types ──────────────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  name: string;
  clientCount: number;
  date: string;
}

// ── Mock data ──────────────────────────────────────────────────────────────

export const MOCK_CAMPAIGNS: Campaign[] = [
  { id: "1", name: "Beauty Salons Miami FL", clientCount: 60,  date: "04.04.2021 – 10:12AM" },
  { id: "2", name: "Chris beauty hair salon", clientCount: 202, date: "04.04.2021 – 10:40AM" },
  { id: "3", name: "Beauty Salons Miami FL", clientCount: 60,  date: "04.04.2021 – 10:12AM" },
  { id: "4", name: "Chris beauty hair salon", clientCount: 202, date: "04.04.2021 – 10:40AM" },
  { id: "5", name: "Beauty Salons Miami FL", clientCount: 60,  date: "04.04.2021 – 10:12AM" },
];

// ── CampaignRow ────────────────────────────────────────────────────────────

function CampaignRow({ campaign }: { campaign: Campaign }) {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
      <td className="py-3 px-4 text-xs text-gray-800">{campaign.name}</td>
      <td className="py-3 px-4 text-xs">
        <span className="text-blue-500 font-medium hover:underline cursor-pointer">
          {campaign.clientCount}
        </span>
      </td>
      <td className="py-3 px-4 text-xs text-gray-500">{campaign.date}</td>
    </tr>
  );
}

// ── RecentCampaigns ────────────────────────────────────────────────────────

interface RecentCampaignsProps {
  campaigns?: Campaign[];
}

export default function RecentCampaigns({ campaigns = MOCK_CAMPAIGNS }: RecentCampaignsProps) {
  return (
    <div className=" overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-gray-500 font-semibold text-sm">Recent Campaigns</h3>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-4 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <CampaignRow key={campaign.id} campaign={campaign} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}