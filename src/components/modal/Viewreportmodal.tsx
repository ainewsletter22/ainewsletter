import { useState, useEffect, useMemo, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import * as XLSX from "xlsx";
import type { ReportData, Newsletter, Campaign, Broadcast } from "../../types/Types";
import { MOCK_REPORT } from "../../types/Mockdata";
import { campaignService } from "../../services/campaignService";
import { broadcastService } from "../../services/broadcastService";

interface Props {
  newsletter?: Newsletter;
  onClose: () => void;
}

// ─── Local types for the activity tables / top links ───────────────────────
// NOTE: field names on raw recipient rows (bounce_type, unsubscribed_at,
// suppressed_at, click_count, open_count, clicked_links) are assumptions
// about what the recipients endpoint returns today or could return with a
// small backend addition. Adjust the field names in `toActivityRows` /
// `deriveTopLinks` below to match your real payload shape.
type ActivityKey = "opened" | "clicked" | "unsubscribed" | "bounced" | "suppressed";

interface ActivityRow {
  id: number | string;
  email: string;
  detail?: string;
  badge?: { text: string; tone: "red" | "gray" };
}

interface TopLinkRow {
  id: number | string;
  url: string;
  clicks: number;
}

const ACTIVITY_TABS: { key: ActivityKey; label: string }[] = [
  { key: "clicked", label: "Clicked" },
  { key: "opened", label: "Opened" },
  { key: "unsubscribed", label: "Unsubscribed" },
  { key: "bounced", label: "Bounced" },
  { key: "suppressed", label: "suppressed" },
];

const STAT_CARDS = (data: ReportData) => [
  { icon: <PlaneIcon />, value: `${data.deliveryRate}%`, label: "Letter Delivery Rate", key: null as ActivityKey | null },
  { icon: <OpenEnvelopeIcon />, value: data.opened.toLocaleString(), label: "Opened", key: "opened" as ActivityKey | null },
  { icon: <ClickIcon />, value: data.clicked.toLocaleString(), label: "Clicked", key: "clicked" as ActivityKey | null },
  { icon: <UnsubscribeIcon />, value: data.unsubscribed.toLocaleString(), label: "Unsubscribed", key: "unsubscribed" as ActivityKey | null },
];

// ─── Time-range chart helpers ───────────────────────────────────────────────
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const DEFAULT_WINDOW = 48 * HOUR; // default view: first 48h after the send
const CHART_BUCKETS = 48;

interface ChartPoint {
  label: string;          // x-axis label
  full: string;           // tooltip timestamp
  opens: number;
  clicks: number;
  unsubscribed: number;
  // log-scaled copies that the chart actually plots (so 0 is still drawable)
  opensY: number;
  clicksY: number;
  unsubscribedY: number;
}

// The largest unit that fits wins: a span of 9 days is "1-week", 45 days is
// "1-month", 2 days + a few hours is "2-day", 2 hours + 10 minutes is "2-hour".
function describeSpan(ms: number): string {
  const units: [string, number][] = [
    ["year", 365 * DAY],
    ["month", 30 * DAY],
    ["week", 7 * DAY],
    ["day", DAY],
    ["hour", HOUR],
    ["minute", MINUTE],
  ];
  for (const [name, size] of units) {
    if (ms >= size) return `${Math.floor(ms / size)}-${name}`;
  }
  return "1-minute";
}

const pad = (n: number) => String(n).padStart(2, "0");
// Local-time helpers (toISOString() is UTC and shifts the date/time for anyone
// not on UTC, so the inputs must be built from local parts).
const toLocalDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toLocalTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const formatPickerDate = (v: string) => {
  const [y, m, d] = v.split("-");
  return y && m && d ? `${m}/${d}/${y.slice(2)}` : "";
};

function formatSentAt(d: Date): string {
  const date = d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} ${time}`;
}

// X-axis labels adapt to the span being shown.
function formatAxisLabel(d: Date, spanMs: number): string {
  if (spanMs <= 2 * DAY) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s/g, "");
  }
  if (spanMs <= 90 * DAY) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

// Y axis is log-like (0, 10, 100, 1,000, 10k …) so small and large series stay readable.
const toLogY = (v: number) => Math.log10(1 + v);
const fromLogY = (y: number) => Math.round(Math.pow(10, y) - 1);

function buildYTicks(maxVal: number): number[] {
  const ticks = [0];
  let p = 1;
  for (;;) {
    ticks.push(p);
    if (p >= maxVal) break;
    p *= 10;
  }
  return ticks;
}

function formatCount(v: number): string {
  if (v >= 1_000_000) return `${v / 1_000_000}M`;
  if (v >= 10_000) return `${v / 1_000}k`;
  return v.toLocaleString();
}

// Buckets the events that happened inside [start, end] into CHART_BUCKETS
// equal slices, so a 2-hour window gets ~2.5-minute slices and a 2-year window
// gets ~2-week slices — the x axis always spreads across exactly the chosen span.
function buildChartData(
  recipients: any[],
  totals: { opens: number; clicks: number; unsubscribed: number },
  sentAt: Date | null,
  start: number,
  end: number
): ChartPoint[] {
  const span = end - start;
  if (span <= 0) return [];

  const N = CHART_BUCKETS;
  const step = span / N;
  const opens = new Array<number>(N).fill(0);
  const clicks = new Array<number>(N).fill(0);
  const unsubs = new Array<number>(N).fill(0);

  const hasTimestamps = recipients.some(r => r.opened_at || r.clicked_at || r.unsubscribed_at);

  if (hasTimestamps) {
    const bucketOf = (ts: number) => {
      if (Number.isNaN(ts) || ts <= start || ts > end) return -1;
      return Math.min(N - 1, Math.ceil((ts - start) / step) - 1);
    };
    recipients.forEach(r => {
      if (r.opened_at) { const i = bucketOf(new Date(r.opened_at).getTime()); if (i >= 0) opens[i]++; }
      if (r.clicked_at) { const i = bucketOf(new Date(r.clicked_at).getTime()); if (i >= 0) clicks[i]++; }
      if (r.unsubscribed_at) { const i = bucketOf(new Date(r.unsubscribed_at).getTime()); if (i >= 0) unsubs[i]++; }
    });
  } else if (sentAt) {
    // No per-recipient timestamps (broadcasts): spread the real totals evenly
    // over the first 48h after the send so the numbers still add up, and
    // window that curve. Replace once real timestamps are available.
    const s = sentAt.getTime();
    const cdf = (t: number) => Math.min(1, Math.max(0, (t - s) / DEFAULT_WINDOW));
    for (let i = 0; i < N; i++) {
      const lo = start + i * step;
      const hi = lo + step;
      opens[i] = Math.round(totals.opens * cdf(hi)) - Math.round(totals.opens * cdf(lo));
      clicks[i] = Math.round(totals.clicks * cdf(hi)) - Math.round(totals.clicks * cdf(lo));
      unsubs[i] = Math.round(totals.unsubscribed * cdf(hi)) - Math.round(totals.unsubscribed * cdf(lo));
    }
  }

  return Array.from({ length: N }, (_, i) => {
    const hi = new Date(start + (i + 1) * step);
    return {
      label: formatAxisLabel(hi, span),
      full: hi.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
      opens: opens[i],
      clicks: clicks[i],
      unsubscribed: unsubs[i],
      opensY: toLogY(opens[i]),
      clicksY: toLogY(clicks[i]),
      unsubscribedY: toLogY(unsubs[i]),
    };
  });
}


function toActivityRows(recipients: any[], key: ActivityKey): ActivityRow[] {
  switch (key) {
    case "opened":
      return recipients
        .filter(r => r.opened_at)
        .map(r => ({ id: r.id, email: r.email, detail: String(r.open_count ?? 1) }));
    case "clicked":
      return recipients
        .filter(r => r.clicked_at)
        .map(r => ({ id: r.id, email: r.email, detail: String(r.click_count ?? 1) }));
    case "unsubscribed":
      return recipients
        .filter(r => r.unsubscribed_at)
        .map(r => ({ id: r.id, email: r.email, badge: { text: "Unsubscribed", tone: "red" } }));
    case "bounced":
      return recipients
        .filter(r => r.bounce_type)
        .map(r => ({
          id: r.id,
          email: r.email,
          badge: { text: r.bounce_type === "permanent" ? "Permanent" : "Transient", tone: "red" },
        }));
    case "suppressed":
      return recipients
        .filter(r => r.suppressed_at)
        .map(r => ({ id: r.id, email: r.email, badge: { text: "Suppressed", tone: "gray" } }));
  }
}

function deriveTopLinks(recipients: any[]): TopLinkRow[] {
  const counts = new Map<string, number>();
  recipients.forEach(r => {
    (r.clicked_links ?? []).forEach((url: string) => {
      counts.set(url, (counts.get(url) ?? 0) + 1);
    });
  });
  return Array.from(counts.entries())
    .map(([url, clicks], i) => ({ id: i, url, clicks }))
    .sort((a, b) => b.clicks - a.clicks);
}

function exportRowsToExcel(title: string, rows: ActivityRow[]) {
  const usesBadge = rows.some(r => r.badge);
  const sheetData = rows.map(r => ({
    Email: r.email,
    [usesBadge ? "Status" : "Count"]: r.badge?.text ?? r.detail ?? "",
  }));
  const worksheet = XLSX.utils.json_to_sheet(sheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, title.slice(0, 31));
  XLSX.writeFile(workbook, `${title.toLowerCase()}-recipients.xlsx`);
}

export function ViewReportModal({ newsletter, onClose }: Props) {
  const [data, setData] = useState<ReportData>(MOCK_REPORT);
  const [loading, setLoading] = useState(true);
  const [rawRecipients, setRawRecipients] = useState<any[]>([]);
  const [bounced, setBounced] = useState({ count: 0, pct: 0 });
  const [suppressed, setSuppressed] = useState({ count: 0, pct: 0 });
  const [sentAt, setSentAt] = useState<Date | null>(null);
  const [totals, setTotals] = useState({ opens: 0, clicks: 0, unsubscribed: 0 });

  // Chart range. Until the user touches the date/time inputs we show the
  // default "48-hour performance" (first 48h after the send). Once they pick
  // a date/time, the chart covers [picked date/time → now].
  const [pickDate, setPickDate] = useState("");
  const [pickTime, setPickTime] = useState("");
  const [customRange, setCustomRange] = useState(false);

  const [activeListTab, setActiveListTab] = useState<ActivityKey>("clicked");
  const [listSearch, setListSearch] = useState("");
  const [linkSearch, setLinkSearch] = useState("");
  const [detailModal, setDetailModal] = useState<ActivityKey | null>(null);
  const [contentTab, setContentTab] = useState<"preview" | "plain" | "html" | "insight">("preview");

  useEffect(() => {
    const fetchReportData = async () => {
      if (!newsletter) return;

      setLoading(true);
      try {
        let reportData: Campaign | Broadcast | null = null;

        if (newsletter.type === "broadcast") {
          reportData = await broadcastService.getBroadcast(newsletter.id);
        } else {
          reportData = await campaignService.getCampaign(newsletter.id);
        }

        if (reportData) {
          const total = reportData.total_recipients;
          const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
          const deliveryRate = pct(reportData.delivered_count);

          let recipients: any[] = [];
          let recipientListData: any[] = [];

          if (newsletter.type !== "broadcast") {
            recipients = await campaignService.getCampaignRecipients(newsletter.id);

            recipientListData = recipients.map(r => ({
              id: r.id,
              name: r.Client?.business_name || r.email,
              email: r.email,
              opens: r.opened_at ? new Date(r.opened_at).toLocaleString() : "N/A",
              clicked: r.clicked_at ? new Date(r.clicked_at).toLocaleString() : "N/A",
            }));
          }

          setRawRecipients(recipients);
          setBounced({ count: reportData.bounced_count, pct: pct(reportData.bounced_count) });
          setSuppressed({ count: reportData.suppressed_count, pct: pct(reportData.suppressed_count) });
          setTotals({
            opens: reportData.opened_count,
            clicks: reportData.clicked_count,
            unsubscribed: reportData.complained_count,
          });

          const sentAtDate = reportData.sent_at ? new Date(reportData.sent_at) : (newsletter.date ? new Date(newsletter.date) : null);
          setSentAt(sentAtDate);

          setData({
            subject: newsletter.title,
            deliveryRate,
            opened: reportData.opened_count,
            clicked: reportData.clicked_count,
            unsubscribed: reportData.complained_count,
            recipients: reportData.total_recipients,
            sentAt: sentAtDate ? formatSentAt(sentAtDate) : "N/A",
            stopDate: "",
            stopTime: "",
            chart: [], // chart data is now derived from the selected range (see chartData below)
            recipientList: recipientListData.length > 0 ? recipientListData : MOCK_REPORT.recipientList,
          });

          setCustomRange(false);
          if (sentAtDate) {
            setPickDate(toLocalDateInput(sentAtDate));
            setPickTime(toLocalTimeInput(sentAtDate));
          }
        }
      } catch (error) {
        console.error("Failed to fetch report data:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchReportData();
  }, [newsletter]);

  const activityRowsByKey: Record<ActivityKey, ActivityRow[]> = useMemo(() => ({
    opened: toActivityRows(rawRecipients, "opened"),
    clicked: toActivityRows(rawRecipients, "clicked"),
    unsubscribed: toActivityRows(rawRecipients, "unsubscribed"),
    bounced: toActivityRows(rawRecipients, "bounced"),
    suppressed: toActivityRows(rawRecipients, "suppressed"),
  }), [rawRecipients]);

  const topLinks = useMemo(() => deriveTopLinks(rawRecipients), [rawRecipients]);

  const activeRows = activityRowsByKey[activeListTab];
  const filteredActiveRows = activeRows.filter(r => r.email.toLowerCase().includes(listSearch.toLowerCase()));
  const filteredTopLinks = topLinks.filter(l => l.url.toLowerCase().includes(linkSearch.toLowerCase()));

  // ── Chart range → title + data ──────────────────────────────────────────
  const rangeStart = useMemo(() => {
    if (!pickDate || !pickTime) return null;
    const d = new Date(`${pickDate}T${pickTime}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [pickDate, pickTime]);

  const chartRange = useMemo(() => {
    if (!sentAt) return null;
    if (!customRange || !rangeStart) {
      return { start: sentAt.getTime(), end: sentAt.getTime() + DEFAULT_WINDOW, title: "48-hour performance" };
    }
    const start = sentAt.getTime();
    const end = rangeStart.getTime();
    return { start, end, title: end > start ? `${describeSpan(end - start)} performance` : "Performance" };
  }, [sentAt, customRange, rangeStart]);

  const chartData = useMemo(
    () => (chartRange ? buildChartData(rawRecipients, totals, sentAt, chartRange.start, chartRange.end) : []),
    [chartRange, rawRecipients, totals, sentAt]
  );

  const yTicks = useMemo(() => {
    const max = Math.max(0, ...chartData.flatMap(p => [p.opens, p.clicks, p.unsubscribed]));
    return buildYTicks(max);
  }, [chartData]);

  const onPickDate = (v: string) => { setPickDate(v); setCustomRange(true); };
  const onPickTime = (v: string) => { setPickTime(v); setCustomRange(true); };
  const stepStart = (unit: "day" | "hour", dir: 1 | -1) => {
    const d = new Date(rangeStart ?? sentAt ?? new Date());
    if (unit === "day") d.setDate(d.getDate() + dir);
    else d.setHours(d.getHours() + dir);
    setPickDate(toLocalDateInput(d));
    setPickTime(toLocalTimeInput(d));
    setCustomRange(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm pt-10 pb-10 px-4 overflow-y-auto">
      <div className="bg-[#eeeeee] rounded-2xl shadow-2xl w-full max-w-5xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Subject:</span>
            <span className="text-sm font-semibold text-gray-800">{data.subject}</span>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-700 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M3 3l12 12M15 3 3 15" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Performance */}
              <h3 className="text-xl font-semibold text-gray-900 mb-5">Performance</h3>

              <div className="grid grid-cols-1 md:grid-cols-[250px_minmax(0,1fr)] gap-5 mb-6">
                {/* Stat cards */}
                <div className="space-y-3">
                  {STAT_CARDS(data).map(s => {
                    const Card = (
                      <div className="flex items-center gap-4 bg-white rounded-2xl px-4 py-4 shadow-sm w-full text-left">
                        <div className="w-16 h-16 shrink-0 rounded-full bg-[#f3f3f3] flex items-center justify-center">{s.icon}</div>
                        <div>
                          <p className="text-xl font-bold text-gray-900 leading-tight">{s.value}</p>
                          <p className="text-sm text-gray-600 mt-1">{s.label}</p>
                        </div>
                      </div>
                    );
                    return s.key ? (
                      <button
                        type="button"
                        key={s.label}
                        onClick={() => setDetailModal(s.key)}
                        className="w-full hover:ring-1 hover:ring-blue-200 rounded-2xl transition"
                      >
                        {Card}
                      </button>
                    ) : (
                      <div key={s.label}>{Card}</div>
                    );
                  })}
                </div>

                {/* Recipients + chart */}
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-4xl font-bold text-gray-900 leading-none">{data.recipients.toLocaleString()}</p>
                      <p className="text-lg text-blue-500 mt-2">Recipients</p>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <p className="text-sm">
                        <span className="text-green-700">Sent:</span>{" "}
                        <span className="font-medium text-gray-900">{data.sentAt}</span>
                      </p>
                      <div className="flex items-center gap-3">
                        <StatusPill tone="red" label="Bounced" count={bounced.count} pct={bounced.pct} />
                        <StatusPill tone="gray" label="Suppressed" count={suppressed.count} pct={suppressed.pct} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-5 mt-4 shadow-sm">
                    {/* Title + date/time inputs share one row */}
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <p className="text-sm font-semibold text-gray-900">{chartRange?.title ?? "Performance"}</p>
                      <div className="flex items-center gap-3">
                        <PickerField
                          kind="date"
                          value={pickDate}
                          display={formatPickerDate(pickDate)}
                          onChange={onPickDate}
                          onStep={dir => stepStart("day", dir)}
                        />
                        <PickerField
                          kind="time"
                          value={pickTime}
                          display={pickTime}
                          onChange={onPickTime}
                          onStep={dir => stepStart("hour", dir)}
                        />
                      </div>
                    </div>

                    {chartData.length === 0 ? (
                      <div className="h-[230px] flex items-center justify-center text-sm text-gray-400">
                        No data for the selected range.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={230}>
                        <AreaChart data={chartData} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4a86e8" stopOpacity={0.22} />
                              <stop offset="95%" stopColor="#4a86e8" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="opensGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2e7d32" stopOpacity={0.18} />
                              <stop offset="95%" stopColor="#2e7d32" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="unsubscribedGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#d1d5db" />
                          <XAxis
                            dataKey="label"
                            interval={Math.floor(CHART_BUCKETS / 8) - 1}
                            tick={{ fontSize: 11, fill: "#9ca3af" }}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                          />
                          <YAxis
                            type="number"
                            domain={[0, toLogY(yTicks[yTicks.length - 1])]}
                            ticks={yTicks.map(toLogY)}
                            tickFormatter={(y: number) => formatCount(fromLogY(y))}
                            tick={{ fontSize: 11, fill: "#9ca3af" }}
                            tickLine={false}
                            axisLine={false}
                            width={44}
                          />
                          <Tooltip
                            content={<ChartTooltip />}
                            cursor={{ stroke: "#2e7d32", strokeDasharray: "4 4" }}
                            offset={14}
                          />
                          <Area type="monotone" dataKey="clicksY" stroke="#4a86e8" strokeWidth={1.5} fill="url(#clicksGrad)" dot={false} activeDot={{ r: 4, fill: "#fff", stroke: "#4a86e8", strokeWidth: 1.5 }} />
                          <Area type="monotone" dataKey="opensY" stroke="#2e7d32" strokeWidth={1.5} fill="url(#opensGrad)" dot={false} activeDot={{ r: 4, fill: "#fff", stroke: "#2e7d32", strokeWidth: 1.5 }} />
                          <Area type="monotone" dataKey="unsubscribedY" stroke="#ef4444" strokeWidth={1.5} fill="url(#unsubscribedGrad)" dot={false} activeDot={{ r: 4, fill: "#fff", stroke: "#ef4444", strokeWidth: 1.5 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              {/* Activity tabs + Top Clicked Links */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                  <div className="flex items-center gap-4 border-b border-gray-100 mb-3 pb-2 overflow-x-auto">
                    {ACTIVITY_TABS.map(t => (
                      <button
                        key={t.key}
                        onClick={() => { setActiveListTab(t.key); setListSearch(""); }}
                        className={`text-sm font-medium whitespace-nowrap pb-1 ${activeListTab === t.key ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-400"}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <SearchBox value={listSearch} onChange={setListSearch} />
                  <ActivityRows rows={filteredActiveRows} emptyLabel={ACTIVITY_TABS.find(t => t.key === activeListTab)?.label.toLowerCase() ?? ""} />
                  {filteredActiveRows.length > 5 && (
                    <div className="text-center mt-3">
                      <button
                        onClick={() => setDetailModal(activeListTab)}
                        className="text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-1.5"
                      >
                        View All
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-100">Top Clicked Links</h4>
                  <SearchBox value={linkSearch} onChange={setLinkSearch} />
                  {filteredTopLinks.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-10">No suppressed events have occurred yet.</p>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {filteredTopLinks.map(l => (
                        <div key={l.id} className="flex items-center justify-between py-2.5">
                          <a href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-600 underline underline-offset-2 truncate">
                            <span>🌐</span><span className="truncate">{l.url}</span>
                          </a>
                          <span className="text-sm text-gray-700 shrink-0 ml-2">{l.clicks}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Preview / Plain Text / HTML / Insight */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <MessageContentPanel
                  newsletter={newsletter}
                  activeTab={contentTab}
                  setActiveTab={setContentTab}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {detailModal && (
        <ActivityDetailModal
          title={ACTIVITY_TABS.find(t => t.key === detailModal)!.label}
          rows={activityRowsByKey[detailModal]}
          onClose={() => setDetailModal(null)}
        />
      )}
    </div>
  );
}

// ─── Small shared pieces ────────────────────────────────────────────────────

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative mb-3">
      <span className="absolute left-2.5 top-2.5 text-gray-400 text-sm">🔍</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search..."
        className="w-full text-sm border border-gray-200 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-200"
      />
    </div>
  );
}

function ActivityRows({ rows, emptyLabel }: { rows: ActivityRow[]; emptyLabel: string }) {
  if (rows.length === 0) {
    return <p className="text-center text-sm text-gray-400 py-10">No {emptyLabel} events have occurred yet.</p>;
  }
  return (
    <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
      {rows.slice(0, 5).map(r => (
        <div key={r.id} className="flex items-center justify-between py-2.5">
          <a href={`mailto:${r.email}`} className="text-sm text-blue-600 underline underline-offset-2">{r.email}</a>
          {r.badge ? (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.badge.tone === "red" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"}`}>
              {r.badge.text}
            </span>
          ) : (
            <span className="text-sm text-gray-700">{r.detail}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ActivityDetailModal({ title, rows, onClose }: { title: string; rows: ActivityRow[]; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = rows.filter(r => r.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
          <button
            onClick={() => exportRowsToExcel(title, filtered)}
            title="Download as Excel"
            className="text-gray-400 hover:text-gray-700 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100"
          >
            ⬇️
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          <SearchBox value={search} onChange={setSearch} />
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">No {title.toLowerCase()} events have occurred yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2.5">
                  <a href={`mailto:${r.email}`} className="text-sm text-blue-600 underline underline-offset-2">{r.email}</a>
                  {r.badge ? (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.badge.tone === "red" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"}`}>
                      {r.badge.text}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-700">{r.detail}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageContentPanel({
  newsletter,
  activeTab,
  setActiveTab,
}: {
  newsletter?: Newsletter;
  activeTab: "preview" | "plain" | "html" | "insight";
  setActiveTab: (t: "preview" | "plain" | "html" | "insight") => void;
}) {
  const html = newsletter?.html ?? "";
  const plainText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const copyFrom = () => {
    if (newsletter?.from_name) void navigator.clipboard.writeText(newsletter.from_name);
  };

  // TODO: wire up to a real analytics/insights endpoint once one exists.
  const insights = ["Best performing link is highlighted in Top Clicked Links."];

  return (
    <div>
      <div className="flex items-center gap-5 mb-4 border-b border-gray-100">
        {[
          { key: "preview", label: "Preview" },
          { key: "plain", label: "Plain Text" },
          { key: "html", label: "HTML" },
          { key: "insight", label: "Insight", badge: insights.length },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`relative flex items-center gap-1.5 pb-2 text-sm font-medium ${activeTab === t.key ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-400"}`}
          >
            {t.label}
            {!!t.badge && (
              <span className="inline-flex items-center justify-center text-[10px] font-semibold text-white bg-red-500 rounded-full w-4 h-4">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "preview" && (
        <div className="space-y-2.5">
          <InfoRow label="From:" value={newsletter?.from_name ?? "—"} onCopy={copyFrom} />
          <InfoRow label="To:" value={newsletter?.subtitle || "All Recipients"} />
          <InfoRow label="Subject:" value={newsletter?.title ?? "—"} />
          <InfoRow label="When:" value={newsletter?.date ?? "—"} />
          <div className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden mt-3">
            <iframe title="Email preview" srcDoc={html} className="w-full h-72 bg-white" sandbox="" />
          </div>
        </div>
      )}

      {activeTab === "plain" && (
        <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-xl p-4 max-h-72 overflow-y-auto">
          {plainText || "No plain text content available."}
        </pre>
      )}

      {activeTab === "html" && (
        <pre className="text-xs text-green-300 bg-gray-900 rounded-xl p-4 max-h-72 overflow-y-auto overflow-x-auto">
          <code>{html || "<!-- No HTML content -->"}</code>
        </pre>
      )}

      {activeTab === "insight" && (
        <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
          {insights.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
      )}
    </div>
  );
}

function InfoRow({ label, value, onCopy }: { label: string; value: string; onCopy?: () => void }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-400 w-16 shrink-0">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
      {onCopy && (
        <button onClick={onCopy} className="text-gray-400 hover:text-gray-600" title="Copy">📋</button>
      )}
    </div>
  );
}

// ─── Performance-section pieces ─────────────────────────────────────────────

function StatusPill({ tone, label, pct }: { tone: "red" | "gray"; label: string; count: number; pct: number }) {
  const red = tone === "red";
  return (
    <div className="flex items-center gap-2 bg-white rounded-full pl-3 pr-4 py-2 min-w-[190px]">
      <span className={`w-5 h-5 rounded-full flex items-center justify-center ${red ? "bg-red-200" : "bg-gray-200"}`}>
        <span className={`w-2.5 h-2.5 rounded-full ${red ? "bg-red-400" : "bg-gray-300"}`} />
      </span>
      <span className={`text-sm ${red ? "text-red-500" : "text-gray-400"}`}>{label}</span>
      <span className="text-sm font-medium text-gray-900 w-9 text-right">{pct}%</span>
    </div>
  );
}

// Styled date/time field with a native picker hidden underneath and working up/down steppers.
function PickerField({
  kind, value, display, onChange, onStep,
}: {
  kind: "date" | "time";
  value: string;
  display: string;
  onChange: (v: string) => void;
  onStep: (dir: 1 | -1) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    try { inputRef.current?.showPicker(); } catch { /* showPicker unsupported — native UI still works */ }
  };
  const stepLabel = kind === "date" ? "day" : "hour";

  return (
    <div className="flex items-center h-10 bg-[#f1f1f1] border border-gray-300 rounded-md text-sm text-gray-700">
      <div className="relative flex items-center gap-2 pl-3 pr-2 h-full">
        {kind === "date" ? <CalendarIcon /> : <ClockIcon />}
        <span className="min-w-[56px]">{display || "--"}</span>
        <input
          ref={inputRef}
          type={kind}
          value={value}
          onChange={e => { if (e.target.value) onChange(e.target.value); }}
          onClick={openPicker}
          aria-label={kind === "date" ? "Start date" : "Start time"}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <div className="flex flex-col justify-center pr-2 text-gray-500">
        <button type="button" aria-label={`Later by one ${stepLabel}`} onClick={() => onStep(1)} className="hover:text-gray-900 leading-none">
          <Chevron dir="up" />
        </button>
        <button type="button" aria-label={`Earlier by one ${stepLabel}`} onClick={() => onStep(-1)} className="hover:text-gray-900 leading-none">
          <Chevron dir="down" />
        </button>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;
  const p: ChartPoint = payload[0].payload;
  return (
    <div className="rounded-md bg-[#2e7d32] text-white text-[11px] leading-snug px-2.5 py-1.5 shadow-md">
      <p className="opacity-80 mb-1">{p.full}</p>
      <p>Opened <span className="font-semibold">{p.opens.toLocaleString()}</span></p>
      <p>Clicked <span className="font-semibold">{p.clicks.toLocaleString()}</span></p>
      <p>Unsubscribed <span className="font-semibold">{p.unsubscribed.toLocaleString()}</span></p>
    </div>
  );
}

function Chevron({ dir }: { dir: "up" | "down" }) {
  return (
    <svg width="12" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "up" ? "M3 7.5 6 4.5l3 3" : "M3 4.5 6 7.5l3-3"} />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#4b5563" strokeWidth="1.3" strokeLinecap="round">
      <rect x="2.5" y="4" width="15" height="13" rx="1.5" />
      <path d="M2.5 8h15M6.5 2.5v3M13.5 2.5v3" />
      <path d="M6 11h1M9.5 11h1M13 11h1M6 14h1M9.5 14h1M13 14h1" strokeWidth="1.6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#4b5563" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 5.5V10l3 2" />
    </svg>
  );
}

function PlaneIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24">
      <path d="M21.5 2.5 2.5 10.2l7.3 3 11.7-10.7z" fill="#e070f0" />
      <path d="M21.5 2.5 9.8 13.2l3.5 8.3 8.2-19z" fill="#b83fd0" />
    </svg>
  );
}

function OpenEnvelopeIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24">
      <path d="M3 9.5 12 3l9 6.5-9 5.5z" fill="#4a9a56" />
      <path d="M3 9.5V19a1.5 1.5 0 0 0 1.5 1.5h15A1.5 1.5 0 0 0 21 19V9.5l-9 6z" fill="#2e7d32" />
    </svg>
  );
}

function ClickIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24">
      <path d="M8 3.5 9 6M4.2 6.2 6.5 8M3.5 11l2.8-.2" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path
        d="M10 8a1.4 1.4 0 0 1 2.8 0v4.4l1.2-.3a1.3 1.3 0 0 1 1.6.8 1.3 1.3 0 0 1 1.7.9 1.3 1.3 0 0 1 1.6 1.2l.2 2.6c0 2.9-1.9 5-4.7 5h-1.3c-1.5 0-2.6-.6-3.4-1.7L6.6 16.3a1.3 1.3 0 0 1 1.9-1.7l1.5 1.4z"
        fill="#2f6fd6"
      />
    </svg>
  );
}

function UnsubscribeIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 26 26">
      <rect x="2.5" y="5" width="19" height="15" rx="2.5" fill="#ef4444" />
      <path d="M3.5 7.5 12 14l8.5-6.5" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="19" r="4.6" fill="#dc2626" stroke="#fff" strokeWidth="1.5" />
      <path d="M17.7 19h4.6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}