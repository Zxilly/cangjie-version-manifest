import { readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ChannelDataSchema, OutputManifestSchema } from "./schema.js";
import type { ChannelData, OutputManifest } from "./transform.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "..", "versions.json");
const NIGHTLY_OUTPUT_PATH = join(__dirname, "..", "nightly.json");

export async function readManifest(): Promise<OutputManifest> {
  return OutputManifestSchema.parse(JSON.parse(await readFile(OUTPUT_PATH, "utf8"))) as OutputManifest;
}

export async function writeManifest(manifest: OutputManifest): Promise<void> {
  await writeFile(OUTPUT_PATH, JSON.stringify(manifest, null, 2) + "\n");
  console.error(`Wrote ${OUTPUT_PATH}`);
}

export async function readNightlyManifest(): Promise<ChannelData> {
  try {
    return ChannelDataSchema.parse(JSON.parse(await readFile(NIGHTLY_OUTPUT_PATH, "utf8"))) as ChannelData;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const legacy = await readManifest();
    if (!legacy.channels.nightly) throw new Error("Nightly channel is missing from manifest files");
    return legacy.channels.nightly;
  }
}

export async function writeNightlyManifest(nightly: ChannelData): Promise<void> {
  await writeFile(NIGHTLY_OUTPUT_PATH, JSON.stringify(nightly, null, 2) + "\n");
  console.error(`Wrote ${NIGHTLY_OUTPUT_PATH}`);
}
