/**
 * ClientCard.tsx
 *
 * MAP RENDERING NOTES
 * ───────────────────
 * We use the free `?output=embed` Google Maps URL inside an <iframe>.
 * The goal is a "minimalist thumbnail" — just the map tile and a pin,
 * no Google logo, no "Terms of Use" bar, no zoom buttons.
 *
 * Technique: render the iframe at a fixed size inside an `overflow:hidden`
 * container, then apply `transform: scale(N)` to zoom in on the pin so
 * the UI chrome is pushed outside the container boundary and clipped.
 *
 * The critical detail is `transformOrigin`.
 *   • Google's embed places the pin at roughly the vertical centre of the
 *     viewport, but the bottom ~18 px is occupied by the "Terms / Report"
 *     bar and the top ~40 px by the search/header strip.
 *   • Using `transformOrigin: "50% 45%"` shifts the focal point
 *     *slightly above centre*, keeping the pin in frame after the zoom
 *     while pushing both UI bars out of the visible area.
 *   • A scale of ~2.2 is the sweet spot: enough to hide the chrome at the
 *     container sizes used here (w-36 / h-28 ≈ 144×112 px) without making
 *     the map tiles so large that the neighbourhood context is lost.
 *
 * The iframe itself is `pointer-events: none` so it can't receive clicks.
 * An absolutely-positioned <a> overlay captures the click instead, linking
 * to `directionsUrl` which (unlike a bare `?q=` query) is stable and won't
 * redirect to a different business mid-load.
 */

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
  linkedin_url: string;
  yelp: string;
  gmbPhotos: string;
  reviews: number;
  businessStatus: string;
  leadScore: number;
  mapEmbedUrl?: string;
  directionsUrl?: string;
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

function InfoRow({
  label,
  value,
  isLink = false,
}: {
  label: string;
  value: string;
  isLink?: boolean;
}) {
  const isNone = !value || value === "@NONE" || value === "No email";
  return (
    <span>
      <span className="font-medium text-gray-800">{label}: </span>
      {isNone ? (
        <span className="text-purple-500">{value || "@NONE"}</span>
      ) : isLink ? (
        <a
          href={value?.startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noreferrer"
          className="text-blue-500 hover:underline"
        >
          {value}
        </a>
      ) : (
        <span className={value?.startsWith("@") ? "text-blue-500" : "text-gray-700"}>
          {value}
        </span>
      )}
    </span>
  );
}

/** Fallback shown when no mapEmbedUrl is available. */
function MapPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="18" r="7" stroke="#9CA3AF" strokeWidth="1.5" fill="#E5E7EB" />
        <path
          d="M20 11v-3M20 29v3M11 18H8M32 18h-3"
          stroke="#9CA3AF"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <circle cx="20" cy="18" r="2.5" fill="#9CA3AF" />
      </svg>
    </div>
  );
}

