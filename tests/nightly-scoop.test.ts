import assert from "node:assert/strict";
import test from "node:test";
import { buildNightlyChannel } from "../src/nightly.js";
import { fetchScoopChecksums } from "../src/nightly-scoop.js";

const version = "1.3.0-alpha.20260912010037";
const name = `cangjie-sdk-windows-x64-${version}.zip`;
const url = `https://gitcode.com/Cangjie/nightly_build/releases/download/${version}/${name}`;
const bad = "ee5143b15669f297722852ff92dea330f5a55d8db48be353cf8f9cdc9c9660b2";
const good = "87436517cb5dac915e13cc6d19246cfef8487be85eb0d0fb4066793f133dd554";
const releases = [{ tag: version, assets: [{ name, url }, { name: name + ".sha256", url: url + ".sha256" }] }];

test("Windows workaround replaces cached sidecar hash without reading the broken sidecar", async () => {
  const existing = { latest: version, versions: { [version]: { "win32-x64": { name, url, sha256: bad } } } };
  const result = await buildNightlyChannel(releases, async () => { throw new Error("must not fetch sidecar"); }, existing,
    new Map([[url, { version, sha256: good }]]));
  assert.equal(result.versions[version]["win32-x64"].sha256, good);
});

test("Windows workaround does not publish unmatched Scoop versions or reuse cached hashes", async () => {
  const existing = { latest: version, versions: { [version]: { "win32-x64": { name, url, sha256: bad } } } };
  for (const scoop of [new Map(), new Map([[url, { version: "1.3.0-alpha.20260911010036", sha256: good }]])]) {
    const result = await buildNightlyChannel(releases, async () => { throw new Error("must not fetch sidecar"); }, existing, scoop);
    assert.equal(result.versions[version], undefined);
  }
});

function contents(v: string, u: string, hash: string) {
  return { encoding: "base64", content: Buffer.from(JSON.stringify({
    version: v, architecture: { "64bit": { url: u, hash } },
  })).toString("base64") };
}

test("Scoop history uses commit-pinned manifests, paginates and keeps the newest matching URL", async () => {
  const otherURL = url.replace(version, "1.3.0-alpha.20260911010036");
  const revisions = Array.from({ length: 50 }, (_, i) => (i + 1).toString(16).padStart(40, "0"));
  const result = await fetchScoopChecksums(new Set([url, otherURL]), async (u) => {
    if (u.includes("/commits?")) {
      return u.endsWith("page=1") ? revisions.map(sha => ({ sha })) : [{ sha: "f".repeat(40) }];
    }
    const ref = new URL(u).searchParams.get("ref");
    if (ref === "f".repeat(40)) return contents("older", otherURL, good);
    assert.ok(revisions.includes(ref!));
    return contents(version, url, ref === revisions[0] ? good.toUpperCase() : bad);
  });
  assert.equal(result.get(url)?.sha256, good);
  assert.equal(result.get(otherURL)?.sha256, good);
});

test("Scoop history rejects malformed hashes and propagates fetch failures", async () => {
  const commits = [{ sha: "a".repeat(40) }];
  await assert.rejects(fetchScoopChecksums(new Set([url]), async u =>
    u.includes("/commits?") ? commits : contents(version, url, "invalid")));
  await assert.rejects(fetchScoopChecksums(new Set([url]), async () => { throw new Error("network failed"); }), /network failed/);
});

test("Scoop history never associates a different asset URL with the requested package", async () => {
  const result = await fetchScoopChecksums(new Set([url]), async u =>
    u.includes("/commits?") ? [{ sha: "a".repeat(40) }] : contents(version, url + ".wrong", good));
  assert.equal(result.size, 0);
});

