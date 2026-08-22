import assert from "node:assert/strict";
import test from "node:test";
import type { RawRelease } from "../src/components.js";
import { buildNightlyChannel } from "../src/nightly.js";

const BASE = "https://gitcode.com/Cangjie/nightly_build/releases/download";

function asset(tag: string, name: string, type = "attach") {
  return { name, url: `${BASE}/${tag}/${name}`, type };
}

test("buildNightlyChannel persists a published SDK checksum sidecar", async () => {
  const tag = "1.1.0-alpha.20260613020028";
  const version = "1.2.0-alpha.20260613020028";
  const checksum = "566059e22895b8bb6f82de35a7aea109140872ba8ed3f0cfe266c21ddd776d94";
  const release: RawRelease = {
    tag,
    assets: [
      asset(tag, `cangjie-sdk-linux-x64-${version}.tar.gz`),
      asset(tag, `cangjie-sdk-linux-x64-${version}.tar.gz.sha256`),
      asset(tag, `cangjie-sdk-linux-x64-${version}-sanitizer.tar.gz`),
      asset(tag, `cangjie-sdk-windows-x64-${version}.zip`),
      asset(tag, `cangjie-docs-html-${version}.tar.gz`),
      asset(tag, `cangjie-stdx-linux-x64-${version}.1.zip`),
      asset(tag, `cangjie-stdx-docs-html-${version}.1.tar.gz`),
      asset(tag, `${tag}.zip`, "source"),
    ],
  };

  const sidecarURL = `${BASE}/${tag}/cangjie-sdk-linux-x64-${version}.tar.gz.sha256`;
  const channel = await buildNightlyChannel([release], async (url) => {
    assert.equal(url, sidecarURL);
    return checksum;
  });

  assert.equal(channel.latest, version);
  assert.deepEqual(Object.keys(channel.versions[version]).sort(), ["linux-x64", "win32-x64"]);
  assert.deepEqual(channel.versions[version]["linux-x64"], {
    name: `cangjie-sdk-linux-x64-${version}.tar.gz`,
    sha256: checksum,
    url: `${BASE}/${tag}/cangjie-sdk-linux-x64-${version}.tar.gz`,
  });
  assert.equal(channel.versions[version]["win32-x64"].sha256, "");
  assert.equal(channel.components?.[version].docs?.name, `cangjie-docs-html-${version}.tar.gz`);
  assert.equal(channel.components?.[version].stdx?.["linux-x64"].name, `cangjie-stdx-linux-x64-${version}.1.zip`);
  assert.equal(channel.components?.[version]["stdx-docs"]?.name, `cangjie-stdx-docs-html-${version}.1.tar.gz`);
});

test("buildNightlyChannel rejects a malformed published checksum", async () => {
  const tag = "1.2.0-alpha.20260822010033";
  const version = "1.3.0-alpha.20260822010033";
  const sdkName = `cangjie-sdk-windows-x64-ohos-${version}.zip`;
  const release: RawRelease = {
    tag,
    assets: [asset(tag, sdkName), asset(tag, `${sdkName}.sha256`)],
  };

  await assert.rejects(
    buildNightlyChannel([release], async () => "not-a-sha256"),
    /must contain exactly 64 hexadecimal characters/,
  );
});

test("buildNightlyChannel reuses a persisted checksum for the same SDK URL", async () => {
  const tag = "1.2.0-alpha.20260822010033";
  const version = "1.3.0-alpha.20260822010033";
  const checksum = "6fd0169a0214c6baa4c26741a9241249e3a4884a9fe4798f8d1e809f019cb6b7";
  const sdkName = `cangjie-sdk-windows-x64-ohos-arm32-${version}.zip`;
  const sdk = asset(tag, sdkName);
  const release: RawRelease = {
    tag,
    assets: [sdk, asset(tag, `${sdkName}.sha256`)],
  };
  const existing = {
    latest: version,
    versions: {
      [version]: {
        "win32-x64-ohos-arm32": { name: sdkName, url: sdk.url, sha256: checksum },
      },
    },
  };

  const channel = await buildNightlyChannel(
    [release],
    async () => {
      throw new Error("persisted checksum should avoid another sidecar request");
    },
    existing,
  );

  assert.equal(channel.versions[version]["win32-x64-ohos-arm32"].sha256, checksum);
});
