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
      <header className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-800/60 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 px-4 sm:px-6 py-8 sm:py-12 shadow-[0_25px_60px_-35px_rgba(15,118,110,0.75)] backdrop-blur">
        {/* Enhanced background effects */}
        <div className="absolute inset-y-0 right-[-120px] w-[320px] rounded-full bg-emerald-500/30 blur-[120px]" />
        <div className="absolute inset-y-0 left-[-80px] w-[240px] rounded-full bg-blue-500/20 blur-[100px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-blue-500/20 blur-[140px]" />
        
        <div className="relative flex flex-col gap-6 sm:gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.5em] text-emerald-300/60 mb-3">Wealth Engine Insights</p>
            <h1 className="relative">
              <span className="absolute -top-2 -left-2 text-6xl sm:text-7xl font-black text-emerald-500/10 select-none pointer-events-none">
                ETF
              </span>
              <div className="relative">
                <span className="block text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight bg-gradient-to-r from-emerald-300 via-teal-200 to-blue-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                  ETF Growth vs Defensive
                </span>
                <span className="block text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white/90 mt-1">
                  Dashboard
                </span>
              </div>
            </h1>
            <p className="mt-4 sm:mt-5 max-w-2xl text-sm sm:text-base text-slate-300/90 leading-relaxed">
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
      <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2">
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