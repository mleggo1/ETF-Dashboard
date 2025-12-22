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
      <header className="relative overflow-hidden rounded-xl sm:rounded-2xl lg:rounded-3xl border border-slate-800/60 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-12 shadow-[0_25px_60px_-35px_rgba(15,118,110,0.75)] backdrop-blur">
        {/* Enhanced background effects - reduced on mobile */}
        <div className="absolute inset-y-0 right-[-80px] sm:right-[-120px] w-[200px] sm:w-[320px] rounded-full bg-emerald-500/30 blur-[80px] sm:blur-[120px]" />
        <div className="absolute inset-y-0 left-[-50px] sm:left-[-80px] w-[150px] sm:w-[240px] rounded-full bg-blue-500/20 blur-[60px] sm:blur-[100px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] rounded-full bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-blue-500/20 blur-[80px] sm:blur-[140px]" />
        
        <div className="relative flex flex-col gap-4 sm:gap-6 lg:gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] sm:text-[10px] lg:text-xs uppercase tracking-[0.4em] sm:tracking-[0.5em] text-emerald-300/60 mb-2 sm:mb-3">Wealth Engine Insights</p>
            <h1 className="relative">
              <span className="absolute -top-1 -left-1 sm:-top-2 sm:-left-2 text-4xl sm:text-6xl lg:text-7xl font-black text-emerald-500/10 select-none pointer-events-none">
                ETF
              </span>
              <div className="relative flex items-start gap-3">
                <div className="flex-1">
                  <span className="block text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black tracking-tight bg-gradient-to-r from-emerald-300 via-teal-200 to-blue-300 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(16,185,129,0.4)] sm:drop-shadow-[0_0_30px_rgba(16,185,129,0.5)] leading-tight">
                    ETF Growth vs Defensive
                  </span>
                  <span className="block text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight text-white/90 mt-0.5 sm:mt-1 leading-tight">
                    Dashboard
                  </span>
                </div>
                <button
                  onClick={() => setIsInfoModalOpen(true)}
                  className="flex-shrink-0 mt-1 sm:mt-2 p-2 sm:p-2.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/30 hover:border-emerald-400/60 transition-all hover:scale-110 active:scale-95 shadow-lg hover:shadow-emerald-500/30"
                  aria-label="Learn about ETFs"
                  title="What is an ETF?"
                >
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6"
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
            </h1>
            <p className="mt-3 sm:mt-4 lg:mt-5 max-w-2xl text-xs sm:text-sm lg:text-base text-slate-300/90 leading-relaxed">
              Compare performance, switch time horizons, and stay across the latest market signals in one cohesive
              workspace.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 text-xs text-slate-300 md:items-end mt-3 sm:mt-4 md:mt-0 flex-shrink-0">
            <span className="text-[9px] sm:text-[10px] lg:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.25em] text-slate-400/70 whitespace-nowrap">
              REFRESHED {lastRefreshTimestamp || "n/a"}
            </span>
            <button
              className="inline-flex items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-400/10 px-3 py-1.5 sm:py-2 text-[10px] sm:text-[11px] lg:text-xs font-medium text-emerald-200 backdrop-blur transition hover:border-emerald-300 hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-800/60 disabled:text-slate-500 min-h-[36px] sm:min-h-[40px]"
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
      <ETFInfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
    </div>
  );
};