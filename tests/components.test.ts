import assert from "node:assert/strict";
import test from "node:test";
import {
  buildComponentsForVersions,
  collectDocsComponents,
  collectStdxComponents,
  parseStdxRelease,
  sdkVersionFromAssetVersion,
  type RawRelease,
} from "../src/components.js";

const BASE = "https://gitcode.com/Cangjie/cangjie_stdx/releases/download";

function attach(name: string): { name: string; url: string; type: string } {
  return { name, url: `${BASE}/x/${name}`, type: "attach" };
}

test("sdkVersionFromAssetVersion strips the trailing stdx revision", () => {
  assert.equal(sdkVersionFromAssetVersion("1.1.0-beta.25.1"), "1.1.0-beta.25");
  assert.equal(sdkVersionFromAssetVersion("1.1.0.1"), "1.1.0");
  assert.equal(sdkVersionFromAssetVersion("1.0.5.1"), "1.0.5");
  assert.equal(sdkVersionFromAssetVersion("0.60.5.1"), "0.60.5");
  assert.equal(sdkVersionFromAssetVersion("1.0.1.2"), "1.0.1");
});

test("parseStdxRelease maps the SDK-version-tag release (v1.1.0-beta.25)", () => {
  // tag 是裸 SDK 版本, 资产却带 .1 修订；解析须以资产推导 SDK 版本, 而非 tag。
  const release: RawRelease = {
    tag: "v1.1.0-beta.25",
    assets: [
      attach("cangjie-stdx-docs-html-1.1.0-beta.25.1.tar.gz"),
      attach("cangjie-stdx-linux-x64-1.1.0-beta.25.1.zip"),
      attach("cangjie-stdx-linux-aarch64-1.1.0-beta.25.1.zip"),
      attach("cangjie-stdx-ohos-aarch64-1.1.0-beta.25.1.zip"),
      attach("cangjie-stdx-windows-x64-1.1.0-beta.25.1.zip"),
      { name: "v1.1.0-beta.25.tar.gz", url: `${BASE}/src`, type: "source" },
    ],
  };
  const parsed = parseStdxRelease(release);
  assert.ok(parsed);
  assert.equal(parsed.sdkVersion, "1.1.0-beta.25");
  assert.deepEqual(Object.keys(parsed.stdx).sort(), [
    "linux-aarch64",
    "linux-x64",
    "ohos-aarch64",
    "windows-x64",
  ]);
  assert.equal(
    parsed.stdx["linux-x64"].url,
    `${BASE}/x/cangjie-stdx-linux-x64-1.1.0-beta.25.1.zip`,
  );
  assert.equal(parsed.stdxDocs?.name, "cangjie-stdx-docs-html-1.1.0-beta.25.1.tar.gz");
});

test("parseStdxRelease handles the legacy stdx-docs filename and tag-with-revision", () => {
  const release: RawRelease = {
    tag: "v1.0.4.1",
    assets: [
      attach("cangjie-1.0.4-stdx-docs-html.tar.gz"),
      attach("cangjie-stdx-linux-x64-1.0.4.1.zip"),
      attach("cangjie-stdx-mac-aarch64-1.0.4.1.zip"),
      attach("cangjie-stdx-windows-x64-1.0.4.1.zip"),
    ],
  };
  const parsed = parseStdxRelease(release);
  assert.ok(parsed);
  assert.equal(parsed.sdkVersion, "1.0.4");
  assert.equal(parsed.stdxDocs?.name, "cangjie-1.0.4-stdx-docs-html.tar.gz");
  assert.deepEqual(Object.keys(parsed.stdx).sort(), ["linux-x64", "mac-aarch64", "windows-x64"]);
});

test("parseStdxRelease recognises the zip stdx-docs variant and ios/simulator tokens", () => {
  const release: RawRelease = {
    tag: "v1.1.3.1",
    assets: [
      attach("cangjie-stdx-docs-html-1.1.3.1.tar.gz"),
      attach("cangjie-stdx-android-aarch64-1.1.3.1.zip"),
      attach("cangjie-stdx-ios-aarch64-1.1.3.1.zip"),
      attach("cangjie-stdx-ios-simulator-x64-1.1.3.1.zip"),
      attach("cangjie-stdx-linux-x64-1.1.3.1.zip"),
    ],
  };
  const parsed = parseStdxRelease(release);
  assert.ok(parsed);
  assert.equal(parsed.sdkVersion, "1.1.3");
  assert.deepEqual(Object.keys(parsed.stdx).sort(), [
    "android-aarch64",
    "ios-aarch64",
    "ios-simulator-x64",
    "linux-x64",
  ]);
});

test("parseStdxRelease returns null when a release has no platform stdx assets", () => {
  const release: RawRelease = {
    tag: "v1.1.0-beta.25",
    assets: [{ name: "v1.1.0-beta.25.zip", url: `${BASE}/src`, type: "source" }],
  };
  assert.equal(parseStdxRelease(release), null);
});

test("collectStdxComponents keys by SDK version and keeps the first occurrence", () => {
  const releases: RawRelease[] = [
    { tag: "v1.1.0.1", assets: [attach("cangjie-stdx-linux-x64-1.1.0.1.zip")] },
    { tag: "v1.0.5.1", assets: [attach("cangjie-stdx-linux-x64-1.0.5.1.zip")] },
  ];
  const out = collectStdxComponents(releases);
  assert.deepEqual(Object.keys(out).sort(), ["1.0.5", "1.1.0"]);
  assert.equal(out["1.1.0"].stdx["linux-x64"].name, "cangjie-stdx-linux-x64-1.1.0.1.zip");
});

test("collectDocsComponents maps bare-version tags to the docs html archive", () => {
  const releases: RawRelease[] = [
    {
      tag: "1.1.0-beta.25",
      assets: [
        {
          name: "cangjie-docs-html-1.1.0-beta.25.tar.gz",
          url: "https://github.com/Zxilly/cangjie-docs-bundle/releases/download/1.1.0-beta.25/cangjie-docs-html-1.1.0-beta.25.tar.gz",
        },
      ],
    },
  ];
  const out = collectDocsComponents(releases);
  assert.equal(out["1.1.0-beta.25"].name, "cangjie-docs-html-1.1.0-beta.25.tar.gz");
});

test("buildComponentsForVersions assembles doc / stdx / stdx-doc and skips empty versions", () => {
  const stdxByVersion = collectStdxComponents([
    {
      tag: "v1.1.0-beta.25",
      assets: [
        attach("cangjie-stdx-linux-x64-1.1.0-beta.25.1.zip"),
        attach("cangjie-stdx-docs-html-1.1.0-beta.25.1.tar.gz"),
      ],
    },
  ]);
  const docsByVersion = collectDocsComponents([
    {
      tag: "1.1.0-beta.25",
      assets: [{ name: "cangjie-docs-html-1.1.0-beta.25.tar.gz", url: "https://example/docs" }],
    },
  ]);

  const out = buildComponentsForVersions(
    ["1.1.0-beta.25", "9.9.9"],
    stdxByVersion,
    docsByVersion,
  );
  assert.deepEqual(Object.keys(out), ["1.1.0-beta.25"]);
  const c = out["1.1.0-beta.25"];
  assert.equal(c.docs?.name, "cangjie-docs-html-1.1.0-beta.25.tar.gz");
  assert.equal(c["stdx-docs"]?.name, "cangjie-stdx-docs-html-1.1.0-beta.25.1.tar.gz");
  assert.equal(c.stdx?.["linux-x64"].name, "cangjie-stdx-linux-x64-1.1.0-beta.25.1.zip");
});
