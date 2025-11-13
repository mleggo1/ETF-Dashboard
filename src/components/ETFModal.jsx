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
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
            <div>
              <h2 className="text-xl font-semibold text-white">
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

          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            <div className="flex-[2] flex flex-col border-r border-slate-800/60 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-sm uppercase tracking-[0.3em] text-slate-400">
                    Price Chart
                  </span>
                  <div className="flex gap-2">
                    {["YTD", "1Y", "2Y", "5Y", "10Y", "ALL"].map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setLocalTimeframe(tf)}
                        className={
                          "px-3 py-1.5 text-xs font-medium rounded-full transition " +
                          (localTimeframe === tf
                            ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/60"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60")
                        }
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex-1 p-6 overflow-auto">
                <EnlargedChart timeframe={localTimeframe} data={data} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <ETFInfoPanel etf={etf} metadata={metadata} data={data} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

