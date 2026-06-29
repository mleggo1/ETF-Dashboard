/** ASX / US trading calendar helpers (Australia/Sydney for ASX). */

const SYDNEY = "Australia/Sydney";
const NY = "America/New_York";

/** ASX non-trading days (official + observed). Extend annually. */
const ASX_HOLIDAYS = new Set([
  "2024-01-01", "2024-01-26", "2024-03-29", "2024-04-01", "2024-04-25",
  "2024-06-10", "2024-12-25", "2024-12-26",
  "2025-01-01", "2025-01-27", "2025-04-18", "2025-04-21", "2025-04-25",
  "2025-06-09", "2025-12-25", "2025-12-26",
  "2026-01-01", "2026-01-26", "2026-04-03", "2026-04-06", "2026-04-25",
  "2026-06-08", "2026-12-25", "2026-12-28",
  "2027-01-01", "2027-01-26", "2027-03-26", "2027-03-29", "2027-04-26",
  "2027-06-14", "2027-12-27", "2027-12-28",
]);

/** NYSE non-trading days (for US-listed symbols e.g. STRF). */
const US_HOLIDAYS = new Set([
  "2024-01-01", "2024-01-15", "2024-02-19", "2024-03-29", "2024-05-27",
  "2024-06-19", "2024-07-04", "2024-09-02", "2024-11-28", "2024-12-25",
  "2025-01-01", "2025-01-20", "2025-02-17", "2025-04-18", "2025-05-26",
  "2025-06-19", "2025-07-04", "2025-09-01", "2025-11-27", "2025-12-25",
  "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25",
  "2026-06-19", "2026-07-03", "2026-09-07", "2026-11-26", "2026-12-25",
  "2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31",
  "2027-06-18", "2027-07-05", "2027-09-06", "2027-11-25", "2027-12-24",
]);

export const getMarketForSymbol = (symbol) => {
  if (!symbol) return "ASX";
  if (symbol.endsWith(".AX") || symbol.endsWith(".XA")) return "ASX";
  return "US";
};

const getHolidays = (market) => (market === "US" ? US_HOLIDAYS : ASX_HOLIDAYS);

const getTimeZone = (market) => (market === "US" ? NY : SYDNEY);

/** YYYY-MM-DD in market timezone. */
export const toMarketDateString = (date = new Date(), market = "ASX") => {
  return new Intl.DateTimeFormat("en-CA", { timeZone: getTimeZone(market) }).format(date);
};

const getMarketTimeParts = (date = new Date(), market = "ASX") => {
  const fmt = new Intl.DateTimeFormat("en-AU", {
    timeZone: getTimeZone(market),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = {};
  fmt.formatToParts(date).forEach((p) => {
    if (p.type !== "literal") parts[p.type] = p.value;
  });
  return parts;
};

const parseDate = (dateStr) => new Date(`${dateStr}T12:00:00`);

const addDays = (dateStr, days) => {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const isWeekend = (dateStr, market = "ASX") => {
  const d = parseDate(dateStr);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: getTimeZone(market),
    weekday: "short",
  }).format(d);
  return weekday === "Sat" || weekday === "Sun";
};

export const isHoliday = (dateStr, market = "ASX") => getHolidays(market).has(dateStr);

export const isTradingDay = (dateStr, market = "ASX") =>
  !isWeekend(dateStr, market) && !isHoliday(dateStr, market);

/** Walk back to the previous trading day (exclusive of dateStr if non-trading). */
export const getPreviousTradingDay = (dateStr, market = "ASX") => {
  let d = dateStr;
  do {
    d = addDays(d, -1);
  } while (!isTradingDay(d, market));
  return d;
};

/**
 * Latest valid EOD trading day for charts.
 * Before market close → previous completed trading day.
 * Weekend/holiday → previous trading day.
 */
export const getExpectedLatestTradingDay = (asOf = new Date(), market = "ASX") => {
  const parts = getMarketTimeParts(asOf, market);
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const hour = parseInt(parts.hour, 10);
  const minute = parseInt(parts.minute, 10);

  // ASX cash close ~16:10 Sydney; US close ~16:00 ET
  const closeHour = market === "US" ? 16 : 16;
  const closeMinute = market === "US" ? 0 : 10;
  const beforeClose =
    hour < closeHour || (hour === closeHour && minute < closeMinute);

  let candidate = today;
  if (!isTradingDay(candidate, market) || beforeClose) {
    candidate = getPreviousTradingDay(candidate, market);
  }
  return candidate;
};

export const formatDisplayDate = (dateStr) => {
  if (!dateStr) return "n/a";
  const d = parseDate(dateStr);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
};

/** True if priceDate is before the expected latest EOD trading day. */
export const isPriceStale = (priceDate, expectedTradingDay) => {
  if (!priceDate || !expectedTradingDay) return false;
  return priceDate < expectedTradingDay;
};
