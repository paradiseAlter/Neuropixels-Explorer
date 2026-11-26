# Third-party methods and evaluation material

## Bundled browser NWB reader

The standalone HTML uses the h5wasm 0.10.3 JavaScript API and source files from
the official npm package. Its native WebAssembly runtime was rebuilt separately
against HDF5 2.2.0 from the pinned upstream sources and recipe recorded in
`docs/development/DEVELOPMENT.md`; it is not the npm tarball's original native
runtime. The npm tarball SHA-1 `fd58a1cdcbc27d21bf639d65d00fce9948238141`
identifies only the upstream 0.10.3 package inputs. Source:
https://github.com/usnistgov/h5wasm . The distributed notices are preserved in
`vendor/h5wasm/LICENSE.txt` and `vendor/h5wasm/NATIVE-NOTICES.txt` and embedded
in the generated HTML.
No research recordings or videos are included in the application HTML.

## Video clock verification

The standalone HTML includes the SHA-256 build from [hash-wasm 4.12.0](https://www.npmjs.com/package/hash-wasm/v/4.12.0) to verify full video files in bounded chunks. The wrapper's MIT license and the SHA-256 implementation's notice are in `vendor/hash-wasm/LICENSE.txt` and accompany the standalone build.

## Prior annotation evaluation

Checked for the annotation beta on 2026-09-08. The repository itself is MIT
licensed. A repository's public availability does not replace its license.
No third-party model weights, software source trees or experimental videos are
included in this release.

| Component | License / terms | How used |
| --- | --- | --- |
| Explorer `motion-kmeans/1` | MIT, authored in this repository | Browser motion/appearance features, k-means++ initialization, Lloyd iterations and temporal consolidation. A research baseline, not a reproduced ethology model. |
| scikit-learn 1.5.2 | BSD-3-Clause | Optional, separately installed KMeans and Ward comparison in `scripts/behavior_candidates.py`; not required by the browser UI. |
| NumPy / SciPy | BSD-3-Clause | NumPy is an existing service dependency; optional feature comparisons also use the installed scientific Python stack. |
| Keypoint-MoSeq | Harvard non-commercial research and academic-use software terms | Not installed, bundled or run. An independently written adapter reads separately generated CSV results. Installing/running the upstream software remains subject to its terms. |
| DeepLabCut official open-field example | Distributed in the upstream DeepLabCut repository; repository LGPL-3.0 terms apply to its software | A public sample video was downloaded solely into ignored local evaluation output. The beta does not redistribute the video, DLC software or weights, and makes no independent claim about separate media rights. |
| Playwright | Apache-2.0 | Optional development dependency for browser smoke checks; not loaded into the product. |

Primary upstream sources:

- [scikit-learn license](https://github.com/scikit-learn/scikit-learn/blob/1.5.2/COPYING)
- [NumPy license](https://github.com/numpy/numpy/blob/v2.0.1/LICENSE.txt)
- [SciPy license](https://github.com/scipy/scipy/blob/v1.13.1/LICENSE.txt)
- [Keypoint-MoSeq license](https://github.com/dattalab/keypoint-moseq/blob/main/LICENSE.md)
- [DeepLabCut open-field example](https://deeplabcut.github.io/DeepLabCut/examples/COLAB/COLAB_DEMO_mouse_openfield.html)
- [DeepLabCut license](https://github.com/DeepLabCut/DeepLabCut/blob/main/LICENSE)
- [Playwright license](https://github.com/microsoft/playwright/blob/main/LICENSE)

The optional dependencies retain their own notices. Any future redistribution
of their source, binaries or weights must carry the corresponding terms; this
file does not relicense them under MIT.

## Allen validation material (2026-09-09)

The versioned example manifest contains public identifiers and download URLs;
no neural payloads, camera images, manuscript source trees or model weights
are redistributed. The selected DANDI NWB archive declares CC-BY-4.0. The
separately hosted camera files retain the Allen Institute terms and citation
policy; this project does not assume their license is the same as the NWB
archive. Published ripple tables remain external OSF data, with their source
and individual extraction hashes recorded locally.

The VBN-Manuscript repository was inspected at
`cf0d8a0046f0222954a1bf8d51b8ada1bc1d89f6`; no repository license was identified,
so its software is not incorporated. The local analysis examples are separate
implementations of the documented calculations. Optional h5py, pandas,
matplotlib, requests and PyAV installations retain their own package and
transitive binary notices; they are not relicensed or bundled here.

See [the data/method citations and scope](docs/validation/ALLEN_VBN_VALIDATION.md),
[Allen terms](https://alleninstitute.org/terms-of-use/), and
[Allen citation policy](https://alleninstitute.org/citation-policy/).
