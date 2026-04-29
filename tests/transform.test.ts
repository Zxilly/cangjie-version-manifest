import assert from "node:assert/strict";
import test from "node:test";
import { detectPlatform, transformVersionData } from "../src/transform.js";
import { HostPlatformSchema, type VersionMap } from "../src/schema.js";

function pkg(name: string) {
  return {
    name,
    url: `/downloads/${name}`,
    sha: `sha-${name}`,
    version: "1.1.0",
    time: "2026-01-01",
  };
}

test("detectPlatform returns native and cross-toolchain keys", () => {
  assert.equal(detectPlatform("cangjie-sdk-windows-x64-1.1.0.zip"), "win32-x64");
  assert.equal(detectPlatform("cangjie-sdk-windows-x64-android-1.1.0.zip"), "win32-x64-android");
  assert.equal(detectPlatform("cangjie-sdk-windows-x64-ohos-1.1.0.zip"), "win32-x64-ohos");

  assert.equal(detectPlatform("cangjie-sdk-mac-aarch64-1.1.0.tar.gz"), "darwin-arm64");
  assert.equal(detectPlatform("cangjie-sdk-mac-aarch64-android-1.1.0.tar.gz"), "darwin-arm64-android");
  assert.equal(detectPlatform("cangjie-sdk-mac-aarch64-ios-1.1.0.tar.gz"), "darwin-arm64-ios");
  assert.equal(detectPlatform("cangjie-sdk-mac-aarch64-ohos-1.1.0.tar.gz"), "darwin-arm64-ohos");

  assert.equal(detectPlatform("cangjie-sdk-linux-x64-1.1.0.tar.gz"), "linux-x64");
  assert.equal(detectPlatform("cangjie-sdk-linux-x64-android-1.1.0.tar.gz"), "linux-x64-android");
  assert.equal(detectPlatform("cangjie-sdk-linux-x64-ohos-1.1.0.tar.gz"), "linux-x64-ohos");

  assert.equal(detectPlatform("Cangjie-0.53.13-linux_aarch64.tar.gz"), "linux-arm64");
});

test("detectPlatform supports target architecture suffixes and non-desktop host SDK packages", () => {
  assert.equal(
    detectPlatform("cangjie-sdk-windows-x64-ohos-arm32-1.1.0-alpha.20260429010057.zip"),
    "win32-x64-ohos-arm32",
  );
  assert.equal(
    detectPlatform("cangjie-sdk-ohos-aarch64-1.1.0-alpha.20260429010057.tar.gz"),
    "ohos-arm64",
  );
  assert.equal(HostPlatformSchema.safeParse("ohos-arm64").success, true);
});

test("transformVersionData keeps 1.1.0 native and cross toolchains without overwrites", () => {
  const versionMap: VersionMap = {
    "1.1.0": {
      time: "2026-01-01",
      name: "",
      version: "1.1.0",
      versiontype: "STS",
      list: [
        {
          name: "",
          list: [
            {
              name: "Windows",
              list: [
                pkg("cangjie-sdk-windows-x64-1.1.0.exe"),
                pkg("cangjie-sdk-windows-x64-1.1.0.zip"),
                pkg("cangjie-sdk-windows-x64-android-1.1.0.exe"),
                pkg("cangjie-sdk-windows-x64-android-1.1.0.zip"),
                pkg("cangjie-sdk-windows-x64-ohos-1.1.0.zip"),
              ],
            },
            {
              name: "Mac",
              list: [
                pkg("cangjie-sdk-mac-aarch64-1.1.0.tar.gz"),
                pkg("cangjie-sdk-mac-aarch64-ohos-1.1.0.tar.gz"),
                pkg("cangjie-sdk-mac-aarch64-ios-1.1.0.tar.gz"),
                pkg("cangjie-sdk-mac-aarch64-android-1.1.0.tar.gz"),
              ],
            },
            {
              name: "Linux",
              list: [
                pkg("cangjie-sdk-linux-aarch64-1.1.0.tar.gz"),
                pkg("cangjie-sdk-linux-x64-ohos-1.1.0.tar.gz"),
                pkg("cangjie-sdk-linux-x64-android-1.1.0.tar.gz"),
                pkg("cangjie-sdk-linux-x64-1.1.0.tar.gz"),
              ],
            },
          ],
        },
        {
          name: null,
          list: [
            {
              name: "VScode Plugin",
              list: [pkg("cangjie-vscode-1.1.0.tar.gz")],
            },
          ],
        },
      ],
    },
  };

  const packages = transformVersionData(versionMap).channels.sts.versions["1.1.0"];

  assert.deepEqual(Object.keys(packages).sort(), [
    "darwin-arm64",
    "darwin-arm64-android",
    "darwin-arm64-ios",
    "darwin-arm64-ohos",
    "linux-arm64",
    "linux-x64",
    "linux-x64-android",
    "linux-x64-ohos",
    "win32-x64",
    "win32-x64-android",
    "win32-x64-ohos",
  ]);
  assert.equal(packages["win32-x64"]?.name, "cangjie-sdk-windows-x64-1.1.0.zip");
  assert.equal(packages["win32-x64-android"]?.name, "cangjie-sdk-windows-x64-android-1.1.0.zip");
  assert.equal(packages["win32-x64-ohos"]?.name, "cangjie-sdk-windows-x64-ohos-1.1.0.zip");
  assert.equal(packages["darwin-arm64-ios"]?.name, "cangjie-sdk-mac-aarch64-ios-1.1.0.tar.gz");
  assert.equal(packages["linux-x64-android"]?.name, "cangjie-sdk-linux-x64-android-1.1.0.tar.gz");
});

