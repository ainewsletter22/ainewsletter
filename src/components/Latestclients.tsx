import { useEffect, useState } from "react";
import { clientService } from "../services/clientService";

// Types
interface ApiClient {
    id: number;
    business_name: string;
    email: string;
    phone: string;
    website: string;
    createdAt: string;
}

interface Client {
    id: number;
    businessName: string;
    email: string;
    phone: string;
    website: string;
    createdAt: string;
}
// ClientRow
function ClientRow({ client }: { client: Client }) {
    console.log(client);
    return (
        <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
            <td className="py-3 px-4 text-xs text-gray-800">
                {client.businessName}
            </td>
            <td className="py-3 px-4 text-xs text-blue-500">{client.email}</td>
            <td className="py-3 px-4 text-xs text-gray-700">{client.phone}</td>
            <td className="py-3 px-4 text-xs">
                {client.website ? (
                    <a
                        href={client.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-red-500 hover:underline font-medium"
                    >
                        Visit Website
                    </a>
                ) : (
                    "—"
                )}
            </td>
        </tr>
    );
}

// LatestClients
export default function LatestClients() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function fetchClients() {
            try {
                const data: ApiClient[] = await clientService.getLatestClients();

                const formattedClients: Client[] = data.map(
                    ({ business_name, ...client }) => ({
                        ...client,
                        businessName: business_name,
                    }),
                );

                setClients(formattedClients);
            } catch (err) {
                console.error("Failed to fetch clients:", err);
                setError("Could not load clients.");
            } finally {
                setLoading(false);
            }
        }

        fetchClients();
    }, []);

    return (
        <div>
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-blue-500 font-semibold text-sm">
                    Latest Saved Clients
                </h3>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 py-4 shadow-sm overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Name
                            </th>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Email
                            </th>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Phone
                            </th>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Website
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="py-6 text-center text-sm text-gray-500"
                                >
                                    Loading clients...
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="py-6 text-center text-sm text-red-500"
                                >
                                    {error}
                                </td>
                            </tr>
                        ) : clients.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="py-6 text-center text-sm text-gray-500"
                                >
                                    No clients found.
                                </td>
                            </tr>
                        ) : (
                            clients.map((client) => (
                                <ClientRow key={client.id} client={client} />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
