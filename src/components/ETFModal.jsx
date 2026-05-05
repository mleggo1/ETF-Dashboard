import React, { useState, useEffect } from "react";
import { AppContext } from "../App";
import { EnlargedChart } from "./EnlargedChart";
import { ETFInfoPanel } from "./ETFInfoPanel";
import etfMetadata from "../data/etf-metadata.json";

export const ETFModal = ({ etf, isOpen, onClose }) => {
  const { etfData } = React.useContext(AppContext);
  const [localTimeframe, setLocalTimeframe] = useState("1Y");
  const data = etfData[etf?.symbol];
  const metadata = etfMetadata[etf?.symbol];
  const isDefensive = etf?.group === "defensive";

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !etf) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" />
      <div
        className="relative z-10 w-full max-w-7xl max-h-[90vh] rounded-3xl border border-slate-800/60 bg-slate-900/95 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950" />
        <div className="relative flex flex-col h-full max-h-[90vh]">
          <div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-800/60 shrink-0">
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-semibold text-white leading-snug line-clamp-2 sm:line-clamp-none">
                {etf.symbol} – {etf.name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              aria-label="Close modal"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
            {/* Mobile: fixed-height chart so Recharts renders; desktop unchanged (flex row + flex-[2]) */}
            <div className="flex flex-col w-full shrink-0 min-h-[min(42vh,340px)] max-h-[min(48vh,380px)] border-b border-slate-800/60 overflow-hidden lg:min-h-0 lg:max-h-none lg:flex-[2] lg:border-b-0 lg:border-r lg:border-slate-800/60">
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-800/60 shrink-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400">
                    Price Chart
                  </span>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-start sm:justify-end">
                    {["YTD", "1Y", "2Y", "5Y", "10Y", "ALL"].map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setLocalTimeframe(tf)}
                        className={
                          "px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-medium rounded-full transition " +
                          (localTimeframe === tf
                            ? isDefensive
                              ? "bg-blue-500/20 text-blue-200 border border-blue-400/60"
                              : "bg-emerald-500/20 text-emerald-200 border border-emerald-400/60"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60")
                        }
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-[220px] p-3 sm:p-6 overflow-hidden flex flex-col lg:min-h-0 lg:overflow-auto">
                <EnlargedChart timeframe={localTimeframe} data={data} group={etf.group} layout="modal" />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto max-h-[42vh] lg:max-h-none">
              <ETFInfoPanel etf={etf} metadata={metadata} data={data} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

