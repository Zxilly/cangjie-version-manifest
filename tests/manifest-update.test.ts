import assert from "node:assert/strict";
import test from "node:test";
import type { OutputManifest } from "../src/transform.js";
import { updateNightlyChannel, updateReleaseChannels } from "../src/manifest-update.js";

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

test("updateNightlyChannel preserves the reviewed release channels", () => {
  const existing: OutputManifest = {
    channels: {
      lts: channel("1.0.5"),
      sts: channel("1.1.0"),
      nightly: channel("1.2.0-alpha.1"),
    },
  };

  const updated = updateNightlyChannel(existing, channel("1.2.0-alpha.2"));

  assert.strictEqual(updated.channels.lts, existing.channels.lts);
  assert.strictEqual(updated.channels.sts, existing.channels.sts);
  assert.equal(updated.channels.nightly?.latest, "1.2.0-alpha.2");
});

test("updateReleaseChannels preserves the automatically published nightly channel", () => {
  const existing: OutputManifest = {
    channels: {
      lts: channel("1.0.4"),
      sts: channel("1.0.9"),
      nightly: channel("1.2.0-alpha.2"),
    },
  };
  const reviewed: OutputManifest = {
    channels: {
      lts: channel("1.0.5"),
      sts: channel("1.1.0"),
    },
  };

  const updated = updateReleaseChannels(existing, reviewed);

  assert.equal(updated.channels.lts.latest, "1.0.5");
  assert.equal(updated.channels.sts.latest, "1.1.0");
  assert.strictEqual(updated.channels.nightly, existing.channels.nightly);
});
