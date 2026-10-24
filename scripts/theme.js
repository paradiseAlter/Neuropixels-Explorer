((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NeuropixelsTheme = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  "use strict";

  const STORAGE_KEY = "neuropixels-explorer-theme";
  const THEME_OPTIONS = ["dark", "light", "contrast", "system"];

  const PALETTES = Object.freeze({
    dark: Object.freeze({
      canvas: Object.freeze({
        background: "#1D3047",
        grid: "#30465F",
        axis: "#9BB1CC",
        text: "#B1C1D7",
        spike: "#dbe9f7",
        rate: "#86b8eb",
        rateFill: "rgba(87, 143, 197, .16)",
        amplitude: "rgba(155, 199, 238, .58)",
        acg: "#759bc1",
        template: "#acd0f2",
        selection: "#9fc6f1",
        overview: "rgba(103, 145, 185, .28)",
        overviewSelection: "rgba(159, 198, 241, .08)",
        refractory: "rgba(199, 104, 104, .10)"
      }),
      probe: Object.freeze({
        background: "#192B40",
        emptyText: "#68727d",
        headerText: "#b7c0ca",
        mutedText: "#63707c",
        panel: "#11161a",
        bandText: "rgba(233,238,243,.78)",
        bandBoundary: "rgba(255,255,255,.07)",
        channel: "#d5dde5",
        unopened: "#7e8790",
        focus: "#ffffff",
        focusLine: "rgba(255,255,255,.72)",
        lockedLine: "rgba(255,255,255,.38)",
        hoverRing: "#bdc7d0",
        lockedRing: "#e9eef3",
        badgeBackground: "rgba(8,10,12,.94)",
        badgeBorder: "#78838d",
        badgeText: "#e0e5ea",
        labelBackground: "rgba(9,11,13,.94)",
        labelBorder: "rgba(255,255,255,.72)",
        labelText: "#f1f4f7",
        depthText: "#64717e",
        bandAlpha: .28,
        bandActiveAlpha: .42,
        nonNeuralAlpha: .12,
        probes: ["#66A6D9", "#E5A14F", "#60B98C", "#B98BD4", "#D46F7E", "#85A869"]
      }),
      units: Object.freeze({
        primary: { trace: "#9fc6f1", rate: "#86b8eb", fill: "rgba(87, 143, 197, .16)" },
        comparisons: [
          { trace: "#e4b36f", rate: "#d69c51", fill: "rgba(214, 156, 81, .14)" },
          { trace: "#8fc7a7", rate: "#69ae88", fill: "rgba(105, 174, 136, .14)" },
          { trace: "#bea5df", rate: "#a78bd0", fill: "rgba(167, 139, 208, .14)" },
          { trace: "#e58c8c", rate: "#d36e6e", fill: "rgba(211, 110, 110, .14)" },
          { trace: "#75c6d8", rate: "#55aebf", fill: "rgba(85, 174, 191, .14)" },
          { trace: "#d889b4", rate: "#c46d9d", fill: "rgba(196, 109, 157, .14)" },
          { trace: "#b7c86f", rate: "#9daf51", fill: "rgba(157, 175, 81, .14)" },
          { trace: "#d08e67", rate: "#ba7149", fill: "rgba(186, 113, 73, .14)" },
          { trace: "#8ea9df", rate: "#718fc9", fill: "rgba(113, 143, 201, .14)" }
        ]
      })
    }),
    light: Object.freeze({
      canvas: Object.freeze({
        background: "#FFFFFF",
        grid: "#DFE6EF",
        axis: "#747e88",
        text: "#4c5661",
        spike: "#244f73",
        rate: "#21679d",
        rateFill: "rgba(33, 103, 157, .17)",
        amplitude: "rgba(34, 91, 139, .66)",
        acg: "#356f9f",
        template: "#174d78",
        selection: "#0b63b6",
        overview: "rgba(37, 101, 153, .25)",
        overviewSelection: "rgba(11, 99, 182, .10)",
        refractory: "rgba(178, 43, 43, .10)"
      }),
      probe: Object.freeze({
        background: "#FFFFFF",
        emptyText: "#68737e",
        headerText: "#26333e",
        mutedText: "#68737e",
        panel: "#eef1f4",
        bandText: "rgba(20,27,34,.82)",
        bandBoundary: "rgba(20,27,34,.15)",
        channel: "#46535f",
        unopened: "#737e88",
        focus: "#101820",
        focusLine: "rgba(16,24,32,.78)",
        lockedLine: "rgba(16,24,32,.46)",
        hoverRing: "#3f4c58",
        lockedRing: "#17232d",
        badgeBackground: "rgba(255,255,255,.96)",
        badgeBorder: "#667480",
        badgeText: "#17212a",
        labelBackground: "rgba(255,255,255,.97)",
        labelBorder: "rgba(20,29,37,.72)",
        labelText: "#111a22",
        depthText: "#58646f",
        bandAlpha: .34,
        bandActiveAlpha: .52,
        nonNeuralAlpha: .16,
        probes: ["#17689e", "#a65a00", "#16734e", "#774399", "#a53549", "#56711c"]
      }),
      units: Object.freeze({
        primary: { trace: "#216aa5", rate: "#155d91", fill: "rgba(21, 93, 145, .16)" },
        comparisons: [
          { trace: "#a95a00", rate: "#8c4a00", fill: "rgba(169, 90, 0, .14)" },
          { trace: "#14764f", rate: "#0e6442", fill: "rgba(20, 118, 79, .14)" },
          { trace: "#7b489d", rate: "#653783", fill: "rgba(123, 72, 157, .14)" },
          { trace: "#b33b50", rate: "#972e40", fill: "rgba(179, 59, 80, .14)" },
          { trace: "#087987", rate: "#066570", fill: "rgba(8, 121, 135, .14)" },
          { trace: "#9c4575", rate: "#82345f", fill: "rgba(156, 69, 117, .14)" },
          { trace: "#657b20", rate: "#536619", fill: "rgba(101, 123, 32, .14)" },
          { trace: "#a75428", rate: "#89431f", fill: "rgba(167, 84, 40, .14)" },
          { trace: "#405fa3", rate: "#334e88", fill: "rgba(64, 95, 163, .14)" }
        ]
      })
    }),
    contrast: Object.freeze({
      canvas: Object.freeze({
        background: "#000000",
        grid: "#3d3d3d",
        axis: "#c7c7c7",
        text: "#ffffff",
        spike: "#ffffff",
        rate: "#00d8ff",
        rateFill: "rgba(0, 216, 255, .20)",
        amplitude: "#00d8ff",
        acg: "#ffd800",
        template: "#ffffff",
        selection: "#00ffff",
        overview: "rgba(0, 216, 255, .34)",
        overviewSelection: "rgba(255, 255, 255, .14)",
        refractory: "rgba(255, 76, 76, .22)"
      }),
      probe: Object.freeze({
        background: "#000000",
        emptyText: "#ffffff",
        headerText: "#ffffff",
        mutedText: "#d0d0d0",
        panel: "#070707",
        bandText: "#ffffff",
        bandBoundary: "rgba(255,255,255,.38)",
        channel: "#ffffff",
        unopened: "#c8c8c8",
        focus: "#ffffff",
        focusLine: "#ffffff",
        lockedLine: "rgba(255,255,255,.75)",
        hoverRing: "#00ffff",
        lockedRing: "#ffffff",
        badgeBackground: "#000000",
        badgeBorder: "#ffffff",
        badgeText: "#ffffff",
        labelBackground: "#000000",
        labelBorder: "#ffffff",
        labelText: "#ffffff",
        depthText: "#ffffff",
        bandAlpha: .42,
        bandActiveAlpha: .68,
        nonNeuralAlpha: .22,
        probes: ["#00d8ff", "#ffd800", "#34ff9a", "#e38bff", "#ff6680", "#b8ff43"]
      }),
      units: Object.freeze({
        primary: { trace: "#00d8ff", rate: "#00ffff", fill: "rgba(0, 216, 255, .20)" },
        comparisons: [
          { trace: "#ffd800", rate: "#ffe866", fill: "rgba(255, 216, 0, .18)" },
          { trace: "#34ff9a", rate: "#7affb7", fill: "rgba(52, 255, 154, .18)" },
          { trace: "#e38bff", rate: "#efb9ff", fill: "rgba(227, 139, 255, .18)" },
          { trace: "#ff6680", rate: "#ff99aa", fill: "rgba(255, 102, 128, .18)" },
          { trace: "#5af4ff", rate: "#9af9ff", fill: "rgba(90, 244, 255, .18)" },
          { trace: "#ff83d1", rate: "#ffb5e3", fill: "rgba(255, 131, 209, .18)" },
          { trace: "#b8ff43", rate: "#d3ff8b", fill: "rgba(184, 255, 67, .18)" },
          { trace: "#ff9f45", rate: "#ffc17f", fill: "rgba(255, 159, 69, .18)" },
          { trace: "#9db8ff", rate: "#c0d0ff", fill: "rgba(157, 184, 255, .18)" }
        ]
      })
    })
  });

  function normalizePreference(value) {
    const normalized = String(value || "").toLowerCase();
    if (["high-contrast", "high contrast", "high_contrast"].includes(normalized)) return "contrast";
    return THEME_OPTIONS.includes(normalized) ? normalized : "system";
  }

  function resolveTheme(preference, systemDark = true) {
    const normalized = normalizePreference(preference);
    return normalized === "system" ? (systemDark ? "dark" : "light") : normalized;
  }

  class ThemeController {
    constructor({ root = typeof document !== "undefined" ? document.documentElement : null, storage = null, matchMedia = null } = {}) {
      this.root = root;
      this.storage = storage;
      this.listeners = new Set();
      this.media = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;
      let stored = null;
      try { stored = this.storage?.getItem(STORAGE_KEY); } catch { /* Device storage can be unavailable in restricted browser contexts. */ }
      this.preference = normalizePreference(stored);
      this.systemListener = () => { if (this.preference === "system") this.apply(); };
      this.media?.addEventListener?.("change", this.systemListener);
      this.apply(false);
    }

    snapshot() {
      const resolved = resolveTheme(this.preference, this.media?.matches ?? true);
      return { preference: this.preference, resolved, palette: PALETTES[resolved] };
    }

    apply(notify = true) {
      const snapshot = this.snapshot();
      if (this.root) {
        this.root.dataset.theme = snapshot.resolved;
        this.root.dataset.themePreference = snapshot.preference;
        this.root.style.colorScheme = snapshot.resolved === "light" ? "light" : "dark";
      }
      if (notify) this.listeners.forEach((listener) => listener(snapshot));
      return snapshot;
    }

    setPreference(value) {
      this.preference = normalizePreference(value);
      try { this.storage?.setItem(STORAGE_KEY, this.preference); } catch { /* Preference remains active for this page. */ }
      return this.apply();
    }

    onChange(listener, immediate = true) {
      if (typeof listener !== "function") return () => {};
      this.listeners.add(listener);
      if (immediate) listener(this.snapshot());
      return () => this.listeners.delete(listener);
    }

    destroy() {
      this.media?.removeEventListener?.("change", this.systemListener);
      this.listeners.clear();
    }
  }

  return { STORAGE_KEY, THEME_OPTIONS, PALETTES, normalizePreference, resolveTheme, ThemeController };
});
