import dataset from "./canonical/etf-canonical.json";
import { getDashboardMetadataMap } from "./canonical/etfCanonical.js";

export const canonicalDataset = dataset;
export default getDashboardMetadataMap(dataset);
