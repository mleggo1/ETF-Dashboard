import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalIdentityKey,
  dashboardViewOfInstrument,
  decimalToPercentPoints,
  educatorViewOfInstrument,
  FRESHNESS_RULES,
  formatPercentPoints,
  getEducatorEtfs,
  getInstrumentByExchangeTicker,
  listSharedInstruments,
  mergeInstrumentRefresh,
  percentPointsToDecimal,
  reconcileSharedInstruments,
  UNAVAILABLE_DISPLAY,
  validateDataset,
  validateInstrument,
} from "../src/data/canonical/etfCanonical.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataset = JSON.parse(
  readFileSync(path.join(__dirname, "../src/data/canonical/etf-canonical.json"), "utf8")
);

const NOW = new Date(2026, 8, 18);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("canonical dataset validates", () => {
  const result = validateDataset(dataset, { now: NOW });
  assert.equal(result.ok, true, result.errors.join("\n"));
});

test("percent-point storage does not scale 0.04% to 4% or 0.0004%", () => {
  assert.equal(percentPointsToDecimal(0.04), 0.0004);
  assert.equal(decimalToPercentPoints(0.0004), 0.04);
  assert.equal(formatPercentPoints(0.04, 2), "0.04%");
  assert.notEqual(formatPercentPoints(0.04, 2), "4.00%");
  assert.notEqual(formatPercentPoints(0.04, 2), "0.0004%");
});

test("missing values format as em dash rather than zero", () => {
  assert.equal(formatPercentPoints(null, 2), UNAVAILABLE_DISPLAY);
  assert.equal(formatPercentPoints(undefined, 2), UNAVAILABLE_DISPLAY);
  assert.notEqual(formatPercentPoints(null, 2), "0.00%");
  assert.notEqual(formatPercentPoints(null, 2), "0%");
});

test("identical tickers on different exchanges stay distinct", () => {
  const asxIvv = getInstrumentByExchangeTicker(dataset, "XASX", "IVV");
  const nyseIvv = {
    exchange: "NYSEARCA",
    ticker: "IVV",
    fundName: "iShares Core S&P 500 ETF",
    isin: "US4642872000",
    currency: "USD",
    managementFee: { percentPoints: 0.03 },
  };
  assert.ok(asxIvv);
  assert.equal(asxIvv.id, "XASX:IVV");
  assert.equal(asxIvv.isin, "AU000000IVV8");
  assert.equal(asxIvv.managementFee.percentPoints, 0.04);
  assert.notEqual(canonicalIdentityKey(asxIvv), canonicalIdentityKey(nyseIvv));
  assert.notEqual(asxIvv.managementFee.percentPoints, nyseIvv.managementFee.percentPoints);
  assert.equal(getInstrumentByExchangeTicker(dataset, "NYSEARCA", "IVV"), null);
});

test("hedged and unhedged funds are not combined", () => {
  for (const instrument of dataset.instruments) {
    assert.equal(typeof instrument.hedged, "boolean");
  }
  assert.equal(getInstrumentByExchangeTicker(dataset, "XASX", "IVV").hedged, false);
  assert.equal(getInstrumentByExchangeTicker(dataset, "XASX", "VGS").hedged, false);
  assert.equal(getInstrumentByExchangeTicker(dataset, "XASX", "IHVV"), null);
  assert.equal(getInstrumentByExchangeTicker(dataset, "XASX", "VGAD"), null);
});

test("shared instruments reconcile between educator and dashboard views", () => {
  const shared = listSharedInstruments(dataset);
  assert.equal(shared.length, 8);
  const result = reconcileSharedInstruments(dataset);
  assert.equal(result.ok, true, JSON.stringify(result.mismatches, null, 2));
  for (const instrument of shared) {
    const educator = educatorViewOfInstrument(instrument, dataset.datasetVersion);
    const dashboard = dashboardViewOfInstrument(instrument, dataset.datasetVersion);
    assert.equal(educator.datasetVersion, dashboard.datasetVersion);
    assert.equal(educator.managementFeeDisplay, dashboard.managementFeeDisplay);
    assert.equal(educator.return5yDisplay, dashboard.return5yDisplay);
    assert.equal(educator.yieldDisplay, dashboard.yieldDisplay);
  }
});

