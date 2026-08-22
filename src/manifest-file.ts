import { readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { OutputManifestSchema } from "./schema.js";
import type { OutputManifest } from "./transform.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "..", "versions.json");

export async function readManifest(): Promise<OutputManifest> {
  return OutputManifestSchema.parse(JSON.parse(await readFile(OUTPUT_PATH, "utf8"))) as OutputManifest;
}

export async function writeManifest(manifest: OutputManifest): Promise<void> {
  await writeFile(OUTPUT_PATH, JSON.stringify(manifest, null, 2) + "\n");
  console.error(`Wrote ${OUTPUT_PATH}`);
}
