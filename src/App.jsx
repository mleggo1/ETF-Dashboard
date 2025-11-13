import React, { useEffect, useState, createContext, useCallback, useMemo } from "react";
import { Dashboard } from "./components/Dashboard";
import etfConfig from "./data/etfs.json";

export const AppContext = createContext();

const DATA_URL = "/data/etf-prices.json";
const YAHOO_CHART_ENDPOINT = "https://query1.finance.yahoo.com/v8/finance/chart/";
const SPLIT_THRESHOLD = 7; // detect >7x jumps as split indicators

const formatRefreshTimestamp = (date = new Date()) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${day}/${month}/${year}, ${displayHours}:${minutes}:${seconds} ${ampm}`;
};

const fetchYahooPayload = async (symbol, { interval, range }, signal) => {
  const url = new URL(symbol, YAHOO_CHART_ENDPOINT);
  url.searchParams.set("interval", interval);
  url.searchParams.set("range", range);
  
  // Use CORS proxy to avoid browser CORS restrictions
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url.toString())}`;
  
  let res;
  try {
    res = await fetch(proxyUrl, { 
      signal,
      headers: {
        'Accept': 'application/json',
      },
    });
  } catch (networkError) {
    // If proxy fails, try direct (might work in some environments)
    try {
      res = await fetch(url.toString(), { 
        signal,
        mode: 'cors',
      });
    } catch (directError) {
      throw new Error(`Network error: Unable to fetch data. ${networkError.message || directError.message}`);
    }
  }
  
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): ${res.statusText}`);
  }
  
  let body;
  try {
    body = await res.json();
  } catch (parseError) {
    throw new Error(`Failed to parse response: ${parseError.message}`);
  }
  
  const chartResult = body?.chart?.result?.[0];
  if (!chartResult) {
    const message = body?.chart?.error?.description || "No chart data returned";
    throw new Error(message);
  }
  return chartResult;
};

const extractPricePairs = (chartResult) => {
  const timestamps = chartResult.timestamp ?? [];
  const adjCloseSeries = chartResult.indicators?.adjclose?.[0]?.adjclose;
  const closeSeries = chartResult.indicators?.quote?.[0]?.close;
  const prices = adjCloseSeries && adjCloseSeries.length ? adjCloseSeries : closeSeries ?? [];
  const pairs = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const ts = timestamps[i];
    const value = prices[i];
    if (typeof ts !== "number") continue;
    if (value === null || value === undefined || Number.isNaN(value)) continue;
    const date = new Date(ts * 1000).toISOString().slice(0, 10);
    pairs.push([date, Number.parseFloat(Number(value).toFixed(2))]);
  }
  return pairs;
};

const normalizeForSplits = (pairs) => {
  if (!pairs.length) return [];
  const sorted = [...pairs]
    .map(([date, close]) => ({ date, close }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const adjusted = new Array(sorted.length);
  let factor = 1;
  adjusted[sorted.length - 1] = {
    ...sorted[sorted.length - 1],
    close: Number(sorted[sorted.length - 1].close.toFixed(2)),
  };

  for (let i = sorted.length - 2; i >= 0; i -= 1) {
    const current = sorted[i];
    const nextRaw = sorted[i + 1];
    if (current.close && nextRaw.close) {
      const ratio = current.close / nextRaw.close;
      const inverse = nextRaw.close / current.close;
      if (ratio > SPLIT_THRESHOLD) {
        factor *= ratio;
      } else if (inverse > SPLIT_THRESHOLD) {
        factor /= inverse;
      }
    }
    adjusted[i] = {
      ...current,
      close: Number((current.close / factor).toFixed(2)),
    };
  }

  return adjusted;
};

const fetchYahooSeries = async (symbol, signal) => {
  const [monthly, daily] = await Promise.all([
    fetchYahooPayload(symbol, { range: "max", interval: "1mo" }, signal),
    fetchYahooPayload(symbol, { range: "10y", interval: "1d" }, signal).catch((error) => {
      console.warn(`Daily data unavailable for ${symbol}, using monthly only.`, error);
      return null;
    }),
  ]);

  const combined = extractPricePairs(monthly);
  if (daily) {
    extractPricePairs(daily).forEach((pair) => combined.push(pair));
  }
  const normalized = normalizeForSplits(combined);

  const deduped = new Map();
  normalized.forEach(({ date, close }) => {
    deduped.set(date, close);
  });

  const prices = [...deduped.entries()]
    .map(([date, close]) => ({ date, close }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (!prices.length) {
    throw new Error("No price points available");
  }

  const referenceMeta = daily ?? monthly;
  const lastUpdated =
    referenceMeta.meta?.regularMarketTime
      ? new Date(referenceMeta.meta.regularMarketTime * 1000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

  return {
    symbol,
    prices,
    currency: referenceMeta.meta?.currency || "AUD",
    exchangeName: referenceMeta.meta?.exchangeName,
    lastUpdated,
  };
};

export default function App() {
  const [globalTimeframe, setGlobalTimeframe] = useState("YTD");
  const [etfData, setEtfData] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [generatedAt, setGeneratedAt] = useState(null);
  const [dataAsAtDate, setDataAsAtDate] = useState(null);
  const [lastRefreshTimestamp, setLastRefreshTimestamp] = useState(null);

  const loadData = useCallback(
    async ({ signal, allowFallback = true } = {}) => {
      setLoading(true);
      setErrors({});

      const fetchFallbackDataset = async () => {
        const response = await fetch(`${DATA_URL}?t=${Date.now()}`, { signal });
        if (!response.ok) {
          throw new Error(`Failed to load dataset (${response.status})`);
        }
        return response.json();
      };

      try {
        const liveResults = await Promise.allSettled(
          etfConfig.map(({ symbol }) => fetchYahooSeries(symbol, signal))
        );

        if (signal?.aborted) {
          return;
        }

        const nextData = {};
        const nextErrors = {};
        const failedSymbols = [];
        let freshestDate = null;
        let mostRecentPriceDate = null;

        liveResults.forEach((result, index) => {
          const { symbol } = etfConfig[index];
          if (result.status === "fulfilled") {
            nextData[symbol] = result.value;
            const updated = result.value.lastUpdated;
            if (updated) {
              if (!freshestDate || new Date(updated) > new Date(freshestDate)) {
                freshestDate = updated;
              }
            }
            // Find the most recent price date from the price series
            const prices = result.value.prices;
            if (prices && prices.length > 0) {
              const lastPriceDate = prices[prices.length - 1].date;
              if (!mostRecentPriceDate || lastPriceDate > mostRecentPriceDate) {
                mostRecentPriceDate = lastPriceDate;
              }
            }
          } else {
            failedSymbols.push(symbol);
            nextErrors[symbol] = result.reason?.message || "Failed to fetch live data";
          }
        });

        if (failedSymbols.length === etfConfig.length && allowFallback) {
          // Everything failed – fallback to bundled dataset
          const payload = await fetchFallbackDataset();
          if (signal?.aborted) return;
          setEtfData(payload?.data || {});
          setErrors(payload?.errors || {});
          const fallbackTimestamp = payload?.generatedAt || payload?.lastUpdated || null;
          setLastUpdated(payload?.lastUpdated || fallbackTimestamp);
          setGeneratedAt(fallbackTimestamp);
          // Try to find most recent price date from fallback data
          let fallbackMostRecentDate = null;
          if (payload?.data) {
            Object.values(payload.data).forEach((etf) => {
              if (etf?.prices && etf.prices.length > 0) {
                const lastDate = etf.prices[etf.prices.length - 1].date;
                if (!fallbackMostRecentDate || lastDate > fallbackMostRecentDate) {
                  fallbackMostRecentDate = lastDate;
                }
              }
            });
          }
          setDataAsAtDate(fallbackMostRecentDate || fallbackTimestamp);
          // Set initial refresh timestamp on first load
          setLastRefreshTimestamp(formatRefreshTimestamp(new Date()));
        } else {
          let fallbackPayload = null;
          if (failedSymbols.length > 0 && allowFallback) {
            try {
              fallbackPayload = await fetchFallbackDataset();
            } catch (cacheErr) {
              console.warn("Failed to load fallback dataset for partial errors", cacheErr);
              nextErrors.__fallback = cacheErr.message || "Failed to load fallback dataset";
            }
          }

          const fallbackData = fallbackPayload?.data || {};
          const fallbackErrors = fallbackPayload?.errors || {};
          const fallbackTimestamp = fallbackPayload?.generatedAt || fallbackPayload?.lastUpdated || null;

          const finalData = {};
          etfConfig.forEach(({ symbol }) => {
            if (nextData[symbol]) {
              finalData[symbol] = nextData[symbol];
            } else if (fallbackData[symbol]) {
              finalData[symbol] = fallbackData[symbol];
            }
          });
          if (!Object.keys(finalData).length && Object.keys(fallbackData).length) {
            Object.assign(finalData, fallbackData);
          }

          const finalErrors = { ...fallbackErrors, ...nextErrors };
          const finalLastUpdated =
            Object.keys(nextData).length > 0
              ? freshestDate || fallbackTimestamp || new Date().toISOString().slice(0, 10)
              : fallbackTimestamp || freshestDate || new Date().toISOString().slice(0, 10);
          const finalGeneratedAt =
            Object.keys(nextData).length > 0
              ? new Date().toISOString()
              : fallbackTimestamp || new Date().toISOString();
          const finalDataAsAtDate = mostRecentPriceDate || finalLastUpdated;

          setEtfData(finalData);
          setErrors(finalErrors);
          setLastUpdated(finalLastUpdated);
          setGeneratedAt(finalGeneratedAt);
          setDataAsAtDate(finalDataAsAtDate);
          // Set initial refresh timestamp on first load
          setLastRefreshTimestamp(formatRefreshTimestamp(new Date()));
        }
      } catch (err) {
        if (signal?.aborted) return;
        console.error(err);
        setErrors({ __root: err.message || "Failed to refresh dataset" });
        if (allowFallback) {
          try {
            const payload = await fetchFallbackDataset();
            if (signal?.aborted) return;
            setEtfData(payload?.data || {});
            setErrors((prev) => ({ ...prev, ...(payload?.errors || {}) }));
            const fallbackTimestamp = payload?.generatedAt || payload?.lastUpdated || null;
            setLastUpdated(payload?.lastUpdated || fallbackTimestamp);
            setGeneratedAt(fallbackTimestamp);
            // Try to find most recent price date from fallback data
            let fallbackMostRecentDate = null;
            if (payload?.data) {
              Object.values(payload.data).forEach((etf) => {
                if (etf?.prices && etf.prices.length > 0) {
                  const lastDate = etf.prices[etf.prices.length - 1].date;
                  if (!fallbackMostRecentDate || lastDate > fallbackMostRecentDate) {
                    fallbackMostRecentDate = lastDate;
                  }
                }
              });
            }
            setDataAsAtDate(fallbackMostRecentDate || fallbackTimestamp);
          } catch (fallbackErr) {
            if (signal?.aborted) return;
            console.error(fallbackErr);
            setErrors((prev) => ({
              ...prev,
              __fallback: fallbackErr.message || "Failed to load fallback dataset",
            }));
          }
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    loadData({ signal: controller.signal });
    return () => {
      controller.abort();
    };
  }, [loadData]);

  const handleRefreshData = useCallback(async () => {
    setLoading(true);
    setErrors({});

    // Preserve current data as fallback
    const currentData = { ...etfData };

    try {
      // Force fresh fetch from Yahoo Finance
      const liveResults = await Promise.allSettled(
        etfConfig.map(({ symbol }) => fetchYahooSeries(symbol))
      );

      const nextData = { ...currentData }; // Start with current data
      const nextErrors = {};
      let mostRecentPriceDate = null;
      let hasNewData = false;

      liveResults.forEach((result, index) => {
        const { symbol } = etfConfig[index];
        if (result.status === "fulfilled") {
          nextData[symbol] = result.value;
          hasNewData = true;
          // Find the most recent price date from the price series
          const prices = result.value.prices;
          if (prices && prices.length > 0) {
            const lastPriceDate = prices[prices.length - 1].date;
            if (!mostRecentPriceDate || lastPriceDate > mostRecentPriceDate) {
              mostRecentPriceDate = lastPriceDate;
            }
          }
        } else {
          // Keep existing data for this symbol if fetch failed
          if (!nextData[symbol]) {
            nextErrors[symbol] = result.reason?.message || "Failed to fetch live data";
          } else {
            // We have fallback data, just log the error
            console.warn(`Failed to refresh ${symbol}:`, result.reason?.message);
            nextErrors[symbol] = `Refresh failed, using cached data: ${result.reason?.message}`;
          }
        }
      });

      // Only update if we got at least some new data, or preserve existing
      if (hasNewData || Object.keys(nextData).length > 0) {
        setEtfData(nextData);
      }
      setErrors(nextErrors);
      
      // Set dataAsAtDate from most recent price date
      const refreshDataAsAtDate = mostRecentPriceDate || 
        (Object.values(nextData).length > 0 && Object.values(nextData)[0]?.prices?.length > 0
          ? Object.values(nextData)[0].prices[Object.values(nextData)[0].prices.length - 1].date
          : new Date().toISOString().slice(0, 10));
      setDataAsAtDate(refreshDataAsAtDate);
      setLastUpdated(refreshDataAsAtDate);

      // Set refresh timestamp in DD/MM/YYYY, h:mm:ss A format
      const refreshTimestamp = formatRefreshTimestamp(new Date());
      setLastRefreshTimestamp(refreshTimestamp);
      setGeneratedAt(new Date().toISOString());
    } catch (err) {
      console.error(err);
      // Keep existing data on error
      setEtfData(currentData);
      setErrors({ __root: err.message || "Couldn't refresh data. Using cached data. Please try again." });
      // Still update timestamp to show we tried
      const refreshTimestamp = formatRefreshTimestamp(new Date());
      setLastRefreshTimestamp(refreshTimestamp);
    } finally {
      setLoading(false);
    }
  }, [etfData]);

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

