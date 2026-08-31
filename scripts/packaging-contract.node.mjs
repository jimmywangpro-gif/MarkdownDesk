import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  artifactName,
  getPackagingPlan,
  validateSizeManifest,
  validateArtifactManifest,
  validateTauriConfig,
} from "./packaging.mjs";

const configPath = new URL("../src-tauri/tauri.conf.json", import.meta.url);
const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const bundleRoot = path.join(repoRoot, "src-tauri", "target", "release", "bundle");

async function snapshotFiles(directory) {
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
    if (entry.isDirectory()) files.push(...await snapshotFiles(entryPath));
    else if (entry.isFile()) files.push(path.relative(repoRoot, entryPath));
  }
  return files.sort();
}

function runMacReleaseDryRun(environment) {
  return spawnSync(
    process.execPath,
    ["scripts/package.mjs", "--release", "--dry-run"],
    { cwd: repoRoot, encoding: "utf8", env: environment },
  );
}

function combinedOutput(result) {
  return `${result.stdout}\n${result.stderr}`;
}

test("maps each supported host to only its native bundle formats", () => {
  assert.deepEqual(getPackagingPlan("darwin"), {
    platform: "macos",
    bundles: ["dmg"],
    extensions: [".dmg"],
  });
  assert.deepEqual(getPackagingPlan("win32"), {
    platform: "windows",
    bundles: ["nsis"],
    extensions: [".exe"],
  });
  assert.deepEqual(getPackagingPlan("linux"), {
    platform: "linux",
    bundles: ["deb", "appimage"],
    extensions: [".deb", ".appimage"],
  });
});

test("rejects unsupported hosts instead of selecting a foreign bundle", () => {
  assert.throws(() => getPackagingPlan("freebsd"), /Unsupported packaging host/);
});

test("keeps the packaging entry rerunnable without fabricating dry-run artifacts", () => {
  const args = ["scripts/package.mjs", "--dry-run"];
  const first = spawnSync(process.execPath, args, { cwd: repoRoot, encoding: "utf8" });
  const second = spawnSync(process.execPath, args, { cwd: repoRoot, encoding: "utf8" });

  assert.equal(first.status, 0);
  assert.equal(second.status, 0);
  assert.equal(first.stdout, second.stdout);
  assert.match(first.stdout, /UNVERIFIED/);
  assert.match(first.stdout, /no dmg artifact was created/);
});

test("derives a stable artifact name from platform, format, and actual file", () => {
  assert.equal(
    artifactName("windows", "nsis", "MarkdownDesk_0.1.0_x64-setup.exe"),
    "markdowndesk-windows-nsis-MarkdownDesk_0.1.0_x64-setup.exe",
  );
});

test("validates artifact formats, names, paths, and measured bytes", () => {
  const plan = getPackagingPlan("linux");
  assert.doesNotThrow(() => validateArtifactManifest({
    platform: "linux",
    artifacts: [
      {
        format: "deb",
        name: artifactName("linux", "deb", "MarkdownDesk.deb"),
        path: "src-tauri/target/release/bundle/deb/MarkdownDesk.deb",
        bytes: 1024,
      },
      {
        format: "appimage",
        name: artifactName("linux", "appimage", "MarkdownDesk.AppImage"),
        path: "src-tauri/target/release/bundle/appimage/MarkdownDesk.AppImage",
        bytes: 2048,
      },
    ],
  }, plan));
});

test("validates the Tauri target mapping from the checked-in config", async () => {
  const config = JSON.parse(await readFile(configPath, "utf8"));
  assert.doesNotThrow(() => validateTauriConfig(config));
});

test("keeps the checked-in Tauri identifier on the public packaging seam", async () => {
  const config = JSON.parse(await readFile(configPath, "utf8"));
  assert.equal(config.identifier, "io.github.jimmywangpro-gif.markdowndesk");
});

test("rejects a macOS release dry-run when signing and notarization settings are absent", { skip: process.platform !== "darwin" }, () => {
  const environment = { ...process.env };
  delete environment.APPLE_SIGNING_IDENTITY;
  delete environment.MACOS_NOTARY_PROFILE;

  const result = runMacReleaseDryRun(environment);

  assert.notEqual(result.status, 0);
  assert.match(combinedOutput(result), /APPLE_SIGNING_IDENTITY/);
  assert.match(combinedOutput(result), /MACOS_NOTARY_PROFILE/);
});

test("reports an unverified macOS release dry-run with placeholder settings and creates no artifact", { skip: process.platform !== "darwin" }, async () => {
  const environment = {
    ...process.env,
    APPLE_SIGNING_IDENTITY: "placeholder-signing-identity",
    MACOS_NOTARY_PROFILE: "placeholder-notary-profile",
  };
  const before = await snapshotFiles(bundleRoot);

  const result = runMacReleaseDryRun(environment);

  const after = await snapshotFiles(bundleRoot);
  assert.equal(result.status, 0);
  assert.match(combinedOutput(result), /release dry-run is UNVERIFIED/);
  assert.deepEqual(after, before);
});

test("accepts a measured manifest under the package size guard", () => {
  const result = validateSizeManifest({
    sizeLimitBytes: 15 * 1024 * 1024,
    artifacts: [{ path: "MarkdownDesk.dmg", bytes: 1024 }],
  });

  assert.deepEqual(result, { valid: true, status: "VERIFIED" });
});

test("fails the size guard when a measured artifact exceeds the limit", () => {
  const result = validateSizeManifest({
    sizeLimitBytes: 15 * 1024 * 1024,
    artifacts: [{ path: "MarkdownDesk.dmg", bytes: 15 * 1024 * 1024 + 1 }],
  });

  assert.deepEqual(result, {
    valid: false,
    status: "FAILED",
    oversized: ["MarkdownDesk.dmg"],
  });
});

test("marks missing measurements as UNVERIFIED", () => {
  assert.deepEqual(validateSizeManifest({}), { valid: true, status: "UNVERIFIED" });
});

test("applies the format-specific 100 MiB budget to AppImage", () => {
  const result = validateSizeManifest({
    sizeLimitBytes: 15 * 1024 * 1024,
    artifacts: [
      { format: "appimage", path: "MarkdownDesk.AppImage", bytes: 90 * 1024 * 1024 },
      { format: "deb", path: "MarkdownDesk.deb", bytes: 5 * 1024 * 1024 },
    ],
  });

  assert.deepEqual(result, { valid: true, status: "VERIFIED" });
});

test("still fails an AppImage beyond the 100 MiB format budget", () => {
  const result = validateSizeManifest({
    sizeLimitBytes: 15 * 1024 * 1024,
    artifacts: [{ format: "appimage", path: "MarkdownDesk.AppImage", bytes: 101 * 1024 * 1024 }],
  });

  assert.deepEqual(result, {
    valid: false,
    status: "FAILED",
    oversized: ["MarkdownDesk.AppImage"],
  });
});

test("requires macOS release verification to assess the app executable after stapling", async () => {
  const script = await readFile(path.join(repoRoot, "scripts", "package.mjs"), "utf8");
  const functionBody = script.match(
    /function verifyAndNotarizeMacRelease\(appPath, dmgPath\) \{([\s\S]*?)\n\}/,
  )?.[1];

  assert.ok(functionBody, "verifyAndNotarizeMacRelease must remain source-visible");
  assert.match(
    functionBody,
    /runMacReleaseCommand\("xcrun", \["stapler", "staple", dmgPath\]\);[\s\S]*runMacReleaseCommand\("spctl", \[\s*"--assess",\s*"--type",\s*"execute",\s*"--verbose=4",\s*appPath,\s*\]\);/,
  );
});
