/**
 * Batch EOD prices from Marketstack (primary data feed).
 * GET /api/prices?years=1
 *
 * Requires MARKETSTACK_ACCESS_KEY in Vercel env.
 * Response is cached to conserve free-tier quota (100 req/mo; each symbol in a batch counts as 1).
 */
import { fetchMarketstackEodBatch, groupEodRowsBySymbol } from "./marketstackEod.js";

/** Keep in sync with src/utils/marketstackSymbols.js */
const MARKETSTACK_SYMBOLS = [
  "IVV.XASX", "NDQ.XASX", "RBTZ.XASX", "CRYP.XASX", "EBTC.CHIA", "EETH.CHIA",
  "VAS.XASX", "VHY.XASX", "VAP.XASX", "IOO.XASX", "VAF.XASX", "VGS.XASX", "STRF.XNAS",
];

const yearsAgo = (years) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
};

export default async function handler(req, res) {
  const accessKey = process.env.MARKETSTACK_ACCESS_KEY;
  if (!accessKey) {
    return res.status(503).json({
      error: "MARKETSTACK_ACCESS_KEY is not configured on the server",
      code: "MISSING_API_KEY",
    });
  }

  const years = Math.min(Math.max(parseInt(req.query?.years || "1", 10) || 1, 1), 10);
  const symbols = MARKETSTACK_SYMBOLS;

  try {
    const rows = await fetchMarketstackEodBatch({
      accessKey,
      symbols,
      dateFrom: yearsAgo(years),
      sort: "ASC",
    });

    const grouped = groupEodRowsBySymbol(rows);

    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    return res.status(200).json({
      dataSource: "marketstack",
      fetchedAt: new Date().toISOString(),
      years,
      symbols: grouped,
    });
  } catch (err) {
    console.error("[api/prices]", err);
    return res.status(502).json({
      error: err.message || "Marketstack batch fetch failed",
      code: "MARKETSTACK_ERROR",
    });
  }
}
