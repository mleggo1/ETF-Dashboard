import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// helper to filter dataset by timeframe
const filterByTimeframe = (prices, timeframe) => {
  if (!prices) return [];
  if (timeframe === "ALL") return prices;

  const lastDate = new Date(prices[prices.length - 1].date);
  const start = new Date(lastDate);

  switch (timeframe) {
    case "YTD":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case "1Y":
      start.setFullYear(start.getFullYear() - 1);
      break;
    case "2Y":
      start.setFullYear(start.getFullYear() - 2);
      break;
    case "5Y":
      start.setFullYear(start.getFullYear() - 5);
      break;
    case "10Y":
      start.setFullYear(start.getFullYear() - 10);
      break;
    default:
      break;
  }

  return prices.filter((p) => new Date(p.date) >= start);
};

const formatCurrency = (value, currency) => {
  if (value === undefined || value === null) return "";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "AUD",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value}`;
  }
};

const formatDateLabel = (dateString, timeframe) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  switch (timeframe) {
    case "YTD":
    case "1Y":
      return date.toLocaleDateString("en-US", { month: "short" });
    case "2Y":
    case "5Y":
      return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    case "10Y":
    case "ALL":
    default:
      return date.getFullYear().toString();
  }
};

export const MiniLineChart = ({ timeframe, data, group }) => {
  if (!data) {
    return <div className="text-xs text-slate-400">Loading chart...</div>;
  }

  if (data.error) {
    return <div className="text-xs text-red-500">Data unavailable: {data.error}</div>;
  }

  const filtered = filterByTimeframe(data.prices, timeframe);
  if (!filtered.length) {
    return <div className="text-xs text-slate-400">Not enough data for {timeframe}</div>;
  }

  const first = filtered[0];
  const last = filtered[filtered.length - 1];
  const pct =
    first && last
      ? (((last.close - first.close) / first.close) * 100).toFixed(2)
      : null;

  const isDefensive = group === "defensive";
  
  // Color scheme: Blue for defensive, Green for growth
  const chartColors = isDefensive
    ? {
        gradientStart: "#60a5fa", // blue-400
        gradientEnd: "#3b82f6", // blue-500
        gradientStartOpacity: 0.95,
        gradientEndOpacity: 0.3,
        activeDot: "#60a5fa",
        percentagePositive: "text-blue-400",
        tooltipBorder: "rgba(96,165,250,0.35)", // blue-400
        tooltipShadow: "rgba(59,130,246,0.25)", // blue-500
      }
    : {
        gradientStart: "#34d399", // emerald-400
        gradientEnd: "#34d399", // emerald-400
        gradientStartOpacity: 0.95,
        gradientEndOpacity: 0.3,
        activeDot: "#34d399",
        percentagePositive: "text-emerald-500",
        tooltipBorder: "rgba(110,231,183,0.35)", // emerald-400
        tooltipShadow: "rgba(16,185,129,0.25)", // emerald-500
      };

  const gradientId = React.useMemo(
    () => `lineGradient-${data?.symbol?.replace(/[^a-zA-Z0-9]/g, "") ?? "default"}`,
    [data?.symbol]
  );

  return (
    <div className="flex flex-col h-full min-h-[18rem] max-h-[20rem]">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
        <span>{timeframe}</span>
        <span className={pct >= 0 ? chartColors.percentagePositive : "text-red-500"}>
          {pct ? `${pct}%` : ""}
        </span>
      </div>
      <div className="flex-1 min-h-[14rem]">
        <ResponsiveContainer width="100%" height="100%" minHeight={224}>
          <LineChart data={filtered} margin={{ top: 6, right: 6, bottom: 24, left: 6 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={chartColors.gradientStart} stopOpacity={chartColors.gradientStartOpacity} />
                <stop offset="100%" stopColor={chartColors.gradientEnd} stopOpacity={chartColors.gradientEndOpacity} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={(value) => formatDateLabel(value, timeframe)}
              tick={{ fontSize: 11, fill: "#cbd5f5" }}
              stroke="#1f2937"
              axisLine={{ stroke: "#1f2937" }}
              tickLine={false}
              minTickGap={14}
              label={{
                value: "Time",
                position: "insideBottomRight",
                offset: -18,
                fill: "#475569",
                fontSize: 11,
              }}
            />
            <YAxis
              domain={["auto", "auto"]}
              tickFormatter={(value) => formatCurrency(value, data.currency)}
              tick={{ fontSize: 11, fill: "#cbd5f5" }}
              stroke="#1f2937"
              axisLine={false}
              tickLine={false}
              width={48}
              orientation="right"
              tickMargin={8}
            />
            <Tooltip
              formatter={(v) => formatCurrency(v, data.currency)}
              labelFormatter={(l) => `Date: ${l}`}
              contentStyle={{
                backgroundColor: "rgba(15,23,42,0.95)",
                border: `1px solid ${chartColors.tooltipBorder}`,
                borderRadius: 12,
                color: "#e2e8f0",
                boxShadow: `0 12px 30px ${chartColors.tooltipShadow}`,
              }}
              itemStyle={{ color: "#e2e8f0" }}
              labelStyle={{ color: isDefensive ? "#bfdbfe" : "#bbf7d0" }}
            />
            <Line
              type="monotone"
              dataKey="close"
              stroke={`url(#${gradientId})`}
              dot={false}
              strokeWidth={2.5}
              activeDot={{ r: 4, strokeWidth: 0, fill: chartColors.activeDot }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
