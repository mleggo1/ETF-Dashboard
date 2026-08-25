/** Parse a YYYY-MM-DD price date as a local calendar day (avoids UTC off-by-one). */
export const parseISODate = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return new Date(NaN);
  const [year, month, day] = dateStr.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return new Date(NaN);
  return new Date(year, month - 1, day);
};

export const formatISODate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** Start of the selected chart/table window, based on the last price date. */
export const getTimeframeStartDate = (lastDateStr, timeframe) => {
  const start = parseISODate(lastDateStr);
  if (Number.isNaN(start.getTime())) return start;

  switch (timeframe) {
    case "YTD":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case "1Y":
      start.setFullYear(start.getFullYear() - 1);
      break;
    case "2Y":
      start.setFullYear(start.getFullYear() - 2);
      break;
    case "5Y":
      start.setFullYear(start.getFullYear() - 5);
      break;
    case "10Y":
      start.setFullYear(start.getFullYear() - 10);
      break;
    default:
      break;
  }

  return start;
};

export const filterPricesByTimeframe = (prices, timeframe) => {
  if (!prices || prices.length === 0) return [];
  const sorted = [...prices].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (timeframe === "ALL") return sorted;

  const lastDate = sorted[sorted.length - 1]?.date;
  const start = getTimeframeStartDate(lastDate, timeframe);
  if (Number.isNaN(start.getTime())) return sorted;

  return sorted.filter((p) => {
    const d = parseISODate(p.date);
    return !Number.isNaN(d.getTime()) && d >= start;
  });
};

/** When history does not cover the full window, describe the actual start. */
export const returnCoverageLabel = (filtered, timeframe) => {
  if (!filtered?.length || timeframe === "ALL") return null;
  const windowStart = getTimeframeStartDate(filtered[filtered.length - 1].date, timeframe);
  const first = parseISODate(filtered[0].date);
  if (Number.isNaN(windowStart.getTime()) || Number.isNaN(first.getTime())) return null;
  const lagDays = Math.round((first - windowStart) / 86400000);
  if (lagDays > 90) return `since ${filtered[0].date}`;
  return null;
};
