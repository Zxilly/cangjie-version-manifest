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

export const PlatformSchema = z.enum([
  "win32-x64",
  "darwin-arm64",
  "darwin-x64",
  "linux-arm64",
  "linux-x64",
]);

export const SdkPackageSchema = z.object({
  name: z.string(),
  sha256: z.string(),
  url: z.string(),
});

// ─── 推导类型 ─────────────────────────────────────────────────────────────────

export type Platform = z.infer<typeof PlatformSchema>;
export type SdkPackage = z.infer<typeof SdkPackageSchema>;
export type VersionPackages = Partial<Record<Platform, SdkPackage>>;
export type VersionMap = z.infer<typeof VersionMapSchema>;
