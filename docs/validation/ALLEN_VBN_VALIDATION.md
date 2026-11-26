# Allen VBN public-data workflow

The annotation beta now has a reproducible path from Allen Visual Behavior
Neuropixels NWB files and matched camera recordings into Explorer. The small
public download manifest is versioned; neural recordings, videos, catalogs,
screenshots and analysis results stay outside Git.

This is a **head-fixed visual change-detection task**. Running, licking,
rewards, image changes and omissions are available. It is not a freely moving
grooming/sniffing ground-truth dataset. Anonymous video groups require review
under each laboratory's own definitions.

## Hit/miss response review, 2026-11-23

Session 1064644573, probeC: all 205 active image changes matched original
trial frames (79 hits, 123 misses, 3 automatic rewards). With 98 VISp Units
in ascending ID order, −0.5 to +1 s, 50 ms bins, shape normalization,
k=3 and seed 1, fitting on hits produced groups of 57, 11 and 24 Units and
6 unassigned constant profiles. All 593,880 Unit/trial/bin counts matched an
independent NWB calculation. Mean adjusted Rand index across eight event
splits was 0.374. Acquisition coverage was unavailable in the source.

In Chrome, Unit 1066256388 had 4 spikes in the first hit window and 3 in the
first miss window. Clicking those rows decoded frames at 134.545 and 232.147
video seconds on the original full-length side camera. Both conditions kept
the same 98 row identities on return. A fresh browser profile restored the
saved selection and these spike counts from the exported project.

A separate empty Chrome profile imported the original session NWB, selected
probeC (349 Units), attached the full 2,387,348,809-byte side camera video and
imported its matching frame-clock JSON. The browser verified the full video
SHA-256 in bounded chunks. Selecting a recorded image change at neural time
31.020 s sought to video time 28.686920 s.

## Corpus selection

`examples/allen-vbn/download-plan.json` selects four mice, two familiar/novel
sessions per mouse, with no abnormal activity/histology flags and at least five
probes. Selection uses metadata and anatomy coverage, not observed responses.
The official tutorial session anchors development.

| Mouse | Familiar | Novel | Intended partition |
| --- | --- | --- | --- |
| 544456 | 1064400234 | 1064644573 | Development |
| 541234 | 1062755779 | 1063010385 | Held out |
| 533539 | 1055240613 | 1055415082 | Validation |
| 530862 | 1052342277 | 1052533639 | Training |

The manifest contains 58 files / 60,185,417,099 bytes: eight NWBs, side/face
videos and their metadata/timestamps, plus the unit and channel metadata
tables. It does not include raw AP or LFP. Partitions keep paired sessions from
the same mouse together. Four mice are a development corpus, not evidence of
model generalization; no supervised behavior accuracy has been established.

Sources are pinned to Allen manifest v0.5.0. NWB delivery can use DANDI
000713 version 0.240702.1725, but completion requires the **primary Allen
whole-file BLAKE2b** to match. Raw-camera files retain their S3 ETags and local
SHA256; a matching single-part MD5 ETag supplies an additional check when
available. Files with incomplete ranges are never published under the final
filename.

## Download and preserve provenance

From this checkout, install the optional local analysis dependencies:

```powershell
python -m pip install -e ".[allen]"
$dataRoot = "X:/Datasets/Allen/visual-behavior-neuropixels"
python scripts/download_allen_dataset.py --plan examples/allen-vbn/download-plan.json --root $dataRoot --max-gb 80 --workers 16 --file-jobs 2 --chunk-mib 1
```

Choose an existing spacious drive for `X:`. Run only one downloader against a
given file at a time. Restart with the same plan, root and chunk size to resume.
The script caps file concurrency at three and total planned size at the supplied
budget. It uses no credentials or bucket-wide mirroring. Per-file receipts and
`<plan-name>-progress.json` distinguish completed files from cached ranges.
The manifest lists planned bytes; it is not a claim that a download finished.

## Prepare the multi-session demo

After the required files finish downloading:

```powershell
python scripts/prepare_allen_demo.py --root $dataRoot --plan examples/allen-vbn/download-plan.json --database "$dataRoot/explorer/catalog.sqlite" --workers 2
```

