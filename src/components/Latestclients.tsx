// ── Types ──────────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  website: string;
}

// ── Mock data ──────────────────────────────────────────────────────────────

export const MOCK_CLIENTS: Client[] = [
  { id: "1", name: "Chris beauty hair salon", email: "example@yourdomain.com", phone: "(786) 252-8856", website: "https://example.com" },
  { id: "2", name: "Chris beauty hair salon", email: "example@yourdomain.com", phone: "(786) 252-8856", website: "https://example.com" },
  { id: "3", name: "Chris beauty hair salon", email: "example@yourdomain.com", phone: "(786) 252-8856", website: "https://example.com" },
  { id: "4", name: "Chris beauty hair salon", email: "example@yourdomain.com", phone: "(786) 252-8856", website: "https://example.com" },
  { id: "5", name: "Chris beauty hair salon", email: "example@yourdomain.com", phone: "(786) 252-8856", website: "https://example.com" },
];

// ── ClientRow ──────────────────────────────────────────────────────────────

function ClientRow({ client }: { client: Client }) {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
      <td className="py-3 px-4 text-xs text-gray-800">{client.name}</td>
      <td className="py-3 px-4 text-xs text-blue-500">{client.email}</td>
      <td className="py-3 px-4 text-xs text-gray-700">{client.phone}</td>
      <td className="py-3 px-4 text-xs">
        <a
          href={client.website}
          target="_blank"
          rel="noreferrer"
          className="text-red-500 hover:underline font-medium"
        >
          Visit Website
        </a>
      </td>
    </tr>
  );
}

// ── LatestClients ──────────────────────────────────────────────────────────

interface LatestClientsProps {
  clients?: Client[];
}

export default function LatestClients({ clients = MOCK_CLIENTS }: LatestClientsProps) {
  return (
    <div className="">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-blue-500 font-semibold text-sm">Latest Saved Clients</h3>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 py-4 shadow-sm overflow-x-auto">
        <table className="w-full ">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Website</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <ClientRow key={client.id} client={client} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}