export default function ClientCard({ client, selected, onSelect }: ClientCardProps) {


  return (
    <div
      className={`bg-white rounded-2xl border-2 p-4 md:p-5 transition-all shadow-sm ${
        selected ? "border-blue-400" : "border-gray-100"
      }`}
    >
      {/* ── Header ── */}
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
        <span
          className={`text-xs font-bold px-3 py-1 rounded w-fit ${
            client.claimed ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
          }`}
        >
          {client.claimed ? "CLAIMED" : "UNCLAIMED"}
        </span>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col sm:flex-row gap-4">

        {/* ── Map thumbnail + lead score ── */}
        <div className="shrink-0 w-full sm:w-36 flex flex-col gap-2">

          {/*
           * CROPPING CONTAINER
           * ──────────────────
           * overflow-hidden clips whatever the scaled iframe pushes outside
           * this boundary.  Fixed pixel dimensions (144 × 112) keep the
           * crop rect deterministic regardless of parent layout changes.
           */}
          <div
            className="relative rounded-xl overflow-hidden bg-gray-100 border border-gray-200"
            style={{ width: "144px", height: "112px" }}
          >
            {client.mapEmbedUrl ? (
              <>
                {/*
                 * IFRAME — scaled up to hide Google's UI chrome.
                 *
                 * width / height = 100% of the container (144 × 112 px).
                 * transform: scale(2.2) — zoom factor (see file header).
                 * transformOrigin: "50% 45%" — focal point slightly above
                 *   centre to keep the dropped pin visible while pushing
                 *   both the top header and bottom "Terms" bar out of frame.
                 *
                 * pointer-events: none — the <a> overlay handles clicks;
                 *   without this the iframe would capture them and navigate
                 *   inside the iframe rather than opening a new tab.
                 */}
                <iframe
                  title={`Map for ${client.name}`}
                  src={client.mapEmbedUrl}
                  className="absolute inset-0 border-0"
                  style={{
                    width:           "100%",
                    height:          "100%",
                    transformOrigin: "center center",
                    pointerEvents:   "none",
                  }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />

                {/*
                 * CLICK OVERLAY
                 * Covers the entire container so the user can click anywhere
                 * on the thumbnail to open Google Maps in a new tab.
                 * z-index 10 ensures it sits above the iframe.
                 */}
                <a
                  href={client.directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute inset-0 z-10"
                  aria-label={`Open ${client.name} in Google Maps`}
                  title="Open in Google Maps"
                />
              </>
            ) : (
              <MapPlaceholder />
            )}
          </div>

          {/* Lead score bar */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white bg-amber-400 rounded-full px-2 py-0.5">
                {client.leadScore}%
              </span>
              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-amber-400 h-1.5 rounded-full"
                  style={{ width: `${client.leadScore}%` }}
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-400">GMB LeadsScore Technology</p>
          </div>
        </div>

        {/* ── Details grid ── */}
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
              <InfoRow label="Email" value={client.email} isLink />
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-1.5 md:gap-4 col-span-1 md:col-span-2">
            <div className="overflow-hidden text-ellipsis whitespace-nowrap">
              <InfoRow label="Telephone" value={client.telephone} isLink />
            </div>
            <div className="overflow-hidden text-ellipsis whitespace-nowrap">
              <InfoRow label="Website" value={client.website} isLink />
            </div>
          </div>

          <div className="col-span-1 md:col-span-2">
            <InfoRow label="Address" value={client.address} />
          </div>

          <div className="overflow-hidden text-ellipsis whitespace-nowrap">
            <InfoRow label="Instagram" value={client.instagram} isLink />
          </div>
          <div className="overflow-hidden text-ellipsis whitespace-nowrap">
            <InfoRow label="X (Twitter)" value={client.twitter} isLink />
          </div>
          <div className="overflow-hidden text-ellipsis whitespace-nowrap">
            <InfoRow label="Facebook" value={client.facebook} isLink />
          </div>
          <div className="overflow-hidden text-ellipsis whitespace-nowrap">
            <InfoRow label="GMB Photos" value={client.gmbPhotos} isLink />
          </div>
          <div className="overflow-hidden text-ellipsis whitespace-nowrap">
            <InfoRow label="LinkedIn" value={client.linkedin_url} isLink />
          </div>
          <div className="hidden md:block" />
          <div className="overflow-hidden text-ellipsis whitespace-nowrap">
            <InfoRow label="Yelp" value={client.yelp} isLink />
          </div>
          <div className="hidden md:block" />

          <div className="col-span-1 md:col-span-2 flex flex-col md:flex-row gap-1.5 md:gap-6 pt-2 md:pt-1 border-t border-gray-100 mt-2 md:mt-1">
            <div className="overflow-hidden text-ellipsis whitespace-nowrap">
              <InfoRow label="Reviews" value={`${client.reviews} reviews`} />
            </div>
            <div className="overflow-hidden text-ellipsis whitespace-nowrap">
              <InfoRow label="Business Status" value={client.businessStatus} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { ClientData };