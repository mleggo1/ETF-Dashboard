import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const YAHOO_CHART_ENDPOINT = "https://query1.finance.yahoo.com/v8/finance/chart/";

const etfsPath = path.join(__dirname, "..", "src", "data", "etfs.json");
const outputPath = path.join(__dirname, "..", "public", "data", "etf-prices.json");

const loadEtfConfig = () => {
  const raw = fs.readFileSync(etfsPath, "utf8");
  return JSON.parse(raw);
};

const fetchYahooSeries = async (symbol) => {
  const url = new URL(symbol, YAHOO_CHART_ENDPOINT);
  url.searchParams.set("interval", "1d");
  url.searchParams.set("range", "10y");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Request failed for ${symbol} (${res.status}): ${res.statusText}`);
  }
  const body = await res.json();
  const chartResult = body?.chart?.result?.[0];
  if (!chartResult) {
    const message = body?.chart?.error?.description || "No chart data returned";
    throw new Error(`No chart data for ${symbol}: ${message}`);
  }
  const timestamps = chartResult.timestamp ?? [];
  const adjCloseSeries = chartResult.indicators?.adjclose?.[0]?.adjclose;
  const closeSeries = chartResult.indicators?.quote?.[0]?.close;
  const pricesSeries = adjCloseSeries && adjCloseSeries.length ? adjCloseSeries : closeSeries ?? [];

  const prices = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const ts = timestamps[i];
    const value = pricesSeries[i];
    if (typeof ts !== "number") continue;
    if (value === null || value === undefined || Number.isNaN(value)) continue;
    const date = new Date(ts * 1000).toISOString().slice(0, 10);
    prices.push({
      date,
      close: Number.parseFloat(Number(value).toFixed(2)),
    });
  }
  prices.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (!prices.length) {
    throw new Error(`No price points after filtering for ${symbol}`);
  }

  const meta = chartResult.meta ?? {};
  const lastUpdated =
    meta.regularMarketTime != null
      ? new Date(meta.regularMarketTime * 1000).toISOString().slice(0, 10)
      : prices[prices.length - 1].date;

  return {
    symbol,
    prices,
    currency: meta.currency || "AUD",
    exchangeName: meta.exchangeName,
    lastUpdated,
  };
};

const main = async () => {
  const etfs = loadEtfConfig();
  const symbols = etfs.map((e) => e.symbol);
  console.log(`Generating fallback price dataset for ${symbols.length} ETFs...`);

  const results = await Promise.allSettled(symbols.map((s) => fetchYahooSeries(s)));

  const data = {};
  const errors = {};
  let mostRecentDate = null;

  results.forEach((result, index) => {
    const symbol = symbols[index];
    if (result.status === "fulfilled") {
      data[symbol] = result.value;
      const lastPrice = result.value.prices[result.value.prices.length - 1];
      if (lastPrice?.date && (!mostRecentDate || lastPrice.date > mostRecentDate)) {
        mostRecentDate = lastPrice.date;
      }
    } else {
      errors[symbol] = result.reason?.message || "Failed to fetch data";
      console.warn(`Failed to fetch ${symbol}:`, errors[symbol]);
    }
  });

  const nowIso = new Date().toISOString();
  const payload = {
    generatedAt: nowIso,
    lastUpdated: mostRecentDate || nowIso.slice(0, 10),
    data,
    errors,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload), "utf8");

  console.log(`Wrote ${Object.keys(data).length} ETFs to ${outputPath}`);
  if (Object.keys(errors).length) {
    console.log("Some symbols failed:", Object.keys(errors));
  }
};

main().catch((err) => {
  console.error("Failed to generate ETF prices dataset:", err);
  process.exit(1);
});

