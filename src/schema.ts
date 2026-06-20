import { z } from "zod";

// ─── 原始数据 Schema（从 version.js 解析出的结构） ────────────────────────────

export const RawPackageSchema = z.object({
  name: z.string(),
  url: z.string(),
  sha: z.string().default(""),
  version: z.string(),
  time: z.string(),
  size: z.string().optional(),
});

export const RawVersionDataSchema = z.object({
  time: z.string(),
  name: z.string().nullable(),
  version: z.string(),
  versiontype: z.enum(["LTS", "STS"]),
  list: z.array(
    z.object({
      name: z.string().nullable(),
      list: z.array(
        z.object({
          name: z.string(),
          list: z.array(RawPackageSchema),
        })
      ),
    })
  ),
});

export const VersionMapSchema = z.record(z.string(), RawVersionDataSchema);

// ─── 输出 Schema ──────────────────────────────────────────────────────────────

export const HostPlatformSchema = z.enum([
  "win32-x64",
  "darwin-arm64",
  "darwin-x64",
  "linux-arm64",
  "linux-x64",
  "ohos-arm64",
  "ohos-x64",
]);

export const PlatformSchema = HostPlatformSchema;

export const ToolchainKeySchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const SdkPackageSchema = z.object({
  name: z.string(),
  sha256: z.string(),
  url: z.string(),
});

// ─── 组件（doc / stdx / stdx-doc）输出 Schema ────────────────────────────────
//
// 组件归档发布在 SDK 之外的仓库（stdx / stdx-doc 在 gitcode cangjie_stdx,
// doc 在 cangjie-docs-bundle）, 其 tag 与文件名约定历来不一致, 故这里直接收录
// release API 返回的真实下载链接, 不做任何 URL 推导。组件归档不提供 sha256,
// 因此只保留 name + url。
export const ComponentPackageSchema = z.object({
  name: z.string(),
  url: z.string(),
});

// stdx 按其归档平台 token（如 linux-x64、ohos-aarch64）分别收录；doc / stdx-doc
// 各只有一个归档。键名 `stdx-docs` 与组件名保持一致。
export const VersionComponentsSchema = z.object({
  docs: ComponentPackageSchema.optional(),
  "stdx-docs": ComponentPackageSchema.optional(),
  stdx: z.record(z.string(), ComponentPackageSchema).optional(),
});

// ─── 推导类型 ─────────────────────────────────────────────────────────────────

export type HostPlatform = z.infer<typeof HostPlatformSchema>;
export type Platform = HostPlatform;
export type ToolchainKey = z.infer<typeof ToolchainKeySchema>;
export type SdkPackage = z.infer<typeof SdkPackageSchema>;
export type VersionPackages = Partial<Record<ToolchainKey, SdkPackage>>;
export type VersionMap = z.infer<typeof VersionMapSchema>;
export type ComponentPackage = z.infer<typeof ComponentPackageSchema>;
export type VersionComponents = z.infer<typeof VersionComponentsSchema>;
