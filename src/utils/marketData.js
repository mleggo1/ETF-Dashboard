import {
  formatDisplayDate,
  getExpectedLatestTradingDay,
  getMarketForSymbol,
  isPriceStale,
  toMarketDateString,
} from "./asxCalendar";
import { toDashboardSymbol } from "./marketstackSymbols";

export const DATA_URL = "/data/etf-prices.json";
const YAHOO_CHART_ENDPOINT = "https://query1.finance.yahoo.com/v8/finance/chart/";
const SPLIT_THRESHOLD = 7;
export const CACHE_KEY = "etf-dashboard-cache";
export const CACHE_VERSION = "3.0";

const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 400;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const currencyForSymbol = (symbol) => {
  if (symbol === "STRF" || getMarketForSymbol(symbol) === "US") return "USD";
  return "AUD";
};

export const formatRefreshTimestamp = (date = new Date()) => {
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

export const loadCachedData = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (parsed?.version !== CACHE_VERSION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    if (parsed && parsed.data && typeof parsed.data === "object") {
      return parsed;
    }
  } catch (error) {
    console.warn("Failed to load cached data:", error);
  }
  return null;
};

export const saveCachedData = (data, metadata) => {
  const cache = {
    version: CACHE_VERSION,
    data,
    lastUpdated: metadata.lastUpdated,
    generatedAt: metadata.generatedAt,
    dataAsAtDate: metadata.dataAsAtDate,
    lastRefreshTimestamp: metadata.lastRefreshTimestamp,
    expectedTradingDay: metadata.expectedTradingDay,
    cachedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn("Failed to save cached data:", error);
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (retryError) {
      console.error("Failed to save cached data after retry:", retryError);
    }
  }
};

