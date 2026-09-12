import semver from "semver";
import type { ScoopChecksum } from "./nightly-scoop.js";
import { parseStdxRelease, type RawRelease } from "./components.js";
import type { ComponentPackage, SdkPackage, VersionComponents, VersionPackages } from "./schema.js";
import { detectToolchainKey, type ChannelData } from "./transform.js";

const SDK_PREFIX = "cangjie-sdk-";
const SDK_ARCHIVE_EXTENSIONS = [".tar.gz", ".zip"];
const DOCS_HTML_RE = /^cangjie-docs-html-(.+)\.tar\.gz$/;
const VERSION_TOKEN_RE = /^\d+\.\d+\.\d+/;
const SHA256_RE = /^[a-f0-9]{64}$/i;
const CHECKSUM_FETCH_CONCURRENCY = 2;

export type ReadAssetText = (url: string) => Promise<string>;

function parseSHA256(content: string, assetName: string): string {
  const digest = content.trim();
  if (!SHA256_RE.test(digest)) {
    throw new Error(`Nightly checksum asset ${assetName} must contain exactly 64 hexadecimal characters`);
  }
  return digest.toLowerCase();
}

async function readPublishedSDKChecksums(
  releases: RawRelease[],
  readAssetText: ReadAssetText,
  existingChecksums: Map<string, string>,
): Promise<Map<string, string>> {
  const sidecars = releases.flatMap((release) => {
    const sdkByName = new Map(
      release.assets
        .filter((asset) => {
          const identity = nightlySdkIdentity(asset.name);
          return identity !== null && identity.toolchain !== "win32-x64";
        })
        .map((asset) => [asset.name, asset]),
    );
    return release.assets.flatMap((sidecar) => {
      if (!sidecar.name.endsWith(".sha256")) return [];
      const sdk = sdkByName.get(sidecar.name.slice(0, -".sha256".length));
      return sdk ? [{ sdk, sidecar }] : [];
    });
  });
  const checksums = new Map<string, string>();
  const pending = sidecars.filter(({ sdk, sidecar }) => {
    const existing = existingChecksums.get(sdk.url);
    if (!existing) return true;
    checksums.set(sidecar.url, existing);
    return false;
  });
  let next = 0;
  const worker = async () => {
    while (next < pending.length) {
      const { sidecar } = pending[next++];
      checksums.set(sidecar.url, parseSHA256(await readAssetText(sidecar.url), sidecar.name));
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(CHECKSUM_FETCH_CONCURRENCY, pending.length) }, () => worker()),
  );
  return checksums;
}

function existingSDKChecksums(channel?: ChannelData): Map<string, string> {
  const checksums = new Map<string, string>();
  for (const platforms of Object.values(channel?.versions ?? {})) {
    for (const sdk of Object.values(platforms)) {
      if (sdk?.sha256) checksums.set(sdk.url, sdk.sha256);
    }
  }
  return checksums;
}

function nightlySdkIdentity(name: string): { version: string; toolchain: string } | null {
  const normalized = name.toLowerCase().replaceAll("_", "-");
  if (!normalized.startsWith(SDK_PREFIX) || normalized.includes("-sanitizer.")) return null;
  const extension = SDK_ARCHIVE_EXTENSIONS.find((ext) => normalized.endsWith(ext));
  if (!extension) return null;

  const parts = normalized.slice(SDK_PREFIX.length, -extension.length).split("-");
  const versionIndex = parts.findIndex((part) => VERSION_TOKEN_RE.test(part));
  if (versionIndex <= 0) return null;
  const toolchain = detectToolchainKey(name);
  if (!toolchain) return null;
  return { toolchain, version: parts.slice(versionIndex).join("-") };
}

function docsComponent(release: RawRelease, version: string): ComponentPackage | undefined {
  const asset = release.assets.find((candidate) => {
    const match = DOCS_HTML_RE.exec(candidate.name);
    return match?.[1] === version;
  });
  return asset ? { name: asset.name, url: asset.url } : undefined;
}

function releaseComponents(release: RawRelease, version: string): VersionComponents | undefined {
  const components: VersionComponents = {};
  const docs = docsComponent(release, version);
  if (docs) components.docs = docs;

  const stdx = parseStdxRelease(release);
  if (stdx?.sdkVersion === version) {
    if (Object.keys(stdx.stdx).length > 0) components.stdx = stdx.stdx;
    if (stdx.stdxDocs) components["stdx-docs"] = stdx.stdxDocs;
  }
  return Object.keys(components).length > 0 ? components : undefined;
}

export async function buildNightlyChannel(
  releases: RawRelease[],
  readAssetText: ReadAssetText,
  existing?: ChannelData,
  scoopChecksums: ReadonlyMap<string, ScoopChecksum> = new Map(),
): Promise<ChannelData> {
  const versions: Record<string, VersionPackages> = {};
  const components: Record<string, VersionComponents> = {};
  const knownChecksums = existingSDKChecksums(existing);
  const publishedChecksums = await readPublishedSDKChecksums(releases, readAssetText, knownChecksums);

  for (const release of releases) {
    const packages: VersionPackages = {};
    const checksumAssets = new Map(
      release.assets
        .filter((asset) => asset.name.endsWith(".sha256"))
        .map((asset) => [asset.name.slice(0, -".sha256".length), asset]),
    );
    let releaseVersion = "";
    for (const asset of release.assets) {
      if (asset.type === "source") continue;
      const identity = nightlySdkIdentity(asset.name);
      if (!identity) continue;
      if (releaseVersion && releaseVersion !== identity.version) {
        throw new Error(`Nightly release ${release.tag} contains SDK versions ${releaseVersion} and ${identity.version}`);
      }
      releaseVersion = identity.version;
      // Workaround: native Windows .zip.sha256 assets have been incorrect since
      // 2026-09-03. Only trust the version/URL-matched upstream Scoop history;
      // neither cached sidecar hashes nor an empty hash is safe (cjv retries it).
      let sha256: string;
      if (identity.toolchain === "win32-x64") {
        const scoop = scoopChecksums.get(asset.url);
        if (!scoop || scoop.version !== identity.version) {
          console.error(`Skipping Windows SDK without matching Scoop checksum: ${asset.name}`);
          continue;
        }
        sha256 = parseSHA256(scoop.sha256, asset.name);
      } else {
        const checksumAsset = checksumAssets.get(asset.name);
        sha256 = checksumAsset
          ? publishedChecksums.get(checksumAsset.url) ?? ""
          : knownChecksums.get(asset.url) ?? "";
      }
      const entry: SdkPackage = { name: asset.name, sha256, url: asset.url };
      packages[identity.toolchain] = entry;
    }
    if (!releaseVersion || Object.keys(packages).length === 0) continue;
    versions[releaseVersion] = packages;
    const releaseComponentSet = releaseComponents(release, releaseVersion);
    if (releaseComponentSet) components[releaseVersion] = releaseComponentSet;
  }

  const candidates = Object.keys(versions).filter((version) => semver.valid(version));
  const latest = candidates.sort(semver.compare).at(-1) ?? null;
  return {
    versions,
    latest,
    ...(Object.keys(components).length > 0 ? { components } : {}),
  };
}
