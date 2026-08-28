import { spawnSync } from "node:child_process";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  artifactName,
  getPackagingPlan,
  PACKAGE_SIZE_LIMIT_BYTES,
  validateArtifactManifest,
  validateSizeManifest,
  validateTauriConfig,
} from "./packaging.mjs";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const configPath = path.join(repoRoot, "src-tauri", "tauri.conf.json");
const bundleRoot = path.join(repoRoot, "src-tauri", "target", "release", "bundle");

async function filesIn(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(entryPath));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

async function collectArtifacts(plan, buildStartedAt) {
  const artifacts = [];
  for (const format of plan.bundles) {
    const directory = path.join(bundleRoot, format);
    const candidates = await filesIn(directory);
    const expectedExtension = plan.extensions[plan.bundles.indexOf(format)];
    for (const filePath of candidates) {
      if (path.extname(filePath).toLowerCase() !== expectedExtension) continue;
      const fileStats = await stat(filePath);
      if (fileStats.mtimeMs < buildStartedAt - 1000) continue;
      const relativePath = path.relative(repoRoot, filePath).split(path.sep).join("/");
      const fileName = path.basename(filePath);
      artifacts.push({
        format,
        name: artifactName(plan.platform, format, fileName),
        fileName,
        path: relativePath,
        bytes: fileStats.size,
        sizeMiB: Number((fileStats.size / (1024 * 1024)).toFixed(3)),
      });
    }
  }
  return artifacts;
}

function runTauriBuild(plan) {
  // Node >= 20.12 (CVE-2024-27980) refuses to spawn .cmd/.bat files without
  // an explicit shell; use shell:true on Windows to launch npm.cmd safely.
  const useShell = process.platform === "win32";
  const npmCommand = useShell ? "npm.cmd" : "npm";
  console.log(`Running native Tauri bundles: ${plan.bundles.join(", ")}`);
  const result = spawnSync(
    npmCommand,
    ["run", "tauri", "--", "build", "--ci", "--no-sign", "--bundles", ...plan.bundles],
    { cwd: repoRoot, stdio: "inherit", shell: useShell },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (process.platform === "darwin" && plan.bundles.length === 1 && plan.bundles[0] === "dmg") {
      console.log("Tauri DMG bundling failed; checking for a freshly built app for the native hdiutil fallback.");
      return false;
    }
    throw new Error(`Tauri build exited with ${result.status ?? "a signal"}`);
  }
  return true;
}

function macDmgPath(config) {
  const targetArchitecture = process.arch === "arm64" ? "aarch64" : process.arch === "x64" ? "x86_64" : process.arch;
  const productName = config.productName.replace(/[^A-Za-z0-9._-]+/g, "-");
  return path.join(bundleRoot, "dmg", `${productName}_${config.version}_${targetArchitecture}.dmg`);
}

async function createMacDmgFallback(config, buildStartedAt) {
  const appPath = path.join(bundleRoot, "macos", `${config.productName}.app`);
  const appStats = await stat(appPath);
  if (!appStats.isDirectory() || appStats.mtimeMs < buildStartedAt - 1000) {
    throw new Error("Tauri did not produce a fresh macOS .app; refusing to package a stale path");
  }

  const outputPath = macDmgPath(config);
  console.log(`Creating verified macOS DMG with hdiutil: ${outputPath}`);
  const result = spawnSync(
    "hdiutil",
    ["create", "-volname", config.productName, "-srcfolder", appPath, "-ov", "-format", "UDZO", outputPath],
    { cwd: repoRoot, stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`hdiutil exited with ${result.status ?? "a signal"}`);
  }
}

async function main() {
  const config = JSON.parse(await readFile(configPath, "utf8"));
  validateTauriConfig(config);
  const plan = getPackagingPlan();

  if (process.argv.includes("--dry-run")) {
    console.log(`UNVERIFIED: dry run only; no ${plan.bundles.join(", ")} artifact was created.`);
    return;
  }

  console.log(`Packaging host: ${process.platform}/${process.arch}`);
  console.log(`Packaging plan: ${plan.platform} -> ${plan.bundles.join(", ")}`);
  const buildStartedAt = Date.now();
  const tauriBuildSucceeded = runTauriBuild(plan);
  if (!tauriBuildSucceeded) await createMacDmgFallback(config, buildStartedAt);

  const artifacts = await collectArtifacts(plan, buildStartedAt);
  if (artifacts.length !== plan.bundles.length) {
    const found = new Set(artifacts.map((artifact) => artifact.format));
    const missing = plan.bundles.filter((format) => !found.has(format));
    throw new Error(`Tauri build completed without expected artifact(s): ${missing.join(", ")}`);
  }

  const manifest = {
    schemaVersion: 1,
    product: config.productName,
    version: config.version,
    platform: plan.platform,
    host: process.platform,
    architecture: process.arch,
    bundles: plan.bundles,
    measurement: "package-file",
    sizeLimitBytes: PACKAGE_SIZE_LIMIT_BYTES,
    artifacts,
  };
  validateArtifactManifest(manifest, plan);
  const size = validateSizeManifest(manifest);
  manifest.sizeStatus = size.status;

  const manifestPath = path.join(
    repoRoot,
    "src-tauri",
    "target",
    "packaging",
    plan.platform,
    "manifest.json",
  );
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  for (const artifact of artifacts) {
    console.log(`Measured ${artifact.format}: ${artifact.bytes} bytes (${artifact.path})`);
  }
  console.log(`Package manifest: ${manifestPath}`);
  console.log(`Package size guard (${PACKAGE_SIZE_LIMIT_BYTES} bytes): ${size.status}`);
  if (!size.valid) {
    throw new Error(`Package size guard failed for: ${size.oversized.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(`PACKAGING FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
