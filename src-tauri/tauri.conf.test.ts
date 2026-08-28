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
