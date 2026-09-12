import { z } from "zod";
import { fetchJson } from "./component-fetcher.js";

const API = "https://api.gitcode.com/api/v5/repos/Cangjie/nightly_build";
const PATH = "bucket/cangjie-nightly.json";
const PAGE_SIZE = 50;
const MAX_PAGES = 20;
const commitsSchema = z.array(z.object({ sha: z.string().regex(/^[a-f0-9]{40}$/) }));
const contentsSchema = z.object({ encoding: z.literal("base64"), content: z.string() });
const manifestSchema = z.object({
  version: z.string().min(1),
  architecture: z.object({
    "64bit": z.object({ url: z.string().url(), hash: z.string().regex(/^[a-f0-9]{64}$/i) }),
  }),
});

export interface ScoopChecksum {
  version: string;
  sha256: string;
}

// Workaround for broken native Windows Release sidecars (2026-09-03 onward).
// Read commit-pinned upstream Scoop manifests, newest first so corrections win.
// Do not use the GitHub mirror: it can lag a daily GitCode release.
export async function fetchScoopChecksums(
  wantedURLs: ReadonlySet<string>,
  readJSON: (url: string) => Promise<unknown> = (url) => fetchJson(url, {}),
): Promise<Map<string, ScoopChecksum>> {
  const checksums = new Map<string, ScoopChecksum>();
  if (wantedURLs.size === 0) return checksums;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const commits = commitsSchema.parse(await readJSON(
      `${API}/commits?path=${encodeURIComponent(PATH)}&per_page=${PAGE_SIZE}&page=${page}`,
    ));
    for (const { sha } of commits) {
      const file = contentsSchema.parse(await readJSON(`${API}/contents/${PATH}?ref=${sha}`));
      const manifest = manifestSchema.parse(JSON.parse(Buffer.from(file.content, "base64").toString("utf8")));
      const asset = manifest.architecture["64bit"];
      if (wantedURLs.has(asset.url) && !checksums.has(asset.url)) {
        checksums.set(asset.url, { version: manifest.version, sha256: asset.hash.toLowerCase() });
      }
      if (checksums.size === wantedURLs.size) return checksums;
    }
    if (commits.length < PAGE_SIZE) return checksums;
  }
  throw new Error("Scoop manifest history exceeded pagination limit");
}
