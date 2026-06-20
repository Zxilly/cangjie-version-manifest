import type { ComponentPackage, VersionComponents } from "./schema.js";

// 一个 release 的原始资产（取自 gitcode / github release API）。
export interface RawReleaseAsset {
  name: string;
  url: string;
  // gitcode 用 "attach"（上传的归档）/ "source"（源码包）区分；github 不带此字段。
  type?: string;
}

export interface RawRelease {
  tag: string;
  assets: RawReleaseAsset[];
}

// stdx 平台归档：cangjie-stdx-<platform>-<assetVersion>.<ext>
// platform 形如 linux-x64 / ohos-aarch64 / ios-simulator-x64；assetVersion 以数字
// 开头, 且可能含 `-`（如 1.1.0-beta.25.1）。故不能用单条正则切分平台与版本, 而是
// 去掉前缀与扩展名后按 `-` 分段, 取首个以数字开头的段作为版本起点。
const STDX_PREFIX = "cangjie-stdx-";

function stripArchiveExt(name: string): string | null {
  if (name.endsWith(".tar.gz")) return name.slice(0, -".tar.gz".length);
  if (name.endsWith(".zip")) return name.slice(0, -".zip".length);
  return null;
}

function parseStdxPlatformAsset(name: string): { platform: string; version: string } | null {
  if (!name.startsWith(STDX_PREFIX)) return null;
  const stem = stripArchiveExt(name);
  if (stem === null) return null;
  const parts = stem.slice(STDX_PREFIX.length).split("-");
  const versionIndex = parts.findIndex((p) => /^\d/.test(p));
  if (versionIndex <= 0) return null; // 版本前至少要有一个平台段
  return {
    platform: parts.slice(0, versionIndex).join("-"),
    version: parts.slice(versionIndex).join("-"),
  };
}

// stdx-doc 归档命名历史上有三种：
//   cangjie-stdx-docs-html-<assetVersion>.tar.gz   （现行）
//   cangjie-stdx-docs-html-<assetVersion>.zip       （v0.60）
//   cangjie-<sdkVersion>-stdx-docs-html.tar.gz       （v1.0.0/1.0.1/1.0.4）
// 三者都包含 "stdx-docs-html"，据此识别即可，版本不必从文件名解析。
function isStdxDocsAsset(name: string): boolean {
  return name.includes("stdx-docs-html");
}

// 资产版本（<sdk>.<rev>，如 1.1.0-beta.25.1）→ SDK 版本（去掉结尾的 .<rev>）。
export function sdkVersionFromAssetVersion(assetVersion: string): string {
  return assetVersion.replace(/\.\d+$/, "");
}

// 一个 stdx release（gitcode cangjie_stdx）解析出的组件集合。
export interface StdxReleaseComponents {
  sdkVersion: string;
  stdx: Record<string, ComponentPackage>;
  stdxDocs?: ComponentPackage;
}

// 解析单个 stdx release：从平台归档推导 SDK 版本, 收集各平台 stdx 与 stdx-doc。
// 没有任何平台 stdx 归档时返回 null（例如只含源码包的 release）。
export function parseStdxRelease(release: RawRelease): StdxReleaseComponents | null {
  const stdx: Record<string, ComponentPackage> = {};
  let stdxDocs: ComponentPackage | undefined;
  let assetVersion: string | null = null;

  for (const asset of release.assets) {
    if (asset.type === "source") continue;
    if (isStdxDocsAsset(asset.name)) {
      stdxDocs = { name: asset.name, url: asset.url };
      continue;
    }
    const parsed = parseStdxPlatformAsset(asset.name);
    if (!parsed) continue;
    stdx[parsed.platform] = { name: asset.name, url: asset.url };
    if (assetVersion === null) assetVersion = parsed.version;
  }

  if (assetVersion === null) return null;
  return { sdkVersion: sdkVersionFromAssetVersion(assetVersion), stdx, stdxDocs };
}

// 把全部 stdx release 归并为 sdkVersion → 组件。后出现的同版本覆盖先前的
// （release API 默认新→旧, 故首个胜出；为稳健, 仅当目标尚不存在时写入）。
export function collectStdxComponents(
  releases: RawRelease[],
): Record<string, { stdx: Record<string, ComponentPackage>; stdxDocs?: ComponentPackage }> {
  const out: Record<string, { stdx: Record<string, ComponentPackage>; stdxDocs?: ComponentPackage }> = {};
  for (const release of releases) {
    const parsed = parseStdxRelease(release);
    if (!parsed) continue;
    if (out[parsed.sdkVersion]) continue;
    out[parsed.sdkVersion] = { stdx: parsed.stdx, stdxDocs: parsed.stdxDocs };
  }
  return out;
}

// doc（主文档）归档：cangjie-docs-html-<version>.tar.gz, tag 即裸版本。
const DOCS_HTML_RE = /^cangjie-docs-html-(.+)\.tar\.gz$/;

// 把 docs-bundle 的 release 归并为 version → doc 组件（按 tag 取版本）。
export function collectDocsComponents(releases: RawRelease[]): Record<string, ComponentPackage> {
  const out: Record<string, ComponentPackage> = {};
  for (const release of releases) {
    const version = release.tag.replace(/^v/, "");
    const asset = release.assets.find((a) => DOCS_HTML_RE.test(a.name));
    if (!asset) continue;
    if (out[version]) continue;
    out[version] = { name: asset.name, url: asset.url };
  }
  return out;
}

// 为给定 SDK 版本组装组件块, 全无组件时返回 null。
export function buildVersionComponents(
  version: string,
  stdxByVersion: Record<string, { stdx: Record<string, ComponentPackage>; stdxDocs?: ComponentPackage }>,
  docsByVersion: Record<string, ComponentPackage>,
): VersionComponents | null {
  const components: VersionComponents = {};
  const docs = docsByVersion[version];
  if (docs) components.docs = docs;

  const stdxEntry = stdxByVersion[version];
  if (stdxEntry) {
    if (Object.keys(stdxEntry.stdx).length > 0) components.stdx = stdxEntry.stdx;
    if (stdxEntry.stdxDocs) components["stdx-docs"] = stdxEntry.stdxDocs;
  }

  return Object.keys(components).length > 0 ? components : null;
}

// 为一组 SDK 版本批量组装组件映射（仅保留有组件的版本）。
export function buildComponentsForVersions(
  versions: string[],
  stdxByVersion: Record<string, { stdx: Record<string, ComponentPackage>; stdxDocs?: ComponentPackage }>,
  docsByVersion: Record<string, ComponentPackage>,
): Record<string, VersionComponents> {
  const out: Record<string, VersionComponents> = {};
  for (const version of versions) {
    const components = buildVersionComponents(version, stdxByVersion, docsByVersion);
    if (components) out[version] = components;
  }
  return out;
}
