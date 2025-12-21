import React, { useState } from "react";
import { AppContext } from "../App";
import { MiniLineChart } from "./MiniLineChart";

const LOCAL_OPTIONS = ["SYNC", "YTD", "1Y", "2Y", "5Y", "10Y", "ALL"];

export const ETFCard = ({ etf, onChartClick, group }) => {
  const { etfData, globalTimeframe } = React.useContext(AppContext);
  const [localTf, setLocalTf] = useState("SYNC");
  const data = etfData[etf.symbol];
  const effectiveTf = localTf === "SYNC" ? globalTimeframe : localTf;
  const isDefensive = group === "defensive";

  const latestPoint = data?.prices?.[data.prices.length - 1];
  const previousPoint =
    data?.prices && data.prices.length > 1 ? data.prices[data.prices.length - 2] : null;

  const latestClose = latestPoint?.close ?? null;
  const dailyPct =
    latestClose && previousPoint?.close
      ? ((latestClose - previousPoint.close) / previousPoint.close) * 100
      : null;

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return "—";
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: data?.currency || "AUD",
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `$${value.toFixed(2)}`;
    }
  };

  const cardStyles = isDefensive
    ? {
        shadow: "shadow-[0_18px_45px_-25px_rgba(59,130,246,0.65)]",
        hoverBorder: "hover:border-blue-400/60",
        hoverShadow: "hover:shadow-[0_25px_65px_-25px_rgba(59,130,246,0.7)]",
        glowBg: "bg-blue-500/15",
        symbolColor: "text-blue-200",
        viewChartColor: "text-blue-300",
      }
    : {
        shadow: "shadow-[0_18px_45px_-25px_rgba(20,184,166,0.65)]",
        hoverBorder: "hover:border-emerald-400/60",
        hoverShadow: "hover:shadow-[0_25px_65px_-25px_rgba(16,185,129,0.7)]",
        glowBg: "bg-emerald-500/15",
        symbolColor: "text-emerald-200",
        viewChartColor: "text-emerald-300",
      };

  return (
    <div className={`group relative flex h-full flex-col gap-3 sm:gap-4 overflow-hidden rounded-xl sm:rounded-2xl border border-slate-800/60 bg-slate-900/70 p-3 sm:p-4 lg:p-5 ${cardStyles.shadow} transition ${cardStyles.hoverBorder} ${cardStyles.hoverShadow} h-full`}>
      <div className={`pointer-events-none absolute inset-y-0 right-[-60px] w-52 rotate-12 rounded-full ${cardStyles.glowBg} blur-[100px] transition-all duration-700 group-hover:translate-x-6`} />
      <div className="relative flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <div className={`text-xs sm:text-sm font-semibold uppercase tracking-[0.15em] sm:tracking-[0.2em] ${cardStyles.symbolColor} truncate`}>{etf.symbol}</div>
          <div className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-slate-200/80 leading-tight line-clamp-2">{etf.name}</div>
        </div>
        <select
          value={localTf}
          onChange={(e) => setLocalTf(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="relative z-[1] rounded-full border border-slate-700/70 bg-slate-900/80 px-2 sm:px-3 py-1 text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.25em] sm:tracking-[0.3em] text-slate-200 transition hover:border-emerald-300/70 focus:border-emerald-400/80 focus:outline-none flex-shrink-0 min-h-[28px] sm:min-h-[32px]"
        >
          {LOCAL_OPTIONS.map((o) => (
            <option key={o} value={o} className="bg-slate-900 text-slate-200">
              {o}
            </option>
          ))}
        </select>
      </div>
      <div className="relative flex items-baseline justify-between text-slate-100 gap-2">
        <div className="text-xl sm:text-2xl font-semibold tracking-tight truncate">{formatCurrency(latestClose)}</div>
        <div
          className={
            "rounded-full px-2 sm:px-3 py-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.25em] flex-shrink-0 " +
            (dailyPct >= 0
              ? "bg-emerald-500/20 text-emerald-200"
              : "bg-rose-500/10 text-rose-200")
          }
        >
          {dailyPct === null ? "—" : `${dailyPct >= 0 ? "+" : ""}${dailyPct.toFixed(2)}%`}
        </div>
      </div>
      {latestPoint?.date && (
        <div className="text-right text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.25em] text-slate-400/70">
          Last close {latestPoint.date}
        </div>
      )}
      <div
        className="relative flex-1 cursor-pointer min-h-0"
        onClick={() => onChartClick && onChartClick(etf)}
        title="Click to view enlarged chart"
      >
        <MiniLineChart timeframe={effectiveTf} data={data} group={group} />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-slate-900/20 rounded-lg">
          <span className={`text-xs uppercase tracking-[0.3em] ${cardStyles.viewChartColor} font-medium`}>
            View Chart
          </span>
        </div>
      </div>
    </div>
  );
};