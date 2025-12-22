import React, { useState } from "react";
import { TimeframeToolbar } from "./TimeframeToolbar";
import { ETFSection } from "./ETFSection";
import { PerformanceTable } from "./PerformanceTable";
import { ETFModal } from "./ETFModal";
import { ETFInfoModal } from "./ETFInfoModal";
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
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
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
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-10 space-y-4 sm:space-y-6 lg:space-y-8">
      <header className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-800/60 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 px-4 sm:px-5 lg:px-6 py-4 sm:py-5 lg:py-6 shadow-[0_25px_60px_-35px_rgba(15,118,110,0.75)] backdrop-blur">
        {/* Enhanced background effects - reduced */}
        <div className="absolute inset-y-0 right-[-60px] sm:right-[-100px] w-[180px] sm:w-[280px] rounded-full bg-emerald-500/25 blur-[60px] sm:blur-[100px]" />
        <div className="absolute inset-y-0 left-[-40px] sm:left-[-60px] w-[120px] sm:w-[200px] rounded-full bg-blue-500/15 blur-[50px] sm:blur-[80px]" />
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
              <h1 className="relative flex-1">
                <span className="absolute -top-0.5 -left-0.5 sm:-top-1 sm:-left-1 text-3xl sm:text-5xl lg:text-6xl font-black text-emerald-500/10 select-none pointer-events-none">
                  ETF
                </span>
                <div className="relative">
                  <span className="block text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight bg-gradient-to-r from-emerald-300 via-teal-200 to-blue-300 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(16,185,129,0.4)] leading-tight">
                    ETF Growth vs Defensive Dashboard
                  </span>
                </div>
              </h1>
              <button
                onClick={() => setIsInfoModalOpen(true)}
                className="flex-shrink-0 p-1.5 sm:p-2 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/30 hover:border-emerald-400/60 transition-all hover:scale-110 active:scale-95 shadow-md hover:shadow-emerald-500/30"
                aria-label="Learn about ETFs"
                title="What is an ETF?"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
            </div>
            <p className="text-[10px] sm:text-xs lg:text-sm text-slate-300/80 leading-relaxed max-w-2xl">
              Compare performance, switch time horizons, and stay across the latest market signals in one cohesive workspace.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="flex flex-col items-end gap-1.5 text-xs text-slate-300">
              <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-slate-400/70 whitespace-nowrap">
                REFRESHED {lastRefreshTimestamp || "n/a"}
              </span>
              <button
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/60 bg-emerald-400/10 px-3 py-1.5 text-[10px] sm:text-[11px] font-medium text-emerald-200 backdrop-blur transition hover:border-emerald-300 hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-800/60 disabled:text-slate-500"
                onClick={() => reloadData()}
                disabled={loading}
              >
                {loading ? "Refreshing…" : "Refresh data"}
              </button>
            </div>
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
      <ETFInfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
    </div>
  );
};