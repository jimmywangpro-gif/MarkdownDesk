import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getPackagingPlan,
  PACKAGE_SIZE_LIMIT_BYTES,
  validateArtifactManifest,
  validateSizeManifest,
  validateTauriConfig,
} from "./packaging.mjs";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const configPath = path.join(repoRoot, "src-tauri", "tauri.conf.json");

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const config = JSON.parse(await readFile(configPath, "utf8"));
  validateTauriConfig(config);
  const plan = getPackagingPlan();
  console.log(`Tauri target mapping: ${plan.platform} -> ${plan.bundles.join(", ")}`);

  const requestedManifest = argumentValue("--manifest");
  const manifestPath = requestedManifest
    ? path.resolve(process.cwd(), requestedManifest)
    : path.join(repoRoot, "src-tauri", "target", "packaging", plan.platform, "manifest.json");

  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT" && !requestedManifest) {
      console.log(`UNVERIFIED: no package manifest found at ${manifestPath}`);
      return;
    }
    throw error;
  }

  validateArtifactManifest(manifest, plan);
  const size = validateSizeManifest(manifest);
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Package size guard (${PACKAGE_SIZE_LIMIT_BYTES} bytes): ${size.status}`);
  for (const artifact of manifest.artifacts) {
    console.log(`Measured ${artifact.format}: ${artifact.bytes} bytes (${artifact.path})`);
  }
  if (!size.valid) {
    throw new Error(`Package size guard failed for: ${size.oversized.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(`PACKAGING VALIDATION FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
