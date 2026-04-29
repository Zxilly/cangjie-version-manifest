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

## Automation

A GitHub Actions workflow runs every 6 hours to scrape the latest version data from cangjie-lang.cn. If `versions.json` changes, a PR is automatically created.

## Local Usage

```bash
pnpm install
pnpm scrape
```

## License

ISC
