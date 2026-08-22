import type { OutputManifest } from "./transform.js";

export function releaseManifest(releases: OutputManifest): OutputManifest {
  return {
    channels: {
      lts: releases.channels.lts,
      sts: releases.channels.sts,
    },
  };
}
