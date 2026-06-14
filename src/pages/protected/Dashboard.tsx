import { useState, useEffect } from "react";
import DashboardHeader from "../../components/Dashboardheader";
import HeroBanner from "../../components/Herobanner";
import LatestClients from "../../components/Latestclients";
import RecentCampaigns from "../../components/Recentcampaigns";
import StatsBar from "../../components/Statsbar";
import { useAuthStore } from "../../store/useAuthStore";
import { clientService } from "../../store/clientService";
import OnboardingModal from "../../components/modal/Onboardingmodal";
import GoalModal from "../../components/modal/Goalmodal";


export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState({ total: 0, contacted: 0 });
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showGoal, setShowGoal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const data = await clientService.getStats();
        if (isMounted) setStats(data);
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      }
    };
    fetchStats();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    // 1. Check if user has ever seen the onboarding (Development fallback included)
    const hasSeenOnboarding = localStorage.getItem("ingage_onboarding_seen");
    
    // 2. Check if goal has been set for this specific login session
    const hasSetGoalThisSession = sessionStorage.getItem("ingage_session_goal_set");

    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    } else if (!hasSetGoalThisSession) {
      setShowGoal(true);
    }
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem("ingage_onboarding_seen", "true");
    setShowOnboarding(false);
    // After onboarding, immediately check if we should show the goal modal
    if (!sessionStorage.getItem("ingage_session_goal_set")) {
      setShowGoal(true);
    }
  };

  const handleGoalComplete = (goal: string) => {
    console.log("Goal selected for session:", goal);
    sessionStorage.setItem("ingage_session_goal_set", "true");
    setShowGoal(false);
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
        onContinue={(goal) => handleGoalComplete(goal)}
      />
    </div>
  );
}