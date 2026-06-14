import StatCard from "./Statcard";
import clientsIcon from "../assets/clientsIcon.svg";
import sendIcon from "../assets/sendIcon.png";
import dashboardIcon from "../assets/dashboardIcon.png";

interface StatsBarProps {
  totalClients: number;
  contactedClients: number;
}

export default function StatsBar({ totalClients, contactedClients }: StatsBarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-6">
      <StatCard
        icon={clientsIcon}
        value={totalClients.toString()}
        label="Total Clients"
      />
      <StatCard
        icon={sendIcon}
        value={contactedClients.toString()}
        label="Contacted Clients"
      />
      <StatCard
        icon={dashboardIcon}
        value="0"
        label="Upcoming Tasks"
      />
    </div>
  );
}