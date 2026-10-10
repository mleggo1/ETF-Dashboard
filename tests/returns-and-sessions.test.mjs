import test from "node:test";
import assert from "node:assert/strict";
import { chartLastUpdated, pricesFromYahooChart, sessionChangePercent } from "../src/utils/yahooChart.js";
import { calculatePerformance, periodReturn } from "../src/utils/performanceCalculator.js";

const unix = (iso) => Date.parse(iso) / 1000;

test("ASX session bar and the closing quote collapse onto one exchange date", () => {
  const chartResult = {
    meta: {
      exchangeTimezoneName: "Australia/Sydney",
      currency: "AUD",
      regularMarketTime: unix("2026-10-09T05:17:43.000Z"),
    },
    timestamp: [
      unix("2026-10-06T23:00:00.000Z"),
      unix("2026-10-07T23:00:00.000Z"),
      unix("2026-10-08T23:00:00.000Z"),
      unix("2026-10-09T05:17:43.000Z"),
    ],
    indicators: {
      quote: [{ close: [206.83999633789062, 206.82000732421875, 204.9199981689453, 204.9199981689453] }],
      adjclose: [{ adjclose: [206.83999633789062, 206.82000732421875, 204.9199981689453, 204.9199981689453] }],
    },
  };

  const prices = pricesFromYahooChart(chartResult);
  assert.deepEqual(
    prices.map((point) => point.date),
    ["2026-10-07", "2026-10-08", "2026-10-09"]
  );
  assert.deepEqual(
    prices.map((point) => point.close),
    [206.84, 206.82, 204.92]
  );
  assert.equal(chartLastUpdated(chartResult, prices), "2026-10-09");

  const change = sessionChangePercent(prices);
  assert.ok(change < -0.9 && change > -0.93, `expected about -0.92, got ${change}`);
});

test("chart period returns and the historical row use one calculation", () => {
  const prices = [];
  const start = new Date(2016, 0, 4);
  for (let i = 0; i < 4000; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    prices.push({ date, close: Number((100 * (1 + i / 8000)).toFixed(2)) });
  }

  const row = calculatePerformance({ prices }, "IOO.AX", "iShares Global 100 ETF");
  assert.equal(row.y1, periodReturn(prices, "1Y"));
  assert.equal(row.y3, periodReturn(prices, "3Y"));
  assert.equal(row.y5, periodReturn(prices, "5Y"));
  assert.equal(row.y10, periodReturn(prices, "10Y"));
  assert.equal(typeof row.y1, "number");
  assert.notEqual(Number(row.y1.toFixed(2)), Number(row.y5.toFixed(2)));
});
