import path from "node:path";

export const REQUIRED_BUNDLE_TARGETS = Object.freeze([
  "dmg",
  "nsis",
  "deb",
  "appimage",
]);

export const PACKAGE_SIZE_LIMIT_BYTES = 15 * 1024 * 1024;

const PACKAGING_PLANS = Object.freeze({
  darwin: {
    platform: "macos",
    bundles: ["dmg"],
    extensions: [".dmg"],
  },
  win32: {
    platform: "windows",
    bundles: ["nsis"],
    extensions: [".exe"],
  },
  linux: {
    platform: "linux",
    bundles: ["deb", "appimage"],
    extensions: [".deb", ".appimage"],
  },
});

export function getPackagingPlan(host = process.platform) {
  const plan = PACKAGING_PLANS[host];
  if (!plan) {
    throw new Error(
      `Unsupported packaging host "${host}". Supported hosts are macOS, Windows, and Linux; no foreign bundle will be fabricated.`,
    );
  }

  return {
    platform: plan.platform,
    bundles: [...plan.bundles],
    extensions: [...plan.extensions],
  };
}

export function artifactName(platform, format, fileName) {
  return `markdowndesk-${platform}-${format}-${fileName}`;
}

export function validateTauriConfig(config) {
  if (config?.bundle?.active !== true) {
    throw new Error("Tauri bundle.active must be true");
  }

  const targets = config.bundle.targets;
  if (!Array.isArray(targets)) {
    throw new Error(
      `Tauri bundle.targets must explicitly list ${REQUIRED_BUNDLE_TARGETS.join(", ")}; "all" is not an auditable target mapping`,
    );
  }

  const missing = REQUIRED_BUNDLE_TARGETS.filter((target) => !targets.includes(target));
  if (missing.length > 0) {
    throw new Error(`Tauri bundle.targets is missing: ${missing.join(", ")}`);
  }
}

function normalizedFileName(value) {
  return path.posix.basename(String(value).replaceAll("\\", "/"));
}

function normalizedExtension(value) {
  return path.posix.extname(normalizedFileName(value)).toLowerCase();
}

export function validateArtifactManifest(manifest, plan) {
  if (manifest?.platform !== plan.platform) {
    throw new Error(
      `Manifest platform ${JSON.stringify(manifest?.platform)} does not match ${plan.platform}`,
    );
  }

  if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length === 0) {
    throw new Error("Packaging manifest must contain at least one measured artifact");
  }

  const formats = new Set();
  for (const artifact of manifest.artifacts) {
    if (!plan.bundles.includes(artifact?.format)) {
      throw new Error(`Unexpected ${plan.platform} artifact format: ${artifact?.format}`);
    }
    if (formats.has(artifact.format)) {
      throw new Error(`Duplicate artifact format: ${artifact.format}`);
    }
    formats.add(artifact.format);

    const fileName = normalizedFileName(artifact.path);
    if (!fileName || normalizedExtension(fileName) !== plan.extensions[plan.bundles.indexOf(artifact.format)]) {
      throw new Error(`Artifact extension does not match ${artifact.format}: ${artifact.path}`);
    }
    if (artifact.name !== artifactName(plan.platform, artifact.format, fileName)) {
      throw new Error(`Artifact name does not match its format/path: ${artifact.name}`);
    }
    if (!Number.isSafeInteger(artifact.bytes) || artifact.bytes < 0) {
      throw new Error(`Artifact size is not a measured byte count: ${artifact.path}`);
    }
  }

  const missing = plan.bundles.filter((format) => !formats.has(format));
  if (missing.length > 0) {
    throw new Error(`Manifest is missing artifact formats: ${missing.join(", ")}`);
  }
}

export function validateSizeManifest(manifest) {
  const limit = manifest?.sizeLimitBytes;
  const artifacts = manifest?.artifacts;
  if (!Number.isSafeInteger(limit) || limit <= 0 || !Array.isArray(artifacts) || artifacts.length === 0) {
    return { valid: true, status: "UNVERIFIED" };
  }

  if (artifacts.some((artifact) => !Number.isSafeInteger(artifact?.bytes) || artifact.bytes < 0)) {
    return { valid: true, status: "UNVERIFIED" };
  }

  const oversized = artifacts
    .filter((artifact) => artifact.bytes > limit)
    .map((artifact) => artifact.path);
  if (oversized.length > 0) {
    return { valid: false, status: "FAILED", oversized };
  }

  return { valid: true, status: "VERIFIED" };
}
