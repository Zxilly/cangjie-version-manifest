import { fetchNightlyReleases, fetchText } from "./component-fetcher.js";
import { readNightlyManifest, writeNightlyManifest } from "./manifest-file.js";
import { buildNightlyChannel } from "./nightly.js";
import { fetchScoopChecksums } from "./nightly-scoop.js";
import { detectToolchainKey } from "./transform.js";

async function main(): Promise<void> {
  const existing = await readNightlyManifest();
  const releases = await fetchNightlyReleases();
  const windowsURLs = new Set(releases.flatMap((release) => release.assets
    .filter((asset) => asset.type !== "source" && asset.name.startsWith("cangjie-sdk-")
      && asset.name.endsWith(".zip") && detectToolchainKey(asset.name) === "win32-x64")
    .map((asset) => asset.url)));
  const scoopChecksums = await fetchScoopChecksums(windowsURLs);
  const nightly = await buildNightlyChannel(releases, fetchText, existing, scoopChecksums);
  if (nightly.latest === null || Object.keys(nightly.versions).length === 0) {
    throw new Error("Nightly manifest is empty");
  }

  await writeNightlyManifest(nightly);
  console.error(`Nightly: ${Object.keys(nightly.versions).length}, latest ${nightly.latest}`);
}

main().catch((error: Error) => {
  console.error(`Fatal: ${error.message}`);
  process.exit(1);
});
