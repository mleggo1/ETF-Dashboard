import { calendarDateFromUnix } from "./dates.js";

export const timeZoneForChart = (chartResult) => {
  const named = chartResult?.meta?.exchangeTimezoneName;
  if (typeof named === "string" && named.trim()) return named.trim();
  if (chartResult?.meta?.currency === "USD") return "America/New_York";
  return "Australia/Sydney";
};

/**
 * One close per exchange session.
 * Yahoo's daily bar is stamped at the session open, which during AEDT is the
 * previous UTC date, and it also appends regularMarketTime with the same close.
 * Dating those in UTC stores the same session twice and the day change becomes 0%.
 */
export const pricesFromYahooChart = (chartResult) => {
  if (!chartResult) return [];
  const timestamps = chartResult.timestamp ?? [];
  const adjCloseSeries = chartResult.indicators?.adjclose?.[0]?.adjclose;
  const closeSeries = chartResult.indicators?.quote?.[0]?.close;
  const series = adjCloseSeries && adjCloseSeries.length ? adjCloseSeries : closeSeries ?? [];
  const timeZone = timeZoneForChart(chartResult);
  const byDate = new Map();

  for (let i = 0; i < timestamps.length; i += 1) {
    const ts = timestamps[i];
    const value = series[i];
    if (typeof ts !== "number") continue;
    if (value === null || value === undefined || Number.isNaN(value)) continue;
    const date = calendarDateFromUnix(ts, timeZone);
    if (!date) continue;
    byDate.set(date, Number.parseFloat(Number(value).toFixed(2)));
  }

  return [...byDate.entries()]
    .map(([date, close]) => ({ date, close }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
};

export const chartLastUpdated = (chartResult, prices = []) => {
  const timeZone = timeZoneForChart(chartResult);
  if (chartResult?.meta?.regularMarketTime != null) {
    const dated = calendarDateFromUnix(chartResult.meta.regularMarketTime, timeZone);
    if (dated) return dated;
  }
  return prices[prices.length - 1]?.date || null;
};

/** Move from the previous session to the latest session. Same-day ticks count once. */
export const sessionChangePercent = (prices) => {
  if (!prices || prices.length < 2) return null;
  const sorted = [...prices].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const last = sorted[sorted.length - 1];
  let previous = null;
  for (let i = sorted.length - 2; i >= 0; i -= 1) {
    if (sorted[i].date !== last.date) {
      previous = sorted[i];
      break;
    }
  }
  if (!last?.close || !previous?.close) return null;
  return ((last.close - previous.close) / previous.close) * 100;
};
