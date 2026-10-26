import { useEffect, useState } from "react";
import { clientService } from "../services/clientService";

// ── Types ──────────────────────────────────────────────────────────────────

interface ApiEmail {
    id: number;
    head: string;
    source_type: "campaign" | "broadcast";
    total_recipients: number;
    sent_at: string;
}

interface Campaign {
    id: number;
    name: string;
    clientCount: number;
    date: string;
    type: "campaign" | "broadcast";
}

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

export default function RecentCampaigns() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function fetchEmails() {
            try {
                const data: ApiEmail[] = await clientService.getLatestEmails();

                const formattedCampaigns: Campaign[] = data.map((email) => ({
                    id: email.id,
                    name: email.head,
                    clientCount: email.total_recipients,
                    date: new Date(email.sent_at).toLocaleString(),
                    type: email.source_type,
                }));

                setCampaigns(formattedCampaigns);
            } catch (err) {
                console.error("Failed to fetch campaigns:", err);
                setError("Could not load campaigns.");
            } finally {
                setLoading(false);
            }
        }

        fetchEmails();
    }, []);

    return (
        <div className=" overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-gray-500 font-semibold text-sm">
                    Recent Campaigns
                </h3>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-4 overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Name
                            </th>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Recipients
                            </th>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Date
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={3}
                                    className="py-6 text-center text-sm text-gray-500"
                                >
                                    Loading campaigns...
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td
                                    colSpan={3}
                                    className="py-6 text-center text-sm text-red-500"
                                >
                                    {error}
                                </td>
                            </tr>
                        ) : campaigns.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={3}
                                    className="py-6 text-center text-sm text-gray-500"
                                >
                                    No campaigns found.
                                </td>
                            </tr>
                        ) : (
                            campaigns.map((campaign) => (
                                <CampaignRow
                                    key={campaign.id}
                                    campaign={campaign}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
