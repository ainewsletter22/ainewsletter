import people from "../assets/peopleYellow.png";
import contact from "../assets/contactIcon.png";
import logo from "../assets/mainLogo.png";
import StatCard from "./Statcard";
const stats = [
  {
    icon: people,
    value: "3,550",
    label: "Clients Generated",
  },
  {
    icon: contact,
    value: "1,780",
    label: "Clients Contacted",
  },
  {
    icon: logo,
    value: "148,800",
    label: "Total Emails Sent",
  },
];

export default function StatsBar() {
  return (
    <div className="flex flex-col md:flex-row gap-4 w-full">
      {stats.map((stat) => (
        <StatCard key={stat.label} icon={stat.icon} value={stat.value} label={stat.label} />
      ))}
    </div>
  );
}