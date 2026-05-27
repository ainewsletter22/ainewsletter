import DashboardHeader from "../../components/Dashboardheader";
import HeroBanner from "../../components/Herobanner";
import LatestClients from "../../components/Latestclients";
import RecentCampaigns from "../../components/Recentcampaigns";
import StatsBar from "../../components/Statsbar";


export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Header ── */}
      <DashboardHeader />

      {/* ── Page body ── */}
      <main className="flex-1 px-4 md:px-6 py-4 md:py-6 flex flex-col gap-6 max-w-300 w-full mx-auto">

        {/* ── Stats bar: three StatCards ── */}
        <StatsBar />

        {/* ── Hero banner ── */}
        <HeroBanner
          userName="Jamson"
          onWatchVideo={() => console.log("Watch video")}
          onViewMap={() => console.log("View map")}
        />

        {/* ── Tables row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LatestClients />
          <RecentCampaigns />
        </div>

      </main>
    </div>
  );
}