test("ASX IVV uses the current verified 0.04% management fee", () => {
  const ivv = getInstrumentByExchangeTicker(dataset, "XASX", "IVV");
  assert.equal(ivv.fundName, "iShares S&P 500 ETF");
  assert.equal(ivv.currency, "AUD");
  assert.equal(ivv.issuer.includes("BlackRock"), true);
  assert.equal(ivv.managementFee.percentPoints, 0.04);
  assert.equal(ivv.managementFee.issuerLabel, "Annual Management Fee");
  assert.equal(formatPercentPoints(ivv.managementFee.percentPoints, 2), "0.04%");
  assert.equal(ivv.yield.percentPoints, 1.05);
  assert.equal(ivv.yield.asOf, "2026-09-16");
});

test("CRYP has insufficient five-year history and a verified zero yield", () => {
  const cryp = getInstrumentByExchangeTicker(dataset, "XASX", "CRYP");
  assert.equal(cryp.return5y.percentPoints, null);
  assert.equal(cryp.return5y.status, "insufficient_history");
  assert.equal(cryp.yield.percentPoints, 0);
  assert.equal(cryp.yield.verifiedZero, true);
  assert.equal(cryp.managementFee.percentPoints, 0.67);
});

test("EBTC and EETH do not invent five-year returns or yields", () => {
  const ebtc = getInstrumentByExchangeTicker(dataset, "CHIA", "EBTC");
  const eeth = getInstrumentByExchangeTicker(dataset, "CHIA", "EETH");
  assert.equal(ebtc.return5y.percentPoints, null);
  assert.equal(eeth.return5y.percentPoints, null);
  assert.equal(ebtc.yield.percentPoints, null);
  assert.equal(eeth.yield.percentPoints, null);
  assert.equal(ebtc.yield.status, "not_applicable");
  assert.equal(eeth.managementFee.percentPoints, 0.45);
});

test("VAF five-year return can be negative and is not coerced to zero", () => {
  const vaf = getInstrumentByExchangeTicker(dataset, "XASX", "VAF");
  assert.equal(vaf.return5y.percentPoints, -0.22);
  assert.notEqual(vaf.return5y.percentPoints, 0);
  assert.equal(formatPercentPoints(vaf.return5y.percentPoints, 2), "-0.22%");
  assert.equal(vaf.managementFee.percentPoints, 0.1);
  assert.equal(vaf.yield.percentPoints, null);
  assert.equal(vaf.distributionFrequency, "Quarterly");
});

test("VAS fee is the current 0.07% rather than the retired 0.10%", () => {
  const vas = getInstrumentByExchangeTicker(dataset, "XASX", "VAS");
  assert.equal(vas.managementFee.percentPoints, 0.07);
});

test("accumulating crypto ETFs are not treated as distributing equity ETFs", () => {
  const ebtc = getInstrumentByExchangeTicker(dataset, "CHIA", "EBTC");
  const ivv = getInstrumentByExchangeTicker(dataset, "XASX", "IVV");
  assert.equal(ebtc.distributionPolicy, "accumulating");
  assert.equal(ivv.distributionPolicy, "distributing");
});

test("duplicate canonical ids fail validation", () => {
  const duplicate = clone(dataset);
  duplicate.instruments.push(clone(duplicate.instruments[0]));
  const result = validateDataset(duplicate, { now: NOW });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("duplicate id")));
});

test("ticker-only identity is rejected", () => {
  const ivv = clone(getInstrumentByExchangeTicker(dataset, "XASX", "IVV"));
  ivv.exchange = "";
  ivv.id = "IVV";
  const result = validateInstrument(ivv);
  assert.equal(result.ok, false);
});

test("percentage stored as a decimal fraction is rejected", () => {
  const ivv = clone(getInstrumentByExchangeTicker(dataset, "XASX", "IVV"));
  ivv.managementFee.percentPoints = 0.0004;
  const result = validateInstrument(ivv);
  assert.equal(result.ok, false);
});

