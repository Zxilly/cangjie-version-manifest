# cangjie-version-manifest

Machine-readable version manifest for [Cangjie Programming Language](https://cangjie-lang.cn) SDK releases.

## `versions.json`

The [`versions.json`](./versions.json) file contains all available SDK versions, organized by release channel:

```jsonc
{
  "channels": {
    "sts": {
      "versions": { /* ... */ },
      "latest": "1.1.0-beta.24"
    },
    "lts": {
      "versions": { /* ... */ },
      "latest": "1.0.5"
    }
  }
}
```

Each version entry is keyed by platform:

| Key | Platform |
|-----|----------|
| `win32-x64` | Windows x64 |
| `darwin-arm64` | macOS Apple Silicon |
| `darwin-x64` | macOS Intel |
| `linux-arm64` | Linux AArch64 |
| `linux-x64` | Linux x64 |

Each platform entry contains `name`, `sha256`, and `url`.

## Automation

A GitHub Actions workflow runs every 6 hours to scrape the latest version data from cangjie-lang.cn. If `versions.json` changes, a PR is automatically created.

## Local Usage

```bash
pnpm install
pnpm scrape
```

## License

ISC
