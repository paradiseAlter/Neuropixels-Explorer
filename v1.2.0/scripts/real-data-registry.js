(() => {
  "use strict";

  const app = window.NeuropixelWorkflowV11;
  const registry = app?.registry;
  const experiment = registry?.get("experiment");
  if (!experiment || experiment.realDataPatched) return;

  experiment.realDataPatched = true;
  experiment.widths = { compact: 320, detailed: 446 };
  experiment.description = "A lazy multi-experiment Kilosort catalog. It indexes many result folders, then loads only selected Unit or Cluster spike vectors in a background worker.";
  Object.assign(experiment.defaultData, {
    folderName: "No source selected",
    folderPath: "",
    catalogState: "EMPTY",
    catalogSummary: "Select one Kilosort result folder or a parent containing many experiments.",
    catalogCount: 0,
    catalogBytes: 0,
    catalogItems: [],
    selectedExperiment: "",
    selectionType: "unit",
    selectedCluster: "",
    unitOptions: [],
    residentExperiments: [],
    residentBytes: 0,
    loadedUnitSummaries: [],
    workerState: "IDLE"
  });

  const escape = registry.escapeHtml;

  function bytes(value) {
    const size = Number(value) || 0;
    if (!size) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const order = Math.min(units.length - 1, Math.floor(Math.log(size) / Math.log(1024)));
    return `${(size / 1024 ** order).toFixed(order > 1 ? 2 : 0)} ${units[order]}`;
  }

  function outputLabel(outputs) {
    if (!outputs?.length) return "None available";
    return `${outputs.slice(0, 3).join(", ")}${outputs.length > 3 ? ` +${outputs.length - 3}` : ""}`;
  }

  function entityLabel(entities) {
    if (!entities?.length) return "None selected";
    const labels = entities.slice(0, 2).map((entity) => entity.label);
    return `${labels.join(", ")}${entities.length > 2 ? ` +${entities.length - 2}` : ""}`;
  }

  function optionMarkup(items, selected, emptyLabel) {
    if (!items?.length) return `<option value="">${escape(emptyLabel)}</option>`;
    return items.map((item) => `<option value="${escape(item.id)}" ${String(item.id) === String(selected) ? "selected" : ""}>${escape(item.label)}</option>`).join("");
  }

  function capabilityMarkup(outputs) {
    if (!outputs?.length) return `<p class="empty-list">Index a Kilosort source to discover typed outputs.</p>`;
    return `<div class="capability-list">${outputs.map((item) => `<span>${escape(item)}</span>`).join("")}</div>`;
  }

  experiment.render = (data) => {
    const entities = data.entities || [];
    const outputs = data.availableOutputs || [];
    const experiments = data.catalogItems || [];
    const units = data.unitOptions || [];
    const loaded = data.loadedUnitSummaries || [];
    const ready = data.catalogState === "READY";
    const stateTone = data.catalogState === "ERROR" ? "error" : ready ? "ready" : data.catalogState === "INDEXING" ? "loading" : "idle";
    const compactSource = data.catalogCount ? `${data.catalogCount} experiments · ${bytes(data.catalogBytes)}` : "No catalog";

    return `
      <div class="compact-summary">
        <div><span>STATUS</span><strong class="tone-${escape(stateTone)}">${escape(data.catalogState || "EMPTY")}</strong></div>
        <div><span>SOURCE</span><strong title="${escape(data.folderPath || data.folderName)}">${escape(data.folderName)}</strong></div>
        <div><span>CATALOG</span><strong>${escape(compactSource)}</strong></div>
        <div><span>VIEWER DATA</span><strong title="${escape(entityLabel(loaded))}">${escape(loaded.length ? entityLabel(loaded) : "Nothing loaded")}</strong></div>
      </div>

      <div class="node-detail real-data-detail">
        <section class="detail-section source-section">
          <div class="section-heading"><span>KILOSORT SOURCE</span><em>LAZY INDEX</em></div>
          <button class="source-picker" type="button" data-node-action="choose-folder">
            <span><small>RESULTS ROOT OR ONE EXPERIMENT</small><strong>${escape(data.folderName)}</strong></span>
            <b>SELECT FOLDER</b>
          </button>
          <p class="helper-text">Catalog metadata is read immediately. Large NPY arrays stay on disk until one Unit or Cluster is requested.</p>
        </section>

        <section class="detail-section">
          <div class="section-heading"><span>CATALOG HEALTH</span><em class="tone-${escape(stateTone)}">${escape(data.catalogState || "EMPTY")}</em></div>
          <div class="real-catalog-metrics">
            <div><span>EXPERIMENTS</span><strong>${Number(data.catalogCount) || 0}</strong></div>
            <div><span>INDEXED SIZE</span><strong>${bytes(data.catalogBytes)}</strong></div>
            <div><span>ARRAYS RESIDENT</span><strong>${(data.residentExperiments || []).length}/3</strong></div>
          </div>
          <p class="audit-conclusion">${escape(data.catalogSummary)}</p>
        </section>

        <section class="detail-section real-selection-section" data-interactive>
          <div class="section-heading"><span>REAL DATA SELECTION</span><em>${escape(data.workerState || "IDLE")}</em></div>
          <label class="real-select-field">
            <span>EXPERIMENT</span>
            <select data-real-control="experiment" ${ready ? "" : "disabled"}>
              ${optionMarkup(experiments, data.selectedExperiment, "No indexed experiment")}
            </select>
          </label>
          <div class="real-select-pair">
            <label class="real-select-field">
              <span>SEMANTICS</span>
              <select data-real-control="selection-type" ${ready ? "" : "disabled"}>
                <option value="unit" ${data.selectionType === "unit" ? "selected" : ""}>Unit · KSLabel good</option>
                <option value="cluster" ${data.selectionType === "cluster" ? "selected" : ""}>Cluster · all assignments</option>
              </select>
            </label>
            <label class="real-select-field">
              <span>UNIT / CLUSTER ID</span>
              <select data-real-control="cluster" ${units.length ? "" : "disabled"}>
                ${optionMarkup(units, data.selectedCluster, data.selectionType === "unit" ? "No good unit" : "No cluster")}
              </select>
            </label>
          </div>
          <div class="real-loader-actions">
            <button type="button" data-node-action="real-add-unit" ${ready && units.length ? "" : "disabled"}>ADD TO VIEWER</button>
            <button type="button" data-node-action="real-clear-units" ${loaded.length ? "" : "disabled"}>CLEAR LOADED</button>
          </div>
          <p class="real-selection-note">Each added lane keeps a lightweight spike-time vector. Every connected Viewer uses one shared TimeRange.</p>
        </section>

        <section class="detail-section">
          <div class="section-heading"><span>LOADED VIEWER LANES</span><em>${loaded.length}</em></div>
          <div class="real-unit-list" data-interactive>
            ${loaded.map((item) => `
              <div class="real-unit-row">
                <i class="quality-${escape(item.quality || "unknown")}"></i>
                <span><strong>${escape(item.label)}</strong><small>${Number(item.spikeCount).toLocaleString()} spikes · ${Number(item.rateHz).toFixed(2)} Hz</small></span>
                <button type="button" data-node-action="real-remove-unit" data-value="${escape(item.key)}" aria-label="Remove ${escape(item.label)}">×</button>
              </div>`).join("") || `<p class="empty-list">No real spike lane has been loaded.</p>`}
          </div>
        </section>

        <section class="detail-section">
          <div class="section-heading"><span>MANUAL / FUTURE ENTITIES</span><em>${entities.length}</em></div>
          <div class="entity-list" data-interactive>
            ${entities.map((entity, index) => `
              <div class="entity-row">
                <span class="entity-kind">${escape(entity.kind)}</span>
                <strong>${escape(entity.label)}</strong>
                <button type="button" data-node-action="remove-entity" data-value="${index}" aria-label="Remove ${escape(entity.label)}">×</button>
              </div>`).join("") || `<p class="empty-list">No manual entity selected.</p>`}
          </div>
          <div class="entity-add entity-add-extended">
            ${["Unit", "Cluster", "Channel", "Template", "Brain Region"].map((kind) => `<button type="button" data-node-action="add-entity" data-value="${escape(kind)}">+ ${escape(kind.toUpperCase())}</button>`).join("")}
          </div>
          <p class="entity-contract-note"><strong>Unit</strong> means a curated analysis entity; <strong>Cluster</strong> is the spike assignment ID. Brain Region remains metadata until an atlas mapping source is connected.</p>
        </section>

        <section class="detail-section">
          <div class="section-heading"><span>AVAILABLE OUTPUTS</span><em>${outputs.length}</em></div>
          ${capabilityMarkup(outputs)}
          <div class="field"><span>FILES INDEXED</span><strong>${Number(data.fileCount) || "—"}</strong></div>
          <div class="field"><span>WORKER CACHE</span><strong>${bytes(data.residentBytes)}</strong></div>
        </section>
      </div>`;
  };
})();
