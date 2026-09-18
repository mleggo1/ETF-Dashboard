import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { reconcileSharedInstruments, validateDataset } from "../src/data/canonical/etfCanonical.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dashboardJson = path.join(__dirname, "../src/data/canonical/etf-canonical.json");
const dashboardJs = path.join(__dirname, "../src/data/canonical/etfCanonical.js");
const educatorJson = path.join(__dirname, "../../Investment-Matchmaker/src/data/etf-canonical.json");
const educatorJs = path.join(__dirname, "../../Investment-Matchmaker/src/data/etfCanonical.js");

test("educator canonical files match the dashboard source of truth when present", () => {
  const dashboard = JSON.parse(readFileSync(dashboardJson, "utf8"));
  assert.equal(validateDataset(dashboard, { now: new Date(2026, 8, 18) }).ok, true);
  if (!existsSync(educatorJson) || !existsSync(educatorJs)) {
    assert.fail("Investment Educator canonical dataset is missing — run npm run sync:canonical");
  }
  const educator = JSON.parse(readFileSync(educatorJson, "utf8"));
  assert.equal(educator.datasetVersion, dashboard.datasetVersion);
  assert.deepEqual(educator, dashboard);
  assert.equal(readFileSync(educatorJs, "utf8"), readFileSync(dashboardJs, "utf8"));
  assert.equal(reconcileSharedInstruments(educator).ok, true);
});
