import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = JSON.parse(
  readFileSync("src-tauri/tauri.conf.json", "utf8"),
) as {
  app?: {
    security?: {
      csp?: string;
    };
  };
  bundle?: {
    fileAssociations?: Array<{
      ext: string[];
      name?: string;
      role?: string;
      rank?: string;
      mimeType?: string;
    }>;
  };
};

const capability = JSON.parse(
  readFileSync("src-tauri/capabilities/default.json", "utf8"),
) as {
  permissions?: Array<
    | string
    | {
        identifier: string;
        allow?: Array<{ url: string }>;
      }
  >;
};

const WINDOW_STATE_PERMISSIONS = [
  "core:window:allow-set-size",
  "core:window:allow-set-position",
  "core:window:allow-outer-size",
  "core:window:allow-outer-position",
  "core:window:allow-is-maximized",
  "core:window:allow-maximize",
  "core:window:allow-unmaximize",
] as const;

function cspDirectives(): Record<string, string> {
  return Object.fromEntries(
    (config.app?.security?.csp ?? "").split(";").map((directive) => {
      const [name, ...sources] = directive.trim().split(/\s+/);
      return [name, sources.join(" ")];
    }),
  );
}

describe("Tauri CSP", () => {
  it("disallows inline styles while preserving required Tauri origins", () => {
    const directives = cspDirectives();

    expect(directives["style-src"]).toBe("'self'");
    expect(directives["connect-src"]).toContain("ipc: http://ipc.localhost");
    expect(directives["img-src"]).toContain("data: asset: http://asset.localhost");
  });

  it("keeps executable and document-embedding capabilities explicitly locked down", () => {
    const directives = cspDirectives();
    const policy = config.app?.security?.csp ?? "";

    expect(directives["default-src"]).toBe("'self'");
    expect(directives["script-src"]).toBe("'self'");
    expect(directives["style-src"]).toBe("'self'");
    expect(directives["object-src"]).toBe("'none'");
    expect(directives["base-uri"]).toBe("'none'");
    expect(directives["form-action"]).toBe("'none'");
    expect(policy).not.toMatch(/'unsafe-(?:inline|eval)'/);
  });
});

describe("Tauri file associations", () => {
  it("registers Markdown documents as editable macOS file types", () => {
    const association = config.bundle?.fileAssociations?.find((item) =>
      item.ext.includes("md"),
    );

    expect(association).toMatchObject({
      ext: ["md", "markdown"],
      name: "Markdown Document",
      role: "Editor",
      rank: "Default",
      mimeType: "text/markdown",
    });
  });
});

describe("Tauri window capabilities", () => {
  it("allows only the window state commands needed by useWindowState", () => {
    const permissions = capability.permissions ?? [];
    const identifiers = permissions.map((permission) =>
      typeof permission === "string" ? permission : permission.identifier,
    );
    const windowPermissions = identifiers.filter((identifier) =>
      identifier.startsWith("core:window:"),
    );

    expect(identifiers).toContain("core:default");
    expect(windowPermissions).toEqual(WINDOW_STATE_PERMISSIONS);
    expect(identifiers).not.toContain("core:window:default");
    expect(identifiers).not.toContain("core:window:allow-all");

    expect(permissions).toContainEqual({
      identifier: "opener:allow-open-url",
      allow: [
        { url: "http://*" },
        { url: "https://*" },
        { url: "mailto:*" },
      ],
    });
  });
});
