import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
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
