import { useState } from "react";
import type { ClientData } from "../../components/Clientcard";
import DashboardHeader from "../../components/Dashboardheader";
import ClientCard from "../../components/Clientcard";
import logo from "../../assets/mainLogoNBG.png";
import { clientService } from "../../store/clientService";

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_CLIENTS: ClientData[] = [
 {
    id: "1", name: "Restaurant Watergang", claimed: true, rating: 4.9,
    email: "michelle.rivera@example.com", telephone: "020 786 6246",
    website: "restaurantwatergang.nl",
    address: "Weteringstraat 41, 1017 SM Amsterdam, Netherlands",
    instagram: "@restaurantwatergang", twitter: "@restgangng",
    facebook: "@restaurantwatergang", linkedin: "@restaurantwatergang",
    yelp: "@restaurantwatergang", gmbPhotos: "10+ Photos",
    reviews: 116, businessStatus: "Operational", leadScore: 82,
  },
  {
    id: "2", name: "Barone LLC.", claimed: true, rating: 4.9,
    email: "@NONE", telephone: "020 786 6246", website: "@NONE",
    address: "Weteringstraat 41, 1017 SM Amsterdam, Netherlands",
    instagram: "@restaurantwatergang", twitter: "@NONE",
    facebook: "@NONE", linkedin: "@restaurantwatergang",
    yelp: "@restaurantwatergang", gmbPhotos: "10+ Photos",
    reviews: 16, businessStatus: "Operational", leadScore: 82,
  },
  {
    id: "3", name: "Abstergo Ltd.", claimed: false, rating: 4.5,
    email: "No email", telephone: "020 786 6246",
    website: "restaurantwatergang.nl",
    address: "Weteringstraat 41, 1017 SM Amsterdam, Netherlands",
    instagram: "@restaurantwatergang", twitter: "@NONE",
    facebook: "@restaurantwatergang", linkedin: "@restaurantwatergang",
    yelp: "@restaurantwatergang", gmbPhotos: "10+ Photos",
    reviews: 116, businessStatus: "Operational", leadScore: 64,
  },
  {
    id: "4", name: "Barone LLC.", claimed: false, rating: 4.5,
    email: "@NONE", telephone: "020 786 6246",
    website: "restaurantwatergang.nl",
    address: "Weteringstraat 41, 1017 SM Amsterdam, Netherlands",
    instagram: "@restaurantwatergang", twitter: "@NONE",
    facebook: "@restaurantwatergang", linkedin: "@restaurantwatergang",
    yelp: "@restaurantwatergang", gmbPhotos: "10+ Photos",
    reviews: 116, businessStatus: "Operational", leadScore: 40,
  },
  {
    id: "5", name: "Dunder Mifflin", claimed: true, rating: 4.7,
    email: "info@dundermifflin.com", telephone: "020 786 1234",
    website: "dundermifflin.com",
    address: "1725 Slough Ave, Scranton, PA, USA",
    instagram: "@dundermifflin", twitter: "@dundermifflin",
    facebook: "@dundermifflin", linkedin: "@dundermifflin",
    yelp: "@dundermifflin", gmbPhotos: "5+ Photos",
    reviews: 88, businessStatus: "Operational", leadScore: 75,
  },
  {
    id: "6", name: "Massive Dynamic", claimed: false, rating: 4.2,
    email: "@NONE", telephone: "020 786 9999",
    website: "@NONE",
    address: "42 West 42nd St, New York, NY, USA",
    instagram: "@massivedynamic", twitter: "@NONE",
    facebook: "@NONE", linkedin: "@massivedynamic",
    yelp: "@massivedynamic", gmbPhotos: "10+ Photos",
    reviews: 34, businessStatus: "Operational", leadScore: 55,
  },
];

// ── Page state type ────────────────────────────────────────────────────────────

type PageState = "idle" | "loading" | "results" | "empty";

const ITEMS_PER_PAGE = 4;

// ── Sub-components ─────────────────────────────────────────────────────────────

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M4 5.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Loading state
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      {/* App logo icon */}
      <div className="w-20 h-20 rounded-2xl bg-white shadow-md flex items-center justify-center border border-gray-100">
        <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M4 12l6-6 6 6-6 6-6-6z" fill="white" />
          </svg>
        </div>
      </div>

      <p className="text-gray-600 text-sm font-medium">A little patience and we are done!</p>

      {/* Progress */}
      <div className="flex flex-col items-center gap-2 w-48">
        <p className="text-blue-500 text-xs font-semibold">0% of 100%</p>
      </div>
    </div>
  );
}

// Empty state
function EmptyState({ city, niche }: { city: string; niche: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      {/* Purple badge */}
      <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center shadow-md mb-1">
        <span className="text-white font-bold text-sm">G</span>
      </div>

      {/* Magnifier emoji-style */}
      <div className="text-5xl mb-1">🔍</div>

      <p className="text-gray-900 font-bold text-lg">No Clients Found</p>
      <p className="text-gray-500 text-sm text-center leading-relaxed">
        No matches in [{city || "City"}] for [{niche || "Niche"}].<br />
        Try a different search.
      </p>
    </div>
  );
}

