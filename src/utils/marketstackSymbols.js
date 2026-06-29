/**
 * Map dashboard tickers to Marketstack EOD symbols (TICKER.MIC).
 * MIC: XASX = ASX, CHIA = Chi-X Australia, XNAS = NASDAQ.
 */
export const DASHBOARD_TO_MARKETSTACK = {
  "IVV.AX": "IVV.XASX",
  "NDQ.AX": "NDQ.XASX",
  "RBTZ.AX": "RBTZ.XASX",
  "CRYP.AX": "CRYP.XASX",
  "EBTC.XA": "EBTC.CHIA",
  "EETH.XA": "EETH.CHIA",
  "VAS.AX": "VAS.XASX",
  "VHY.AX": "VHY.XASX",
  "VAP.AX": "VAP.XASX",
  "IOO.AX": "IOO.XASX",
  "VAF.AX": "VAF.XASX",
  "VGS.AX": "VGS.XASX",
  STRF: "STRF.XNAS",
};

export const MARKETSTACK_TO_DASHBOARD = Object.fromEntries(
  Object.entries(DASHBOARD_TO_MARKETSTACK).map(([dash, ms]) => [ms, dash])
);

/** Bare ticker → dashboard symbol (e.g. IVV → IVV.AX). */
const BARE_TICKER_TO_DASHBOARD = Object.fromEntries(
  Object.entries(DASHBOARD_TO_MARKETSTACK).map(([dash, ms]) => [ms.split(".")[0], dash])
);

export const toMarketstackSymbol = (dashboardSymbol) =>
  DASHBOARD_TO_MARKETSTACK[dashboardSymbol] || dashboardSymbol;

export const toDashboardSymbol = (marketstackSymbol) => {
  if (MARKETSTACK_TO_DASHBOARD[marketstackSymbol]) {
    return MARKETSTACK_TO_DASHBOARD[marketstackSymbol];
  }
  const bare = marketstackSymbol?.split(".")?.[0];
  if (bare && BARE_TICKER_TO_DASHBOARD[bare]) {
    return BARE_TICKER_TO_DASHBOARD[bare];
  }
  return marketstackSymbol;
};

export const allMarketstackSymbols = () => Object.values(DASHBOARD_TO_MARKETSTACK);

export const allDashboardSymbols = () => Object.keys(DASHBOARD_TO_MARKETSTACK);
