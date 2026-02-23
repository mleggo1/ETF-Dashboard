import React, { useMemo } from "react";
import { AppContext } from "../App";
import { calculatePerformance } from "../utils/performanceCalculator";

const PERFORMANCE_CACHE_KEY = "etf-performance-cache";
const PERFORMANCE_CACHE_VERSION = 2; // bump when calculation logic changes (e.g. sort-by-date fix)

const loadCachedPerformance = () => {
  try {
    const cached = localStorage.getItem(PERFORMANCE_CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (parsed && parsed.data && Array.isArray(parsed.data) && parsed.version === PERFORMANCE_CACHE_VERSION) {
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
      version: PERFORMANCE_CACHE_VERSION,
      data: performanceData,
      timestamp: timestamp,
      cachedAt: new Date().toISOString(),
    };
    localStorage.setItem(PERFORMANCE_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn("Failed to save cached performance data:", error);
  }
};

const NUMERIC_KEYS = ["y1", "y3", "y5", "y10"];

const getSortValue = (row, key) => {
  const v = row[key];
  if (v === null || v === undefined) return null;
  if (key === "etf") return (v || "").toString().toLowerCase();
  if (typeof v === "string") {
    const num = parseFloat(v.replace("%", ""));
    return isNaN(num) ? null : num;
  }
  return isNaN(v) ? null : Number(v);
};

export const PerformanceTable = () => {
  const { etfData, ETF_CONFIG, lastRefreshTimestamp } = React.useContext(AppContext);
  const [cachedPerformance, setCachedPerformance] = React.useState(loadCachedPerformance());
  const [sortBy, setSortBy] = React.useState("y1");
  const [sortDir, setSortDir] = React.useState("desc");
  
  // Calculate performance from current data
  const currentPerformance = useMemo(() => {
    if (!etfData || Object.keys(etfData).length === 0) return null;
    
    return ETF_CONFIG.map(({ symbol, name }) => {
      const data = etfData[symbol];
      return calculatePerformance(data, symbol, name);
    });
  }, [etfData, ETF_CONFIG]);
  
  // Scroll to ETF card when row is clicked
  const handleRowClick = (symbol) => {
    const cardElement = document.getElementById(`etf-card-${symbol}`);
    if (cardElement) {
      cardElement.scrollIntoView({ behavior: "smooth", block: "center" });
      // Add a highlight effect
      cardElement.classList.add("ring-2", "ring-emerald-400", "ring-opacity-75");
      setTimeout(() => {
        cardElement.classList.remove("ring-2", "ring-emerald-400", "ring-opacity-75");
      }, 2000);
    }
  };
  
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
  
  // Sort: nulls/undefined last; numeric desc = high first, asc = low first; ETF A–Z / Z–A
  const sortedPerformance = useMemo(() => {
    if (!displayPerformance.length) return [];
    const dir = sortDir === "asc" ? 1 : -1;
    const key = sortBy;
    return [...displayPerformance].sort((a, b) => {
      const va = getSortValue(a, key);
      const vb = getSortValue(b, key);
      const aNull = va === null || va === undefined;
      const bNull = vb === null || vb === undefined;
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
      if (key === "etf") {
        return va < vb ? -dir : va > vb ? dir : 0;
      }
      return va < vb ? dir : va > vb ? -dir : 0;
    });
  }, [displayPerformance, sortBy, sortDir]);
  
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir(NUMERIC_KEYS.includes(column) ? "desc" : "asc");
    }
  };
  
  const SortIndicator = ({ column }) => {
    if (sortBy !== column) return <span className="opacity-40">↕</span>;
    return sortDir === "asc" ? <span>↑</span> : <span>↓</span>;
  };
  
  return (
    <div className="overflow-hidden rounded-xl sm:rounded-2xl border-2 border-slate-800/80 bg-slate-900/80 shadow-[0_18px_45px_-25px_rgba(16,185,129,0.45)]">
      <div className="bg-gradient-to-r from-emerald-500/30 via-emerald-400/20 to-transparent px-4 sm:px-5 lg:px-6 py-3 sm:py-3.5 border-b border-slate-800/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-[0.3em] text-emerald-100">
              Historical Performance (Annualised)
            </h3>
            {cachedPerformance?.timestamp && (
              <p className="mt-1 text-[9px] sm:text-[10px] lg:text-xs text-emerald-200/70 normal-case">
                Updated {cachedPerformance.timestamp}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
        <table className="w-full text-xs sm:text-sm text-slate-200/90 min-w-[500px] sm:min-w-[600px]">
          <thead className="bg-slate-900/80 border-b-2 border-slate-800/60">
            <tr>
              <th
                className="px-4 sm:px-5 lg:px-6 py-3 sm:py-3.5 text-left text-[10px] sm:text-[11px] lg:text-xs font-bold uppercase tracking-[0.2em] text-slate-300 cursor-pointer select-none hover:bg-slate-800/60 transition"
                onClick={() => handleSort("etf")}
              >
                <span className="inline-flex items-center gap-1">ETF <SortIndicator column="etf" /></span>
              </th>
              <th
                className="px-4 sm:px-5 lg:px-6 py-3 sm:py-3.5 text-right text-[10px] sm:text-[11px] lg:text-xs font-bold uppercase tracking-[0.2em] text-slate-300 cursor-pointer select-none hover:bg-slate-800/60 transition"
                onClick={() => handleSort("y1")}
              >
                <span className="inline-flex items-center justify-end gap-1 w-full">1 YR <SortIndicator column="y1" /></span>
              </th>
              <th
                className="px-4 sm:px-5 lg:px-6 py-3 sm:py-3.5 text-right text-[10px] sm:text-[11px] lg:text-xs font-bold uppercase tracking-[0.2em] text-slate-300 cursor-pointer select-none hover:bg-slate-800/60 transition"
                onClick={() => handleSort("y3")}
              >
                <span className="inline-flex items-center justify-end gap-1 w-full">3 YRS <SortIndicator column="y3" /></span>
              </th>
              <th
                className="px-4 sm:px-5 lg:px-6 py-3 sm:py-3.5 text-right text-[10px] sm:text-[11px] lg:text-xs font-bold uppercase tracking-[0.2em] text-slate-300 cursor-pointer select-none hover:bg-slate-800/60 transition"
                onClick={() => handleSort("y5")}
              >
                <span className="inline-flex items-center justify-end gap-1 w-full">5 YRS <SortIndicator column="y5" /></span>
              </th>
              <th
                className="px-4 sm:px-5 lg:px-6 py-3 sm:py-3.5 text-right text-[10px] sm:text-[11px] lg:text-xs font-bold uppercase tracking-[0.2em] text-slate-300 cursor-pointer select-none hover:bg-slate-800/60 transition"
                onClick={() => handleSort("y10")}
              >
                <span className="inline-flex items-center justify-end gap-1 w-full">10 YRS <SortIndicator column="y10" /></span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedPerformance.length > 0 ? (
              sortedPerformance.map((row, index) => {
                const formatValue = (value, isOneYear = false) => {
                  // Handle both new format (number) and old cached format (string)
                  if (value === null || value === undefined) return "—";
                  if (typeof value === "string") {
                    // Old cached format - already formatted, just return it
                    return value;
                  }
                  if (isNaN(value)) return "—";
                  // 1Y shows 1 decimal place to match charts, others show whole numbers
                  const decimals = isOneYear ? 1 : 0;
                  return `${value >= 0 ? "" : ""}${value.toFixed(decimals)}%`;
                };
                
                const getValueClass = (value) => {
                  if (value === null || value === undefined) return "text-emerald-300";
                  // Handle old cached format (string) - check if it starts with "-"
                  if (typeof value === "string") {
                    if (value === "—") return "text-emerald-300";
                    // Check if the string contains a negative number
                    const numValue = parseFloat(value.replace("%", ""));
                    if (!isNaN(numValue) && numValue < 0) return "text-red-400";
                    return "text-emerald-300";
                  }
                  if (isNaN(value)) return "text-emerald-300";
                  return value < 0 ? "text-red-400" : "text-emerald-300";
                };
                
                const symbol = row.symbol || row.etf?.split(" – ")[0] || `row-${index}`;
                
                return (
                  <tr 
                    key={row.etf || index} 
                    onClick={() => handleRowClick(symbol)}
                    className="odd:bg-slate-900/50 even:bg-slate-900/30 border-b border-slate-800/40 cursor-pointer transition hover:bg-slate-800/60 hover:shadow-[inset_0_0_0_1px_rgba(16,185,129,0.3)] active:bg-slate-800/70"
                  >
                    <td className="px-4 sm:px-5 lg:px-6 py-3 sm:py-3.5 text-xs sm:text-sm lg:text-base font-semibold text-slate-200">
                      <div className="flex items-center gap-2">
                        <span>{row.etf}</span>
                        <span className="text-emerald-400/60 text-[10px]">→</span>
                      </div>
                    </td>
                    <td className={`px-4 sm:px-5 lg:px-6 py-3 sm:py-3.5 text-right text-sm sm:text-base lg:text-lg font-bold ${getValueClass(row.y1)}`}>
                      {formatValue(row.y1, true)}
                    </td>
                    <td className={`px-4 sm:px-5 lg:px-6 py-3 sm:py-3.5 text-right text-sm sm:text-base lg:text-lg font-bold ${getValueClass(row.y3)}`}>
                      {formatValue(row.y3)}
                    </td>
                    <td className={`px-4 sm:px-5 lg:px-6 py-3 sm:py-3.5 text-right text-sm sm:text-base lg:text-lg font-bold ${getValueClass(row.y5)}`}>
                      {formatValue(row.y5)}
                    </td>
                    <td className={`px-4 sm:px-5 lg:px-6 py-3 sm:py-3.5 text-right text-sm sm:text-base lg:text-lg font-bold ${getValueClass(row.y10)}`}>
                      {formatValue(row.y10)}
                    </td>
                  </tr>
                );
              })
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
      <p className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-[9px] sm:text-[10px] lg:text-xs text-slate-400/80">
        Note: Performance calculated from available historical data. Some ETFs may not have full 5/10-year history.
      </p>
    </div>
  );
};