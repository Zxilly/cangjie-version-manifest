import https from "https";
import { parse as parseHtml } from "node-html-parser";

const TARGET_PAGE = "https://cangjie-lang.cn/download/1.1.0";
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_REDIRECTS = 5;
const USER_AGENT = "Mozilla/5.0 (cangjie-version-manifest scraper)";

export function fetchUrl(url: string, redirectsLeft = MAX_REDIRECTS): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { "User-Agent": USER_AGENT }, timeout: REQUEST_TIMEOUT_MS },
      (res) => {
        const status = res.statusCode ?? 0;

        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          if (redirectsLeft <= 0) {
            reject(new Error(`Too many redirects fetching ${url}`));
            return;
          }
          const next = new URL(res.headers.location, url).toString();
          fetchUrl(next, redirectsLeft - 1).then(resolve, reject);
          return;
        }

        if (status < 200 || status >= 300) {
          res.resume();
          reject(new Error(`HTTP ${status} fetching ${url}`));
          return;
        }

        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error(`Request timeout: ${url}`)));
    req.on("error", reject);
  });
}

export async function getAllJsUrls(): Promise<string[]> {
  console.error(`Fetching ${TARGET_PAGE}…`);
  const html = await fetchUrl(TARGET_PAGE);
  const doc = parseHtml(html);
  const urls = doc
    .querySelectorAll("script[src]")
    .map((el) => el.getAttribute("src") ?? "")
    .filter((src) => src.length > 0)
    .map((src) => new URL(src, TARGET_PAGE).toString());
  console.error(`  found ${urls.length} script(s)`);
  return urls;
}
