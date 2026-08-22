import { fetchNightlyReleases, fetchText } from "./component-fetcher.js";
import { readManifest, writeManifest } from "./manifest-file.js";
import { updateNightlyChannel } from "./manifest-update.js";
import { buildNightlyChannel } from "./nightly.js";

async function main(): Promise<void> {
  const existing = await readManifest();
  const releases = await fetchNightlyReleases();
  const nightly = await buildNightlyChannel(releases, fetchText, existing.channels.nightly);
  if (nightly.latest === null || Object.keys(nightly.versions).length === 0) {
    throw new Error("Nightly manifest is empty");
  }

  await writeManifest(updateNightlyChannel(existing, nightly));
  console.error(`Nightly: ${Object.keys(nightly.versions).length}, latest ${nightly.latest}`);
}

main().catch((error: Error) => {
  console.error(`Fatal: ${error.message}`);
  process.exit(1);
});
