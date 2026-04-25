import semver from "semver";
import type { Platform, SdkPackage, VersionMap, VersionPackages } from "./schema.js";

const SITE_BASE_URL = "https://cangjie-lang.cn";

function latestVersion(versions: Record<string, unknown>): string | null {
  const valid = Object.keys(versions).filter((v) => semver.valid(v) !== null);
  if (valid.length === 0) return null;
  return valid.sort(semver.compare).at(-1)!;
}

export function detectPlatform(filename: string): Platform | null {
  const n = filename.toLowerCase();
  if (n.includes("windows")) return "win32-x64";
  if (n.includes("mac-aarch64") || n.includes("darwin_aarch64")) return "darwin-arm64";
  if (n.includes("mac-x64") || n.includes("darwin_x64")) return "darwin-x64";
  if (n.includes("linux-aarch64") || n.includes("linux_aarch64")) return "linux-arm64";
  if (n.includes("linux-x64") || n.includes("linux_x64")) return "linux-x64";
  return null;
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
          if (!name || name.toLowerCase().endsWith(".exe")) continue;
          const platform = detectPlatform(name);
          if (!platform) continue;
          packages[platform] = {
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
