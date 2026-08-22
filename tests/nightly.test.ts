import assert from "node:assert/strict";
import test from "node:test";
import type { RawRelease } from "../src/components.js";
import { buildNightlyChannel } from "../src/nightly.js";

const BASE = "https://gitcode.com/Cangjie/nightly_build/releases/download";

function asset(tag: string, name: string, type = "attach") {
  return { name, url: `${BASE}/${tag}/${name}`, type };
}

test("buildNightlyChannel publishes SDKs and components from one release", () => {
  const tag = "1.1.0-alpha.20260613020028";
  const version = "1.2.0-alpha.20260613020028";
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

  const channel = buildNightlyChannel([release]);

  assert.equal(channel.latest, version);
  assert.deepEqual(Object.keys(channel.versions[version]).sort(), ["linux-x64", "win32-x64"]);
  assert.deepEqual(channel.versions[version]["linux-x64"], {
    name: `cangjie-sdk-linux-x64-${version}.tar.gz`,
    sha256: "",
    url: `${BASE}/${tag}/cangjie-sdk-linux-x64-${version}.tar.gz`,
  });
  assert.equal(channel.components?.[version].docs?.name, `cangjie-docs-html-${version}.tar.gz`);
  assert.equal(channel.components?.[version].stdx?.["linux-x64"].name, `cangjie-stdx-linux-x64-${version}.1.zip`);
  assert.equal(channel.components?.[version]["stdx-docs"]?.name, `cangjie-stdx-docs-html-${version}.1.tar.gz`);
});
