import semver from "semver";
import type {
  HostPlatform,
  SdkPackage,
  ToolchainKey,
  VersionMap,
  VersionPackages,
} from "./schema.js";

const SITE_BASE_URL = "https://cangjie-lang.cn";

function latestVersion(versions: Record<string, unknown>): string | null {
  const valid = Object.keys(versions).filter((v) => semver.valid(v) !== null);
  if (valid.length === 0) return null;
  return valid.sort(semver.compare).at(-1)!;
}

const VERSION_TOKEN_RE = /^\d+\.\d+(?:\.\d+)?/;
const HOST_PATTERNS: Array<{ tokens: string[]; key: HostPlatform }> = [
  { tokens: ["windows", "x64"], key: "win32-x64" },
  { tokens: ["win32", "x64"], key: "win32-x64" },
  { tokens: ["mac", "aarch64"], key: "darwin-arm64" },
  { tokens: ["mac", "arm64"], key: "darwin-arm64" },
  { tokens: ["darwin", "aarch64"], key: "darwin-arm64" },
  { tokens: ["darwin", "arm64"], key: "darwin-arm64" },
  { tokens: ["mac", "x64"], key: "darwin-x64" },
  { tokens: ["darwin", "x64"], key: "darwin-x64" },
  { tokens: ["linux", "aarch64"], key: "linux-arm64" },
  { tokens: ["linux", "arm64"], key: "linux-arm64" },
  { tokens: ["linux", "x64"], key: "linux-x64" },
  { tokens: ["ohos", "aarch64"], key: "ohos-arm64" },
  { tokens: ["ohos", "arm64"], key: "ohos-arm64" },
  { tokens: ["ohos", "x64"], key: "ohos-x64" },
];

function normalizeName(filename: string): string {
  return filename.toLowerCase().replaceAll("_", "-");
}

function normalizeToolchainPart(part: string): string {
  if (part === "aarch64") return "arm64";
  return part;
}

function detectLegacyHostPlatform(filename: string): HostPlatform | null {
  const n = filename.toLowerCase().replaceAll("_", "-");
  if (n.includes("windows-x64")) return "win32-x64";
  if (n.includes("mac-aarch64") || n.includes("darwin-aarch64")) return "darwin-arm64";
  if (n.includes("mac-x64") || n.includes("darwin-x64")) return "darwin-x64";
  if (n.includes("linux-aarch64") || n.includes("linux-arm64")) return "linux-arm64";
  if (n.includes("linux-x64")) return "linux-x64";
  if (n.includes("ohos-aarch64") || n.includes("ohos-arm64")) return "ohos-arm64";
  if (n.includes("ohos-x64")) return "ohos-x64";
  return null;
}

function extractNewSdkToolchainParts(filename: string): string[] | null {
  const n = normalizeName(filename);
  const prefix = "cangjie-sdk-";
  if (!n.startsWith(prefix)) return null;

  const parts = n.slice(prefix.length).split("-");
  const versionIndex = parts.findIndex((part) => VERSION_TOKEN_RE.test(part));
  if (versionIndex <= 0) return null;
  return parts.slice(0, versionIndex);
}

function matchHostPlatform(parts: string[]): { key: HostPlatform; consumed: number } | null {
  for (const host of HOST_PATTERNS) {
    if (host.tokens.every((token, index) => parts[index] === token)) {
      return { key: host.key, consumed: host.tokens.length };
    }
  }
  return null;
}

function toolchainFromParts(parts: string[]): ToolchainKey | null {
  const host = matchHostPlatform(parts);
  if (host) {
    const target = parts.slice(host.consumed).map(normalizeToolchainPart);
    return target.length > 0 ? `${host.key}-${target.join("-")}` : host.key;
  }

  const standalone = parts.map(normalizeToolchainPart).join("-");
  return standalone.length > 0 ? standalone : null;
}

export function detectToolchainKey(filename: string): ToolchainKey | null {
  const parts = extractNewSdkToolchainParts(filename);
  if (parts) return toolchainFromParts(parts);
  return detectLegacyHostPlatform(filename);
}

export const detectPlatform = detectToolchainKey;

function isPrimarySdkPackage(filename: string): boolean {
  const n = normalizeName(filename);
  if (n.includes("-sanitizer.")) return false;
  if (!n.endsWith(".zip") && !n.endsWith(".tar.gz")) return false;
  return n.startsWith("cangjie-sdk-") || /^cangjie-\d/.test(n);
}

function resolvePackageUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return new URL(url, SITE_BASE_URL).toString();
}

export interface ChannelData {
  versions: Record<string, VersionPackages>;
  latest: string | null;
}

export interface OutputManifest {
  channels: {
    sts: ChannelData;
    lts: ChannelData;
  };
}

export function transformVersionData(versionMap: VersionMap): OutputManifest {
  const stsVersions: Record<string, VersionPackages> = {};
  const ltsVersions: Record<string, VersionPackages> = {};

  for (const [version, data] of Object.entries(versionMap)) {
    const packages: VersionPackages = {};

    for (const group of data.list) {
      for (const platformGroup of group.list) {
        for (const pkg of platformGroup.list) {
          const name = pkg.name;
          if (!name || !isPrimarySdkPackage(name)) continue;
          const toolchain = detectToolchainKey(name);
          if (!toolchain) continue;
          packages[toolchain] = {
            name,
            sha256: pkg.sha,
            url: resolvePackageUrl(pkg.url),
          } satisfies SdkPackage;
        }
      }
    }

    if (Object.keys(packages).length === 0) continue;
    const bucket = data.versiontype === "LTS" ? ltsVersions : stsVersions;
    bucket[version] = packages;
  }

  return {
    channels: {
      sts: { versions: stsVersions, latest: latestVersion(stsVersions) },
      lts: { versions: ltsVersions, latest: latestVersion(ltsVersions) },
    },
  };
}
