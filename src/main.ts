import { writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getAllJsUrls, fetchUrl } from "./fetcher.js";
import { tryParseVersionScript } from "./parser.js";
import { transformVersionData } from "./transform.js";
import type { VersionMap } from "./schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "..", "versions.json");

async function findVersionMap(jsUrls: string[]): Promise<{ url: string; map: VersionMap }> {
  for (const url of jsUrls) {
    console.error(`Probing ${url}`);
    let content: string;
    try {
      content = await fetchUrl(url);
    } catch (e) {
      console.error(`  fetch failed: ${(e as Error).message}`);
      continue;
    }
    const map = tryParseVersionScript(content);
    if (map) {
      console.error("  matched version data");
      return { url, map };
    }
  }
  throw new Error(`No version data found in ${jsUrls.length} script(s)`);
}

async function main(): Promise<void> {
  const jsUrls = await getAllJsUrls();
  if (jsUrls.length === 0) throw new Error("No <script src> tags found on download page");

  const { url, map } = await findVersionMap(jsUrls);
  console.error(`Source: ${url}`);
  console.error(`Versions: ${Object.keys(map).join(", ") || "(none)"}`);

  const manifest = transformVersionData(map);
  const stsCount = Object.keys(manifest.channels.sts.versions).length;
  const ltsCount = Object.keys(manifest.channels.lts.versions).length;
  console.error(`STS: ${stsCount}, LTS: ${ltsCount}`);

  if (stsCount === 0 && ltsCount === 0) {
    throw new Error("Transformed manifest is empty — refusing to overwrite output");
  }

  await writeFile(OUTPUT_PATH, JSON.stringify(manifest, null, 2) + "\n");
  console.error(`Wrote ${OUTPUT_PATH}`);
}

main().catch((e: Error) => {
  console.error(`Fatal: ${e.message}`);
  process.exit(1);
});
