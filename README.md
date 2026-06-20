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
`cangjie_stdx` for `stdx` / `stdx-docs`, `cangjie-docs-bundle` for `docs`) rather
than reconstructed, because the upstream release tags and asset filenames do not
follow a consistent rule. The `stdx` platform tokens match the archive filenames
(e.g. `linux-x64`, `linux-aarch64`, `mac-aarch64`, `windows-x64`, `ohos-aarch64`,
`ohos-x64`, `android-aarch64`, `ios-aarch64`, `ios-simulator-x64`). A component
entry carries only `name` and `url`; these archives ship without a published
checksum. A version appears under `components` only for the add-ons it actually
publishes.

## Automation

A GitHub Actions workflow runs every 6 hours to scrape the latest version data from cangjie-lang.cn. If `versions.json` changes, a PR is automatically created.

## Local Usage

```bash
pnpm install
pnpm scrape
```

## License

ISC
