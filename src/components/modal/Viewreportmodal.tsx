import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import type { ReportData } from "../../types/Types";
import { MOCK_REPORT } from "../../types/Mockdata";

interface Props {
  subject?: string;
  onClose: () => void;
}

const STAT_CARDS = (data: ReportData) => [
  { icon: "✈️", color: "text-pink-500 bg-pink-50", value: `${data.deliveryRate}%`, label: "Letter Delivery Rate" },
  { icon: "✉️", color: "text-green-600 bg-green-50", value: data.opened.toLocaleString(), label: "Opened" },
  { icon: "👆", color: "text-blue-600 bg-blue-50", value: data.clicked.toLocaleString(), label: "Clicked" },
  { icon: "📭", color: "text-red-500 bg-red-50", value: data.unsubscribed.toLocaleString(), label: "Unsubscribed" },
];

export function ViewReportModal({ subject, onClose }: Props) {
  const data = MOCK_REPORT;
  const [stopDate, setStopDate] = useState(data.stopDate);
  const [stopTime, setStopTime] = useState(data.stopTime);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm pt-10 pb-10 px-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Subject:</span>
            <span className="text-sm font-semibold text-gray-800">{subject ?? data.subject}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">✕</button>
        </div>

        <div className="p-6">
          {/* Performance */}
          <h3 className="text-lg font-bold text-gray-900 mb-4">Performance</h3>

          <div className="grid grid-cols-5 gap-4 mb-6">
            {/* Stat cards */}
            <div className="col-span-2 space-y-3">
              {STAT_CARDS(data).map(s => (
                <div key={s.label} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${s.color}`}>{s.icon}</div>
                  <div>
                    <p className="text-lg font-bold text-gray-900 leading-none">{s.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Chart area */}
            <div className="col-span-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{data.recipients.toLocaleString()}</p>
                  <p className="text-sm text-blue-600 font-medium">Recipients</p>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="text-green-600 font-medium">Sent: {data.sentAt}</span>
                  <div className="flex items-center gap-1.5">
                    <span>Stop Date</span>
                    <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1">
                      <span className="text-xs">📅</span>
                      <input type="date" value={stopDate} onChange={e => setStopDate(e.target.value)} className="text-xs focus:outline-none bg-transparent w-20" />
                    </div>
                    <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1">
                      <span className="text-xs">🕐</span>
                      <input type="time" value={stopTime} onChange={e => setStopTime(e.target.value)} className="text-xs focus:outline-none bg-transparent w-14" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                <p className="text-xs text-gray-500 mb-2 font-medium">48-hour performance</p>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={data.chart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="opensGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                    <YAxis scale="log" domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                      formatter={(v: any, name: any) => v !== undefined ? [v.toLocaleString(), name === "opens" ? "Opens" : "Clicks"] : []}
                    />
                    <Area type="monotone" dataKey="opens" stroke="#3b82f6" strokeWidth={2} fill="url(#opensGrad)" dot={false} activeDot={{ r: 4 }} />
                    <Area type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={2} fill="url(#clicksGrad)" dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recipients table */}
          <div>
            <h4 className="text-sm font-bold text-blue-600 mb-3">Recipients</h4>
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Name", "Email", "Opens", "Clicked"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recipientList.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-sm text-gray-800">{r.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{r.opens}</td>
                      <td className="px-4 py-3 text-sm text-blue-600">{r.clicked ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}