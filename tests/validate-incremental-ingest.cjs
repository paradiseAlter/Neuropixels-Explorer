"use strict";

const fs = require("node:fs");
const path = require("node:path");
const statusApi = require("../scripts/data-status.js");
const databaseClient = require("../scripts/database-client.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const databaseRecording = databaseClient.normalizeRecording({
  recording_id: "rec_01",
  recording_index: 1,
  legacy_kilosort_folder: "ks4_exp1",
  sample_rate_hz: 30000,
  recording_duration_s: 10,
  spike_count: 3,
  indexed_byte_size: 1024,
  asset_count: 3,
  assetRoles: ["spike_times", "spike_clusters", "spike_templates"],
  assets: [
    { asset_id: 1, asset_role: "spike_times", filename: "spike_times.npy", availability_status: "available" },
    { asset_id: 2, asset_role: "spike_clusters", filename: "spike_clusters.npy", availability_status: "available" },
    { asset_id: 3, asset_role: "spike_templates", filename: "spike_templates.npy", availability_status: "available" },
    { asset_id: 4, asset_role: "templates", filename: "templates.npy", availability_status: "missing" }
  ],
  units: [{ unit_id: "rec_01_unit_0007", cluster_id: 7, spike_count: 3, kilosort_label: "good" }]
});

assert(databaseRecording.capabilities.spikes, "A missing template must not disable the basic spike view");
assert(!databaseRecording.capabilities.template, "A Template view requires both templates.npy and spike_templates.npy");
const status = statusApi.buildDataStatus([databaseRecording], null, []);
const templates = status.missing.find((item) => item.key === "template");
assert(templates, "Template should be reported as missing");
assert(templates.missingRecordings.length === 1, "The missing Recording should be named");
assert(templates.missingRecordings[0].files.length === 1, "Only the absent templates.npy should be requested");
assert(templates.missingRecordings[0].files[0].filename === "templates.npy", "The exact missing filename should be shown");
assert(templates.missingRecordings[0].files[0].roles[0] === "templates", "The ingest role should be explicit");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "scripts", "explorer-shell.html"), "utf8");
const app = fs.readFileSync(path.join(root, "scripts", "app.js"), "utf8");
const service = fs.readFileSync(path.join(root, "server", "neuropixels_explorer", "ingest.py"), "utf8");
assert(html.includes('id="supplement-file-input"') && html.includes('id="supplement-folder-input"'), "Both supplement pickers must be local assets");
assert(app.includes("captureOpenUnitViews") && app.includes("refreshAffectedOpenUnits"), "Open Units and time windows must be restored after ingest");
assert(service.includes("BEGIN IMMEDIATE") && service.includes("connection.rollback()"), "Database registration must be transactional");
assert(service.includes("managed-assets") && !service.includes("sqlite3.Binary"), "Large files must remain outside SQLite");

console.log(JSON.stringify({
  status: "PASS",
  missingTemplate: templates.missingRecordings[0],
  spikeViewStillAvailable: databaseRecording.capabilities.spikes,
  transactionalRegistration: true
}, null, 2));
