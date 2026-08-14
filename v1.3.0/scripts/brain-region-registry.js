(() => {
  "use strict";

  const app = window.NeuropixelWorkflowV11;
  const registry = app?.registry;
  const experiment = registry?.get("experiment");
  if (!experiment || experiment.brainRegionPatched) return;

  experiment.brainRegionPatched = true;
  Object.assign(experiment.defaultData, {
    regionState: "EMPTY",
    regionFolderName: "No Legacy Table selected",
    regionFolderPath: "",
    regionSummary: "Select the Process / Legacy Table folder to discover unit-to-region CSV annotations.",
    regionFileCount: 0,
    regionCsvCount: 0,
    regionMappingCount: 0,
    regionExperimentCount: 0,
    regionCount: 0,
    regionCoordinateCount: 0,
    regionSourceFiles: [],
    regionCoordinateFiles: [],
    regionConflictCount: 0,
    regionGoodCoverage: null,
    regionAllCoverage: null,
    regionAppliedSignature: ""
  });

  const escape = registry.escapeHtml;
  const baseRender = experiment.render;

  function percentage(value) {
    if (value == null || value === "") return "—";
    return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}%` : "—";
  }

  function sourceFilesMarkup(items) {
    if (!items?.length) return `<p class="empty-list">No compatible region table detected.</p>`;
    return `<div class="region-source-list">${items.map((item, index) => `
      <div class="region-source-row ${index === 0 ? "primary" : "support"}">
        <span>${index === 0 ? "PRIMARY" : "MERGE"}</span>
        <strong title="${escape(item.name)}">${escape(item.name)}</strong>
        <em>${Number(item.annotatedRows || item.rows || 0).toLocaleString()} mapped rows</em>
      </div>`).join("")}</div>`;
  }

  experiment.render = (data) => {
    const ready = data.regionState === "READY";
    const tone = data.regionState === "ERROR" ? "error" : ready ? "ready" : data.regionState === "SCANNING" ? "loading" : "idle";
    const compact = ready
      ? `${Number(data.regionMappingCount).toLocaleString()} units · ${Number(data.regionCount).toLocaleString()} regions`
      : data.regionState === "SCANNING" ? "Inspecting CSV schemas" : data.regionState === "ERROR" ? "Configuration invalid" : "Not loaded";
    let markup = baseRender(data);
    const compactMarker = `\n      </div>\n\n      <div class="node-detail real-data-detail">`;
    markup = markup.replace(compactMarker, `
        <div><span>REGION MAP</span><strong class="tone-${escape(tone)}" title="${escape(data.regionFolderPath || data.regionSummary)}">${escape(compact)}</strong></div>${compactMarker}`);

    const coordinateFiles = data.regionCoordinateFiles || [];
    const coordinateText = coordinateFiles.length
      ? `${coordinateFiles[0].name} · ${Number(coordinateFiles[0].mappedRows || coordinateFiles[0].rows || 0).toLocaleString()} electrode rows`
      : "No electrode-coordinate reference detected";
    const regionSection = `
        <section class="detail-section brain-region-section" data-interactive>
          <div class="section-heading"><span>BRAIN REGION CONFIG</span><em class="tone-${escape(tone)}">${escape(data.regionState || "EMPTY")}</em></div>
          <button class="source-picker region-picker" type="button" data-node-action="choose-region-folder" ${data.regionState === "SCANNING" ? "disabled" : ""}>
            <span><small>PROCESS / LEGACY TABLE FOLDER</small><strong title="${escape(data.regionFolderPath || data.regionFolderName)}">${escape(data.regionFolderName)}</strong></span>
            <b>${ready ? "CHANGE FOLDER" : "SELECT FOLDER"}</b>
          </button>
          <p class="helper-text">This is a separate annotation source. KiloSort remains the spike source; the CSV supplies Experiment + Cluster → Brain Region metadata.</p>
          <div class="region-metrics">
            <div><span>MAPPED UNITS</span><strong>${Number(data.regionMappingCount).toLocaleString()}</strong></div>
            <div><span>EXPERIMENTS</span><strong>${Number(data.regionExperimentCount).toLocaleString()}</strong></div>
            <div><span>REGIONS</span><strong>${Number(data.regionCount).toLocaleString()}</strong></div>
            <div><span>GOOD COVERAGE</span><strong>${percentage(data.regionGoodCoverage)}</strong></div>
          </div>
          <p class="audit-conclusion">${escape(data.regionSummary)}</p>
          ${sourceFilesMarkup(data.regionSourceFiles)}
          <div class="region-coordinate-reference">
            <span>COORDINATE REFERENCE</span><strong title="${escape(coordinateText)}">${escape(coordinateText)}</strong>
          </div>
          <div class="region-config-footer">
            <span>${Number(data.regionCsvCount).toLocaleString()} CSV · ${Number(data.regionConflictCount).toLocaleString()} conflicts</span>
            <button type="button" data-node-action="clear-region-folder" ${ready || data.regionState === "ERROR" ? "" : "disabled"}>CLEAR REGION MAP</button>
          </div>
        </section>

`;
    const selectionMarker = `        <section class="detail-section real-selection-section" data-interactive>`;
    return markup.replace(selectionMarker, `${regionSection}${selectionMarker}`);
  };
})();
