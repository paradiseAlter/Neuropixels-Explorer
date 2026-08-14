(() => {
  "use strict";

  const scope = window.NeuropixelWorkflowV11 = window.NeuropixelWorkflowV11 || {};

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const port = (id, label, type, family = "data", accepts = [type], optional = false) => ({
    id, label, type, family, accepts, optional
  });

  const field = (label, value) => `
    <div class="field"><span>${escapeHtml(label)}</span><strong title="${escapeHtml(value)}">${escapeHtml(value)}</strong></div>`;

  function entityLabel(entities) {
    if (!entities?.length) return "None selected";
    const labels = entities.slice(0, 3).map((entity) => entity.label);
    return `${labels.join(", ")}${entities.length > 3 ? ` +${entities.length - 3}` : ""}`;
  }

  function outputLabel(outputs) {
    if (!outputs?.length) return "None available";
    return `${outputs.slice(0, 3).join(", ")}${outputs.length > 3 ? ` +${outputs.length - 3}` : ""}`;
  }

  function capabilityMarkup(outputs) {
    if (!outputs?.length) return `<p class="empty-list">Run a folder QC check to discover outputs.</p>`;
    return `<div class="capability-list">${outputs.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>`;
  }

  function auditMarkup(files) {
    if (!files?.length) return `<p class="empty-list">No folder has been checked.</p>`;
    return `<div class="audit-file-list" data-interactive>${files.slice(0, 24).map((item) => `
      <div class="audit-file ${escapeHtml(item.status)}">
        <i>${escapeHtml(item.status === "pass" ? "PASS" : item.status === "error" ? "ERROR" : item.status === "warn" ? "WARN" : "SKIP")}</i>
        <span title="${escapeHtml(item.path || item.name)}">${escapeHtml(item.name)}</span>
        <em>${escapeHtml(item.note)}</em>
      </div>`).join("")}${files.length > 24 ? `<p class="list-note">${files.length - 24} more entries are available in the Load Log.</p>` : ""}</div>`;
  }

  const definitions = [
    {
      type: "experiment",
      title: "Experiment Data",
      code: "DATA",
      category: "Core",
      accent: "#d6d6d9",
      widths: { compact: 304, detailed: 380 },
      description: "A lightweight Kilosort folder handle with structure QC and a collection of Units, Channels, or Templates.",
      inputs: [
        port("selection", "Selection feedback", "EntitySelection", "selection", ["EntitySelection", "Selection"]),
        port("context", "External context", "AnyData", "data", ["*"])
      ],
      outputs: [
        port("data", "Data handle", "DataHandle"),
        port("entities", "Entity collection", "NeuralCollection"),
        port("geometry", "Probe geometry", "SpatialData"),
        port("metadata", "Metadata table", "TableData"),
        port("qc", "QC report", "QCReport", "report")
      ],
      defaultData: {
        loaded: false,
        folderName: "No source selected",
        folderPath: "",
        fileCount: 0,
        audit: "NOT CHECKED",
        auditTone: "idle",
        entities: [],
        nextEntity: { Unit: 1, Channel: 1, Template: 1 },
        availableOutputs: [],
        auditFiles: [],
        auditSummary: "Choose one Kilosort results folder."
      },
      render(data) {
        const entities = data.entities || [];
        const outputs = data.availableOutputs || [];
        return `
          <div class="compact-summary">
            <div><span>STATUS</span><strong class="tone-${escapeHtml(data.auditTone)}">${escapeHtml(data.loaded ? data.audit : "NOT LOADED")}</strong></div>
            <div><span>EXPERIMENT</span><strong title="${escapeHtml(data.folderPath || data.folderName)}">${escapeHtml(data.folderName)}</strong></div>
            <div><span>ENTITIES</span><strong title="${escapeHtml(entityLabel(entities))}">${escapeHtml(entityLabel(entities))}</strong></div>
            <div><span>DATA</span><strong title="${escapeHtml(outputLabel(outputs))}">${escapeHtml(outputLabel(outputs))}</strong></div>
          </div>
          <div class="node-detail">
            <div class="detail-section source-section">
              <div class="section-heading"><span>KILOSORT SOURCE</span><em>STRUCTURE ONLY</em></div>
              <button class="source-picker" type="button" data-node-action="choose-folder">
                <span><small>RESULTS FOLDER</small><strong>${escapeHtml(data.folderName)}</strong></span>
                <b>SELECT FOLDER</b>
              </button>
              <p class="helper-text">The browser indexes file names and sizes here; array contents stay unloaded.</p>
            </div>

            <div class="detail-section">
              <div class="section-heading"><span>QC CHECK</span><em class="tone-${escapeHtml(data.auditTone)}">${escapeHtml(data.audit)}</em></div>
              <p class="audit-conclusion">${escapeHtml(data.auditSummary)}</p>
              ${auditMarkup(data.auditFiles)}
            </div>

            <div class="detail-section">
              <div class="section-heading"><span>ENTITY COLLECTION</span><em>${entities.length}</em></div>
              <div class="entity-list" data-interactive>
                ${entities.map((entity, index) => `
                  <div class="entity-row">
                    <span class="entity-kind">${escapeHtml(entity.kind)}</span>
                    <strong>${escapeHtml(entity.label)}</strong>
                    <button type="button" data-node-action="remove-entity" data-value="${index}" aria-label="Remove ${escapeHtml(entity.label)}">×</button>
                  </div>`).join("") || `<p class="empty-list">No entities selected.</p>`}
              </div>
              <div class="entity-add">
                <button type="button" data-node-action="add-entity" data-value="Unit">+ UNIT</button>
                <button type="button" data-node-action="add-entity" data-value="Channel">+ CHANNEL</button>
                <button type="button" data-node-action="add-entity" data-value="Template">+ TEMPLATE</button>
              </div>
            </div>

            <div class="detail-section">
              <div class="section-heading"><span>AVAILABLE OUTPUTS</span><em>${outputs.length}</em></div>
              ${capabilityMarkup(outputs)}
              ${field("FILES INDEXED", data.fileCount ? String(data.fileCount) : "—")}
            </div>
          </div>`;
      }
    },
    {
      type: "viewer",
      title: "Viewer",
      code: "VIEW",
      category: "Core",
      accent: "#78aee9",
      widths: { compact: 324, detailed: 620 },
      description: "One viewer with automatic Raster, Waveform, and Probe representations. All raster lanes share one TimeRange.",
      inputs: [
        port("primary", "Primary data", "AnyData", "data", ["*"]),
        port("compare", "Comparison data", "AnyData", "data", ["*"]),
        port("selection", "Entity selection", "EntitySelection", "selection", ["EntitySelection", "Selection"]),
        port("time", "Shared time range", "TimeRange", "time")
      ],
      outputs: [
        port("context", "View context", "ViewContext", "context"),
        port("selection", "Entity selection", "EntitySelection", "selection"),
        port("time", "Shared time range", "TimeRange", "time"),
        port("view", "View state", "ViewState", "view")
      ],
      defaultData: {
        mode: "Auto",
        resolvedMode: "Raster",
        sourceLabel: "Demo spike events",
        sourceState: "DEMO",
        sourceEntities: [
          { kind: "Unit", label: "Unit 14" },
          { kind: "Unit", label: "Unit 27" },
          { kind: "Unit", label: "Unit 41" },
          { kind: "Unit", label: "Unit 52" }
        ],
        availableOutputs: ["SpikeEvents", "UnitSet", "ProbeGeometry"],
        fullStart: 0,
        fullEnd: 60,
        viewStart: 8,
        viewEnd: 20,
        linkedTime: true,
        sourceSignature: "demo"
      },
      render(data) {
        const entities = data.sourceEntities || [];
        const resolved = data.mode === "Auto" ? `AUTO → ${data.resolvedMode.toUpperCase()}` : data.mode.toUpperCase();
        return `
          <div class="compact-summary viewer-summary">
            <div><span>REPRESENTATION</span><strong>${escapeHtml(resolved)}</strong></div>
            <div><span>SOURCE</span><strong title="${escapeHtml(data.sourceLabel)}">${escapeHtml(data.sourceLabel)}</strong></div>
            <div><span>LANES</span><strong>${entities.length} · LINKED TIME</strong></div>
            <div><span>RANGE</span><strong data-viewer-compact-range>${Number(data.viewStart).toFixed(2)}–${Number(data.viewEnd).toFixed(2)} s</strong></div>
          </div>
          <div class="node-detail viewer-detail">
            <div class="viewer-modebar" data-interactive>
              <div class="mode-tabs" role="group" aria-label="Viewer representation">
                ${["Auto", "Raster", "Waveform", "Probe"].map((mode) => `<button type="button" class="${data.mode === mode ? "active" : ""}" data-node-action="set-view-mode" data-value="${mode}">${mode}</button>`).join("")}
              </div>
              <div class="viewer-tools">
                <button type="button" data-viewer-action="zoom-out" title="Zoom shared time out">−</button>
                <button type="button" data-viewer-action="zoom-in" title="Zoom shared time in">+</button>
                <button type="button" data-viewer-action="reset" title="Reset shared time">RESET</button>
              </div>
            </div>
            <div class="viewer-status">
              <span><i class="source-dot ${escapeHtml(data.sourceState.toLowerCase())}"></i>${escapeHtml(data.sourceState)} SOURCE</span>
              <strong>${escapeHtml(resolved)}</strong>
              <em>BOX DRAG TO ZOOM ALL LANES</em>
            </div>
            <div class="viewer-stage" data-viewer-stage data-canvas-wheel-lock data-interactive>
              <canvas class="viewer-canvas" data-viewer-canvas aria-label="Synchronized neural data view"></canvas>
              <div class="viewer-selection" data-viewer-selection hidden></div>
            </div>
            <div class="viewer-footer">
              <span>Wheel: zoom at cursor · Drag a time box: zoom every lane · Double-click: reset</span>
              <strong data-viewer-range>${Number(data.viewStart).toFixed(2)}–${Number(data.viewEnd).toFixed(2)} s</strong>
            </div>
            <div class="context-note"><span>OUTPUT</span><p><strong>ViewContext</strong> = original DataHandle + entity selection + shared TimeRange. No neural array is copied through the Viewer.</p></div>
          </div>`;
      }
    },
    {
      type: "analyze",
      title: "Analyze",
      code: "AUTO",
      category: "Next",
      accent: "#76cf9f",
      widths: { compact: 298, detailed: 356 },
      description: "A reserved downstream analysis boundary. In 1.1.0 it documents contracts but does not execute an analysis.",
      inputs: [
        port("data", "Primary data", "AnyData", "data", ["*"]),
        port("context", "View context", "ViewContext", "context"),
        port("parameters", "Parameters", "Parameters", "parameters")
      ],
      outputs: [
        port("result", "Analysis result", "AnalysisResult"),
        port("features", "Features", "FeatureData"),
        port("table", "Result table", "TableData")
      ],
      defaultData: { method: "Not configured", state: "PLACEHOLDER" },
      render(data) {
        return `
          <div class="compact-summary">
            <div><span>METHOD</span><strong>${escapeHtml(data.method)}</strong></div>
            <div><span>STATE</span><strong>${escapeHtml(data.state)}</strong></div>
            <div><span>INPUT</span><strong>DataHandle or ViewContext</strong></div>
          </div>
          <div class="node-detail">
            <div class="placeholder-panel"><strong>ANALYSIS IS DEFERRED</strong><p>This node is kept to test routing. Viewer → Analyze passes a lightweight ViewContext, not rendered pixels or copied raw data.</p></div>
          </div>`;
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
    return null;
  }

  scope.registry = {
    definitions,
    get: (type) => byType.get(type),
    classifyConnection,
    escapeHtml
  };
})();