test("unverified zero cannot replace a verified fee", () => {
  const ivv = getInstrumentByExchangeTicker(dataset, "XASX", "IVV");
  const merged = mergeInstrumentRefresh(ivv, {
    ...ivv,
    managementFee: { percentPoints: 0, status: "verified" },
  });
  assert.equal(merged.instrument.managementFee.percentPoints, 0.04);
  assert.ok(merged.rejected.length > 0);
});

test("null refresh cannot overwrite a verified five-year return", () => {
  const ndq = getInstrumentByExchangeTicker(dataset, "XASX", "NDQ");
  const merged = mergeInstrumentRefresh(ndq, {
    ...ndq,
    return5y: { percentPoints: null, status: "verified" },
  });
  assert.equal(merged.instrument.return5y.percentPoints, 14.22);
});

test("stale verified yield fails freshness validation", () => {
  const stale = clone(dataset);
  const ndq = stale.instruments.find((item) => item.id === "XASX:NDQ");
  ndq.yield.asOf = "2025-01-01";
  const result = validateDataset(stale, { now: NOW });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("yield is stale")));
});

test("conflicting dataset versions fail validation", () => {
  const conflicted = clone(dataset);
  conflicted.instruments[0].datasetVersion = "old";
  const result = validateDataset(conflicted, { now: NOW });
  assert.equal(result.ok, false);
});

test("educator adapter uses the same dataset version and does not invent CRYP 5y", () => {
  const educatorEtfs = getEducatorEtfs(dataset);
  assert.equal(educatorEtfs.length, 8);
  const cryp = educatorEtfs.find((item) => item.ticker === "CRYP");
  assert.equal(cryp.return_5y, null);
  assert.equal(cryp.datasetVersion, dataset.datasetVersion);
  const ivv = educatorEtfs.find((item) => item.ticker === "IVV");
  assert.equal(ivv.canonicalId, "XASX:IVV");
  assert.equal(ivv.mer, 0.04);
  assert.equal(Number(ivv.return_5y.toFixed(6)), 0.1296);
});

test("RBTZ five-year return is the issuer NAV figure, not the old 12.5% placeholder", () => {
  const rbtz = getInstrumentByExchangeTicker(dataset, "XASX", "RBTZ");
  assert.equal(rbtz.return5y.percentPoints, 0.31);
  assert.notEqual(rbtz.return5y.percentPoints, 12.5);
});

test("renamed or replacement funds keep stable exchange+ticker identities", () => {
  const ids = dataset.instruments.map((item) => item.id);
  assert.deepEqual(ids, [...new Set(ids)]);
  assert.ok(ids.includes("XASX:IVV"));
  assert.ok(ids.includes("XNAS:STRF"));
  const strf = getInstrumentByExchangeTicker(dataset, "XNAS", "STRF");
  assert.equal(strf.category.includes("not an ETF"), true);
});

test("unexpectedly large annualised five-year returns are rejected", () => {
  const ndq = clone(getInstrumentByExchangeTicker(dataset, "XASX", "NDQ"));
  ndq.return5y.percentPoints = 80;
  const result = validateInstrument(ndq);
  assert.equal(result.ok, false);
});

test("freshness thresholds are defined for every shared metric", () => {
  assert.ok(FRESHNESS_RULES.managementFeeMaxAgeDays <= 90);
  assert.ok(FRESHNESS_RULES.returnMaxAgeDays <= 45);
  assert.ok(FRESHNESS_RULES.yieldMaxAgeDays <= 45);
});

test("AUD and USD instruments are not mixed under the same identity", () => {
  const ivv = getInstrumentByExchangeTicker(dataset, "XASX", "IVV");
  const strf = getInstrumentByExchangeTicker(dataset, "XNAS", "STRF");
  assert.equal(ivv.currency, "AUD");
  assert.equal(strf.currency, "USD");
  assert.notEqual(ivv.id, strf.id);
});

test("display rounding is identical to two decimal places", () => {
  assert.equal(formatPercentPoints(1.5, 2), "1.50%");
  assert.equal(formatPercentPoints(0.1, 2), "0.10%");
  assert.equal(formatPercentPoints(0.4, 2), "0.40%");
  assert.equal(formatPercentPoints(-0.22, 2), "-0.22%");
});

