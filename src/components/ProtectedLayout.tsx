import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuthStore } from '../store/useAuthStore';
import { plansService } from "../services/plansService";
import PlanSelectModal from "./modal/PlanSelectModal";

export default function ProtectedLayout() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;

  // null = still checking, so the modal never flashes for users who have a plan
  const [hasPlan, setHasPlan] = useState<boolean | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    plansService
      .getUser(Number(userId))
      .then((u) => {
        if (!cancelled) setHasPlan(!!u.plan_id); // null and 0 both mean no plan
      })
      .catch((err) => {
        console.error("Failed to check user plan:", err);
        if (!cancelled) setHasPlan(true); // fail open so the app isn't blocked
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handlePlanSelect = async (planId: number) => {
    if (!user) return;
    try {
      const updated = await plansService.updateUserPlan(user.id, planId);
      const planName = updated.Plan?.name ?? "new";
      setSuccessMessage(`You are now on the ${planName} plan!`);
      console.log(successMessage)
      setHasPlan(true);
    } catch (err) {
      console.error("Failed to save plan", err);
      // stay open so they can retry
    }
  };

  return (
    <>
      <Outlet />
      <PlanSelectModal isOpen={hasPlan === true} onSelect={handlePlanSelect} />
    </>
  );
}