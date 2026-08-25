((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NeuropixelsStreamExtensions = api;
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  "use strict";

  const RAW_VOLTAGE_CONTRACT_VERSION = "1.0";
  const RAW_VOLTAGE_STREAM_KINDS = Object.freeze(["raw_voltage", "ap", "lfp"]);

  function validateRawVoltageProvider(provider) {
    if (!provider || typeof provider !== "object") throw new TypeError("Raw-voltage provider must be an object");
    if (!String(provider.id || "").trim()) throw new TypeError("Raw-voltage provider requires a stable id");
    if (typeof provider.canOpen !== "function") throw new TypeError(`${provider.id}: canOpen(stream) is required`);
    if (typeof provider.open !== "function") throw new TypeError(`${provider.id}: open(stream, context) is required`);
    const kinds = provider.streamKinds?.length ? [...provider.streamKinds] : [...RAW_VOLTAGE_STREAM_KINDS];
    const invalid = kinds.filter((kind) => !RAW_VOLTAGE_STREAM_KINDS.includes(String(kind)));
    if (invalid.length) throw new TypeError(`${provider.id}: unsupported stream kind(s): ${invalid.join(", ")}`);
    return Object.freeze({ ...provider, id: String(provider.id).trim(), streamKinds: Object.freeze(kinds.map(String)) });
  }

  class RawVoltageExtensionRegistry {
    constructor() {
      this.contractVersion = RAW_VOLTAGE_CONTRACT_VERSION;
      this._providers = new Map();
    }

    register(provider) {
      const normalized = validateRawVoltageProvider(provider);
      if (this._providers.has(normalized.id)) throw new Error(`Raw-voltage provider already registered: ${normalized.id}`);
      this._providers.set(normalized.id, normalized);
      return () => this._providers.delete(normalized.id);
    }

    providers() {
      return [...this._providers.values()];
    }

    resolve(stream) {
      if (!stream || !RAW_VOLTAGE_STREAM_KINDS.includes(String(stream.streamKind || stream.stream_kind || ""))) return null;
      return this.providers().find((provider) => provider.streamKinds.includes(String(stream.streamKind || stream.stream_kind)) && provider.canOpen(stream)) || null;
    }

    async open(stream, context = {}) {
      const provider = this.resolve(stream);
      if (!provider) throw new Error("No raw-voltage provider can open this stream");
      const reader = await provider.open(stream, context);
      if (!reader || typeof reader.readWindow !== "function" || typeof reader.close !== "function") {
        throw new TypeError(`${provider.id}: open() must return { readWindow(request), close() }`);
      }
      return reader;
    }
  }

  const rawVoltage = new RawVoltageExtensionRegistry();

  return {
    RAW_VOLTAGE_CONTRACT_VERSION,
    RAW_VOLTAGE_STREAM_KINDS,
    RawVoltageExtensionRegistry,
    validateRawVoltageProvider,
    rawVoltage
  };
});
