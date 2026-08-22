import assert from "node:assert/strict";
import test from "node:test";
import type { OutputManifest } from "../src/transform.js";
import { releaseManifest } from "../src/manifest-update.js";

function channel(version: string) {
  return {
    latest: version,
    versions: {
      [version]: {
        "linux-x64": { name: `${version}.tar.gz`, sha256: "", url: `https://example/${version}` },
      },
    },
  };
}

test("releaseManifest keeps versions.json limited to reviewed release channels", () => {
  const reviewed: OutputManifest = {
    channels: {
      lts: channel("1.0.5"),
      sts: channel("1.1.0"),
      nightly: channel("1.2.0-alpha.2"),
    },
  };

  const updated = releaseManifest(reviewed);

  assert.equal(updated.channels.lts.latest, "1.0.5");
  assert.equal(updated.channels.sts.latest, "1.1.0");
  assert.equal(updated.channels.nightly, undefined);
});
