(() => {
  "use strict";

  window.NeuropixelWorkflow = window.NeuropixelWorkflow || {};

  const bundleTypes = [
    "ExperimentBundle",
    "SynchronizedBundle",
    "ProcessedNeural",
    "AnalysisBundle",
    "QCResult",
    "PopulationResult",
    "RelationshipResult",
    "ModelResult",
    "ComparisonResult"
  ];

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const row = (label, value, extraClass = "") => `
    <div class="node-field ${extraClass}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>`;

  const definitions = [
    {
      type: "experiment-data",
      title: "Experiment Data",
      code: "DATA",
      category: "Essential",
      accent: "#d6d6d8",
      width: 286,
      description: "Loads one Kilosort recording folder and keeps unit, channel, template, geometry, and metadata selections together.",
      inputs: [],
      outputs: [{ id: "bundle", label: "Experiment", type: "ExperimentBundle" }],
      defaultData: {
        folderName: "No folder selected",
        fileCount: 0,
        auditState: "AWAITING FOLDER",
        auditTone: "idle",
        scope: "Units · all detected"
      },
      render(data) {
        return `
          <div class="source-summary">
            <div>
              <span class="node-overline">KILOSORT SOURCE</span>
              <strong class="source-name" title="${escapeHtml(data.folderName)}">${escapeHtml(data.folderName)}</strong>
            </div>
            <span class="node-state ${escapeHtml(data.auditTone)}">${escapeHtml(data.auditState)}</span>
          </div>
          <button class="node-action primary" type="button" data-node-action="choose-folder">Choose Kilosort folder</button>
          <div class="node-section">
            <div class="node-section-title"><span>Selection groups</span><button type="button" data-node-action="configure-selection">Configure</button></div>
            ${row("NEURAL ENTITIES", data.scope)}
            ${row("FILES INDEXED", data.fileCount ? `${data.fileCount}` : "—")}
          </div>`;
      }
    },
    {
      type: "auto-analysis",
      title: "Auto Analysis",
      code: "AUTO",
      category: "Essential",
      accent: "#84d6b0",
      width: 278,
      description: "Builds a transparent neural-analysis plan from the available Kilosort data. The execution engine is not implemented in this prototype.",
      inputs: [{ id: "data", label: "Experiment", type: "ExperimentBundle", accepts: ["ExperimentBundle", "SynchronizedBundle"] }],
      outputs: [{ id: "analysis", label: "Analysis", type: "AnalysisBundle" }],
      defaultData: { mode: "Auto" },
      render(data) {
        return `
          <div class="segmented-control" role="group" aria-label="Analysis mode">
            ${["Auto", "Guided", "Manual"].map((mode) => `<button type="button" class="${data.mode === mode ? "active" : ""}" data-node-action="set-mode" data-value="${mode}">${mode}</button>`).join("")}
          </div>
          <div class="analysis-plan">
            <div><span class="plan-index">01</span><span>Folder and schema audit</span><em>AUTO</em></div>
            <div><span class="plan-index">02</span><span>Unit QC and summary</span><em>AUTO</em></div>
            <div><span class="plan-index">03</span><span>Population overview</span><em>AUTO</em></div>
          </div>
          <p class="node-footnote">Plan is inspectable before execution.</p>`;
      }
    },
    {
      type: "neural-viewer",
      title: "Neural Viewer",
      code: "VIEW",
      category: "Essential",
      accent: "#8db7ed",
      width: 326,
      description: "A multi-mode neural viewer for rasters, traces, rates, waveforms, heatmaps, and embeddings with shared selection and time state.",
      inputs: [{ id: "data", label: "Neural data", type: "NeuralData", accepts: bundleTypes }],
      outputs: [{ id: "selection", label: "Selection", type: "ViewSelection" }],
      defaultData: { viewMode: "AUTO VIEW", linkGroup: "LINK A" },
      render(data) {
        return `
          <div class="viewer-toolbar">
            <button type="button" data-node-action="cycle-view">${escapeHtml(data.viewMode)}</button>
            <button type="button" data-node-action="cycle-link">${escapeHtml(data.linkGroup)}</button>
          </div>
          <div class="neural-preview" aria-label="Neural viewer placeholder">
            <span class="preview-axis"></span>
            <span class="spike-lane lane-one"></span>
            <span class="spike-lane lane-two"></span>
            <span class="spike-lane lane-three"></span>
            <span class="preview-cursor"></span>
          </div>
          <div class="viewer-status"><span>Waiting for executable neural data</span><strong>0–10 s</strong></div>`;
      }
    },
    {
      type: "spatial-viewer",
      title: "Spatial Viewer",
      code: "SPACE",
      category: "Essential",
      accent: "#d7a76d",
      width: 264,
      description: "Displays units, channels, or templates on Neuropixels shanks and later supports anatomy or atlas modes.",
      inputs: [{ id: "data", label: "Spatial entities", type: "SpatialData", accepts: ["ExperimentBundle", "AnalysisBundle", "QCResult", "PopulationResult"] }],
      outputs: [{ id: "selection", label: "Selection", type: "ViewSelection" }],
      defaultData: { mode: "PROBE", linkGroup: "LINK A" },
      render(data) {
        return `
          <div class="viewer-toolbar">
            <button type="button" data-node-action="cycle-space">${escapeHtml(data.mode)}</button>
            <button type="button" data-node-action="cycle-link">${escapeHtml(data.linkGroup)}</button>
          </div>
          <div class="probe-preview" aria-label="Four-shank probe placeholder">
            ${[0, 1, 2, 3].map((index) => `<span class="probe-shank shank-${index}"><i></i><b></b></span>`).join("")}
          </div>
          <div class="viewer-status"><span>4 shanks</span><strong>No entity selected</strong></div>`;
      }
    },
    {
      type: "synchronize",
      title: "Synchronize",
      code: "TIME",
      category: "Essential",
      accent: "#c2a1dd",
      width: 270,
      description: "Creates an explicit time mapping between neural recordings or event clocks. Video-specific synchronization is reserved for a later extension.",
      inputs: [
        { id: "primary", label: "Primary clock", type: "TimeData", accepts: ["ExperimentBundle", "ProcessedNeural"] },
        { id: "reference", label: "Reference clock", type: "TimeData", accepts: ["ExperimentBundle", "EventData", "ProcessedNeural"] }
      ],
      outputs: [{ id: "synced", label: "Synchronized", type: "SynchronizedBundle" }],
      defaultData: {},
      render() {
        return `
          <div class="sync-readout">
            ${row("METHOD", "Auto detect timestamps")}
            ${row("OFFSET", "Not estimated")}
            ${row("CLOCK DRIFT", "Not estimated")}
          </div>
          <p class="node-footnote">Runs only when two timebases are present.</p>`;
      }
    },
    {
      type: "compare",
      title: "Compare",
      code: "CMP",
      category: "Essential",
      accent: "#e0c86e",
      width: 276,
      description: "Compares two or more compatible recordings, neural groups, or analysis results without exposing separate merge, split, or pair-builder nodes.",
      inputs: [
        { id: "a", label: "Input A", type: "Comparable", accepts: bundleTypes },
        { id: "b", label: "Input B", type: "Comparable", accepts: bundleTypes }
      ],
      outputs: [{ id: "comparison", label: "Comparison", type: "ComparisonResult" }],
      defaultData: {},
      render() {
        return `
          ${row("MATCHING", "By recording and entity ID")}
          ${row("DISPLAY", "Side by side")}
          ${row("STATISTICS", "Descriptive only")}
          <button class="node-action" type="button" data-node-action="configure">Configure comparison</button>`;
      }
    },
    {
      type: "report-export",
      title: "Report & Export",
      code: "OUT",
      category: "Essential",
      accent: "#9fc3a4",
      width: 270,
      description: "Collects results, figures, workflow metadata, and provenance into exportable files or a report.",
      inputs: [{ id: "result", label: "Result", type: "AnyResult", accepts: bundleTypes }],
      outputs: [],
      defaultData: {},
      render() {
        return `
          <div class="export-grid">
            <span>TABLE</span><span>FIGURE</span><span>WORKFLOW</span><span>REPORT</span>
          </div>
          ${row("PROVENANCE", "Include")}
          ${row("STATUS", "Waiting for result")}
          <button class="node-action" type="button" data-node-action="configure">Choose outputs</button>`;
      }
    },
    {
      type: "preprocess",
      title: "Preprocess",
      code: "PRE",
      category: "Advanced",
      accent: "#8ea9c4",
      width: 276,
      description: "An ordered internal recipe for crop, filter, reference, bin, smooth, normalize, resample, and artifact handling.",
      inputs: [{ id: "data", label: "Neural data", type: "NeuralData", accepts: ["ExperimentBundle", "SynchronizedBundle", "ProcessedNeural"] }],
      outputs: [{ id: "processed", label: "Processed", type: "ProcessedNeural" }],
      defaultData: {},
      render() {
        return `
          <div class="recipe-stack">
            <div><span>01</span><strong>Bin spikes</strong><em>AUTO</em></div>
            <div><span>02</span><strong>Smooth activity</strong><em>AUTO</em></div>
            <button type="button" data-node-action="configure">+ Add operation</button>
          </div>`;
      }
    },
    {
      type: "quality-control",
      title: "Quality Control",
      code: "QC",
      category: "Advanced",
      accent: "#e08d7c",
      width: 274,
      description: "Runs unit quality, stability, waveform, and duplicate-risk checks as one transparent QC stage.",
      inputs: [{ id: "data", label: "Experiment", type: "ExperimentBundle", accepts: ["ExperimentBundle", "ProcessedNeural"] }],
      outputs: [{ id: "qc", label: "QC result", type: "QCResult" }],
      defaultData: {},
      render() {
        return `
          <div class="metric-list">
            <span>Firing rate</span><span>ISI violations</span>
            <span>Presence</span><span>Drift</span>
            <span>Waveform</span><span>Duplicate risk</span>
          </div>
          <p class="node-footnote">Thresholds remain inspectable and editable.</p>`;
      }
    },
    {
      type: "population-analysis",
      title: "Population Analysis",
      code: "POP",
      category: "Advanced",
      accent: "#7fc5cc",
      width: 276,
      description: "Builds a population representation and applies configurable dimensionality reduction or clustering methods.",
      inputs: [{ id: "data", label: "Neural data", type: "NeuralData", accepts: ["ExperimentBundle", "ProcessedNeural", "QCResult"] }],
      outputs: [{ id: "population", label: "Population", type: "PopulationResult" }],
      defaultData: {},
      render() {
        return `
          ${row("REPRESENTATION", "Binned firing rate")}
          ${row("REDUCTION", "PCA")}
          ${row("CLUSTERING", "Optional · off")}
          <button class="node-action" type="button" data-node-action="configure">Configure methods</button>`;
      }
    },
    {
      type: "relationship-analysis",
      title: "Relationship Analysis",
      code: "REL",
      category: "Advanced",
      accent: "#c39ac8",
      width: 284,
      description: "Groups correlation, CCG, cross-correlation, event-triggered, and GLM methods under one relationship-analysis stage.",
      inputs: [
        { id: "a", label: "Neural group A", type: "NeuralData", accepts: ["ExperimentBundle", "ProcessedNeural", "QCResult", "PopulationResult"] },
        { id: "b", label: "Neural group B", type: "NeuralData", accepts: ["ExperimentBundle", "ProcessedNeural", "QCResult", "PopulationResult"], optional: true }
      ],
      outputs: [{ id: "relationship", label: "Relationship", type: "RelationshipResult" }],
      defaultData: {},
      render() {
        return `
          ${row("METHOD", "Pairwise timing")}
          ${row("PAIR POLICY", "Within selection")}
          ${row("INTERPRETATION", "Descriptive")}
          <button class="node-action" type="button" data-node-action="configure">Configure analysis</button>`;
      }
    },
    {
      type: "model-decoder",
      title: "Model / Decoder",
      code: "MODEL",
      category: "Advanced",
      accent: "#a99ed8",
      width: 276,
      description: "Reserved for regression, classification, decoding, and neural-state prediction when labels or targets are available.",
      inputs: [
        { id: "features", label: "Features", type: "FeatureData", accepts: ["PopulationResult", "AnalysisBundle", "ProcessedNeural"] },
        { id: "target", label: "Target", type: "TargetData", accepts: ["AnalysisBundle", "ComparisonResult"], optional: true }
      ],
      outputs: [{ id: "model", label: "Model result", type: "ModelResult" }],
      defaultData: {},
      render() {
        return `
          ${row("TASK", "Not configured")}
          ${row("VALIDATION", "Held-out split required")}
          <p class="node-footnote">Inactive until a valid target is connected.</p>`;
      }
    },
    {
      type: "custom-plugin",
      title: "Custom Plugin",
      code: "DEV",
      category: "Advanced",
      accent: "#92959b",
      width: 274,
      description: "A future extension surface for project-specific analysis while preserving typed inputs, outputs, versioning, and worker execution.",
      inputs: [{ id: "input", label: "Typed input", type: "AnyData", accepts: ["*"] }],
      outputs: [{ id: "output", label: "Typed output", type: "AnyResult" }],
      defaultData: {},
      render() {
        return `
          <div class="plugin-placeholder">
            <strong>No plugin assigned</strong>
            <span>Definition · executor · renderer</span>
          </div>
          <button class="node-action" type="button" data-node-action="configure">Select definition</button>`;
      }
    }
  ];

  const byType = new Map(definitions.map((definition) => [definition.type, definition]));

  function canConnect(output, input) {
    if (!output || !input) return false;
    const accepted = input.accepts || [input.type];
    return accepted.includes("*") || accepted.includes(output.type) || input.type === output.type;
  }

  window.NeuropixelWorkflow.nodeRegistry = {
    definitions,
    get: (type) => byType.get(type),
    canConnect,
    escapeHtml
  };
})();
