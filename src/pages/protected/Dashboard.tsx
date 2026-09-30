import { useState, useEffect } from "react";
import DashboardHeader from "../../components/Dashboardheader";
import HeroBanner from "../../components/Herobanner";
import LatestClients from "../../components/Latestclients";
import RecentCampaigns from "../../components/Recentcampaigns";
import StatsBar from "../../components/Statsbar";
import { useAuthStore } from "../../store/useAuthStore";
import { clientService } from "../../services/clientService";
import OnboardingModal from "../../components/modal/Onboardingmodal";
import GoalModal from "../../components/modal/Goalmodal";
import type { OnboardingSelections } from "../../types/domain";


export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState({ total: 0, contacted: 0 });
  
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("ingage_onboarding_seen"));
  const [showGoal, setShowGoal] = useState(() => (
    !!localStorage.getItem("ingage_onboarding_seen") &&
    !sessionStorage.getItem("ingage_session_goal_set")
  ));

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const categories = await clientService.getCategories();
        const clientsCounts = await Promise.all(
          categories.map(cat => clientService.getSavedClients(cat.id))
        );
        const totalClients = clientsCounts.reduce((sum, clients) => sum + clients.length, 0);
        const contacted = await clientService.getStats();
        if (isMounted) setStats({ total: totalClients, contacted: contacted.contacted });
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      }
    };
    fetchStats();
    return () => { isMounted = false; };
  }, []);

  const handleOnboardingComplete = async (selections?: OnboardingSelections) => {
    try {
      if (selections) {
        await clientService.saveOnboardingInfo({
          company_kind_id: selections.company_kind_id,
          role_in_company_id: selections.role_in_company_id,
          company_size_id: selections.company_size_id,
          app_purpose_id: selections.app_purpose_id
        });
      }
      localStorage.setItem("ingage_onboarding_seen", "true");
      setShowOnboarding(false);
      
      // After onboarding, immediately check if we should show the goal modal
      if (!sessionStorage.getItem("ingage_session_goal_set")) {
        setShowGoal(true);
      }
    } catch (error) {
      console.error("Failed to save onboarding info", error);
      // Still hide it so the user can use the app, or show an alert
      setShowOnboarding(false);
    }
  };

  const handleGoalComplete = async (goalIds: number[]) => {
    try {
      await clientService.saveGoals(goalIds);
      sessionStorage.setItem("ingage_session_goal_set", "true");
      setShowGoal(false);
    } catch (error) {
      console.error("Failed to save goals", error);
      setShowGoal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Header ── */}
      <DashboardHeader />

      {/* ── Page body ── */}
      <main className="flex-1 px-4 md:px-6 py-4 md:py-6 flex flex-col gap-6 max-w-300 w-full mx-auto">

        {/* ── Stats bar: three StatCards ── */}
        <StatsBar totalClients={stats.total} contactedClients={stats.contacted} />

        {/* ── Hero banner ── */}
        <HeroBanner
          userName={user?.first_name || "User"}
          onWatchVideo={() => console.log("Watch video")}
          onViewMap={() => console.log("View map")}
        />

        {/* ── Tables row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LatestClients />
          <RecentCampaigns />
        </div>

      </main>

      {/* ── Modals ── */}
      <OnboardingModal 
        isOpen={showOnboarding} 
        onClose={() => handleOnboardingComplete()} // Skip also marks as seen
        onContinue={() => handleOnboardingComplete()} 
      />

      <GoalModal 
        isOpen={showGoal && !showOnboarding} // Ensure they don't overlap
        onClose={() => setShowGoal(false)}
        onDashboard={() => setShowGoal(false)}
        onContinue={(goal) => handleGoalComplete(Array.isArray(goal) ? goal.map(Number) : [Number(goal)])}
      />
    </div>
  );
}
