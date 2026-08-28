import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettingsProvider } from "./lib/SettingsContext";
import App from "./App";

// T11 toolbar iconography RED tests: every toolbar action button carries an
// SVG icon, an aria-label, and a native title tooltip. Text labels are
// dropped in favour of icons; the accessible name survives via aria-label.
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(null),
}));

function renderApp() {
  return render(
    <SettingsProvider>
      <App />
    </SettingsProvider>,
  );
}

const ICON_BUTTONS = [
  "open-button",
  "save-button",
  "save-as-button",
  "export-html-button",
  "print-pdf-button",
  "clear-recent-button",
  "theme-toggle",
  "editor-font-decrease",
  "editor-font-increase",
  "preview-font-decrease",
  "preview-font-increase",
] as const;

describe("toolbar iconography + tooltips (T11)", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  it.each(ICON_BUTTONS)(
    "%s renders an SVG icon with aria-label and title tooltip",
    (testId) => {
      renderApp();
      const button = screen.getByTestId(testId);
      expect(button.querySelector("svg")).not.toBeNull();
      // Icon-only buttons need an accessible name (aria-label preferred).
      expect(button.getAttribute("aria-label")).not.toBeNull();
      // Native tooltip: hovering shows the OS-level hint.
      expect(button.getAttribute("title")).not.toBeNull();
    },
  );

  it("mode buttons keep icons and tooltips alongside aria-pressed", () => {
    renderApp();
    for (const m of ["edit", "view", "split"]) {
      const button = screen.getByTestId(`mode-${m}`);
      expect(button.querySelector("svg")).not.toBeNull();
      expect(button.getAttribute("title")).not.toBeNull();
      expect(button.getAttribute("aria-label")).not.toBeNull();
    }
  });

  it("keeps the toolbar compact: icon buttons expose no visible text label", () => {
    renderApp();
    for (const testId of ICON_BUTTONS) {
      const button = screen.getByTestId(testId);
      const visibleText = button.textContent?.trim() ?? "";
      expect(visibleText).toBe("");
    }
  });

  it("removes group label captions (Mode/Theme/Editor/Preview) from the toolbar", () => {
    renderApp();
    expect(screen.queryByText("Mode")).toBeNull();
    expect(screen.queryByText("Theme")).toBeNull();
    expect(screen.queryByText("Editor")).toBeNull();
    expect(screen.queryByText("Preview")).toBeNull();
  });
});