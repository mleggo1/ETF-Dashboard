import React, { useEffect, useState, createContext, useCallback, useMemo } from "react";
import { Dashboard } from "./components/Dashboard";
import etfConfig from "./data/etfs.json";
import {
  buildStaleWarnings,
  DATA_URL,
  enrichAllRecords,
  fetchEtfSeries,
  fetchFallbackDataset,
  formatRefreshTimestamp,
  getMostRecentPriceDate,
  loadCachedData,
  pickBetterRecord,
  saveCachedData,
} from "./utils/marketData";
import { getExpectedLatestTradingDay } from "./utils/asxCalendar";

export const AppContext = createContext();

export default function App() {
  const cachedData = loadCachedData();
  const [initialFallbackData, setInitialFallbackData] = useState(null);

  useEffect(() => {
    if (!cachedData && !initialFallbackData) {
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
  }, [cachedData, initialFallbackData]);

  const initialDataRaw = cachedData?.data || initialFallbackData?.data || {};
  const initialData = enrichAllRecords(initialDataRaw);

  const [globalTimeframe, setGlobalTimeframe] = useState("YTD");
  const [etfData, setEtfData] = useState(initialData);
  const [lastUpdated, setLastUpdated] = useState(
    cachedData?.lastUpdated || initialFallbackData?.lastUpdated || null
  );
  const [loading, setLoading] = useState(!cachedData && !initialFallbackData);
  const [errors, setErrors] = useState({});
  const [generatedAt, setGeneratedAt] = useState(
    cachedData?.generatedAt || initialFallbackData?.generatedAt || null
  );
  const [dataAsAtDate, setDataAsAtDate] = useState(cachedData?.dataAsAtDate || null);
  const [lastRefreshTimestamp, setLastRefreshTimestamp] = useState(
    cachedData?.lastRefreshTimestamp || null
  );

  useEffect(() => {
    if (initialFallbackData && !cachedData) {
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
  }, [initialFallbackData, cachedData]);

  const applyDataset = useCallback((finalData, meta) => {
    const enriched = enrichAllRecords(finalData);
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

  const mergeLiveAndFallback = useCallback((liveResults, fallbackPayload, nextErrors) => {
    const fallbackData = fallbackPayload?.data || {};
    const finalData = {};
    const errorsOut = { ...(fallbackPayload?.errors || {}), ...nextErrors };

    etfConfig.forEach(({ symbol }, index) => {
      const live = liveResults[index]?.status === "fulfilled" ? liveResults[index].value : null;
      const fallback = fallbackData[symbol];
      const fetchError =
        liveResults[index]?.status === "rejected"
          ? liveResults[index].reason?.message || "Failed to fetch live data"
          : null;

      if (!live && fetchError) {
        errorsOut[symbol] = fetchError;
      }

      const picked = pickBetterRecord(live, fallback, symbol, { fetchError });
      if (picked) finalData[symbol] = picked;
    });

    return { finalData, errorsOut };
  }, []);

  const loadData = useCallback(
    async ({ signal, allowFallback = true } = {}) => {
      setLoading(true);
      setErrors({});

      try {
        const liveResults = await Promise.allSettled(
          etfConfig.map(({ symbol }) => fetchEtfSeries(symbol, signal))
        );

        if (signal?.aborted) return;

        const failedCount = liveResults.filter((r) => r.status === "rejected").length;
        const nextErrors = {};
        liveResults.forEach((result, index) => {
          if (result.status === "rejected") {
            nextErrors[etfConfig[index].symbol] =
              result.reason?.message || "Failed to fetch live data";
          }
        });

        let fallbackPayload = null;
        if (allowFallback && (failedCount > 0 || failedCount === etfConfig.length)) {
          try {
            fallbackPayload = await fetchFallbackDataset(signal);
          } catch (cacheErr) {
            console.warn("Failed to load fallback dataset", cacheErr);
            nextErrors.__fallback = cacheErr.message || "Failed to load fallback dataset";
          }
        }

        if (failedCount === etfConfig.length && allowFallback && fallbackPayload?.data) {
          if (signal?.aborted) return;
          const enrichedFallback = {};
          etfConfig.forEach(({ symbol }) => {
            if (fallbackPayload.data[symbol]) {
              enrichedFallback[symbol] = pickBetterRecord(null, fallbackPayload.data[symbol], symbol, {
                fetchError: "All live sources failed",
              });
            }
          });
          const mostRecent = getMostRecentPriceDate(enrichedFallback);
          const refreshTimestamp = formatRefreshTimestamp(new Date());
          applyDataset(enrichedFallback, {
            errors: { ...fallbackPayload.errors, ...nextErrors, __root: "Using bundled fallback — live fetch failed" },
            lastUpdated: fallbackPayload.lastUpdated || fallbackPayload.generatedAt,
            generatedAt: fallbackPayload.generatedAt || new Date().toISOString(),
            dataAsAtDate: mostRecent || fallbackPayload.generatedAt,
            lastRefreshTimestamp: refreshTimestamp,
            expectedTradingDay: getExpectedLatestTradingDay(new Date(), "ASX"),
          });
          return;
        }

        const { finalData, errorsOut } = mergeLiveAndFallback(liveResults, fallbackPayload, nextErrors);
        const mostRecent = getMostRecentPriceDate(finalData);
        const refreshTimestamp = formatRefreshTimestamp(new Date());
        const liveCount = liveResults.filter((r) => r.status === "fulfilled").length;

        applyDataset(finalData, {
          errors: errorsOut,
          lastUpdated: mostRecent || new Date().toISOString().slice(0, 10),
          generatedAt: new Date().toISOString(),
          dataAsAtDate: mostRecent,
          lastRefreshTimestamp: refreshTimestamp,
          expectedTradingDay: getExpectedLatestTradingDay(new Date(), "ASX"),
        });

        if (liveCount === 0 && !fallbackPayload) {
          setErrors((prev) => ({
            ...prev,
            __root: "Could not refresh live data and no fallback available",
          }));
        }
      } catch (err) {
        if (signal?.aborted) return;
        console.error(err);
        setErrors({ __root: err.message || "Failed to refresh dataset" });
        if (allowFallback) {
          try {
            const payload = await fetchFallbackDataset(signal);
            if (signal?.aborted) return;
            const enrichedFallback = enrichAllRecords(payload?.data || {});
            const mostRecent = getMostRecentPriceDate(enrichedFallback);
            applyDataset(enrichedFallback, {
              errors: { ...(payload?.errors || {}), __root: err.message },
              lastUpdated: payload?.lastUpdated || payload?.generatedAt,
              generatedAt: payload?.generatedAt || new Date().toISOString(),
              dataAsAtDate: mostRecent || payload?.generatedAt,
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
    [applyDataset, mergeLiveAndFallback]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadData({ signal: controller.signal });
    return () => controller.abort();
  }, [loadData]);

  const handleRefreshData = useCallback(async () => {
    setLoading(true);
    setErrors({});
    const currentData = { ...etfData };

    try {
      const liveResults = await Promise.allSettled(
        etfConfig.map(({ symbol }) => fetchEtfSeries(symbol))
      );

      let fallbackPayload = null;
      const failedCount = liveResults.filter((r) => r.status === "rejected").length;
      if (failedCount > 0) {
        try {
          fallbackPayload = await fetchFallbackDataset();
        } catch (e) {
          console.warn("Fallback unavailable during manual refresh", e);
        }
      }

      const nextErrors = {};
      const nextData = { ...currentData };

      etfConfig.forEach(({ symbol }, index) => {
        const live = liveResults[index]?.status === "fulfilled" ? liveResults[index].value : null;
        const fallback = fallbackPayload?.data?.[symbol];
        const fetchError =
          liveResults[index]?.status === "rejected"
            ? liveResults[index].reason?.message
            : null;

        if (live) {
          nextData[symbol] = pickBetterRecord(live, fallback, symbol, { fetchError });
        } else {
          const existing = currentData[symbol];
          if (existing || fallback) {
            nextData[symbol] = pickBetterRecord(existing, fallback, symbol, {
              fetchError:
                fetchError || (existing ? "Refresh failed — using last known data" : null),
            });
          } else {
            nextErrors[symbol] = fetchError || "Failed to fetch live data";
          }
        }
      });

      const mostRecent = getMostRecentPriceDate(nextData);
      const refreshTimestamp = formatRefreshTimestamp(new Date());

      applyDataset(nextData, {
        errors: nextErrors,
        lastUpdated: mostRecent,
        generatedAt: new Date().toISOString(),
        dataAsAtDate: mostRecent,
        lastRefreshTimestamp: refreshTimestamp,
        expectedTradingDay: getExpectedLatestTradingDay(new Date(), "ASX"),
      });
    } catch (err) {
      console.error(err);
      const enriched = enrichAllRecords(currentData);
      setEtfData(enriched);
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
