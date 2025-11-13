import React from "react";

const ROWS = [
  { etf: "IVV – iShares S&P 500 ETF", y1: "20%", y3: "14%", y5: "17%", y10: "15%" },
  { etf: "NDQ – BetaShares NASDAQ 100 ETF", y1: "24%", y3: "26%", y5: "17%", y10: "20%" },
  { etf: "VHY – Vanguard Australian Shares High Yield ETF", y1: "18%", y3: "15%", y5: "15%", y10: "10%" },
  { etf: "VAF – Vanguard Australian Fixed Interest ETF", y1: "4%", y3: "4%", y5: "0%", y10: "2%" },
  { etf: "EBTC – Global X 21Shares Bitcoin ETF", y1: "89%", y3: "81%", y5: "—", y10: "—" },
  { etf: "EETH – Global X 21Shares Ethereum ETF", y1: "90%", y3: "48%", y5: "—", y10: "—" },
  { etf: "STRF – Strategy Inc.", y1: "20%", y3: "—", y5: "—", y10: "—" },
  { etf: "VAP – Vanguard Australian Property Secs ETF", y1: "16%", y3: "—", y5: "—", y10: "—" }
];

export const PerformanceTable = () => {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/70 shadow-[0_18px_45px_-25px_rgba(16,185,129,0.45)]">
      <div className="bg-gradient-to-r from-emerald-500/30 via-emerald-400/20 to-transparent px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-100">
        Historical Performance (Annualised)
      </div>
      <table className="w-full text-sm text-slate-200/90">
        <thead className="bg-slate-900/60 text-slate-300 uppercase tracking-[0.2em] text-[11px]">
          <tr>
            <th className="px-6 py-3 text-left">ETF</th>
            <th className="px-6 py-3 text-right">1 YR</th>
            <th className="px-6 py-3 text-right">3 YRS</th>
            <th className="px-6 py-3 text-right">5 YRS</th>
            <th className="px-6 py-3 text-right">10 YRS</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.etf} className="odd:bg-slate-900/60 even:bg-slate-900/40">
              <td className="px-6 py-3 text-base font-medium text-slate-200">{row.etf}</td>
              <td className="px-6 py-3 text-right text-base font-bold text-emerald-300">{row.y1}</td>
              <td className="px-6 py-3 text-right text-base font-bold text-emerald-300">{row.y3}</td>
              <td className="px-6 py-3 text-right text-base font-bold text-emerald-300">{row.y5}</td>
              <td className="px-6 py-3 text-right text-base font-bold text-emerald-300">{row.y10}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-6 py-3 text-xs text-slate-400/80">Note: Some ETFs do not have 5/10-year history. Replace with live data when available.</p>
    </div>
  );
};