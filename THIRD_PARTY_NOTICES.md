# Third-party methods and evaluation material

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
