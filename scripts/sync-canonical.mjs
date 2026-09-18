import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const siblingEducator = path.resolve(ROOT, "..", "Investment-Matchmaker");

const dataset = JSON.parse(
  await readFile(path.join(ROOT, "src", "data", "canonical", "etf-canonical.json"), "utf8")
);
const { getDashboardEtfConfig, validateDataset } = await import(
  pathToFileURL(path.join(ROOT, "src", "data", "canonical", "etfCanonical.js")).href
);

const validation = validateDataset(dataset);
if (!validation.ok) {
  console.error("Canonical dataset failed validation:");
  validation.errors.forEach((error) => console.error(` - ${error}`));
  process.exit(1);
}

const etfs = getDashboardEtfConfig(dataset);
await writeFile(path.join(ROOT, "src", "data", "etfs.json"), `${JSON.stringify(etfs, null, 2)}\n`);
console.log(`Wrote ${etfs.length} ETF listings to src/data/etfs.json`);

const educatorDataDir = path.join(siblingEducator, "src", "data");
try {
  await mkdir(educatorDataDir, { recursive: true });
  await copyFile(
    path.join(ROOT, "src", "data", "canonical", "etf-canonical.json"),
    path.join(educatorDataDir, "etf-canonical.json")
  );
  await copyFile(
    path.join(ROOT, "src", "data", "canonical", "etfCanonical.js"),
    path.join(educatorDataDir, "etfCanonical.js")
  );
  const educatorAdapter = `import dataset from "./etf-canonical.json";
import {
  getEducatorEtfs,
  formatMerDisplay,
  formatReturnDisplay,
  formatYieldDisplay,
} from "./etfCanonical.js";

export const canonicalDataset = dataset;
export const EDUCATOR_ETFS = getEducatorEtfs(dataset);
export { formatMerDisplay, formatReturnDisplay, formatYieldDisplay };
`;
  await writeFile(path.join(educatorDataDir, "educatorEtfs.js"), educatorAdapter);
  console.log("Synchronised canonical dataset to Investment-Matchmaker/src/data");
} catch (error) {
  console.warn("Could not copy canonical files into Investment-Matchmaker:", error.message);
}
