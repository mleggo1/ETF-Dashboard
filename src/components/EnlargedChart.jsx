import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Sort by date first so lastDate is correct - matches table and MiniLineChart
const filterByTimeframe = (prices, timeframe) => {
  if (!prices) return [];
  if (timeframe === "ALL") return prices;

  const sorted = [...prices].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const lastDate = new Date(sorted[sorted.length - 1].date);
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

  return sorted.filter((p) => new Date(p.date) >= start);
};

const formatDateLabel = (dateString, timeframe) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  switch (timeframe) {
    case "YTD":
    case "1Y":
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    case "2Y":
    case "5Y":
      return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    case "10Y":
    case "ALL":
    default:
      return date.getFullYear().toString();
  }
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

const formatCurrencyNoCents = (value, currency) => {
  if (value === undefined || value === null) return "";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "AUD",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${Math.round(value)}`;
  }
};

export const EnlargedChart = ({ timeframe, data, group }) => {
  const isDefensive = group === "defensive";
  
  // Color scheme: Blue for defensive, Green for growth
  const chartColors = isDefensive
    ? {
        gradientStart: "#60a5fa", // blue-400
        gradientEnd: "#3b82f6", // blue-500
        gradientStartOpacity: 0.8,
        gradientEndOpacity: 0.1,
        activeDot: "#60a5fa",
        percentagePositive: "text-blue-400",
        tooltipBorder: "rgba(96,165,250,0.3)", // blue-400
        loadingSpinner: "border-blue-400",
      }
    : {
        gradientStart: "#34d399", // emerald-400
        gradientEnd: "#34d399", // emerald-400
        gradientStartOpacity: 0.8,
        gradientEndOpacity: 0.1,
        activeDot: "#34d399",
        percentagePositive: "text-emerald-400",
        tooltipBorder: "rgba(110,231,183,0.3)", // emerald-400
        loadingSpinner: "border-emerald-400",
      };

  const gradientId = useMemo(
    () => `enlargedGradient-${data?.symbol?.replace(/[^a-zA-Z0-9]/g, "") ?? "default"}`,
    [data?.symbol]
  );

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className={`inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid ${chartColors.loadingSpinner} border-r-transparent`}></div>
          <p className="mt-4 text-sm text-slate-400">Loading chart...</p>
        </div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center text-red-400">
          <p className="text-sm">Data unavailable: {data.error}</p>
        </div>
      </div>
    );
  }

  const filtered = filterByTimeframe(data.prices, timeframe);
  if (!filtered.length) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center text-slate-400">
          <p className="text-sm">Not enough data for {timeframe}</p>
        </div>
      </div>
    );
  }

  const first = filtered[0];
  const last = filtered[filtered.length - 1];
  const cumulativeReturn =
    first && last
      ? (((last.close - first.close) / first.close) * 100).toFixed(2)
      : null;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const point = filtered.find((p) => p.date === label);
      const periodReturn = point && first
        ? (((point.close - first.close) / first.close) * 100).toFixed(2)
        : null;

      return (
        <div className={`rounded-lg border ${chartColors.tooltipBorder} bg-slate-900/95 p-3 shadow-lg backdrop-blur`} style={{ borderColor: chartColors.tooltipBorder }}>
          <p className="text-xs text-slate-400 mb-1">{label}</p>
          <p className="text-sm font-semibold text-white mb-1">
            {formatCurrency(value, data.currency)}
          </p>
          {periodReturn !== null && (
            <p className={`text-xs ${periodReturn >= 0 ? chartColors.percentagePositive : "text-red-400"}`}>
              {periodReturn >= 0 ? "+" : ""}{periodReturn}% since period start
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full min-h-[500px]">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-slate-300">
          <span className="text-slate-400">Period return: </span>
          <span className={cumulativeReturn >= 0 ? chartColors.percentagePositive : "text-rose-400"}>
            {cumulativeReturn !== null ? `${cumulativeReturn >= 0 ? "+" : ""}${cumulativeReturn}%` : "—"}
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={filtered} margin={{ top: 20, right: 30, bottom: 60, left: 20 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.gradientStart} stopOpacity={chartColors.gradientStartOpacity} />
              <stop offset="100%" stopColor={chartColors.gradientEnd} stopOpacity={chartColors.gradientEndOpacity} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tickFormatter={(value) => formatDateLabel(value, timeframe)}
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            stroke="#475569"
            axisLine={{ stroke: "#475569" }}
            tickLine={{ stroke: "#475569" }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(value) => formatCurrencyNoCents(value, data.currency)}
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            stroke="#475569"
            axisLine={{ stroke: "#475569" }}
            tickLine={{ stroke: "#475569" }}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="close"
            stroke={`url(#${gradientId})`}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 0, fill: chartColors.activeDot }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

