import type { Platform, SdkPackage, VersionMap, VersionPackages } from "./schema.js";

function compareSemver(a: string, b: string): number {
  const pa = a.split(/[-.]/).map((s) => (/^\d+$/.test(s) ? Number(s) : s));
  const pb = b.split(/[-.]/).map((s) => (/^\d+$/.test(s) ? Number(s) : s));
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i], vb = pb[i];
    if (va === undefined) return -1;
    if (vb === undefined) return 1;
    if (typeof va === "number" && typeof vb === "number") {
      if (va !== vb) return va - vb;
    } else {
      const sa = String(va), sb = String(vb);
      if (sa !== sb) return sa < sb ? -1 : 1;
    }
  }
  return 0;
}

function latestVersion(versions: Record<string, unknown>): string | null {
  const keys = Object.keys(versions);
  if (keys.length === 0) return null;
  return keys.sort(compareSemver).at(-1)!;
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
          if (!pkg?.name || pkg.name.endsWith(".exe")) continue;
          const platform = detectPlatform(pkg.name);
          if (platform) {
            packages[platform] = {
              name: pkg.name,
              sha256: pkg.sha ?? "",
              url: pkg.url?.startsWith("http")
                ? pkg.url
                : `https://cangjie-lang.cn${pkg.url}`,
            } satisfies SdkPackage;
          }
        }
      }
    }

    if (Object.keys(packages).length > 0) {
      (data.versiontype === "LTS" ? ltsVersions : stsVersions)[version] = packages;
    }
  }

  return {
    channels: {
      sts: { versions: stsVersions, latest: latestVersion(stsVersions) },
      lts: { versions: ltsVersions, latest: latestVersion(ltsVersions) },
    },
  };
}
