/**
 * Vercel serverless proxy for Yahoo Finance chart API (avoids browser CORS / flaky proxies).
 * GET /api/chart?symbol=IVV.AX&interval=1d&range=10y
 */
export default async function handler(req, res) {
  const { symbol, interval = "1d", range = "10y" } = req.query || {};
  if (!symbol || typeof symbol !== "string") {
    return res.status(400).json({ error: "symbol query parameter is required" });
  }

  const url = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`
  );
  url.searchParams.set("interval", String(interval));
  url.searchParams.set("range", String(range));

  try {
    const yres = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; ETFDashboard/1.0)",
      },
    });

    const body = await yres.json();
    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=60");
    return res.status(yres.ok ? 200 : yres.status).json(body);
  } catch (err) {
    console.error("[api/chart]", symbol, err);
    return res.status(502).json({
      error: err.message || "Failed to fetch chart data",
    });
  }
}
