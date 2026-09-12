# cangjie-version-manifest

[仓颉编程语言](https://cangjie-lang.cn) SDK 的机器可读版本清单。

## 版本清单

[`versions.json`](./versions.json) 包含经过审核的 LTS 和 STS 版本：

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

独立生成的 [`nightly.json`](./nightly.json) 包含 nightly 通道数据：

```jsonc
{
  "versions": { /* ... */ },
  "latest": "1.3.0-alpha.20260822010033",
  "components": { /* ... */ }
}
```

客户端仅在操作 nightly 版本时获取 `nightly.json`，避免常规 LTS/STS 请求加载额外的版本数据。

每个版本下的 SDK 按工具链标识组织。原生 SDK 使用宿主平台标识：

| 标识 | 宿主平台 |
| --- | --- |
| `win32-x64` | Windows x64 |
| `darwin-arm64` | macOS Apple Silicon |
| `darwin-x64` | macOS Intel |
| `linux-arm64` | Linux AArch64 |
| `linux-x64` | Linux x64 |
| `ohos-arm64` | OpenHarmony AArch64 |
| `ohos-x64` | OpenHarmony x64 |

交叉编译 SDK 使用 `<host-platform>-<target>`，其中 `target` 保留上游发布的目标平台标识。
例如：`win32-x64-ohos`、`darwin-arm64-ios`、`linux-x64-android` 和 `win32-x64-ohos-arm32`。

每个工具链条目包含 `name`、`sha256` 和 `url`。
除下述标准 Windows x64 特殊处理外，nightly 生成器会读取上游 Release 中与 SDK 同名的
`.sha256` 文件，验证摘要格式后写入 `sha256`。上游未提供校验文件时，使用空摘要以保持兼容。

### 临时兼容处理（workaround）：标准 Windows nightly 校验和

从 2026 年 9 月 3 日的构建开始，上游标准 Windows x64 的 `.zip.sha256` 与实际下载的 ZIP 不一致；
已验证截至 9 月 12 日的全部 10 个构建均存在此问题。
上游 [Scoop manifest](https://gitcode.com/Cangjie/nightly_build/blob/main/bucket/cangjie-nightly.json)
保存了正确摘要，其中 9 月 3 日至 11 日的历史条目均与独立下载计算的结果一致。
问题出在上游发布的校验文件，生成器此前只是转录了其中的摘要。

仅针对 `win32-x64`，生成器直接从 GitCode 读取 Scoop manifest 的提交历史，
按 SDK 版本和完整下载 URL 精确匹配，优先使用最新的匹配提交，并覆盖此前缓存的 sidecar 摘要。
Windows → OHOS 和 OHOS ARM32 交叉编译包继续使用已验证正常的 Release 校验文件。

没有匹配 Scoop 记录的标准 Windows 包暂不列入清单，包括上游支持 Scoop 之前的旧构建，
待匹配记录出现后再加入。此处不能发布空摘要或回退到已知错误的 `.sha256`，
否则客户端可能再次读取该文件。网络请求失败或 Scoop 元数据格式错误时，生成器会在写入清单前终止。
运行 `pnpm scrape:nightly` 也会利用上游历史记录修正已有的标准 Windows 摘要。

只有在确认上游最终 ZIP 与 `.sha256` 一致后，才能移除此 workaround；
移除时仍需保留对受影响历史版本的处理方式。
公开的 [Scoop 更新脚本](https://gitcode.com/Cangjie/nightly_build/blob/main/tools/update_manifest.py)
会计算本地 ZIP 的哈希或接受 `--hash` 参数，但不会生成出错的 Release 校验文件。

### 附加组件

除 `versions` 外，每个通道还包含按 SDK 版本组织的 `components`，保存以下附加组件的下载链接：

- `docs`：主文档。
- `stdx-docs`：stdx API 文档。
- `stdx`：stdx 二进制包，按归档文件中的平台标识组织。

```jsonc
{
  "channels": {
    "sts": {
      "components": {
        "1.1.0-beta.25": {
          "docs": {
            "name": "cangjie-docs-html-1.1.0-beta.25.tar.gz",
            "url": "..."
          },
          "stdx-docs": {
            "name": "cangjie-stdx-docs-html-1.1.0-beta.25.1.tar.gz",
            "url": "..."
          },
          "stdx": {
            "linux-x64": {
              "name": "cangjie-stdx-linux-x64-1.1.0-beta.25.1.zip",
              "url": "..."
            },
            "ohos-aarch64": {
              "name": "cangjie-stdx-ohos-aarch64-1.1.0-beta.25.1.zip",
              "url": "..."
            }
            /* ... */
          }
        }
      }
    }
  }
}
```

这些链接直接取自上游 Release API：`stdx` / `stdx-docs` 来自 GitCode 的 `cangjie_stdx`，
`docs` 来自 `cangjie-docs-bundle`。不同仓库的命名方式以各自发布的资产为准，不自行重建下载地址。

`stdx` 的平台标识与归档文件名保持一致，例如 `linux-x64`、`linux-aarch64`、`mac-aarch64`、
`windows-x64`、`ohos-aarch64`、`ohos-x64`、`android-aarch64`、`ios-aarch64` 和 `ios-simulator-x64`。
组件条目包含 `name` 和 `url`，仅为实际发布了附加组件的版本生成对应条目。

### Nightly 版本来源

nightly 通道基于 GitCode `Cangjie/nightly_build` Releases 中的静态资产生成。
本仓库负责发现 Release，并将发布标签映射到资产中的 SDK 版本；
客户端直接使用清单提供的下载 URL 和版本元数据。

## 自动更新

nightly 工作流每 6 小时运行一次，将 `nightly.json` 直接提交到 `master`。
正式版本工作流通过 PR 更新 `versions.json` 中的 LTS/STS 及其附加组件，供人工审核。
两个工作流共用同一个并发组，分别维护各自的数据文件。

## 本地使用

```bash
pnpm install
pnpm scrape:releases
pnpm scrape:nightly
```

## 许可证

ISC
