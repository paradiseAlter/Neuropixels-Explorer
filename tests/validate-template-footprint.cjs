"use strict";
const assert = require("node:assert/strict");
const vm = require("node:vm");
const core = require("../scripts/kilosort-core.js");
const ui = require("../scripts/template-footprint.js");
function npy(values, shape, fortran = false) {
  let header = `{'descr': '<f8', 'fortran_order': ${fortran ? "True" : "False"}, 'shape': (${shape.join(", ")}${shape.length === 1 ? "," : ""}), }`;
  header += " ".repeat((64 - (10 + header.length + 1) % 64) % 64) + "\n";
  const bytes = Buffer.alloc(10 + header.length + values.length * 8);
  bytes.set([147,78,85,77,80,89,1,0]); bytes.writeUInt16LE(header.length,8); bytes.write(header,10,"latin1");
  values.forEach((v,i) => bytes.writeDoubleLE(v,10+header.length+i*8));
  return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
}
function fixture() { return {spikeClusters:npy([7,7,7,7,8],[5]),spikeTimes:npy([0,1,2,3,4],[5]),spikeTemplates:npy([1,0,1,0,1],[5]),templates:npy([0,2,-3,4,1,0,0,1,2,0,0,3],[2,3,2]),channelPositions:npy([0,0,20,100],[2,2]),channelMap:npy([31,4],[2]),templateIndices:npy([0,1,0,1],[2,2]),channelShanks:npy([0,1],[2])}; }
const input = fixture(), copies = Object.fromEntries(Object.entries(input).map(([k,v]) => [k,Buffer.from(v).toString("hex")]));
const result = core.buildTemplateFootprint(input,1000,7);
assert.equal(result.status,"available"); assert.equal(result.templateId,0);
assert.deepEqual([result.templateSpikeCount,result.unitSpikeCount,result.templateCount],[2,4,2]);
assert.deepEqual(result.channels.map(c=>c.channelId),[31,4]);
assert.deepEqual(result.channels.map(c=>c.peakToPeak),[4,4]);
assert.deepEqual(result.channels[0].waveform,[0,-3,1]);
assert.equal(result.channels[0].depthUm,0);
assert.equal(result.amplitudeUnit,"stored");
assert.deepEqual(core.analyzeUnitBuffers(input,1000,7).templateFootprint,result);
assert.deepEqual(core.buildTemplateFootprint({...input, templates:npy([0,0,-3,2,1,0,2,1,4,0,0,3],[2,3,2],true),channelPositions:npy([0,20,0,100],[2,2],true)},1000,7),result);
for(const [k,v] of Object.entries(input)) assert.equal(Buffer.from(v).toString("hex"),copies[k]);
for(const [key,value,status] of [
  ["templates",null,"missing_templates"],["channelPositions",null,"missing_geometry"],
  ["spikeTemplates",npy([0,1],[2]),"invalid_assignments"],
  ["templateIndices",npy([1,0,0,1],[2,2]),"unsupported_layout"],
  ["channelMap",npy([4,4],[2]),"invalid_channel_map"],
  ["templates",npy([0,2,NaN,4,1,0,0,1,2,0,0,3],[2,3,2]),"invalid_values"]
]) assert.equal(core.buildTemplateFootprint({...input,[key]:value},1000,7).status,status);
assert.equal(core.buildTemplateFootprint(input,1000,99).status,"no_spikes");
const geometry = ui.geometry([...result.channels,{index:2,xUm:null,depthUm:null,peakToPeak:0}]);
assert.equal(geometry.points.length,2); assert.equal(geometry.points[0].y,232);
assert(geometry.points.every(c=>Number.isFinite(c.x+c.y+c.radius)));
for(const lang of ["en","zh-CN","es"]) {
  const html=ui.render(result,1,lang);
  assert(html.includes('value="1" selected'));
  assert(html.includes("0.002") === false); // 2 samples / 1 kHz = 2 ms
  assert(html.includes(ui.words(lang).note));
}
// Worker source must contain all dependencies of the new analysis path.
const sandbox={self:{},Map,Uint8Array,Float32Array,Float64Array,Int16Array,Int32Array,Uint32Array,DataView,TextDecoder,ArrayBuffer,console};
vm.runInNewContext(core.createWorkerSource(),sandbox);
assert.equal(typeof sandbox.self.onmessage,"function");
console.log("PASS: dense template mapping, dominant-template provenance, exact amplitudes, missing/invalid sources, shared-scale renderer and worker dependencies");
