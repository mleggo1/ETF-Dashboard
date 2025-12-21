import React, { useMemo } from "react";
import { AppContext } from "../App";
import { calculatePerformance } from "../utils/performanceCalculator";

const PERFORMANCE_CACHE_KEY = "etf-performance-cache";

const loadCachedPerformance = () => {
  try {
    const cached = localStorage.getItem(PERFORMANCE_CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (parsed && parsed.data && Array.isArray(parsed.data)) {
      return parsed;
    }
  } catch (error) {
    console.warn("Failed to load cached performance data:", error);
  }
  return null;
};

const saveCachedPerformance = (performanceData, timestamp) => {
  try {
    const cache = {
      data: performanceData,
      timestamp: timestamp,
      cachedAt: new Date().toISOString(),
    };
    localStorage.setItem(PERFORMANCE_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn("Failed to save cached performance data:", error);
  }
};

export const PerformanceTable = () => {
  const { etfData, ETF_CONFIG, lastRefreshTimestamp } = React.useContext(AppContext);
  const [cachedPerformance, setCachedPerformance] = React.useState(loadCachedPerformance());
  
  // Calculate performance from current data
  const currentPerformance = useMemo(() => {
    if (!etfData || Object.keys(etfData).length === 0) return null;
    
    return ETF_CONFIG.map(({ symbol, name }) => {
      const data = etfData[symbol];
      return calculatePerformance(data, symbol, name);
    });
  }, [etfData, ETF_CONFIG]);
  
  // Update cache when new performance data is calculated
  React.useEffect(() => {
    if (currentPerformance && currentPerformance.length > 0) {
      saveCachedPerformance(currentPerformance, lastRefreshTimestamp);
      setCachedPerformance({
        data: currentPerformance,
        timestamp: lastRefreshTimestamp,
      });
    }
  }, [currentPerformance, lastRefreshTimestamp]);
  
  // Use current performance if available, otherwise use cached
  const displayPerformance = currentPerformance || cachedPerformance?.data || [];
  
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/70 shadow-[0_18px_45px_-25px_rgba(16,185,129,0.45)]">
      <div className="bg-gradient-to-r from-emerald-500/30 via-emerald-400/20 to-transparent px-4 sm:px-6 py-3 text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-emerald-100">
        Historical Performance (Annualised)
        {cachedPerformance?.timestamp && (
          <span className="ml-2 text-[10px] sm:text-xs text-emerald-200/70 normal-case">
            · Updated {cachedPerformance.timestamp}
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-slate-200/90 min-w-[600px]">
          <thead className="bg-slate-900/60 text-slate-300 uppercase tracking-[0.2em] text-[10px] sm:text-[11px]">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left">ETF</th>
              <th className="px-4 sm:px-6 py-3 text-right">1 YR</th>
              <th className="px-4 sm:px-6 py-3 text-right">3 YRS</th>
              <th className="px-4 sm:px-6 py-3 text-right">5 YRS</th>
              <th className="px-4 sm:px-6 py-3 text-right">10 YRS</th>
            </tr>
          </thead>
          <tbody>
            {displayPerformance.length > 0 ? (
              displayPerformance.map((row, index) => (
                <tr key={row.etf || index} className="odd:bg-slate-900/60 even:bg-slate-900/40">
                  <td className="px-4 sm:px-6 py-3 text-sm sm:text-base font-medium text-slate-200">{row.etf}</td>
                  <td className="px-4 sm:px-6 py-3 text-right text-sm sm:text-base font-bold text-emerald-300">{row.y1}</td>
                  <td className="px-4 sm:px-6 py-3 text-right text-sm sm:text-base font-bold text-emerald-300">{row.y3}</td>
                  <td className="px-4 sm:px-6 py-3 text-right text-sm sm:text-base font-bold text-emerald-300">{row.y5}</td>
                  <td className="px-4 sm:px-6 py-3 text-right text-sm sm:text-base font-bold text-emerald-300">{row.y10}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                  Loading performance data...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="px-4 sm:px-6 py-3 text-[10px] sm:text-xs text-slate-400/80">
        Note: Performance calculated from available historical data. Some ETFs may not have full 5/10-year history.
      </p>
    </div>
  );
};