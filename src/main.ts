import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getAllJsUrls, fetchUrl } from "./fetcher.js";
import { tryParseVersionScript } from "./parser.js";
import { transformVersionData } from "./transform.js";
import type { VersionMap } from "./schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "..", "versions.json");

async function main(): Promise<void> {
  const jsUrls = await getAllJsUrls();

  let versionMap: VersionMap | null = null;
  let matchedUrl: string | null = null;

  for (const url of jsUrls) {
    console.error(`[2] 尝试解析: ${url}`);
    let content: string;
    try {
      content = await fetchUrl(url);
    } catch {
      console.error("    → 拉取失败，跳过");
      continue;
    }
    const result = tryParseVersionScript(content);
    if (result) {
      versionMap = result;
      matchedUrl = url;
      console.error("    → 命中版本数据！");
      break;
    }
    console.error("    → 未包含版本数据");
  }

  if (!versionMap || !matchedUrl) {
    throw new Error(`在 ${jsUrls.length} 个 JS 文件中均未找到版本数据`);
  }

  console.error("    → 来源:", matchedUrl);
  console.error("    → 共找到版本:", Object.keys(versionMap).join(", "));

  const manifest = transformVersionData(versionMap);
  console.error("    → STS 版本数:", Object.keys(manifest.channels.sts.versions).length);
  console.error("    → LTS 版本数:", Object.keys(manifest.channels.lts.versions).length);

  const json = JSON.stringify(manifest, null, 2) + "\n";
  writeFileSync(OUTPUT_PATH, json);
  console.error("    → 已写入:", OUTPUT_PATH);
}

main().catch((e: Error) => {
  console.error("Fatal error:", e.message);
  process.exit(1);
});
