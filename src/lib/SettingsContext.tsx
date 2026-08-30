import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  clampSplitRatio,
  type Settings,
  type Theme,
  type WindowState,
} from "./settings";

export interface SettingsContextValue {
  settings: Settings;
  loaded: boolean;
  setTheme: (theme: Theme) => void;
  setEditorFontSize: (size: number) => void;
  setPreviewFontSize: (size: number) => void;
  setWindowState: (windowState: WindowState) => void;
  setSplitRatio: (ratio: number) => void;
}

// Default context lets <App /> render standalone (e.g. in existing tests)
// with default settings and no-op setters.
const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  setTheme: () => {},
  setEditorFontSize: () => {},
  setPreviewFontSize: () => {},
  setWindowState: () => {},
  setSplitRatio: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // Load persisted settings once on startup.
  useEffect(() => {
    let cancelled = false;
    loadSettings().then((loadedSettings) => {
      if (cancelled) return;
      setSettings(loadedSettings);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on every change (after the initial load).
  useEffect(() => {
    if (!loaded) return;
    saveSettings(settings);
  }, [settings, loaded]);

  // Apply theme + font sizes to the document root immediately.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.style.setProperty("--editor-font-size", `${settings.editorFontSize}px`);
    root.style.setProperty("--preview-font-size", `${settings.previewFontSize}px`);
  }, [settings]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      loaded,
      setTheme: (theme) => setSettings((prev) => ({ ...prev, theme })),
      setEditorFontSize: (size) => setSettings((prev) => ({ ...prev, editorFontSize: size })),
      setPreviewFontSize: (size) => setSettings((prev) => ({ ...prev, previewFontSize: size })),
      setWindowState: (windowState) => setSettings((prev) => ({ ...prev, windowState })),
      setSplitRatio: (ratio) =>
        setSettings((prev) => ({ ...prev, splitRatio: clampSplitRatio(ratio) })),
    }),
    [settings, loaded],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
