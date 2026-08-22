import semver from "semver";
import { parseStdxRelease, type RawRelease } from "./components.js";
import type { ComponentPackage, SdkPackage, VersionComponents, VersionPackages } from "./schema.js";
import { detectToolchainKey, type ChannelData } from "./transform.js";

const SDK_PREFIX = "cangjie-sdk-";
const SDK_ARCHIVE_EXTENSIONS = [".tar.gz", ".zip"];
const DOCS_HTML_RE = /^cangjie-docs-html-(.+)\.tar\.gz$/;
const VERSION_TOKEN_RE = /^\d+\.\d+\.\d+/;

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

export function buildNightlyChannel(releases: RawRelease[]): ChannelData {
  const versions: Record<string, VersionPackages> = {};
  const components: Record<string, VersionComponents> = {};

  for (const release of releases) {
    const packages: VersionPackages = {};
    let releaseVersion = "";
    for (const asset of release.assets) {
      if (asset.type === "source") continue;
      const identity = nightlySdkIdentity(asset.name);
      if (!identity) continue;
      if (releaseVersion && releaseVersion !== identity.version) {
        throw new Error(`Nightly release ${release.tag} contains SDK versions ${releaseVersion} and ${identity.version}`);
      }
      releaseVersion = identity.version;
      const entry: SdkPackage = { name: asset.name, sha256: "", url: asset.url };
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
