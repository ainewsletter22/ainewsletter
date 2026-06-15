import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import type { ClientData } from "../../components/Clientcard";
import DashboardHeader from "../../components/Dashboardheader";
import ClientCard from "../../components/Clientcard";
import logo from "../../assets/mainLogoNBG.png";
import { clientService } from "../../store/clientService";


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
function LoadingState({ progress, statusText }: { progress: number; statusText: string }) {
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
      <div className="flex flex-col items-center gap-2 w-64">
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-blue-500 h-full transition-all duration-700 ease-out" 
            style={{ width: `${progress}%` }} 
          />
        </div>
        <p className="text-blue-500 text-[10px] font-bold uppercase tracking-wider">{statusText}</p>
        <p className="text-gray-400 text-xs font-semibold">{progress}% of 100%</p>
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
  activeFilters,
  onFilterChange,
  sortBy,
  onSortChange,
  categories,
  onAddWithCategory,
}: {
  count: number;
  selectedIds: string[];
  onSelectAll: () => void;
  allSelected: boolean;
  onAddSelected: () => void;
  activeFilters: string[];
  onFilterChange: (f: string) => void;
  sortBy: string;
  onSortChange: (s: string) => void;
  categories: any[];
  onAddWithCategory: (catId: string) => void;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const saveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
      if (saveRef.current && !saveRef.current.contains(e.target as Node)) setSaveMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filterOptions = [
    "Rating 4.4 or Less", "Status Operational", "With Website", "With Phone",
    "With Email", "Social Media Accounts", "50 Reviews or Less", "Yelp Business"
  ];
  const sortOptions = ["Sort by reviews", "Sort by name", "Sort by Email"];

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between py-3 gap-4 md:gap-0">
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <button className="bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-lg">
          RESULTS: {count}
        </button>

        {/* Filter Dropdown */}
        <div className="relative" ref={filterRef}>
          <button 
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-1.5 text-xs md:text-sm text-gray-600 border border-gray-200 rounded-lg px-2 md:px-3 py-1.5 hover:bg-gray-50 transition-colors uppercase"
          >
            FILTER OPTIONS <ChevronIcon />
          </button>
          {filterOpen && (
            <div className="absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-2">
              {filterOptions.map(opt => (
                <div 
                  key={opt} 
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer" 
                  onClick={() => onFilterChange(opt)}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${activeFilters.includes(opt) ? "bg-blue-500 border-blue-500" : "border-gray-300"}`}>
                    {activeFilters.includes(opt) && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-700">{opt}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="relative" ref={sortRef}>
          <button 
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-1.5 text-xs md:text-sm text-gray-600 border border-gray-200 rounded-lg px-2 md:px-3 py-1.5 hover:bg-gray-50 transition-colors uppercase"
          >
            {sortBy} <ChevronIcon />
          </button>
          {sortOpen && (
            <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-2">
              {sortOptions.map(opt => (
                <div 
                  key={opt} 
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer" 
                  onClick={() => { onSortChange(opt); setSortOpen(false); }}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${sortBy === opt ? "bg-blue-500 border-blue-500" : "border-gray-300"}`}>
                    {sortBy === opt && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-xs font-medium text-gray-700">{opt}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
        {selectedIds.length > 0 && (
          <div className="relative" ref={saveRef}>
            <button
              onClick={() => setSaveMenuOpen(!saveMenuOpen)}
              className="flex-1 md:flex-none text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors text-center uppercase flex items-center gap-2"
            >
              Save to Folder <ChevronIcon />
            </button>
            {saveMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-2">
                <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase border-b border-gray-50 mb-1">Choose Destination</p>
                {categories.length > 0 ? (
                  categories.map(cat => (
                    <button 
                      key={cat.id} 
                      onClick={() => { onAddWithCategory(cat.id); setSaveMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors truncate"
                    >
                      {cat.name}
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-2 text-xs text-gray-500 italic">No folders found</p>
                )}
              </div>
            )}
          </div>
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
  const routeLocation = useLocation();
  const [niche, setNiche] = useState("");
  const [countryId, setCountryId] = useState("");
  const [stateId, setStateId] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [availableCities, setAvailableCities] = useState<any[]>([]);
  const [moreFilters, setMoreFilters] = useState("");
  const [pageState, setPageState] = useState<PageState>("idle");
  const [clients, setClients] = useState<ClientData[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [progressValue, setProgressValue] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("Sort by reviews");
  const [categories, setCategories] = useState<any[]>([]);

  const [meta, setMeta] = useState<{ countries: any[], niches: any[] }>({ countries: [], niches: [] });
  const pollingRef = useRef<any>(null);
  const progressTimerRef = useRef<any>(null);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [countries, niches, cats] = await Promise.all([
          clientService.getCountries(),
          clientService.getNiches(),
          clientService.getCategories()
        ]);
        
        console.log("API Raw Countries:", countries);
        console.log("API Raw Niches:", niches);

        // If API returns data, use it. Otherwise, use these mocks for dev testing.
        const finalCountries = (countries && countries.length > 0) ? countries : [
          { id: 161, name: "Nigeria", states: [{id: 1, name: "Minna"}, {id: 2, name: "Lagos"}] },
          { id: 1, name: "United States", states: [{id: 3, name: "New York"}, {id: 4, name: "California"}] },
          { id: 2, name: "Netherlands", states: [{id: 5, name: "Amsterdam"}] }
        ];
        
        const finalNiches = (niches && niches.length > 0) ? niches : [
          { id: 1, name: "Furniture shops" },
          { id: 2, name: "Restaurants" },
          { id: 3, name: "Car Wash" },
          { id: 4, name: "Hair Salon" }
        ];

        setMeta({ 
          countries: finalCountries, 
          niches: finalNiches 
        });
        setCategories(cats);
      } catch (e) {
        console.error("Failed to load metadata", e);
        setMeta({
          countries: [
            { id: 161, name: "Nigeria", states: [{id: 1, name: "Minna"}, {id: 2, name: "Lagos"}] },
            { id: 1, name: "United States", states: [{id: 3, name: "New York"}] }
          ],
          niches: [{ id: 1, name: "Furniture shops" }, { id: 2, name: "Restaurants" }]
        });
      }
    };
    loadMeta();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  // Handle resuming a job from Search History
  useEffect(() => {
    const resumeId = routeLocation.state?.resumeJobId;
    if (resumeId) {
      setPageState("loading");
      pollJobStatus(resumeId);
    }
  }, [routeLocation.state]);

  const availableStates = meta.countries.find(c => c.id.toString() === countryId)?.states || [];

  useEffect(() => {
    if (countryId && stateId) {
      clientService.getCities(countryId, stateId)
        .then(data => setAvailableCities(data || []))
        .catch(() => setAvailableCities([]));
    } else {
      setAvailableCities([]);
      setCity("");
    }
  }, [countryId, stateId]);

  // Simulates a smooth progress bar crawl
  const startProgressSimulation = () => {
    setProgressValue(5);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    
    progressTimerRef.current = setInterval(() => {
      setProgressValue((prev) => {
        if (prev < 30) return prev + 2;      // Fast start
        if (prev < 70) return prev + 0.5;    // Medium mid-section
        if (prev < 98) return prev + 0.1;    // Very slow crawl at the end
        return prev;
      });
    }, 500);
  };

  const pollJobStatus = (jobId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setStatusText("Processing AI Request...");
    startProgressSimulation();

    pollingRef.current = setInterval(async () => {
      try {
        const job = await clientService.getJobStatus(jobId);
        const status = job.data?.status || "processing";
        setStatusText(`AI Status: ${status}`);

        // Polling until status is "complete" per Postman test
        if (status === "complete") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (progressTimerRef.current) clearInterval(progressTimerRef.current);
          
          setProgressValue(100);
          
          const results = await clientService.getLeadResults(jobId);
          setClients(results);
          setPageState(results.length > 0 ? "results" : "empty");
        } else if (status === "failed") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (progressTimerRef.current) clearInterval(progressTimerRef.current);
          setPageState("idle");
          alert("Lead generation failed. Please try a different prompt.");
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 3000);
  };

  // Simulate search
  const handleSearch = async () => {
    if (!niche && !countryId) return;
    setPageState("loading");
    setStatusText("Initiating AI...");
    setProgressValue(0);
    setSelectedIds([]);
    setCurrentPage(1);

    const selectedCountry = meta.countries.find(c => c.id.toString() === countryId)?.name || "";
    const locationParts = [city, state, selectedCountry].filter(Boolean);
    const location = locationParts.join(", ");
    const filterText = moreFilters ? ` with ${moreFilters}` : "";
    const prompt = `Find ${niche} businesses in ${location}${filterText}`;
    console.log("Sending Prompt to AI:", prompt);

    try {
      const jobResponse = await clientService.generateLeads(prompt);
      // Accessing job_id per snake_case backend return
      const jobId = jobResponse.data.job_id; 
      pollJobStatus(jobId);
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

  const handleAddSelected = async (categoryId: string) => {
    try {
      await clientService.addClientsToManage(selectedIds, categoryId);
      alert(`${selectedIds.length} clients added successfully!`);
      setSelectedIds([]);
    } catch (error) {
      console.error("Failed to add clients:", error);
    }
  };

  const handleFilterChange = (filter: string) => {
    setActiveFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
    setCurrentPage(1);
  };

  const filteredAndSortedClients = [...clients]
    .filter(client => {
      if (activeFilters.length === 0) return true;
      return activeFilters.every(filter => {
        switch (filter) {
          case "Rating 4.4 or Less": return client.rating <= 4.4;
          case "Status Operational": return client.businessStatus === 'Operational' || client.businessStatus === 'complete';
          case "With Website": return client.website !== '@NONE' && client.website !== '';
          case "With Phone": return client.telephone !== 'No phone' && client.telephone !== '';
          case "With Email": return client.email !== 'No email' && client.email !== '';
          case "Social Media Accounts": 
            return (client.instagram !== '@NONE' && client.instagram !== '') || 
                   (client.twitter !== '@NONE' && client.twitter !== '') || 
                   (client.facebook !== '@NONE' && client.facebook !== '') || 
                   (client.linkedin_url !== '@NONE' && client.linkedin_url !== '');
          case "50 Reviews or Less": return client.reviews <= 50;
          case "Yelp Business": return client.yelp !== '@NONE' && client.yelp !== '';
          default: return true;
        }
      });
    })
    .sort((a, b) => {
      if (sortBy === "Sort by reviews") return b.reviews - a.reviews;
      if (sortBy === "Sort by name") return a.name.localeCompare(b.name);
      if (sortBy === "Sort by Email") return a.email.localeCompare(b.email);
      return 0;
    });

  const totalPages = Math.ceil(filteredAndSortedClients.length / ITEMS_PER_PAGE);
  const paginatedClients = filteredAndSortedClients.slice(
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
                <select
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full appearance-none bg-white rounded-lg px-4 py-4 text-sm text-gray-500 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                >
                  <option value="">Select Niche</option>
                  {meta.niches.map(n => <option key={n.id} value={n.name}>{n.name}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <ChevronIcon />
                </div>
              </div>
            </div>

            {/* Country */}
            <div className="w-full md:flex-[1.5]">
              <label className="block text-xs text-gray-400 mb-1.5">Country</label>
              <div className="relative">
                <select
                  value={countryId}
                  onChange={(e) => {
                    setCountryId(e.target.value);
                    setStateId("");
                    setState("");
                    setCity("");
                  }}
                  className="w-full appearance-none bg-white rounded-lg px-4 py-4 text-sm text-gray-500 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                >
                  <option value="">Select country</option>
                  {meta.countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                <select
                  value={stateId}
                  disabled={!countryId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const match = availableStates.find((s: any) => s.id.toString() === id);
                    setStateId(id);
                    setState(match ? match.name : "");
                    setCity("");
                  }}
                  className="w-full appearance-none bg-white rounded-lg px-4 py-4 text-sm text-gray-500 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer disabled:bg-gray-50 disabled:cursor-not-allowed"
                >
                  <option value="">{countryId ? "Select state" : "Choose country first"}</option>
                  {availableStates.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <ChevronIcon />
                </div>
              </div>
            </div>

            {/* City */}
            <div className="w-full md:flex-[1.5]">
              <label className="block text-xs text-gray-400 mb-1.5">City/Town</label>
              <div className="relative">
                <select
                  value={city}
                  disabled={!stateId}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full appearance-none bg-white rounded-lg px-4 py-4 text-sm text-gray-500 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer disabled:bg-gray-50 disabled:cursor-not-allowed"
                >
                  <option value="">{stateId ? "Select city" : "Choose state first"}</option>
                  {availableCities.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <ChevronIcon />
                </div>
              </div>
            </div>

            {/* More Filters */}
            <div className="w-full md:flex-[1.5]">
              <label className="block text-xs text-gray-400 mb-1.5">More Filters</label>
              <div className="relative">
                <select 
                  value={moreFilters}
                  onChange={(e) => setMoreFilters(e.target.value)}
                  className="w-full appearance-none bg-white rounded-lg px-4 py-4 text-sm text-gray-500 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                >
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
        {pageState === "loading" && <LoadingState progress={progressValue} statusText={statusText} />}

        {/* Empty */}
        {pageState === "empty" && <EmptyState city={state} niche={niche} />}

        {/* Results */}
        {pageState === "results" && (
          <>
            <ResultsToolbar
              count={filteredAndSortedClients.length}
              selectedIds={selectedIds}
              onSelectAll={handleSelectAll}
              allSelected={selectedIds.length === clients.length}
              onAddSelected={() => {}} // Replaced by onAddWithCategory
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
              sortBy={sortBy}
              onSortChange={(s) => { setSortBy(s); setCurrentPage(1); }}
              categories={categories}
              onAddWithCategory={handleAddSelected}
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