This fully decodes each side camera, prepares its clock, runs the V1 positive
control, and registers one physical probe per session. The probe with the most
original VISp units is chosen using anatomy alone; all its original units and
labels are retained. The other probes remain in the NWB for future import.
An explicit `--ready-only` processes completed sessions while downloads continue
and records the pending sessions. Re-running checks existing clocks and uses
already prepared entries. Face videos remain available for future analysis.

The optional real-browser corpus check uses `ALLEN_DATA_ROOT` and
`ALLEN_TEST_URL`, with Playwright/Chrome installed separately:

```powershell
$env:ALLEN_DATA_ROOT = $dataRoot
$env:ALLEN_TEST_URL = "http://127.0.0.1:8791/?database=1"
node tests/validate-allen-corpus-browser.cjs
```

## Import and synchronization

```powershell
$session = "1064644573"
$source = "$dataRoot/sources/v0.5.0/$session"
python scripts/build_allen_video_clock.py --video "$source/behavior_videos/side.mp4" --timestamps "$source/behavior_videos/side_timestamps.npy" --session-id $session --output "$dataRoot/side.clock.json"
python scripts/import_allen_probe.py --nwb "$source/ecephys_session_$session.nwb" --data-root $dataRoot --database "$dataRoot/explorer/catalog.sqlite" --probe probeC --video "$source/behavior_videos/side.mp4" --video-clock "$dataRoot/side.clock.json"
neuropixels-explorer validate-db --database "$dataRoot/explorer/catalog.sqlite"
neuropixels-explorer serve --database "$dataRoot/explorer/catalog.sqlite" --data-root $dataRoot --port 8791
```

The adapter exposes one physical probe per Recording. It preserves Allen unit
IDs, original good/noise labels, and peak-channel anatomical assignments.
Different probes are never renamed as shanks of one probe. The current browser
uses the KiloSort time contract, so the adapter writes float64 sample-equivalent
values using the original fitted probe sampling rate. Dividing by that rate
recovers NWB session seconds. These are derived input arrays, not new spike
sorting results or modified NWB sources. Unmapped channels remain unmapped.

The clock builder decodes every frame, checks frame count and monotonic PTS,
and associates it with the corresponding Allen exposure-start TTL. Missing
prefix/tail timestamps remain outside the map; interior missing timestamps
cause a visible failure rather than invented interpolation. Anchor compression
is checked against every measured timestamp with a 0.1 ms error ceiling.
This is reconstruction error relative to Allen timestamps, not an independent
measurement of hardware latency. The UI and annotation CSV use the same
invertible piecewise clock. CSV records `sync_method` and `sync_model`; its
offset/scale fields describe the summary fit, while mapped endpoints and the
JSON project carry the applied clock. Manual offset edits remove verified status.

## Confirmed corpus checks (2026-09-09)

All 58 planned files finished: 60,185,417,099 bytes. NWB sources contain
15,813 original units and 929,935,065 spikes in total. The demonstration catalog
exposes eight separate probeC recordings, 1,898 units and 109,445,803 spikes;
other physical probes remain available in the original NWBs.

The 16 side/face recordings contain 42.77 camera-hours, including two views of
the same sessions. All eight side cameras were fully decoded: 4,619,261 frames,
4,619,253 measured timestamps, with eight metadata images outside the clock.
Maximum timestamp reconstruction error was 0.09568 ms. Face-camera headers and
exposure counts were checked; full face-video decoding is not claimed.

Chrome checks passed for all eight recording switches, real activity overview,
and full-video seek at 20 minutes using the shared measured clock, with no page
errors. Each session's PSTH also passed three independent histogram checks.
Local source audits, preparation summaries, screenshots and analysis outputs
accompany the external corpus; they are not bundled in Git.

## Confirmed pilot checks

Session 1064644573, probeC (Allen probe 1064735073):

- 349 original units and 20,302,917 spikes entered the real Explorer catalog.
  Sample-to-seconds round-trip error was at most 1.82e-12 s. There are 347
  mapped units and two explicitly unmapped units. A separate check of three
  actual Explorer Unit APIs matched the original NWB spike counts and seconds
  to the same numerical tolerance.
- The full side camera has 572,798 decoded frames at 60 fps. Frame zero is a
  metadata image with no exposure timestamp. The other 572,797 frames match
  the official array. A global affine fit misses early dropped frames by up
  to 33.954 ms; the checked piecewise reconstruction stays within 0.082 ms.
