(() => {
  "use strict";

  window.NeuropixelWorkflowV1 = window.NeuropixelWorkflowV1 || {};

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const port = (id, label, type, family = "data", accepts = [type], optional = false) => ({
    id, label, type, family, accepts, optional
  });

  const field = (label, value) => `<div class="field"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;

  const definitions = [
    {
      type: "experiment",
      title: "Experiment Data",
      code: "DATA",
      category: "Essential",
      accent: "#d3d3d6",
      widths: { compact: 188, standard: 270, expanded: 360 },
      description: "One flexible Kilosort source can hold one entity or many Units, Channels, and Templates.",
      inputs: [
        port("selection", "Selection feedback", "Selection", "selection"),
        port("context", "Context", "AnyData", "data", ["*"]) 
      ],
      outputs: [
        port("data", "Smart data", "ExperimentData"),
        port("units", "Units", "NeuralEntities"),
        port("channels", "Channels", "NeuralEntities"),
        port("templates", "Templates", "NeuralEntities"),
        port("geometry", "Geometry", "SpatialData"),
        port("metadata", "Metadata", "TableData")
      ],
      defaultData: {
        folderName: "No folder selected",
        fileCount: 0,
        audit: "AWAITING SOURCE",
        auditTone: "idle",
        entities: [
          { kind: "Unit", label: "Unit 14" },
          { kind: "Unit", label: "Unit 27" }
        ],
        nextEntity: 28
      },
      render(data) {
        const entities = data.entities || [];
        return `
          <div class="node-summary">
            <span>${escapeHtml(data.folderName)}</span>
            <strong>${entities.length} ENTIT${entities.length === 1 ? "Y" : "IES"}</strong>
          </div>
          <div class="node-detail">
            <div class="source-card">
              <div><small>KILOSORT SOURCE</small><strong title="${escapeHtml(data.folderName)}">${escapeHtml(data.folderName)}</strong></div>
              <em class="tone-${escapeHtml(data.auditTone)}">${escapeHtml(data.audit)}</em>
            </div>
            <button class="wide-action" type="button" data-node-action="choose-folder">Choose Kilosort folder</button>
            <div class="section-head"><span>ENTITY COLLECTION</span><strong>${entities.length}</strong></div>
            <div class="entity-list">
              ${entities.map((entity, index) => `
                <div class="entity-row">
                  <span class="entity-kind">${escapeHtml(entity.kind)}</span>
                  <strong>${escapeHtml(entity.label)}</strong>
                  <button type="button" data-node-action="remove-entity" data-value="${index}" aria-label="Remove ${escapeHtml(entity.label)}">×</button>
                </div>`).join("") || `<p class="empty-list">No entities selected.</p>`}
            </div>
            <div class="entity-add">
              <button type="button" data-node-action="add-entity" data-value="Unit">+ Unit</button>
              <button type="button" data-node-action="add-entity" data-value="Channel">+ Channel</button>
              <button type="button" data-node-action="add-entity" data-value="Template">+ Template</button>
            </div>
            ${field("FILES INDEXED", data.fileCount || "—")}
          </div>`;
      }
    },
    {
      type: "analyze",
      title: "Analyze",
      code: "AUTO",
      category: "Essential",
      accent: "#77d3a5",
      widths: { compact: 184, standard: 266, expanded: 340 },
      description: "A transparent smart analysis node that accepts raw, processed, selected, or previous analysis data.",
      inputs: [
        port("data", "Primary data", "AnyData", "data", ["*"]),
        port("aux", "Auxiliary data", "AnyData", "data", ["*"]),
        port("selection", "Selection", "Selection", "selection"),
        port("parameters", "Parameters", "Parameters", "parameters")
      ],
      outputs: [
        port("result", "Analysis result", "AnalysisResult"),
        port("features", "Features", "FeatureData"),
        port("table", "Result table", "TableData"),
        port("selection", "Result selection", "Selection", "selection")
      ],
      defaultData: { mode: "Auto", method: "Neural overview" },
      render(data) {
        return `
          <div class="node-summary"><span>${escapeHtml(data.method)}</span><strong>${escapeHtml(data.mode)}</strong></div>
          <div class="node-detail">
            <div class="segmented">
              ${["Auto", "Guided", "Manual"].map((mode) => `<button type="button" class="${data.mode === mode ? "active" : ""}" data-node-action="set-mode" data-value="${mode}">${mode}</button>`).join("")}
            </div>
            ${field("ANALYSIS GOAL", data.method)}
            <div class="plan-list">
              <span><i>01</i>Schema and provenance audit<em>AUTO</em></span>
              <span><i>02</i>Unit and population summary<em>AUTO</em></span>
              <span><i>03</i>Choose compatible result views<em>AUTO</em></span>
            </div>
            <button class="wide-action" type="button" data-node-action="cycle-analysis">Change analysis goal</button>
          </div>`;
      }
    },
    {
      type: "viewer",
      title: "Universal Viewer",
      code: "VIEW",
      category: "Essential",
      accent: "#7faee8",
      widths: { compact: 194, standard: 310, expanded: 430 },
      description: "A general viewer that accepts Experiment Data directly or any downstream analysis result.",
      inputs: [
        port("view-a", "View input A", "AnyData", "data", ["*"]),
        port("view-b", "View input B", "AnyData", "data", ["*"]),
        port("view-c", "View input C", "AnyData", "data", ["*"]),
        port("view-d", "View input D", "AnyData", "data", ["*"]),
        port("selection", "Selection", "Selection", "selection"),
        port("time", "Time state", "TimeState", "time")
      ],
      outputs: [
        port("selection", "Selection", "Selection", "selection"),
        port("time", "Time range", "TimeState", "time"),
        port("view", "View state", "ViewState", "view"),
        port("render", "Rendered result", "RenderResult")
      ],
      defaultData: { mode: "AUTO", link: "LINK A" },
      render(data) {
        return `
          <div class="node-summary"><span>GENERAL DATA VIEW</span><strong>${escapeHtml(data.mode)}</strong></div>
          <div class="node-detail">
            <div class="viewer-actions">
              <button type="button" data-node-action="cycle-view">${escapeHtml(data.mode)} VIEW</button>
              <button type="button" data-node-action="cycle-link">${escapeHtml(data.link)}</button>
            </div>
            <div class="universal-preview">
              <span class="view-grid"></span>
              <span class="trace trace-a"></span>
              <span class="trace trace-b"></span>
              <span class="spikes"></span>
              <i></i>
            </div>
            <div class="viewer-foot"><span>Raw data · analysis · tables · selections</span><strong>4 DATA INPUTS</strong></div>
          </div>`;
      }
    },
    {
      type: "spatial-viewer",
      title: "Spatial Viewer",
      code: "SPACE",
      category: "Essential",
      accent: "#d4a168",
      widths: { compact: 178, standard: 248, expanded: 318 },
      description: "A general spatial view for units, channels, templates, geometry, or analysis overlays.",
      inputs: [
        port("data", "Spatial or smart data", "AnyData", "data", ["*"]),
        port("overlay", "Overlay", "AnyData", "data", ["*"]),
        port("selection", "Selection", "Selection", "selection")
      ],
      outputs: [
        port("selection", "Spatial selection", "Selection", "selection"),
        port("geometry", "Geometry", "SpatialData"),
        port("view", "View state", "ViewState", "view")
      ],
      defaultData: { mode: "PROBE", link: "LINK A" },
      render(data) {
        return `
          <div class="node-summary"><span>4-SHANK SPACE</span><strong>${escapeHtml(data.mode)}</strong></div>
          <div class="node-detail">
            <div class="viewer-actions"><button type="button" data-node-action="cycle-space">${escapeHtml(data.mode)}</button><button type="button" data-node-action="cycle-link">${escapeHtml(data.link)}</button></div>
            <div class="probe-preview">${[0,1,2,3].map((n) => `<span class="shank s${n}"><i></i><b></b></span>`).join("")}</div>
            <div class="viewer-foot"><span>Unit · Channel · Template</span><strong>SMART INPUT</strong></div>
          </div>`;
      }
    },
    {
      type: "preprocess",
      title: "Preprocess",
      code: "PRE",
      category: "Advanced",
      accent: "#91aac4",
      widths: { compact: 176, standard: 252, expanded: 326 },
      description: "An adaptive internal recipe for filtering, binning, smoothing, normalization, and artifact handling.",
      inputs: [
        port("data", "Data", "AnyData", "data", ["*"]),
        port("mask", "Mask or selection", "Selection", "selection", ["Selection", "AnyData"]),
        port("parameters", "Parameters", "Parameters", "parameters")
      ],
      outputs: [
        port("data", "Processed data", "ProcessedData"),
        port("table", "Process table", "TableData"),
        port("mask", "Output mask", "Selection", "selection")
      ],
      defaultData: {},
      render() {
        return `<div class="node-summary"><span>ADAPTIVE RECIPE</span><strong>2 STEPS</strong></div><div class="node-detail"><div class="recipe"><span><i>01</i>Bin or resample<em>AUTO</em></span><span><i>02</i>Smooth or filter<em>AUTO</em></span><button type="button" data-node-action="configure">+ Add operation</button></div></div>`;
      }
    },
    {
      type: "quality-control",
      title: "Quality Control",
      code: "QC",
      category: "Advanced",
      accent: "#db8977",
      widths: { compact: 176, standard: 252, expanded: 326 },
      description: "Unit quality, stability, waveform, and duplicate-risk checks in one stage.",
      inputs: [port("data", "Data", "AnyData", "data", ["*"]), port("rules", "QC rules", "Parameters", "parameters")],
      outputs: [port("result", "QC result", "AnalysisResult"), port("kept", "Kept selection", "Selection", "selection"), port("rejected", "Rejected selection", "Selection", "selection"), port("table", "QC table", "TableData")],
      defaultData: {},
      render() {
        return `<div class="node-summary"><span>UNIT AUDIT</span><strong>6 METRICS</strong></div><div class="node-detail"><div class="metric-grid"><span>Rate</span><span>ISI</span><span>Presence</span><span>Drift</span><span>Waveform</span><span>Duplicate</span></div>${field("THRESHOLDS", "Inspectable")}</div>`;
      }
    },
    {
      type: "population",
      title: "Population Analysis",
      code: "POP",
      category: "Advanced",
      accent: "#73c0c7",
      widths: { compact: 182, standard: 258, expanded: 334 },
      description: "Population matrices, PCA, other embeddings, clustering, and state representations.",
      inputs: [port("data", "Data", "AnyData", "data", ["*"]), port("selection", "Selection", "Selection", "selection"), port("parameters", "Parameters", "Parameters", "parameters")],
      outputs: [port("result", "Population result", "AnalysisResult"), port("features", "Features", "FeatureData"), port("embedding", "Embedding", "FeatureData"), port("labels", "Labels", "Selection", "selection"), port("table", "Result table", "TableData")],
      defaultData: { method: "PCA" },
      render(data) {
        return `<div class="node-summary"><span>POPULATION STATE</span><strong>${escapeHtml(data.method)}</strong></div><div class="node-detail">${field("REPRESENTATION", "Binned activity")}${field("REDUCTION", data.method)}${field("CLUSTERING", "Optional")}<button class="wide-action" type="button" data-node-action="cycle-population">Change method</button></div>`;
      }
    },
    {
      type: "relationship",
      title: "Relationship Analysis",
      code: "REL",
      category: "Advanced",
      accent: "#bd91c2",
      widths: { compact: 184, standard: 264, expanded: 344 },
      description: "Correlation, CCG, cross-correlation, event-triggered, and model-based relationships.",
      inputs: [port("a", "Input A", "AnyData", "data", ["*"]), port("b", "Input B", "AnyData", "data", ["*"]), port("context", "Context", "AnyData", "data", ["*"]), port("parameters", "Parameters", "Parameters", "parameters")],
      outputs: [port("result", "Relationship result", "AnalysisResult"), port("pairs", "Pair selection", "Selection", "selection"), port("table", "Result table", "TableData"), port("features", "Features", "FeatureData")],
      defaultData: { method: "Pairwise timing" },
      render(data) {
        return `<div class="node-summary"><span>RELATIONSHIP</span><strong>${escapeHtml(data.method)}</strong></div><div class="node-detail">${field("METHOD", data.method)}${field("PAIR POLICY", "Auto from inputs")}${field("INTERPRETATION", "Descriptive")}<button class="wide-action" type="button" data-node-action="cycle-relationship">Change method</button></div>`;
      }
    },
    {
      type: "compare",
      title: "Compare",
      code: "CMP",
      category: "Essential",
      accent: "#dac269",
      widths: { compact: 176, standard: 252, expanded: 330 },
      description: "A multi-input comparison surface for raw data, selections, analyses, tables, or rendered views.",
      inputs: [port("a", "Input A", "AnyData", "data", ["*"]), port("b", "Input B", "AnyData", "data", ["*"]), port("c", "Input C", "AnyData", "data", ["*"]), port("d", "Input D", "AnyData", "data", ["*"])],
      outputs: [port("result", "Comparison", "AnalysisResult"), port("table", "Comparison table", "TableData"), port("selection", "Selection", "Selection", "selection"), port("render", "Comparison view", "RenderResult")],
      defaultData: {},
      render() {
        return `<div class="node-summary"><span>MULTI-INPUT</span><strong>4 SOURCES</strong></div><div class="node-detail">${field("MATCHING", "Smart by provenance")}${field("DISPLAY", "Side by side")}${field("STATISTICS", "Descriptive")}<button class="wide-action" type="button" data-node-action="configure">Configure comparison</button></div>`;
      }
    },
    {
      type: "report",
      title: "Report & Export",
      code: "OUT",
      category: "Essential",
      accent: "#98bea0",
      widths: { compact: 174, standard: 246, expanded: 318 },
      description: "Collects any data, analysis, table, selection, or rendered view into exportable results.",
      inputs: [port("a", "Result A", "AnyData", "data", ["*"]), port("b", "Result B", "AnyData", "data", ["*"]), port("c", "Result C", "AnyData", "data", ["*"]), port("view", "Rendered view", "ViewState", "view", ["ViewState", "RenderResult", "*"])],
      outputs: [port("manifest", "Manifest", "TableData"), port("report", "Report", "RenderResult")],
      defaultData: {},
      render() {
        return `<div class="node-summary"><span>OUTPUT BUNDLE</span><strong>LOCAL</strong></div><div class="node-detail"><div class="export-grid"><span>TABLE</span><span>FIGURE</span><span>WORKFLOW</span><span>REPORT</span></div>${field("PROVENANCE", "Included")}</div>`;
      }
    },
    {
      type: "custom",
      title: "Custom Plugin",
      code: "DEV",
      category: "Advanced",
      accent: "#92959b",
      widths: { compact: 174, standard: 248, expanded: 330 },
      description: "A versioned extension point with several universal inputs and outputs.",
      inputs: [port("a", "Input A", "AnyData", "data", ["*"]), port("b", "Input B", "AnyData", "data", ["*"]), port("selection", "Selection", "Selection", "selection"), port("parameters", "Parameters", "Parameters", "parameters")],
      outputs: [port("data", "Data", "AnyData"), port("result", "Result", "AnalysisResult"), port("table", "Table", "TableData"), port("selection", "Selection", "Selection", "selection")],
      defaultData: {},
      render() {
        return `<div class="node-summary"><span>PLUGIN SURFACE</span><strong>UNASSIGNED</strong></div><div class="node-detail"><div class="plugin-box"><strong>No plugin assigned</strong><span>definition · executor · renderer</span></div><button class="wide-action" type="button" data-node-action="configure">Choose definition</button></div>`;
      }
    }
  ];

  const byType = new Map(definitions.map((definition) => [definition.type, definition]));

  function classifyConnection(output, input) {
    if (!output || !input) return null;
    const accepted = input.accepts || [input.type];
    if (output.type === input.type || accepted.includes(output.type)) return "exact";
    if (accepted.includes("*")) return "smart";
    if (output.family === input.family) return "smart";
    if (input.family === "data" && ["data", "selection", "view", "time"].includes(output.family)) return "smart";
    return null;
  }

  window.NeuropixelWorkflowV1.registry = {
    definitions,
    get: (type) => byType.get(type),
    classifyConnection,
    escapeHtml
  };
})();
