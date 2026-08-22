import type { ChannelData, OutputManifest } from "./transform.js";

export function updateNightlyChannel(existing: OutputManifest, nightly: ChannelData): OutputManifest {
  return {
    channels: {
      ...existing.channels,
      nightly,
    },
  };
}

export function updateReleaseChannels(existing: OutputManifest, releases: OutputManifest): OutputManifest {
  return {
    channels: {
      lts: releases.channels.lts,
      sts: releases.channels.sts,
      ...(existing.channels.nightly ? { nightly: existing.channels.nightly } : {}),
    },
  };
}
