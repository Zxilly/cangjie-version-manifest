# cangjie-version-manifest

Machine-readable version manifest for [Cangjie Programming Language](https://cangjie-lang.cn) SDK releases.

## `versions.json`

The [`versions.json`](./versions.json) file contains all available SDK versions, organized by release channel:

```jsonc
{
  "channels": {
    "sts": {
      "versions": { /* ... */ },
      "latest": "1.1.0"
    },
    "lts": {
      "versions": { /* ... */ },
      "latest": "1.0.5"
    },
    "nightly": {
      "versions": { /* ... */ },
      "latest": "1.3.0-alpha.20260822010033"
    }
  }
}
```

Each version entry is keyed by toolchain. Native SDKs use the host platform key:

| Key | Host platform |
|-----|---------------|
| `win32-x64` | Windows x64 |
| `darwin-arm64` | macOS Apple Silicon |
| `darwin-x64` | macOS Intel |
| `linux-arm64` | Linux AArch64 |
| `linux-x64` | Linux x64 |
| `ohos-arm64` | OpenHarmony AArch64 |
| `ohos-x64` | OpenHarmony x64 |

Cross-compilation SDKs use `<host-platform>-<target>`, where `target` preserves the
target platform tokens published by upstream. For example, `win32-x64-ohos`,
`darwin-arm64-ios`, `linux-x64-android`, and `win32-x64-ohos-arm32`.

Each toolchain entry contains `name`, `sha256`, and `url`.
Nightly generation reads a matching `.sha256` Release asset when upstream
publishes one and stores the validated digest in `sha256`. Other entries use an
empty digest as the compatibility representation until upstream adds a sidecar.

### Components

Alongside `versions`, each channel carries a `components` map keyed by SDK version.
It holds the download links for the toolchain add-ons — `docs` (the main
documentation), `stdx-docs` (the stdx API documentation), and `stdx` (the stdx
binaries, keyed by archive platform token):

```jsonc
{
  "channels": {
    "sts": {
      "components": {
        "1.1.0-beta.25": {
          "docs":      { "name": "cangjie-docs-html-1.1.0-beta.25.tar.gz", "url": "..." },
          "stdx-docs": { "name": "cangjie-stdx-docs-html-1.1.0-beta.25.1.tar.gz", "url": "..." },
          "stdx": {
            "linux-x64":     { "name": "cangjie-stdx-linux-x64-1.1.0-beta.25.1.zip", "url": "..." },
            "ohos-aarch64":  { "name": "cangjie-stdx-ohos-aarch64-1.1.0-beta.25.1.zip", "url": "..." }
            /* ... */
          }
        }
      }
    }
  }
}
```

These links are taken verbatim from the upstream release APIs (gitcode
`cangjie_stdx` for `stdx` / `stdx-docs`, `cangjie-docs-bundle` for `docs`), which
makes each upstream asset authoritative across the repositories' naming schemes.
The `stdx` platform tokens match the archive filenames
(e.g. `linux-x64`, `linux-aarch64`, `mac-aarch64`, `windows-x64`, `ohos-aarch64`,
`ohos-x64`, `android-aarch64`, `ios-aarch64`, `ios-simulator-x64`). A component
entry carries `name` and `url`. A version appears under `components` for the add-ons it actually
publishes.

### Nightly

The `nightly` channel is generated from the static assets of GitCode
`Cangjie/nightly_build` Releases. Release discovery and tag-to-asset-version
mapping happen in this repository; manifest consumers use the resulting URLs
and version metadata directly.

## Automation

The nightly workflow runs every 6 hours and commits `channels.nightly` directly
to `master`. The release workflow updates LTS/STS and their components on a PR
for review. Both workflows share one concurrency group and update only their
owned channel fields.

## Local Usage

```bash
pnpm install
pnpm scrape:releases
pnpm scrape:nightly
```

## License

ISC
