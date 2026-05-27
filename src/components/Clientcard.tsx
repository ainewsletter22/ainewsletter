interface ClientData {
  id: string;
  name: string;
  claimed: boolean;
  rating: number;
  email: string;
  telephone: string;
  website: string;
  address: string;
  instagram: string;
  twitter: string;
  facebook: string;
  linkedin: string;
  yelp: string;
  gmbPhotos: string;
  reviews: number;
  businessStatus: string;
  leadScore: number;
  mapImageUrl?: string;
}

interface ClientCardProps {
  client: ClientData;
  selected: boolean;
  onSelect: (id: string) => void;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M7 1l1.5 3.5H12l-2.8 2 1 3.5L7 8.2l-3.2 1.8 1-3.5L2 4.5h3.5L7 1z"
            fill={star <= rating ? "#F59E0B" : "#E5E7EB"}
            stroke={star <= rating ? "#F59E0B" : "#D1D5DB"}
            strokeWidth="0.3"
          />
        </svg>
      ))}
    </div>
  );
}

function InfoRow({ label, value, isLink = false }: { label: string; value: string; isLink?: boolean }) {
  const isNone = value === "@NONE" || value === "No email";
  return (
    <span>
      <span className="font-medium text-gray-800">{label}: </span>
      {isNone ? (
        <span className="text-purple-500">{value}</span>
      ) : isLink ? (
        <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
          {value}
        </a>
      ) : (
        <span className={value.startsWith("@") ? "text-blue-500" : "text-gray-700"}>{value}</span>
      )}
    </span>
  );
}

export default function ClientCard({ client, selected, onSelect }: ClientCardProps) {
  return (
    <div className={`bg-white rounded-2xl border-2 p-4 md:p-5 transition-all ${selected ? "border-blue-400" : "border-gray-100"} shadow-sm`}>
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(client.id)}
            className="w-4 h-4 rounded accent-blue-500 cursor-pointer shrink-0"
          />
          <span className="font-bold text-gray-900 text-base flex-1">{client.name}</span>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded w-fit ${client.claimed ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}`}>
          {client.claimed ? "CLAIMED" : "UNCLAIMED"}
        </span>
      </div>

      {/* Body */}*
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Map thumbnail */}
        <div className="shrink-0 w-full sm:w-36 flex flex-col gap-2">
          <div className="w-full sm:w-36 h-32 sm:h-28 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
            {client.mapImageUrl ? (
              <img src={client.mapImageUrl} alt="map" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="18" r="7" stroke="#9CA3AF" strokeWidth="1.5" fill="#E5E7EB" />
                  <path d="M20 11v-3M20 29v3M11 18H8M32 18h-3" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" />
                  <circle cx="20" cy="18" r="2.5" fill="#9CA3AF" />
                </svg>
              </div>
            )}
          </div>
          {/* Lead score bar */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white bg-amber-400 rounded-full px-2 py-0.5">{client.leadScore}%</span>
              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${client.leadScore}%` }} />
              </div>
            </div>
            <p className="text-[10px] text-gray-400">GMB LeadsScore Technology</p>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          <div className="col-span-1 md:col-span-2 flex items-center gap-2">
            <span className="font-medium text-gray-800 shrink-0">Rating:</span>
            <StarRating rating={client.rating} />
            <span className="text-xs text-gray-500 shrink-0">{client.rating}.0</span>
          </div>

          {!client.claimed && client.email === "No email" ? (
            <div className="col-span-1 md:col-span-2 text-sm text-gray-500 italic">
              No email. You can save the lead and add later.
            </div>
          ) : (
            <div className="col-span-1 md:col-span-2 overflow-hidden text-ellipsis whitespace-nowrap">
              <InfoRow label="Email" value={client.email} />
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-1.5 md:gap-4 col-span-1 md:col-span-2">
            <div className="overflow-hidden text-ellipsis whitespace-nowrap"><InfoRow label="Telephone" value={client.telephone} isLink /></div>
            <div className="overflow-hidden text-ellipsis whitespace-nowrap"><InfoRow label="Website" value={client.website} isLink /></div>
          </div>

          <div className="col-span-1 md:col-span-2">
            <InfoRow label="Address" value={client.address} />
          </div>

          <div className="overflow-hidden text-ellipsis whitespace-nowrap"><InfoRow label="Instagram" value={client.instagram} /></div>
          <div className="overflow-hidden text-ellipsis whitespace-nowrap"><InfoRow label="X(twitter)" value={client.twitter} /></div>

          <div className="overflow-hidden text-ellipsis whitespace-nowrap"><InfoRow label="Facebook" value={client.facebook} /></div>
          <div className="overflow-hidden text-ellipsis whitespace-nowrap"><InfoRow label="GMB Photos" value={client.gmbPhotos} /></div>

          <div className="overflow-hidden text-ellipsis whitespace-nowrap"><InfoRow label="Linkedin" value={client.linkedin} /></div>
          <div className="hidden md:block"></div>

          <div className="overflow-hidden text-ellipsis whitespace-nowrap"><InfoRow label="Yelp" value={client.yelp} /></div>
          <div className="hidden md:block"></div>

          <div className="col-span-1 md:col-span-2 flex flex-col md:flex-row gap-1.5 md:gap-6 pt-2 md:pt-1 border-t border-gray-100 mt-2 md:mt-1">
            <div className="overflow-hidden text-ellipsis whitespace-nowrap"><InfoRow label="Reviews" value={`${client.reviews} reviews`} /></div>
            <div className="overflow-hidden text-ellipsis whitespace-nowrap"><InfoRow label="Business Status" value={client.businessStatus} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { ClientData };