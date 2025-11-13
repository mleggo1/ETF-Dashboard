import React from "react";
import { ETFCard } from "./ETFCard";

export const ETFSection = ({ title, etfs, onChartClick }) => {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold uppercase tracking-[0.4em] text-emerald-100">
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {etfs.map((etf) => (
          <ETFCard key={etf.symbol} etf={etf} onChartClick={onChartClick} />
        ))}
      </div>
    </section>
  );
};