import React from "react";
import { AppContext } from "../App";

const OPTIONS = ["YTD", "1Y", "2Y", "5Y", "10Y", "ALL"];

export const TimeframeToolbar = () => {
  const { globalTimeframe, setGlobalTimeframe } = React.useContext(AppContext);

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-800/70 bg-slate-900/70 p-1 shadow-[0_15px_40px_rgba(15,118,110,0.35)] backdrop-blur">
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          onClick={() => setGlobalTimeframe(opt)}
          className={
            "rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition whitespace-nowrap " +
            (globalTimeframe === opt
              ? "bg-emerald-400 text-slate-950 shadow shadow-emerald-500/50"
              : "text-slate-300 hover:bg-slate-800/70")
          }
        >
          {opt}
        </button>
      ))}
    </div>
  );
};
