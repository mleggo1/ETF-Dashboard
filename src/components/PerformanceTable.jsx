import React, { useMemo } from "react";
import { AppContext } from "../App";
import { calculatePerformance } from "../utils/performanceCalculator";

const PERFORMANCE_CACHE_KEY = "etf-performance-cache";
const PERFORMANCE_CACHE_VERSION = 2; // bump when calculation logic changes (e.g. sort-by-date fix)
const CUSTOM_ORDER_KEY = "etf-performance-custom-order";

const loadCustomOrder = () => {
  try {
    const raw = localStorage.getItem(CUSTOM_ORDER_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.every((x) => typeof x === "string") && arr.length > 0) return arr;
  } catch (e) {
    console.warn("Failed to load custom order:", e);
  }
  return null;
};

const saveCustomOrder = (order) => {
  try {
    if (order && order.length > 0) {
      localStorage.setItem(CUSTOM_ORDER_KEY, JSON.stringify(order));
    } else {
      localStorage.removeItem(CUSTOM_ORDER_KEY);
    }
  } catch (e) {
    console.warn("Failed to save custom order:", e);
  }
};

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
  const [customOrder, setCustomOrder] = React.useState(() => loadCustomOrder());
  const [dragOverIndex, setDragOverIndex] = React.useState(-1);
  const [draggedIndex, setDraggedIndex] = React.useState(-1);

  const clearCustomOrder = () => {
    setCustomOrder(null);
    saveCustomOrder(null);
  };

  const handleSaveCurrentOrder = () => {
    if (!displayPerformance.length) return;
    const order = sortedPerformance.map((r) => r.symbol);
    saveCustomOrder(order);
    setCustomOrder(order);
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.setData("application/x-drag-index", String(index));
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(-1);
  };

  const handleDragEnd = () => {
    setDraggedIndex(-1);
    setDragOverIndex(-1);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    setDragOverIndex(-1);
    const fromIndex = parseInt(e.dataTransfer.getData("application/x-drag-index"), 10);
    if (fromIndex === dropIndex || isNaN(fromIndex)) return;
    const currentOrder = customOrder && customOrder.length > 0
      ? [...customOrder]
      : sortedPerformance.map((r) => r.symbol);
    const symbol = currentOrder[fromIndex];
    const reordered = currentOrder.filter((_, i) => i !== fromIndex);
    reordered.splice(dropIndex, 0, symbol);
    setCustomOrder(reordered);
    saveCustomOrder(reordered);
  };
  
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
  
  // Sort: custom order (saved sequence) when set; else column sort (nulls last; numeric desc = high first; ETF A–Z / Z–A)
  const sortedPerformance = useMemo(() => {
    if (!displayPerformance.length) return [];
    const list = [...displayPerformance];

    if (customOrder && Array.isArray(customOrder) && customOrder.length > 0) {
      const orderSet = new Set(customOrder);
      const knownOrder = customOrder.filter((s) => list.some((r) => r.symbol === s));
      const newSymbols = list.filter((r) => !orderSet.has(r.symbol)).map((r) => r.symbol);
      const fullOrder = [...knownOrder, ...newSymbols];
      const orderMap = new Map(fullOrder.map((s, i) => [s, i]));
      list.sort((a, b) => {
        const ai = orderMap.get(a.symbol) ?? Infinity;
        const bi = orderMap.get(b.symbol) ?? Infinity;
        return ai - bi;
      });
      return list;
    }

    const dir = sortDir === "asc" ? 1 : -1;
    const key = sortBy;
    return list.sort((a, b) => {
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
  }, [displayPerformance, sortBy, sortDir, customOrder]);
  
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
          <div className="flex items-center gap-2 flex-shrink-0">
            {customOrder && customOrder.length > 0 && (
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-emerald-300/90 bg-emerald-500/20 border border-emerald-400/40 rounded px-2 py-1">
                Custom order
              </span>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition focus:outline-none focus:ring-1 focus:ring-slate-500"
              title="Print"
              aria-label="Print"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleSaveCurrentOrder}
              className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-emerald-200/90 hover:text-emerald-100 border border-emerald-400/50 hover:border-emerald-400/70 rounded-lg px-2.5 py-1.5 transition"
            >
              Save order
            </button>
            {customOrder && customOrder.length > 0 && (
              <button
                type="button"
                onClick={clearCustomOrder}
                className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-slate-400 hover:text-slate-200 border border-slate-600 hover:border-slate-500 rounded-lg px-2.5 py-1.5 transition"
              >
                Clear order
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
        <table className="w-full text-xs sm:text-sm text-slate-200/90 min-w-[500px] sm:min-w-[600px]">
          <thead className="bg-slate-900/80 border-b-2 border-slate-800/60">
            <tr>
              <th className="w-8 sm:w-9 px-1 py-3 sm:py-3.5 text-slate-500" aria-label="Reorder" />
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
                const isDragging = index === draggedIndex;
                const isDropTarget = index === dragOverIndex;

                return (
                  <tr
                    key={row.etf || index}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleRowClick(symbol)}
                    className={`odd:bg-slate-900/50 even:bg-slate-900/30 border-b border-slate-800/40 cursor-pointer transition hover:bg-slate-800/60 hover:shadow-[inset_0_0_0_1px_rgba(16,185,129,0.3)] active:bg-slate-800/70 select-none ${
                      isDragging ? "opacity-50" : ""
                    } ${isDropTarget ? "border-l-2 border-l-emerald-400 bg-emerald-900/20" : ""}`}
                  >
                    <td
                      className="w-8 sm:w-9 px-1 py-3 sm:py-3.5 text-slate-500 cursor-grab active:cursor-grabbing"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="inline-block text-slate-500 hover:text-slate-400" aria-hidden="true">⋮⋮</span>
                    </td>
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
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
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