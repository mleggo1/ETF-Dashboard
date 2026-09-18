import dataset from "./canonical/etf-canonical.json";
import { getDashboardEtfConfig, validateDataset } from "./canonical/etfCanonical.js";

const validation = validateDataset(dataset);
if (!validation.ok) {
  console.warn("[etf-canonical] validation issues", validation.errors);
}

export const canonicalDataset = dataset;
export default getDashboardEtfConfig(dataset);
