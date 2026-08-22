import { fetchNightlyReleases } from "./component-fetcher.js";
import { readManifest, writeManifest } from "./manifest-file.js";
import { updateNightlyChannel } from "./manifest-update.js";
import { buildNightlyChannel } from "./nightly.js";

async function main(): Promise<void> {
  const releases = await fetchNightlyReleases();
  const nightly = buildNightlyChannel(releases);
  if (nightly.latest === null || Object.keys(nightly.versions).length === 0) {
    throw new Error("Nightly manifest is empty");
  }

  const existing = await readManifest();
  await writeManifest(updateNightlyChannel(existing, nightly));
  console.error(`Nightly: ${Object.keys(nightly.versions).length}, latest ${nightly.latest}`);
}

main().catch((error: Error) => {
  console.error(`Fatal: ${error.message}`);
  process.exit(1);
});
