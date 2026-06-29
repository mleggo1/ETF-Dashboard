import React, { useEffect, useState, createContext, useCallback, useMemo } from "react";
import { Dashboard } from "./components/Dashboard";
import etfConfig from "./data/etfs.json";
import {
  buildStaleWarnings,
  DATA_URL,
  enrichAllRecords,
  fetchAllEtfPrices,
  fetchFallbackDataset,
  formatRefreshTimestamp,
  getMostRecentPriceDate,
  loadCachedData,
  pickBetterRecord,
  saveCachedData,
} from "./utils/marketData";
import { getExpectedLatestTradingDay } from "./utils/asxCalendar";

export const AppContext = createContext();

const SYMBOLS = etfConfig.map((e) => e.symbol);

export default function App() {
  const [bootCache] = useState(() => loadCachedData());
  const [initialFallbackData, setInitialFallbackData] = useState(null);

  useEffect(() => {
    if (!bootCache && !initialFallbackData) {
      fetch(DATA_URL)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error(`Failed to load dataset (${res.status})`);
        })
        .then((payload) => {
          if (payload?.data) setInitialFallbackData(payload);
        })
        .catch((err) => console.warn("Failed to preload fallback dataset:", err));
    }
  }, [bootCache, initialFallbackData]);

  const initialDataRaw = bootCache?.data || initialFallbackData?.data || {};
  const initialData = enrichAllRecords(initialDataRaw);

  const [globalTimeframe, setGlobalTimeframe] = useState("YTD");
  const [etfData, setEtfData] = useState(initialData);
  const [lastUpdated, setLastUpdated] = useState(
    bootCache?.lastUpdated || initialFallbackData?.lastUpdated || null
  );
  const [loading, setLoading] = useState(!bootCache && !initialFallbackData);
  const [errors, setErrors] = useState({});
  const [generatedAt, setGeneratedAt] = useState(
    bootCache?.generatedAt || initialFallbackData?.generatedAt || null
  );
  const [dataAsAtDate, setDataAsAtDate] = useState(bootCache?.dataAsAtDate || null);
  const [lastRefreshTimestamp, setLastRefreshTimestamp] = useState(
    bootCache?.lastRefreshTimestamp || null
  );

  useEffect(() => {
    if (initialFallbackData && !bootCache) {
      const enriched = enrichAllRecords(initialFallbackData.data || {});
      setEtfData(enriched);
      const mostRecent = getMostRecentPriceDate(enriched);
      setLastUpdated(initialFallbackData.lastUpdated || initialFallbackData.generatedAt || null);
      setGeneratedAt(initialFallbackData.generatedAt || null);
      setDataAsAtDate(mostRecent || initialFallbackData.generatedAt || null);
      setLoading(false);

      if (Object.keys(enriched).length > 0) {
        const refreshTimestamp = formatRefreshTimestamp(new Date());
        setLastRefreshTimestamp(refreshTimestamp);
        saveCachedData(enriched, {
          lastUpdated: initialFallbackData.lastUpdated || initialFallbackData.generatedAt || null,
          generatedAt: initialFallbackData.generatedAt || null,
          dataAsAtDate: mostRecent || initialFallbackData.generatedAt || null,
          lastRefreshTimestamp: refreshTimestamp,
          expectedTradingDay: getExpectedLatestTradingDay(new Date(), "ASX"),
        });
      }
    }
  }, [initialFallbackData, bootCache]);

  const applyDataset = useCallback((finalData, meta) => {
    const needsEnrich = Object.values(finalData).some((r) => r && r.priceAsAtDate == null);
    const enriched = needsEnrich ? enrichAllRecords(finalData) : finalData;
    setEtfData(enriched);
    setErrors(meta.errors || {});
    setLastUpdated(meta.lastUpdated);
    setGeneratedAt(meta.generatedAt);
    setDataAsAtDate(meta.dataAsAtDate);
    setLastRefreshTimestamp(meta.lastRefreshTimestamp);

    if (Object.keys(enriched).length > 0) {
      saveCachedData(enriched, {
        lastUpdated: meta.lastUpdated,
        generatedAt: meta.generatedAt,
        dataAsAtDate: meta.dataAsAtDate,
        lastRefreshTimestamp: meta.lastRefreshTimestamp,
        expectedTradingDay: meta.expectedTradingDay,
      });
    }
  }, []);

  const loadData = useCallback(
    async ({ signal, allowFallback = true } = {}) => {
      setLoading(true);
      setErrors({});

      try {
        const cachedSeries = bootCache?.data || {};
        const { data: liveData, errors: fetchErrors } = await fetchAllEtfPrices(SYMBOLS, signal, {
          cachedData: cachedSeries,
          loadBundled: allowFallback,
        });

        if (signal?.aborted) return;

        const nextErrors = { ...fetchErrors };
        const finalData = { ...liveData };

        let bundledPayload = null;
        if (allowFallback && Object.keys(finalData).length < SYMBOLS.length) {
          try {
            bundledPayload = await fetchFallbackDataset(signal);
            const bundledData = bundledPayload?.data || {};
            SYMBOLS.forEach((symbol) => {
              if (!finalData[symbol] && bundledData[symbol]) {
                finalData[symbol] = pickBetterRecord(null, bundledData[symbol], symbol, {
                  fetchError: nextErrors[symbol] || "All live sources failed",
                });
              }
            });
          } catch (cacheErr) {
            console.warn("Failed to load bundled fallback for gaps", cacheErr);
          }
        }

        if (Object.keys(finalData).length === 0) {
          try {
            bundledPayload = bundledPayload || (await fetchFallbackDataset(signal));
          } catch {
            bundledPayload = null;
          }
        }

        if (Object.keys(finalData).length === 0 && bundledPayload?.data) {
          const enrichedFallback = {};
          SYMBOLS.forEach((symbol) => {
            if (bundledPayload.data[symbol]) {
              enrichedFallback[symbol] = pickBetterRecord(null, bundledPayload.data[symbol], symbol, {
                fetchError: "All live sources failed",
              });
            }
          });
          applyDataset(enrichedFallback, {
            errors: {
              ...(bundledPayload.errors || {}),
              ...nextErrors,
              __root: "Using bundled fallback — Marketstack and Yahoo unavailable",
            },
            lastUpdated: bundledPayload.lastUpdated || bundledPayload.generatedAt,
            generatedAt: bundledPayload.generatedAt || new Date().toISOString(),
            dataAsAtDate: getMostRecentPriceDate(enrichedFallback) || bundledPayload.generatedAt,
            lastRefreshTimestamp: formatRefreshTimestamp(new Date()),
            expectedTradingDay: getExpectedLatestTradingDay(new Date(), "ASX"),
          });
          return;
        }

        const mostRecent = getMostRecentPriceDate(finalData);
        applyDataset(finalData, {
          errors: nextErrors,
          lastUpdated: mostRecent || new Date().toISOString().slice(0, 10),
          generatedAt: new Date().toISOString(),
          dataAsAtDate: mostRecent,
          lastRefreshTimestamp: formatRefreshTimestamp(new Date()),
          expectedTradingDay: getExpectedLatestTradingDay(new Date(), "ASX"),
        });
      } catch (err) {
        if (signal?.aborted) return;
        console.error(err);
        setErrors({ __root: err.message || "Failed to refresh dataset" });
        if (allowFallback) {
          try {
            const payload = await fetchFallbackDataset(signal);
            if (signal?.aborted) return;
            const enrichedFallback = enrichAllRecords(payload?.data || {});
            applyDataset(enrichedFallback, {
              errors: { ...(payload?.errors || {}), __root: err.message },
              lastUpdated: payload?.lastUpdated || payload?.generatedAt,
              generatedAt: payload?.generatedAt || new Date().toISOString(),
              dataAsAtDate: getMostRecentPriceDate(enrichedFallback) || payload?.generatedAt,
              lastRefreshTimestamp: formatRefreshTimestamp(new Date()),
              expectedTradingDay: getExpectedLatestTradingDay(new Date(), "ASX"),
            });
          } catch (fallbackErr) {
            if (signal?.aborted) return;
            setErrors((prev) => ({
              ...prev,
              __fallback: fallbackErr.message || "Failed to load fallback dataset",
            }));
          }
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [applyDataset, bootCache]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadData({ signal: controller.signal });
    return () => controller.abort();
  }, [loadData]);

  const handleRefreshData = useCallback(async () => {
    setLoading(true);
    setErrors({});
    const currentData = etfData;

    try {
      const { data: liveData, errors: fetchErrors } = await fetchAllEtfPrices(SYMBOLS, undefined, {
        cachedData: currentData,
        loadBundled: true,
      });

      const nextData = { ...currentData };
      const nextErrors = { ...fetchErrors };

      SYMBOLS.forEach((symbol) => {
        if (liveData[symbol]) {
          nextData[symbol] = liveData[symbol];
        } else if (currentData[symbol]) {
          nextData[symbol] = enrichAllRecords({ [symbol]: currentData[symbol] })[symbol];
          if (!nextErrors[symbol]) {
            nextErrors[symbol] = "Refresh failed — using last known data";
          }
        }
      });

      applyDataset(nextData, {
        errors: nextErrors,
        lastUpdated: getMostRecentPriceDate(nextData),
        generatedAt: new Date().toISOString(),
        dataAsAtDate: getMostRecentPriceDate(nextData),
        lastRefreshTimestamp: formatRefreshTimestamp(new Date()),
        expectedTradingDay: getExpectedLatestTradingDay(new Date(), "ASX"),
      });
    } catch (err) {
      console.error(err);
      setEtfData(enrichAllRecords(currentData));
      setErrors({
        __root: err.message || "Couldn't refresh data. Using cached data. Please try again.",
      });
      setLastRefreshTimestamp(formatRefreshTimestamp(new Date()));
    } finally {
      setLoading(false);
    }
  }, [etfData, applyDataset]);

  const staleWarnings = useMemo(() => buildStaleWarnings(etfData), [etfData]);

  const contextValue = useMemo(
    () => ({
      globalTimeframe,
      setGlobalTimeframe,
      etfData,
      ETF_CONFIG: etfConfig,
      lastUpdated,
      loading,
      errors,
      generatedAt,
      dataAsAtDate,
      lastRefreshTimestamp,
      staleWarnings,
      reloadData: handleRefreshData,
    }),
    [
      globalTimeframe,
      etfData,
      lastUpdated,
      loading,
      errors,
      generatedAt,
      dataAsAtDate,
      lastRefreshTimestamp,
      staleWarnings,
      handleRefreshData,
    ]
  );

  return (
    <AppContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
        <Dashboard />
      </div>
    </AppContext.Provider>
  );
}
