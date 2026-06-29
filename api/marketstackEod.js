/** Shared Marketstack EOD batch fetch (used by /api/prices). */

const MARKETSTACK_BASE = "https://api.marketstack.com/v1/eod";
const PAGE_LIMIT = 1000;
const MAX_PAGES = 20;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchMarketstackEodBatch({
  accessKey,
  symbols,
  dateFrom,
  dateTo,
  sort = "ASC",
}) {
  if (!accessKey) {
    throw new Error("MARKETSTACK_ACCESS_KEY is not configured");
  }
  if (!symbols?.length) {
    throw new Error("No symbols provided");
  }

  const symbolsParam = symbols.join(",");
  const allRows = [];
  let offset = 0;
  let total = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = new URL(MARKETSTACK_BASE);
    url.searchParams.set("access_key", accessKey);
    url.searchParams.set("symbols", symbolsParam);
    url.searchParams.set("sort", sort);
    url.searchParams.set("limit", String(PAGE_LIMIT));
    url.searchParams.set("offset", String(offset));
    if (dateFrom) url.searchParams.set("date_from", dateFrom);
    if (dateTo) url.searchParams.set("date_to", dateTo);

    let response;
    let body;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });
      body = await response.json();
      if (response.status === 429) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      break;
    }

    if (!response.ok || body?.error) {
      const message =
        body?.error?.message || body?.error?.code || `Marketstack HTTP ${response.status}`;
      throw new Error(message);
    }

    const rows = body.data || [];
    allRows.push(...rows);
    total = body.pagination?.total ?? allRows.length;

    if (allRows.length >= total || rows.length < PAGE_LIMIT) {
      break;
    }
    offset += PAGE_LIMIT;
    await sleep(220);
  }

  return allRows;
}

export function groupEodRowsBySymbol(rows) {
  const bySymbol = {};
  rows.forEach((row) => {
    const sym = row.symbol;
    if (!sym) return;
    const exchange = row.exchange;
    const key = exchange && !sym.includes(".") ? `${sym}.${exchange}` : sym;
    if (!bySymbol[key]) bySymbol[key] = [];
    const date = row.date?.slice(0, 10);
    const close = row.adj_close ?? row.close;
    if (!date || close == null || Number.isNaN(Number(close))) return;
    bySymbol[key].push({
      date,
      close: Number.parseFloat(Number(close).toFixed(2)),
    });
  });

  Object.keys(bySymbol).forEach((sym) => {
    const deduped = new Map();
    bySymbol[sym].forEach((p) => deduped.set(p.date, p.close));
    bySymbol[sym] = [...deduped.entries()]
      .map(([date, close]) => ({ date, close }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  });

  return bySymbol;
}
