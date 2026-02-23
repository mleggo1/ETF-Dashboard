// Filter prices by timeframe (same logic as charts)
const filterByTimeframe = (prices, timeframe) => {
  if (!prices || prices.length === 0) return [];
  if (timeframe === "ALL") return prices;

  const sorted = [...prices].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const lastDate = new Date(sorted[sorted.length - 1].date);
  const start = new Date(lastDate);

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

  return sorted.filter((p) => new Date(p.date) >= start);
};

// 1Y = simple (holding-period) return; 3Y/5Y/10Y = annualised (CAGR) from start to end date.
// Calculate return for a timeframe (same as charts - simple percentage change)
const calculateTimeframeReturn = (prices, timeframe) => {
  const filtered = filterByTimeframe(prices, timeframe);
  if (!filtered || filtered.length < 2) return null;
  
  const first = filtered[0];
  const last = filtered[filtered.length - 1];
  
  if (!first || !last || !first.close || !last.close) return null;
  
  return ((last.close - first.close) / first.close) * 100;
};

// Calculate annualized return percentage (for 3Y, 5Y, 10Y)
export const calculateAnnualizedReturn = (prices, years) => {
  if (!prices || prices.length < 2) return null;
  
  const sorted = [...prices].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const lastDate = new Date(sorted[sorted.length - 1].date);
  const startDate = new Date(lastDate);
  startDate.setFullYear(startDate.getFullYear() - years);
  
  // Find the closest price point to the start date
  let startPrice = null;
  for (let i = 0; i < sorted.length; i++) {
    const priceDate = new Date(sorted[i].date);
    if (priceDate >= startDate) {
      startPrice = sorted[i].close;
      break;
    }
  }
  
  // If no price found before start date, use the first available price
  if (startPrice === null) {
    startPrice = sorted[0].close;
  }
  
  const endPrice = sorted[sorted.length - 1].close;
  
  if (!startPrice || !endPrice || startPrice <= 0) return null;
  
  const totalReturn = (endPrice - startPrice) / startPrice;
  const annualizedReturn = (Math.pow(1 + totalReturn, 1 / years) - 1) * 100;
  
  return annualizedReturn;
};

// Calculate performance for all timeframes
export const calculatePerformance = (etfData, symbol, name) => {
  if (!etfData || !etfData.prices || etfData.prices.length < 2) {
    return {
      etf: `${symbol} – ${name}`,
      symbol: symbol,
      y1: null,
      y3: null,
      y5: null,
      y10: null,
    };
  }
  
  // 1Y uses simple return (same as charts), others use annualized
  const y1 = calculateTimeframeReturn(etfData.prices, "1Y");
  const y3 = calculateAnnualizedReturn(etfData.prices, 3);
  const y5 = calculateAnnualizedReturn(etfData.prices, 5);
  const y10 = calculateAnnualizedReturn(etfData.prices, 10);
  
  return {
    etf: `${symbol} – ${name}`,
    symbol: symbol,
    y1: y1,
    y3: y3,
    y5: y5,
    y10: y10,
  };
};

