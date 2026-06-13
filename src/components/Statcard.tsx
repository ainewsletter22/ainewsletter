
interface StatCardProps {
  icon: string;
  value: string;
  label: string;
}

export default function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 md:py-10 flex items-center gap-4">
      {/* Icon container */}
      <div className="w-15 h-15 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
        <img src={icon} className="w-8 h-8 object-cover" alt="" />
      </div>

      {/* Text */}
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}