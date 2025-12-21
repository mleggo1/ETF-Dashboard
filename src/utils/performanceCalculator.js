// Calculate annualized return percentage
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
      y1: "—",
      y3: "—",
      y5: "—",
      y10: "—",
    };
  }
  
  const y1 = calculateAnnualizedReturn(etfData.prices, 1);
  const y3 = calculateAnnualizedReturn(etfData.prices, 3);
  const y5 = calculateAnnualizedReturn(etfData.prices, 5);
  const y10 = calculateAnnualizedReturn(etfData.prices, 10);
  
  const formatReturn = (value) => {
    if (value === null || value === undefined || isNaN(value)) return "—";
    return `${value >= 0 ? "" : ""}${value.toFixed(0)}%`;
  };
  
  return {
    etf: `${symbol} – ${name}`,
    y1: formatReturn(y1),
    y3: formatReturn(y3),
    y5: formatReturn(y5),
    y10: formatReturn(y10),
  };
};