test("a verified management-fee change is accepted when the incoming value is finite and non-zero", () => {
  const ivv = getInstrumentByExchangeTicker(dataset, "XASX", "IVV");
  const merged = mergeInstrumentRefresh(ivv, {
    ...ivv,
    managementFee: { ...ivv.managementFee, percentPoints: 0.05, asOf: "2026-09-18" },
  });
  assert.equal(merged.instrument.managementFee.percentPoints, 0.05);
  assert.equal(merged.rejected.length, 0);
});

test("partial provider payloads cannot blank a verified metric", () => {
  const vas = getInstrumentByExchangeTicker(dataset, "XASX", "VAS");
  const merged = mergeInstrumentRefresh(vas, {
    ...vas,
    yield: { status: "verified" },
  });
  assert.equal(merged.instrument.yield.percentPoints, 3.08);
  assert.ok(merged.rejected.length > 0);
});

test("missing return methodology is rejected when a 5y value is present", () => {
  const ndq = clone(getInstrumentByExchangeTicker(dataset, "XASX", "NDQ"));
  ndq.return5y.methodology = "price_cagr";
  const result = validateInstrument(ndq);
  assert.equal(result.ok, false);
});

test("shared formatted values match the independently verified snapshot", () => {
  const expected = {
    "XASX:IVV": { mer: "0.04%", ret: "12.96%", yld: "1.05%" },
    "XASX:NDQ": { mer: "0.48%", ret: "14.22%", yld: "1.50%" },
    "XASX:RBTZ": { mer: "0.57%", ret: "0.31%", yld: "0.10%" },
    "XASX:CRYP": { mer: "0.67%", ret: "—", yld: "0.00%" },
    "XASX:VHY": { mer: "0.25%", ret: "11.70%", yld: "4.09%" },
    "XASX:VAP": { mer: "0.23%", ret: "2.64%", yld: "2.42%" },
    "XASX:IOO": { mer: "0.40%", ret: "15.86%", yld: "1.21%" },
    "XASX:VAF": { mer: "0.10%", ret: "-0.22%", yld: "—" },
  };
  for (const [id, values] of Object.entries(expected)) {
    const instrument = dataset.instruments.find((item) => item.id === id);
    const educator = educatorViewOfInstrument(instrument, dataset.datasetVersion);
    const dashboard = dashboardViewOfInstrument(instrument, dataset.datasetVersion);
    assert.equal(educator.managementFeeDisplay, values.mer);
    assert.equal(dashboard.managementFeeDisplay, values.mer);
    assert.equal(educator.return5yDisplay, values.ret);
    assert.equal(dashboard.return5yDisplay, values.ret);
    assert.equal(educator.yieldDisplay, values.yld);
    assert.equal(dashboard.yieldDisplay, values.yld);
    assert.equal(educator.datasetVersion, dashboard.datasetVersion);
    assert.deepEqual(educator.metricDefinitions, dashboard.metricDefinitions);
  }
});

test("educator adapters never coerce missing five-year return or yield to zero", () => {
  for (const etf of getEducatorEtfs(dataset)) {
    const instrument = getInstrumentByExchangeTicker(dataset, etf.exchange, etf.ticker);
    if (etf.return_5y === 0) {
      assert.equal(instrument.return5y.verifiedZero, true);
    }
    if (etf.yield === 0) {
      assert.equal(instrument.yield.verifiedZero, true);
    }
    if (instrument.return5y.status === "insufficient_history") {
      assert.equal(etf.return_5y, null);
    }
    if (instrument.yield.status === "unavailable") {
      assert.equal(etf.yield, null);
    }
  }
});

test("different effective dates are retained per metric and compared by both apps", () => {
  const ivv = getInstrumentByExchangeTicker(dataset, "XASX", "IVV");
  assert.equal(ivv.managementFee.asOf, "2026-03-04");
  assert.equal(ivv.return5y.asOf, "2026-08-31");
  assert.equal(ivv.yield.asOf, "2026-09-16");
  const educator = educatorViewOfInstrument(ivv, dataset.datasetVersion);
  const dashboard = dashboardViewOfInstrument(ivv, dataset.datasetVersion);
  assert.equal(educator.asOf.yield, dashboard.asOf.yield);
  assert.notEqual(educator.asOf.yield, educator.asOf.return5y);
});

