import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const ETF_CONFIG_PATH = path.join(ROOT, "src", "data", "etfs.json");
const OUTPUT_DIR = path.join(ROOT, "public", "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "etf-prices.json");
const YAHOO_CHART_ENDPOINT = "https://query1.finance.yahoo.com/v8/finance/chart/";

async function fetchYahooPayload(symbol, { range, interval }) {
  const url = new URL(symbol, YAHOO_CHART_ENDPOINT);
  url.searchParams.set("interval", interval);
  url.searchParams.set("range", range);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  const payload = await response.json();
  const chartResult = payload?.chart?.result?.[0];
  if (!chartResult) {
    const message = payload?.chart?.error?.description || "No chart data available";
    throw new Error(message);
  }
  return chartResult;
}

function extractPricePoints(chartResult) {
  const timestamps = chartResult.timestamp ?? [];
  const adjClose = chartResult.indicators?.adjclose?.[0]?.adjclose;
  const close = chartResult.indicators?.quote?.[0]?.close;
  const priceSeries = adjClose?.length ? adjClose : close ?? [];

  const pairs = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const value = priceSeries[i];
    const ts = timestamps[i];
    if (value === null || value === undefined) continue;
    if (typeof ts !== "number") continue;
    const isoDate = new Date(ts * 1000).toISOString().slice(0, 10);
    if (!isoDate) continue;
    pairs.push([isoDate, Number.parseFloat(Number(value).toFixed(2))]);
  }
  return pairs;
}

function normalizeForSplits(prices) {
  if (!prices.length) return prices;
  const sorted = [...prices].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
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
      const threshold = 7;
      if (ratio > threshold) {
        factor *= ratio;
      } else if (inverse > threshold) {
        factor /= inverse;
      }
    }

    adjusted[i] = {
      ...current,
      close: Number((current.close / factor).toFixed(2)),
    };
  }

  return adjusted;
}

async function fetchYahooSeries(symbol) {
  const [monthly, daily] = await Promise.all([
    fetchYahooPayload(symbol, { range: "max", interval: "1mo" }),
    fetchYahooPayload(symbol, { range: "10y", interval: "1d" }).catch((err) => {
      console.warn(`Falling back to monthly data for ${symbol}: ${err.message}`);
      return null;
    }),
  ]);

  const combined = extractPricePoints(monthly).map(([date, close]) => ({ date, close }));
  if (daily) {
    extractPricePoints(daily).forEach(([date, close]) => {
      combined.push({ date, close });
    });
  }

  const normalized = normalizeForSplits(combined);

  const dedupedMap = new Map();
  normalized.forEach(({ date, close }) => {
    dedupedMap.set(date, close);
  });

  const prices = [...dedupedMap.entries()]
    .map(([date, close]) => ({ date, close }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (!prices.length) {
    throw new Error("No price points available");
  }

  const meta = daily ?? monthly;
  const lastUpdated = meta.meta?.regularMarketTime
    ? new Date(meta.meta.regularMarketTime * 1000).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return {
    symbol,
    prices,
    currency: meta.meta?.currency || "AUD",
    exchangeName: meta.meta?.exchangeName,
    lastUpdated,
  };
}

async function main() {
  const configRaw = await readFile(ETF_CONFIG_PATH, "utf-8");
  const etfConfig = JSON.parse(configRaw);
  console.log(`Fetching data for ${etfConfig.length} ETFs…`);

  const results = await Promise.allSettled(
    etfConfig.map(({ symbol }) => fetchYahooSeries(symbol))
  );

  const data = {};
  const errors = {};
  let freshestDate = null;

  results.forEach((result, index) => {
    const { symbol } = etfConfig[index];
    if (result.status === "fulfilled") {
      data[symbol] = result.value;
      const symbolUpdated = result.value.lastUpdated;
      if (symbolUpdated) {
        if (!freshestDate || new Date(symbolUpdated) > new Date(freshestDate)) {
          freshestDate = symbolUpdated;
        }
      }
    } else {
      errors[symbol] = result.reason?.message || "Failed to fetch data";
      console.warn(`Failed to fetch ${symbol}: ${errors[symbol]}`);
    }
  });

  await mkdir(OUTPUT_DIR, { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    lastUpdated: freshestDate,
    data,
    errors,
  };
  await writeFile(OUTPUT_FILE, JSON.stringify(payload, null, 2));

  console.log(`Saved dataset to ${path.relative(ROOT, OUTPUT_FILE)}`);
  if (Object.keys(errors).length) {
    console.log(`Completed with ${Object.keys(errors).length} errors.`);
  } else {
    console.log("Completed successfully.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

