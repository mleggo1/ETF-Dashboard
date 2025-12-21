import React, { useState } from "react";
import { TimeframeToolbar } from "./TimeframeToolbar";
import { ETFSection } from "./ETFSection";
import { PerformanceTable } from "./PerformanceTable";
import { ETFModal } from "./ETFModal";
import { AppContext } from "../App";

export const Dashboard = () => {
  const {
    ETF_CONFIG,
    loading,
    reloadData,
    errors,
    lastRefreshTimestamp,
  } = React.useContext(AppContext);
  const [selectedETF, setSelectedETF] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const growth = ETF_CONFIG.filter((e) => e.group === "growth");
  const defensive = ETF_CONFIG.filter((e) => e.group === "defensive");

  const handleChartClick = (etf) => {
    setSelectedETF(etf);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedETF(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8">
      <header className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-800/60 bg-slate-900/70 px-4 sm:px-6 py-6 sm:py-8 shadow-[0_25px_60px_-35px_rgba(15,118,110,0.75)] backdrop-blur">
        <div className="absolute inset-y-0 right-[-120px] w-[320px] rounded-full bg-emerald-500/30 blur-[120px]" />
        <div className="relative flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.35em] text-emerald-300/70">Wealth Engine Insights</p>
            <h1 className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-white md:text-4xl">
              ETF Growth vs Defensive Dashboard
            </h1>
            <p className="mt-2 sm:mt-3 max-w-2xl text-xs sm:text-sm text-slate-300">
              Compare performance, switch time horizons, and stay across the latest market signals in one cohesive
              workspace.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 text-xs text-slate-300 md:items-end mt-4 md:mt-0">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-slate-400/70">
              REFRESHED {lastRefreshTimestamp || "n/a"}
            </span>
            <button
              className="inline-flex items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-400/10 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-emerald-200 backdrop-blur transition hover:border-emerald-300 hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-800/60 disabled:text-slate-500"
              onClick={() => reloadData()}
              disabled={loading}
            >
              {loading ? "Refreshing…" : "Refresh data"}
            </button>
          </div>
        </div>
      </header>
      <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
        <TimeframeToolbar />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <ETFSection title="Growth" etfs={growth} onChartClick={handleChartClick} />
        <ETFSection title="Defensive" etfs={defensive} onChartClick={handleChartClick} />
      </div>
      <PerformanceTable />
      <p className="text-xs text-slate-400 text-right">
        Source: Yahoo Finance · Dataset generated {lastRefreshTimestamp || "n/a"}
      </p>
      <p className="text-sm text-slate-500 text-center pt-4">
        © 2025 Investment Matchmaker · Educational only — not financial advice · Built by Michael Leggo
      </p>
      <ETFModal etf={selectedETF} isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
};