- A 120-second prefix was remuxed without re-encoding. Its 7,200 frames were
  checked, with 7,199 valid timestamps and at most 0.00914 ms reconstruction
  error. Browser checks passed for neural/video seek, exact Unit expansion,
  manual review, CSV time export, candidate generation, and draft reload.
- The browser baseline generated 76 candidate intervals in four anonymous
  groups from this prefix. They remain suggestions. QA labels in screenshots
  are software-test records, not scientific annotations.

## Bounded analysis reproductions

```powershell
python scripts/analyze_allen_session.py --nwb "$source/ecephys_session_$session.nwb" --output "$dataRoot/analysis/$session"
python scripts/download_allen_ripple_subset.py --root "$dataRoot/published/ripple-2025" --sessions 1064644573 1064400234 1062755779 1063010385 1055240613 1055415082 1052342277 1052533639
python scripts/filter_allen_ripples.py --root $dataRoot --plan examples/allen-vbn/download-plan.json
```

1. **Official Allen V1 change-triggered PSTH.** The pilot uses the tutorial's
   `VISp`, SNR > 1, ISI violations < 1 and firing rate > 0.1 filters, active
   image changes, and 10 ms bins from -1 to +1.5 s. It yields 98 units and 205
   events. Independent histogram and searchsorted implementations agreed for
   three spread-out units. Mean baseline (-50 to 0 ms) was 2.3504 spikes/s;
   the 20–100 ms response was 10.9097 spikes/s. This is a single-session
   positive control, not a population inference or full Cell-figure replication.
2. **Published ripple-table reuse.** The selected OSF ZIP subset contains
   189 original gzip files, about 66 MB; ZIP CRC32 and individual SHA256 are
   recorded. No whole-archive checksum is claimed after range extraction.
   The authors' documented reuse recipe (power > 3 and < 10 SD, sharp-wave
   flag, no gamma/movement flags) retains 39,864 of 169,440 records across 33
   probe tables and eight sessions. These are probe events; the same
   physiological event can appear on several probes. All eight published
   global-event CSVs in this subset have malformed rows and are excluded with
   parser errors recorded. Originals are preserved; no rows are silently skipped.

For the Cell paper's state/change modulation analyses, sensory-cluster
selection, engagement and image matching, running controls and animal-level
statistics remain additional work. The authors' modulation denominator is
`max(abs(a), abs(b))`; replacing it with `a+b` would reproduce a different
quantity. Re-running the ripple detector also requires LFP, which this corpus
plan does not download. A movement-artifact flag is not a video behavior label.

## Publications, data terms and reproducibility limits

- [Allen VBN quickstart](https://allensdk.readthedocs.io/en/latest/_static/examples/nb/visual_behavior_neuropixels_quickstart.html)
  and [raw video / synchronization guide](https://allensdk.readthedocs.io/en/latest/_static/examples/nb/visual_behavior_neuropixels_raw_ephys_and_video_data_access.html).
- Bennett et al., *Map of spiking activity underlying change detection in the
  mouse visual system*, **Cell (2026)**,
  [doi:10.1016/j.cell.2026.06.025](https://doi.org/10.1016/j.cell.2026.06.025).
  [Author analysis repository](https://github.com/AllenInstitute/VBN-Manuscript),
  inspected at cf0d8a0046f0222954a1bf8d51b8ada1bc1d89f6. Its source is not
  bundled; no repository license was identified at that revision.
- Callaghan-Campbell & Murphy, *Mouse Hippocampal Sharp-Wave Ripple Dataset
  Curated From Public Neuropixels Datasets*, **Scientific Data (2025)**,
  [doi:10.1038/s41597-025-06115-0](https://doi.org/10.1038/s41597-025-06115-0).
  [OSF data](https://osf.io/9gm6x/),
  [author data-use documentation](https://github.com/AngCamp/CampbellMurphy2024/blob/main/Data_Usage/DATA_DOCUMENTATION.md).

Explorer's MIT license covers its code. It does not relicense external data,
papers, algorithms or installed binaries. DANDI's selected NWB archive declares
CC-BY-4.0. Raw camera data is obtained from a separate Allen bucket; retain the
[Allen terms](https://alleninstitute.org/terms-of-use/) and
[citation policy](https://alleninstitute.org/citation-policy/), including the
specific session/camera source when showing a demo. Do not assume that DANDI's
NWB license also covers separately hosted videos. Local receipts and source
metadata remain with the corpus for later publication review.
