import https from "https";
import type { RawRelease, RawReleaseAsset } from "./components.js";

const USER_AGENT = "Mozilla/5.0 (cangjie-version-manifest scraper)";
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_REDIRECTS = 5;
const PER_PAGE = 50;
const MAX_PAGES = 20;

// stdx 与 stdx-doc 发布在 gitcode 的 cangjie_stdx 仓库。
const STDX_RELEASES_API = "https://api.gitcode.com/api/v5/repos/Cangjie/cangjie_stdx/releases";
const NIGHTLY_RELEASES_API = "https://api.gitcode.com/api/v5/repos/Cangjie/nightly_build/releases";
// 主文档发布在 cangjie-docs-bundle（github）, 转载官方文档站点的 HTML 归档。
const DOCS_RELEASES_API = "https://api.github.com/repos/Zxilly/cangjie-docs-bundle/releases";

interface ApiReleaseAsset {
  name?: string;
  browser_download_url?: string;
  type?: string;
}

interface ApiRelease {
  tag_name?: string;
  assets?: ApiReleaseAsset[];
}

function fetchJson(
  url: string,
  headers: Record<string, string>,
  redirectsLeft = MAX_REDIRECTS,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...headers }, timeout: REQUEST_TIMEOUT_MS },
      (res) => {
        const status = res.statusCode ?? 0;

        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          if (redirectsLeft <= 0) {
            reject(new Error(`Too many redirects fetching ${url}`));
            return;
          }
          const next = new URL(res.headers.location, url).toString();
          fetchJson(next, headers, redirectsLeft - 1).then(resolve, reject);
          return;
        }

        if (status < 200 || status >= 300) {
          res.resume();
          reject(new Error(`HTTP ${status} fetching ${url}`));
          return;
        }

        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (e) {
            reject(new Error(`Invalid JSON from ${url}: ${(e as Error).message}`));
          }
        });
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error(`Request timeout: ${url}`)));
    req.on("error", reject);
  });
}

function toRawReleases(apiReleases: ApiRelease[]): RawRelease[] {
  return apiReleases.map((rel) => {
    const assets: RawReleaseAsset[] = (rel.assets ?? [])
      .filter((a): a is ApiReleaseAsset & { browser_download_url: string } =>
        typeof a.browser_download_url === "string" && a.browser_download_url.length > 0,
      )
      .map((a) => ({
        name: a.name ?? new URL(a.browser_download_url).pathname.split("/").pop() ?? "",
        url: a.browser_download_url,
        type: a.type,
      }));
    return { tag: rel.tag_name ?? "", assets };
  });
}

// 分页拉取一个 release API 的全部 release。
async function fetchAllReleases(apiBase: string, headers: Record<string, string>): Promise<RawRelease[]> {
  const all: RawRelease[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${apiBase}?per_page=${PER_PAGE}&page=${page}`;
    const body = await fetchJson(url, headers);
    if (!Array.isArray(body)) {
      throw new Error(`Expected an array of releases from ${url}`);
    }
    const releases = toRawReleases(body as ApiRelease[]);
    all.push(...releases);
    if (releases.length < PER_PAGE) break;
  }
  return all;
}

export async function fetchStdxReleases(): Promise<RawRelease[]> {
  console.error(`Fetching stdx releases from ${STDX_RELEASES_API}…`);
  const releases = await fetchAllReleases(STDX_RELEASES_API, {});
  console.error(`  found ${releases.length} stdx release(s)`);
  return releases;
}

export async function fetchNightlyReleases(): Promise<RawRelease[]> {
  console.error(`Fetching nightly releases from ${NIGHTLY_RELEASES_API}…`);
  const releases = await fetchAllReleases(NIGHTLY_RELEASES_API, {});
  console.error(`  found ${releases.length} nightly release(s)`);
  return releases;
}

export async function fetchDocsReleases(): Promise<RawRelease[]> {
  console.error(`Fetching docs releases from ${DOCS_RELEASES_API}…`);
  // GitHub 未认证额度较低；CI 中若提供 GITHUB_TOKEN 则带上以提高额度。
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const releases = await fetchAllReleases(DOCS_RELEASES_API, headers);
  console.error(`  found ${releases.length} docs release(s)`);
  return releases;
}
