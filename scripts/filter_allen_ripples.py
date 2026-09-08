"""Apply the published ripple dataset's reuse recipe to selected Allen sessions.

Preserves original tables. Counts are probe events, not deduplicated SWRs.
SPDX-License-Identifier: MIT
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import numpy as np
import pandas as pd


def run(root: Path, plan_path: Path):
    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    summary, issues = [], []
    for session in plan["sessions"]:
        sid = str(session["ecephys_session_id"])
        folder = root / "published/ripple-2025" / f"swrs_session_{sid}"
        tables = sorted(folder.glob("*putative_swr_events.csv.gz"))
        if not tables:
            raise ValueError(f"No published probe tables for session {sid}")
        for path in tables:
            data = pd.read_csv(path)
            for column in ["sw_exceeds_threshold", "overlaps_with_gamma", "overlaps_with_movement"]:
                if data[column].dtype != bool:
                    raise ValueError(f"Expected boolean {column} in {path.name}")
            valid = (np.isfinite(data.start_time) & np.isfinite(data.end_time) & (data.end_time > data.start_time)
                     & np.isclose(data.duration, data.end_time - data.start_time, atol=1e-8))
            if not valid.all():
                raise ValueError(f"Invalid event intervals in {path.name}")
            stages = [len(data)]
            mask = data.power_max_zscore.gt(3)
            stages.append(int(mask.sum()))
            for condition in [data.sw_exceeds_threshold, ~data.overlaps_with_gamma,
                              ~data.overlaps_with_movement, data.power_max_zscore.lt(10)]:
                mask &= condition
                stages.append(int(mask.sum()))
            probe = path.name.split("_")[1]
            summary.append(dict(session_id=sid, mouse_id=session["mouse_id"], experience=session["experience_level"],
                                split=session["split"], probe_id=probe, source_file=path.name,
                                **dict(zip(["all_events", "power_gt_3", "sharp_wave", "no_gamma", "no_movement", "power_lt_10"], stages))))
            output = root / "analysis/ripple-2025" / sid
            output.mkdir(parents=True, exist_ok=True)
            data.loc[mask].assign(session_id=sid, probe_id=probe, source_file=path.name).to_csv(
                output / f"{probe}-filtered.csv.gz", index=False, compression="gzip")
        for path in folder.glob("*global_swr_events.csv.gz"):
            try:
                pd.read_csv(path)
            except pd.errors.ParserError as error:
                issues.append({"session_id": sid, "file": path.name, "status": "not_used", "reason": str(error).splitlines()[0]})
    output = root / "analysis/ripple-2025"
    table = pd.DataFrame(summary)
    table.to_csv(output / "per-probe-filter-counts.csv", index=False)
    totals = table.groupby(["session_id", "mouse_id", "experience", "split"]).sum(numeric_only=True).reset_index()
    totals.to_csv(output / "per-session-filter-counts.csv", index=False)
    report = {"source": "https://www.nature.com/articles/s41597-025-06115-0",
              "method_source": "https://github.com/AngCamp/CampbellMurphy2024/blob/main/Data_Usage/DATA_DOCUMENTATION.md",
              "recipe": "power_max_zscore > 3; sharp-wave flag; no gamma/movement flag; power_max_zscore < 10",
              "scope": "Authors' data-reuse filtering recommendations and session joins; not LFP detection or manuscript-wide totals. Probe events may duplicate a physiological event.",
              "sessions": len(totals), "probe_tables": len(summary), "putative_events": int(table.all_events.sum()),
              "retained_probe_events": int(table.power_lt_10.sum()), "global_csv_issues": issues}
    (output / "filter-summary.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--plan", type=Path, required=True)
    args = parser.parse_args()
    result = run(args.root, args.plan)
    print(json.dumps({key: result[key] for key in ["sessions", "probe_tables", "putative_events", "retained_probe_events"]}))
