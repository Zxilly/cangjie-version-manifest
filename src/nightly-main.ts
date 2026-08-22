import { fetchNightlyReleases, fetchText } from "./component-fetcher.js";
import { readNightlyManifest, writeNightlyManifest } from "./manifest-file.js";
import { buildNightlyChannel } from "./nightly.js";

async function main(): Promise<void> {
  const existing = await readNightlyManifest();
  const releases = await fetchNightlyReleases();
  const nightly = await buildNightlyChannel(releases, fetchText, existing);
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
