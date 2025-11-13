import React, { useState } from "react";

const InfoTooltip = ({ term, explanation, children }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      {children}
      <button
        className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-700/50 text-[10px] text-slate-400 hover:bg-slate-600/50 hover:text-slate-300 transition"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={`Info about ${term}`}
      >
        ⓘ
      </button>
      {showTooltip && (
        <div className="absolute left-0 top-6 z-50 w-64 rounded-lg border border-emerald-400/30 bg-slate-900/95 p-3 text-xs text-slate-200 shadow-xl backdrop-blur">
          <p className="font-semibold text-emerald-300 mb-1">{term}</p>
          <p>{explanation}</p>
        </div>
      )}
    </span>
  );
};

export const ETFInfoPanel = ({ etf, metadata, data }) => {
  if (!metadata) {
    return (
      <div className="p-6">
        <div className="text-center text-slate-400">
          <p className="text-sm">Metadata not available for this ETF</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">ETF Information</h3>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-emerald-300 mb-2">Description</h4>
          <p className="text-sm text-slate-300 leading-relaxed">{metadata.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-1">
              Category
            </h4>
            <p className="text-sm text-slate-200">{metadata.category}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-1">
              Index Tracked
            </h4>
            <p className="text-sm text-slate-200">{metadata.indexTracked}</p>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2">
            Strategy
          </h4>
          <p className="text-sm text-slate-200">{metadata.strategy}</p>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2">
            Top Holdings
          </h4>
          <div className="space-y-2">
            {metadata.holdings.slice(0, 8).map((holding, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-slate-800/50 border border-slate-700/50"
              >
                <span className="text-slate-300">{holding.name}</span>
                <span className="text-slate-400 font-medium">{holding.weight}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-1">
              <InfoTooltip
                term="MER"
                explanation="Management Expense Ratio – the yearly fee charged by the ETF manager, expressed as a % of the fund value."
              >
                Management Fee (MER)
              </InfoTooltip>
            </h4>
            <p className="text-sm text-slate-200">{metadata.mer}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-1">
              <InfoTooltip
                term="Dividend Yield"
                explanation="The annual dividend payment divided by the current share price, expressed as a percentage. Shows how much income you can expect from dividends."
              >
                Dividend Yield
              </InfoTooltip>
            </h4>
            <p className="text-sm text-slate-200">{metadata.dividendYield}</p>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-1">
            Distribution Frequency
          </h4>
          <p className="text-sm text-slate-200">{metadata.distributionFrequency}</p>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2">
            Performance Summary
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(metadata.performance).map(([period, returnValue]) => (
              <div
                key={period}
                className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50"
              >
                <div className="text-xs text-slate-400 mb-1">{period}</div>
                <div className="text-sm font-semibold text-slate-200">{returnValue}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2">
            What This ETF Is Good For
          </h4>
          <p className="text-sm text-slate-300 leading-relaxed">{metadata.goodFor}</p>
        </div>

        {data && data.lastUpdated && (
          <div className="pt-4 border-t border-slate-800/60">
            <p className="text-xs text-slate-500">
              Data as at: {data.lastUpdated}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