test("transformVersionData ignores non-primary SDK release assets", () => {
  const versionMap: VersionMap = {
    "1.1.0-alpha.20260429010057": {
      time: "2026-04-29",
      name: "",
      version: "1.1.0-alpha.20260429010057",
      versiontype: "STS",
      list: [
        {
          name: "",
          list: [
            {
              name: "Release Assets",
              list: [
                pkg("cangjie-frontend-linux-x64-1.1.0-alpha.20260429010057.tar.gz"),
                pkg("cangjie-stdx-linux-x64-1.1.0-alpha.20260429010057.1.zip"),
                pkg("cangjie-docs-html-1.1.0-alpha.20260429010057.tar.gz"),
                pkg("cangjie-sdk-linux-x64-1.1.0-alpha.20260429010057.tar.gz"),
                pkg("cangjie-sdk-linux-x64-1.1.0-alpha.20260429010057.tar.gz.asc"),
                pkg("cangjie-sdk-linux-x64-1.1.0-alpha.20260429010057-sanitizer.tar.gz"),
                pkg("cangjie-sdk-windows-x64-ohos-1.1.0-alpha.20260429010057.zip"),
                pkg("cangjie-sdk-windows-x64-ohos-1.1.0-alpha.20260429010057.zip.sha256"),
                pkg("cangjie-sdk-windows-x64-ohos-arm32-1.1.0-alpha.20260429010057.zip"),
                pkg("cangjie-sdk-windows-x64-ohos-arm32-1.1.0-alpha.20260429010057.zip.sha256"),
                pkg("cangjie-sdk-ohos-aarch64-1.1.0-alpha.20260429010057.tar.gz"),
              ],
            },
          ],
        },
      ],
    },
  };

  const packages = transformVersionData(versionMap).channels.sts.versions["1.1.0-alpha.20260429010057"];

  assert.deepEqual(Object.keys(packages).sort(), [
    "linux-x64",
    "ohos-arm64",
    "win32-x64-ohos",
    "win32-x64-ohos-arm32",
  ]);
  assert.equal(packages["linux-x64"]?.name, "cangjie-sdk-linux-x64-1.1.0-alpha.20260429010057.tar.gz");
  assert.equal(
    packages["win32-x64-ohos"]?.name,
    "cangjie-sdk-windows-x64-ohos-1.1.0-alpha.20260429010057.zip",
  );
  assert.equal(
    packages["win32-x64-ohos-arm32"]?.name,
    "cangjie-sdk-windows-x64-ohos-arm32-1.1.0-alpha.20260429010057.zip",
  );
  assert.equal(packages["ohos-arm64"]?.name, "cangjie-sdk-ohos-aarch64-1.1.0-alpha.20260429010057.tar.gz");
});
