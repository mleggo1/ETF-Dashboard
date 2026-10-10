import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chartLastUpdated, pricesFromYahooChart } from "../src/utils/yahooChart.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const YAHOO_CHART_ENDPOINT = "https://query1.finance.yahoo.com/v8/finance/chart/";

const etfsPath = path.join(__dirname, "..", "src", "data", "canonical", "etf-canonical.json");
const outputPath = path.join(__dirname, "..", "public", "data", "etf-prices.json");

const loadEtfConfig = () => {
  const raw = fs.readFileSync(etfsPath, "utf8");
  const dataset = JSON.parse(raw);
  return dataset.instruments
    .filter((item) => (item.apps || []).includes("dashboard"))
    .map((item) => ({ symbol: item.dashboardSymbol, name: item.fundName }));
};

const fetchChartBody = async (symbol) => {
  const url = new URL(symbol, YAHOO_CHART_ENDPOINT);
  url.searchParams.set("interval", "1d");
  url.searchParams.set("range", "10y");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; ETFDashboard/1.0)",
      },
    });
    if (!res.ok) {
      throw new Error(`Request failed for ${symbol} (${res.status}): ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    const curled = spawnSync(
      "curl.exe",
      ["-sS", "-A", "Mozilla/5.0", url.toString()],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
    );
    if (curled.status !== 0 || !curled.stdout) {
      throw error;
    }
    return JSON.parse(curled.stdout);
  }
};

const fetchYahooSeries = async (symbol) => {
  const body = await fetchChartBody(symbol);
  const chartResult = body?.chart?.result?.[0];
  if (!chartResult) {
    const message = body?.chart?.error?.description || "No chart data returned";
    throw new Error(`No chart data for ${symbol}: ${message}`);
  }

  const prices = pricesFromYahooChart(chartResult);
  if (!prices.length) {
    throw new Error(`No price points after filtering for ${symbol}`);
  }

  const meta = chartResult.meta ?? {};
  return {
    symbol,
    prices,
    currency: meta.currency || "AUD",
    exchangeName: meta.exchangeName,
    lastUpdated: chartLastUpdated(chartResult, prices),
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

  if (Object.keys(data).length === 0 && fs.existsSync(outputPath)) {
    console.error("All fetches failed — keeping existing etf-prices.json");
    process.exit(1);
  }

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