export const mergePriceHistories = (baseRecord, updateRecord) => {
  const map = new Map();
  (baseRecord?.prices || []).forEach((p) => map.set(p.date, p.close));
  (updateRecord?.prices || []).forEach((p) => map.set(p.date, p.close));
  return [...map.entries()]
    .map(([date, close]) => ({ date, close }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
};

const parseChartBody = (body) => {
  const chartResult = body?.chart?.result?.[0];
  if (!chartResult) {
    const message = body?.chart?.error?.description || body?.error || "No chart data returned";
    throw new Error(message);
  }
  return chartResult;
};

const fetchFromApiRoute = async (symbol, { interval, range }, signal) => {
  const params = new URLSearchParams({ symbol, interval, range });
  const res = await fetch(`/api/chart?${params}`, { signal });
  if (!res.ok) {
    throw new Error(`Yahoo API route failed (${res.status})`);
  }
  const body = await res.json();
  return { chartResult: parseChartBody(body), dataSource: "yahoo-api" };
};

const fetchFromYahooDirect = async (symbol, { interval, range }, signal) => {
  const url = new URL(symbol, YAHOO_CHART_ENDPOINT);
  url.searchParams.set("interval", interval);
  url.searchParams.set("range", range);
  const res = await fetch(url.toString(), { signal, mode: "cors" });
  if (!res.ok) {
    throw new Error(`Yahoo direct failed (${res.status})`);
  }
  const body = await res.json();
  return { chartResult: parseChartBody(body), dataSource: "yahoo-direct" };
};

const fetchFromProxy = async (symbol, { interval, range }, signal, proxyBase) => {
  const url = new URL(symbol, YAHOO_CHART_ENDPOINT);
  url.searchParams.set("interval", interval);
  url.searchParams.set("range", range);
  const proxyUrl = `${proxyBase}${encodeURIComponent(url.toString())}`;
  const res = await fetch(proxyUrl, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Yahoo proxy failed (${res.status})`);
  }
  const body = await res.json();
  return {
    chartResult: parseChartBody(body),
    dataSource: proxyBase.includes("allorigins") ? "yahoo-allorigins" : "yahoo-corsproxy",
  };
};

const YAHOO_SOURCES = [
  (symbol, opts, signal) => fetchFromApiRoute(symbol, opts, signal),
  (symbol, opts, signal) => fetchFromYahooDirect(symbol, opts, signal),
  (symbol, opts, signal) =>
    fetchFromProxy(symbol, opts, signal, "https://api.allorigins.win/raw?url="),
  (symbol, opts, signal) =>
    fetchFromProxy(symbol, opts, signal, "https://corsproxy.io/?"),
];

const fetchYahooPayload = async (symbol, { interval, range }, signal) => {
  let lastError;
  for (const source of YAHOO_SOURCES) {
    for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt += 1) {
      try {
        return await source(symbol, { interval, range }, signal);
      } catch (error) {
        lastError = error;
        if (signal?.aborted) throw error;
        if (attempt < RETRY_ATTEMPTS - 1) {
          await sleep(RETRY_DELAY_MS * (attempt + 1));
        }
      }
    }
  }
  throw lastError || new Error("All Yahoo fallback sources failed");
};

const extractPricePairs = (chartResult) => {
  const timestamps = chartResult.timestamp ?? [];
  const adjCloseSeries = chartResult.indicators?.adjclose?.[0]?.adjclose;
  const closeSeries = chartResult.indicators?.quote?.[0]?.close;
  const prices =
    adjCloseSeries && adjCloseSeries.length ? adjCloseSeries : closeSeries ?? [];

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

const detectIntraday = (priceDate, market, asOf = new Date()) => {
  const today = toMarketDateString(asOf, market);
  if (priceDate !== today) return false;
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: market === "US" ? "America/New_York" : "Australia/Sydney",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(asOf)
    .reduce((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
  const hour = parseInt(parts.hour, 10);
  const minute = parseInt(parts.minute, 10);
  const openHour = market === "US" ? 9 : 10;
  const openMinute = market === "US" ? 30 : 0;
  const closeHour = 16;
  const closeMinute = market === "US" ? 0 : 10;
  const afterOpen = hour > openHour || (hour === openHour && minute >= openMinute);
  const beforeClose = hour < closeHour || (hour === closeHour && minute < closeMinute);
  return afterOpen && beforeClose;
};

export const enrichEtfRecord = (record, symbol, { fetchError } = {}) => {
  if (!record) return null;
  const market = getMarketForSymbol(symbol);
  const expectedTradingDay = getExpectedLatestTradingDay(new Date(), market);
  const prices = record.prices || [];
  const lastPrice = prices[prices.length - 1];
  const priceAsAtDate = lastPrice?.date || record.lastUpdated || null;
  const isStale = isPriceStale(priceAsAtDate, expectedTradingDay);
  const isIntraday = detectIntraday(priceAsAtDate, market);

  if (isStale) {
    console.warn("[stale-data]", {
      symbol,
      expectedDate: expectedTradingDay,
      actualDate: priceAsAtDate,
      dataSource: record.dataSource || "unknown",
      error: fetchError || record.fetchError || null,
    });
  }

  return {
    ...record,
    priceAsAtDate,
    expectedTradingDay,
    isStale,
    isIntraday,
    staleReason: isStale
      ? `Data stale — latest available price is ${formatDisplayDate(priceAsAtDate)}.`
      : null,
    fetchError: fetchError || record.fetchError || null,
  };
};

export const buildStaleWarnings = (etfData) => {
  const warnings = {};
  Object.entries(etfData || {}).forEach(([symbol, record]) => {
    if (record?.isStale) {
      warnings[symbol] = {
        message: record.staleReason,
        priceDate: record.priceAsAtDate,
        expectedDate: record.expectedTradingDay,
        dataSource: record.dataSource || "unknown",
        fetchError: record.fetchError,
      };
    }
  });
  return warnings;
};

const lastPriceDate = (record) => record?.prices?.[record.prices.length - 1]?.date || "";

export const pickBetterRecord = (live, fallback, symbol, { fetchError } = {}) => {
  if (!live && !fallback) return null;
  if (!live) {
    return enrichEtfRecord(
      { ...fallback, dataSource: fallback.dataSource || "bundled-fallback", fromFallback: true },
      symbol,
      { fetchError }
    );
  }
  if (!fallback) return enrichEtfRecord(live, symbol, { fetchError });
  const liveDate = lastPriceDate(live);
  const fbDate = lastPriceDate(fallback);
  if (fbDate > liveDate) {
    return enrichEtfRecord(
      { ...fallback, dataSource: fallback.dataSource || "bundled-fallback", fromFallback: true },
      symbol,
      { fetchError: `Live data older than fallback through ${fbDate}` }
    );
  }
  return enrichEtfRecord(live, symbol, { fetchError });
};

/** Yahoo Finance — fallback only (full 10y history). */
const buildYahooRecord = (symbol, chartResults, dataSource) => {
  const [monthlyResult, dailyResult] = chartResults;
  const combined = extractPricePairs(monthlyResult.chartResult);
  if (dailyResult) {
    extractPricePairs(dailyResult.chartResult).forEach((pair) => combined.push(pair));
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
    throw new Error("No price points available from Yahoo");
  }

  const referenceMeta = dailyResult?.chartResult ?? monthlyResult.chartResult;
  const metaLastUpdated = referenceMeta.meta?.regularMarketTime
    ? new Date(referenceMeta.meta.regularMarketTime * 1000).toISOString().slice(0, 10)
    : prices[prices.length - 1].date;

  return {
    symbol,
    prices,
    currency: referenceMeta.meta?.currency || currencyForSymbol(symbol),
    exchangeName: referenceMeta.meta?.exchangeName,
    lastUpdated: metaLastUpdated,
    dataSource,
    fromFallback: true,
  };
};

export const fetchYahooSeries = async (symbol, signal) => {
  const [monthlyResult, dailyResult] = await Promise.all([
    fetchYahooPayload(symbol, { range: "max", interval: "1mo" }, signal),
    fetchYahooPayload(symbol, { range: "10y", interval: "1d" }, signal).catch((error) => {
      console.warn(`Daily Yahoo data unavailable for ${symbol}, using monthly only.`, error);
      return null;
    }),
  ]);

  const dataSource = dailyResult?.dataSource || monthlyResult.dataSource || "yahoo";
  const base = buildYahooRecord(symbol, [monthlyResult, dailyResult], dataSource);
  return enrichEtfRecord(base, symbol);
};

/** Lighter Yahoo fetch for stale refresh — merges recent prices into existing history. */
const fetchYahooRecentSeries = async (symbol, signal, existingRecord) => {
  const dailyResult = await fetchYahooPayload(symbol, { range: "6mo", interval: "1d" }, signal);
  const pairs = extractPricePairs(dailyResult.chartResult);
  const normalized = normalizeForSplits(pairs);
  const recentPrices = normalized.map(({ date, close }) => ({ date, close }));

  if (!recentPrices.length) {
    throw new Error("No recent Yahoo prices available");
  }

  const mergedPrices = existingRecord?.prices?.length
    ? mergePriceHistories(existingRecord, { prices: recentPrices })
    : recentPrices;

  const last = mergedPrices[mergedPrices.length - 1];
  const base = {
    symbol,
    prices: mergedPrices,
    currency: existingRecord?.currency || currencyForSymbol(symbol),
    exchangeName: existingRecord?.exchangeName,
    lastUpdated: last.date,
    dataSource: dailyResult.dataSource || "yahoo",
    fromFallback: true,
  };

  return enrichEtfRecord(base, symbol);
};

/** Primary: Marketstack batch EOD via /api/prices. */
const fetchMarketstackBatch = async (signal) => {
  const res = await fetch(`/api/prices?years=1&t=${Date.now()}`, { signal });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Marketstack batch failed (${res.status})`);
  }
  return body;
};

const recordFromMarketstack = (dashboardSymbol, prices) => {
  if (!prices?.length) return null;
  const last = prices[prices.length - 1];
  return {
    symbol: dashboardSymbol,
    prices,
    currency: currencyForSymbol(dashboardSymbol),
    lastUpdated: last.date,
    dataSource: "marketstack",
    fromFallback: false,
  };
};

/**
 * Fetch all ETF prices: Marketstack batch first, Yahoo fallback for stale/missing.
 * Merges Marketstack recent EOD with bundled history for long chart ranges.
 */
export const fetchAllEtfPrices = async (
  symbols,
  signal,
  { bundledData = {}, cachedData = {}, loadBundled = false } = {}
) => {
  const errors = {};
  let marketstackByDashboard = {};

  const bundledPromise = loadBundled
    ? fetchFallbackDataset(signal)
        .then((p) => p?.data || {})
        .catch(() => ({}))
    : Promise.resolve(bundledData);

  const [resolvedBundled, batchOutcome] = await Promise.all([
    bundledPromise,
    fetchMarketstackBatch(signal)
      .then((batch) => ({ ok: true, batch }))
      .catch((err) => ({ ok: false, err })),
  ]);

  const historySources = { ...resolvedBundled, ...bundledData };

  if (batchOutcome.ok) {
    Object.entries(batchOutcome.batch.symbols || {}).forEach(([msSymbol, prices]) => {
      const dashboardSymbol = toDashboardSymbol(msSymbol);
      const record = recordFromMarketstack(dashboardSymbol, prices);
      if (record) marketstackByDashboard[dashboardSymbol] = record;
    });
  } else {
    if (signal?.aborted) throw batchOutcome.err;
    errors.__marketstack = batchOutcome.err?.message || "Marketstack batch fetch failed";
    console.warn("[marketstack]", errors.__marketstack);
  }

  const results = {};
  const needsYahoo = new Set();

  symbols.forEach((symbol) => {
    const msRecord = marketstackByDashboard[symbol];
    const historyBase = historySources[symbol] || cachedData[symbol] || null;

    let candidate = null;
    if (msRecord) {
      candidate = {
        ...msRecord,
        prices: historyBase
          ? mergePriceHistories(historyBase, msRecord)
          : msRecord.prices,
        dataSource: "marketstack",
      };
    } else if (historyBase) {
      candidate = {
        ...historyBase,
        dataSource: historyBase.dataSource || "bundled-fallback",
        fromFallback: true,
      };
    }

    if (!candidate) {
      needsYahoo.add(symbol);
      return;
    }

    const enriched = enrichEtfRecord(candidate, symbol);
    if (!msRecord || enriched.isStale) {
      needsYahoo.add(symbol);
      results[symbol] = enriched;
    } else {
      results[symbol] = enriched;
    }
  });

  const yahooSymbols = [...needsYahoo];
  if (yahooSymbols.length > 0) {
    console.info("[fallback] Yahoo retry for:", yahooSymbols.join(", "));
    const yahooResults = await Promise.allSettled(
      yahooSymbols.map(async (symbol) => {
        const existing = results[symbol];
        const hasHistory = (existing?.prices?.length ?? 0) > 60;
        if (hasHistory) {
          try {
            return await fetchYahooRecentSeries(symbol, signal, existing);
          } catch (recentErr) {
            console.warn(`Recent Yahoo fetch failed for ${symbol}, trying full history.`, recentErr);
          }
        }
        return fetchYahooSeries(symbol, signal);
      })
    );

    yahooResults.forEach((result, index) => {
      const symbol = yahooSymbols[index];
      const existing = results[symbol];
      const historyBase = historySources[symbol] || cachedData[symbol];

      if (result.status === "fulfilled") {
        const yahoo = result.value;
        const mergedYahoo = historyBaseMerge(historyBase, yahoo);
        const picked = pickBetterRecord(mergedYahoo, existing, symbol, {
          fetchError: existing?.isStale
            ? "Marketstack stale — refreshed from Yahoo fallback"
            : errors.__marketstack
              ? "Marketstack unavailable — used Yahoo fallback"
              : null,
        });
        results[symbol] = picked || enrichEtfRecord(mergedYahoo, symbol);
      } else {
        const message = result.reason?.message || "Yahoo fallback failed";
        errors[symbol] = message;
        if (existing) {
          results[symbol] = enrichEtfRecord(existing, symbol, { fetchError: message });
        }
      }
    });
  }

  return { data: results, errors };
};

const historyBaseMerge = (base, update) => {
  if (!base?.prices) return update;
  return {
    ...update,
    prices: mergePriceHistories(base, update),
    dataSource: update.dataSource || "yahoo",
  };
};

/** @deprecated Use fetchAllEtfPrices for batch loading. */
export const fetchEtfSeries = async (symbol, signal) => {
  const { data, errors } = await fetchAllEtfPrices([symbol], signal);
  if (data[symbol]) return data[symbol];
  throw new Error(errors[symbol] || errors.__marketstack || "Failed to fetch ETF data");
};

export const getMostRecentPriceDate = (etfData) => {
  let mostRecent = null;
  Object.values(etfData || {}).forEach((etf) => {
    const last = etf?.prices?.[etf.prices.length - 1]?.date;
    if (last && (!mostRecent || last > mostRecent)) {
      mostRecent = last;
    }
  });
  return mostRecent;
};

export const enrichAllRecords = (etfData) => {
  const enriched = {};
  Object.entries(etfData || {}).forEach(([symbol, record]) => {
    enriched[symbol] = enrichEtfRecord(record, symbol);
  });
  return enriched;
};

export const fetchFallbackDataset = async (signal) => {
  const response = await fetch(`${DATA_URL}?t=${Date.now()}`, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load dataset (${response.status})`);
  }
  return response.json();
};
