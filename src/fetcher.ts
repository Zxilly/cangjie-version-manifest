import https from "https";
import { parse as parseHtml } from "node-html-parser";

const TARGET_PAGE = "https://cangjie-lang.cn/download/1.1.0-beta.24";

export function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (
          res.statusCode != null &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          return fetchUrl(res.headers.location).then(resolve).catch(reject);
        }
        let data = "";
        res.on("data", (c: Buffer) => (data += c));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

export async function getAllJsUrls(): Promise<string[]> {
  console.error("[1] 拉取主页 HTML，提取所有 JS URL...");
  const html = await fetchUrl(TARGET_PAGE);
  const doc = parseHtml(html);
  const urls = doc
    .querySelectorAll("script[src]")
    .map((el) => el.getAttribute("src")!)
    .filter(Boolean)
    .map((s) => (s.startsWith("//") ? "https:" + s : s));
  console.error(`    → 共找到 ${urls.length} 个 JS 文件`);
  return urls;
}
