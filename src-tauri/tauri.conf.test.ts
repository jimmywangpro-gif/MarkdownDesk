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
