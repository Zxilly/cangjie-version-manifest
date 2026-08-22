import { getAllJsUrls, fetchUrl } from "./fetcher.js";
import { fetchDocsReleases, fetchStdxReleases } from "./component-fetcher.js";
import { readManifest, writeManifest } from "./manifest-file.js";
import { updateReleaseChannels } from "./manifest-update.js";
import { tryParseVersionScript } from "./parser.js";
import { attachComponents, transformVersionData } from "./transform.js";
import type { VersionMap } from "./schema.js";

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

  // 组件链接来自 release API（gitcode cangjie_stdx + cangjie-docs-bundle）。
  // 组件采集失败时保留已抓到的 SDK 数据，并输出清晰警告。
  try {
    const [stdxReleases, docsReleases] = await Promise.all([fetchStdxReleases(), fetchDocsReleases()]);
    attachComponents(manifest, stdxReleases, docsReleases);
    const stsComp = Object.keys(manifest.channels.sts.components ?? {}).length;
    const ltsComp = Object.keys(manifest.channels.lts.components ?? {}).length;
    console.error(`Components — STS: ${stsComp}, LTS: ${ltsComp}`);
  } catch (e) {
    console.error(`Warning: failed to attach components: ${(e as Error).message}`);
  }

  const existing = await readManifest();
  await writeManifest(updateReleaseChannels(existing, manifest));
}

main().catch((e: Error) => {
  console.error(`Fatal: ${e.message}`);
  process.exit(1);
});