// Results toolbar
function ResultsToolbar({
  count,
  selectedIds,
  onSelectAll,
  allSelected,
  onAddSelected,
}: {
  count: number;
  selectedIds: string[];
  onSelectAll: () => void;
  allSelected: boolean;
  onAddSelected: () => void;
}) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between py-3 gap-4 md:gap-0">
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <button className="bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-lg">
          RESULTS: {count}
        </button>
        <button className="flex items-center gap-1.5 text-xs md:text-sm text-gray-600 border border-gray-200 rounded-lg px-2 md:px-3 py-1.5 hover:bg-gray-50 transition-colors">
          FILTER OPTIONS <ChevronIcon />
        </button>
        <button className="flex items-center gap-1.5 text-xs md:text-sm text-gray-600 border border-gray-200 rounded-lg px-2 md:px-3 py-1.5 hover:bg-gray-50 transition-colors">
          SORT BY REVIEWS <ChevronIcon />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
        {selectedIds.length > 0 && (
          <button
            onClick={onAddSelected}
            className="flex-1 md:flex-none text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors text-center"
          >
            ADD SELECTED CLIENTS TO MANAGE CLIENTS
          </button>
        )}
        <button
          onClick={onSelectAll}
          className="flex-1 md:flex-none text-xs font-semibold text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-center"
        >
          {allSelected ? "DESELECT ALL" : "SELECT ALL"}
        </button>
      </div>
    </div>
  );
}

// Pagination
function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}) {
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between pt-4 pb-2">
      <p className="text-sm text-gray-500">
        Showing {start} to {end} of {totalItems} entries
      </p>
      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-7 h-7 rounded text-sm font-semibold transition-colors ${
              page === currentPage
                ? "bg-blue-500 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"
        >
          →
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FindClients() {
  const [niche, setNiche] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [pageState, setPageState] = useState<PageState>("idle");
  const [clients, setClients] = useState<ClientData[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Simulate search
  const handleSearch = async () => {
    if (!niche && !country) return;
    setPageState("loading");
    setSelectedIds([]);
    setCurrentPage(1);

    try {
      const data = await clientService.searchClients(niche, country, state);
      setClients(data);
      setPageState(data.length > 0 ? "results" : "empty");
    } catch (error) {
      console.error("Search failed:", error);
      setPageState("idle");
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === clients.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(clients.map((c) => c.id));
    }
  };

  const handleAddSelected = async () => {
    try {
      await clientService.addClientsToManage(selectedIds);
      alert(`${selectedIds.length} clients added successfully!`);
      setSelectedIds([]);
    } catch (error) {
      console.error("Failed to add clients:", error);
    }
  };

  const totalPages = Math.ceil(clients.length / ITEMS_PER_PAGE);
  const paginatedClients = clients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <DashboardHeader />

      <main className="flex-1 px-4 md:px-6 py-6 md:py-8 max-w-7xl w-full mx-auto">

        {/* Page title */}
        <div className="text-center mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            Let Ai Find Active Potential Client
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Discover local businesses with active leads
          </p>
        </div>

        {/* Search bar */}
        <div className="bg-gray-900 rounded-2xl px-4 md:px-6 py-4 md:py-5 mb-6">
          <div className="flex flex-col md:flex-row items-stretch md:items-end gap-4">

            {/* Business Niche */}
            <div className="w-full md:flex-2">
              <label className="block text-xs text-gray-400 mb-1.5">Business Niche</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter Niche or keyword"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full bg-white rounded-lg px-4 py-4 text-sm text-gray-800 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <ChevronIcon />
                </div>
              </div>
            </div>

            {/* Country */}
            <div className="w-full md:flex-2">
              <label className="block text-xs text-gray-400 mb-1.5">Country</label>
              <div className="relative">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full appearance-none bg-white rounded-lg px-4 py-4 text-sm text-gray-500 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                >
                  <option value="">Select country</option>
                  <option value="US">United States</option>
                  <option value="NL">Netherlands</option>
                  <option value="GB">United Kingdom</option>
                  <option value="NG">Nigeria</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <ChevronIcon />
                </div>
              </div>
            </div>

            {/* State / City */}
            <div className="w-full md:flex-[1.5]">
              <label className="block text-xs text-gray-400 mb-1.5">State</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Select City/town"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full bg-white rounded-lg px-4 py-4 text-sm text-gray-500 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <ChevronIcon />
                </div>
              </div>
            </div>

            {/* More Filters */}
            <div className="w-full md:flex-[1.5]">
              <label className="block text-xs text-gray-400 mb-1.5">More Filters</label>
              <div className="relative">
                <select className="w-full appearance-none bg-white rounded-lg px-4 py-4 text-sm text-gray-500 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer">
                  <option value="">Advanced Filters</option>
                  <option value="rating">Min Rating: 4+</option>
                  <option value="email">Has Email</option>
                  <option value="claimed">Claimed Only</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <ChevronIcon />
                </div>
              </div>
            </div>

            {/* Find Clients button */}
            <button
              onClick={handleSearch}
              className="w-full md:w-auto flex justify-center items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm px-5 py-4 rounded-xl transition-colors shrink-0 "
            >
              <SearchIcon />
              Find Clients
            </button>
          </div>
        </div>

        {/* ── Page states ── */}

        {/* Idle */}
        {pageState === "idle" && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-20 h-20 flex items-center justify-center">
                <img src={logo} alt="" />
            </div>
            <p className="text-gray-400 text-sm">
              Fill in the filters above and click <span className="font-semibold text-blue-500">Find Clients</span> to get started.
            </p>
          </div>
        )}

        {/* Loading */}
        {pageState === "loading" && <LoadingState />}

        {/* Empty */}
        {pageState === "empty" && <EmptyState city={state} niche={niche} />}

        {/* Results */}
        {pageState === "results" && (
          <>
            <ResultsToolbar
              count={clients.length}
              selectedIds={selectedIds}
              onSelectAll={handleSelectAll}
              allSelected={selectedIds.length === clients.length}
              onAddSelected={handleAddSelected}
            />

            {/* Client cards grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {paginatedClients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  selected={selectedIds.includes(client.id)}
                  onSelect={handleSelect}
                />
              ))}
            </div>

            {/* Pagination (only shown when > ITEMS_PER_PAGE results) */}
            {clients.length > ITEMS_PER_PAGE && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={clients.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}

      </main>
    </div>
  );
}