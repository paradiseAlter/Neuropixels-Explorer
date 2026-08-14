(() => {
  "use strict";

  const registry = window.NeuropixelWorkflowV11?.registry;
  const experiment = registry?.get("experiment");
  if (!experiment || experiment.entityTypesPatched) return;

  experiment.entityTypesPatched = true;
  experiment.description = "A lightweight Kilosort folder handle with Units, Clusters, Channels, Templates, and Brain Region selections.";
  experiment.defaultData.nextEntity = {
    ...(experiment.defaultData.nextEntity || {}),
    Cluster: 1,
    "Brain Region": 1
  };

  const typedOutputs = [
    {
      id: "clusters",
      label: "Cluster collection",
      type: "ClusterSet",
      family: "data",
      accepts: ["ClusterSet"],
      optional: false
    },
    {
      id: "regions",
      label: "Brain regions",
      type: "BrainRegionSet",
      family: "data",
      accepts: ["BrainRegionSet"],
      optional: false
    }
  ];

  const entityOutputIndex = experiment.outputs.findIndex((output) => output.id === "entities");
  typedOutputs.reverse().forEach((output) => {
    if (!experiment.outputs.some((item) => item.id === output.id)) {
      experiment.outputs.splice(entityOutputIndex + 1, 0, output);
    }
  });

  const baseRender = experiment.render.bind(experiment);
  experiment.render = (data) => {
    const base = baseRender(data);
    const templateButton = `<button type="button" data-node-action="add-entity" data-value="Template">+ TEMPLATE</button>`;
    if (!base.includes(templateButton)) return base;

    const extendedButtons = `${templateButton}
                <button type="button" data-node-action="add-entity" data-value="Cluster">+ CLUSTER</button>
                <button type="button" data-node-action="add-entity" data-value="Brain Region">+ BRAIN REGION</button>`;

    return base
      .replace(`<div class="entity-add">`, `<div class="entity-add entity-add-extended">`)
      .replace(templateButton, extendedButtons)
      .replace(
        `              </div>
            </div>

            <div class="detail-section">
              <div class="section-heading"><span>AVAILABLE OUTPUTS</span>`,
        `              </div>
              <p class="entity-contract-note"><strong>Cluster</strong> is a spike-assignment group; <strong>Unit</strong> is the analysis or curated interpretation. <strong>Brain Region</strong> remains manual or atlas-mapped metadata until a mapping source is connected.</p>
            </div>

            <div class="detail-section">
              <div class="section-heading"><span>AVAILABLE OUTPUTS</span>`
      );
  };
})();
