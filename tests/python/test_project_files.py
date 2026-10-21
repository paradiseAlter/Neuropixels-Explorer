from __future__ import annotations

import json
import hashlib
from pathlib import Path
import sqlite3
import unittest

import test_local_projects as fixtures
from test_local_projects import write_kilosort, write_nwb, ROOT
from neuropixels_explorer.migrations import initialize_database
from neuropixels_explorer.paths import RuntimePaths
from neuropixels_explorer.service import CatalogService
from neuropixels_explorer import project_files


class ProjectFileTests(unittest.TestCase):
    setUp = fixtures.LocalProjectTests.setUp
    tearDown = fixtures.LocalProjectTests.tearDown
    def imported(self, name="Experiment", nwb=False):
        source = self.root / ("session.nwb" if nwb else "sort")
        if nwb:
            write_nwb(source)
        elif not source.exists():
            write_kilosort(source)
        local = self.service.local_projects
        choice = local.select_path("nwb" if nwb else "folder", source)["candidates"][0]
        return local.import_candidate(choice["candidateId"], project_name=name, mode="neural")

    def fresh_service(self):
        root = self.root / "other-runtime"
        root.mkdir()
        db = root / "catalog.sqlite"
        initialize_database(db)
        return CatalogService(RuntimePaths.from_arguments(data_root=root, database_path=db, static_root=ROOT, cache_root=root / "cache"))

    def test_roundtrip_fresh_catalog_restores_video_clock_and_full_annotation_document(self):
        result = self.imported()
        local, project, rid = self.service.local_projects, result["project"], result["recordingId"]
        video = self.root / "behavior.webm"
        video.write_bytes(b"fixture video")
        local.attach_video(rid, video, project["id"])
        local.update_mapping({"projectId": project["id"], "recordingId": rid, "offset": 2.5})
        key = json.dumps([rid, "url", video.name, video.stat().st_size])
        doc = {"schema": "neuropixels-annotations/1", "context": {"key": key, "recordingKey": rid, "videoName": video.name, "videoSize": video.stat().st_size, "duration": 15},
               "segments": [{"id": "clip", "start": 1, "end": 2, "subject": "mouse", "track": "behavior"}],
               "schemes": [{"id": "a", "name": "Lab", "labels": {"clip": "grooming"}, "mappings": {}, "groups": {}, "reviewed": {"clip": True}}],
               "runs": [], "activeSchemeId": "a", "labelColors": {"grooming": "#abcdef"}}
        local.annotation({"projectId": project["id"], "key": key, "document": doc})
        file = self.root / "saved.neuroproject.json"
        project_files.write(local, project, file)
        fresh = self.fresh_service()
        try:
            opened = fresh.local_projects.select_path("open-project", file)["project"]
            self.assertEqual(opened["annotations"][key], doc)
            self.assertEqual(opened["videos"][rid]["timeMapping"]["offset_s"], 2.5)
            self.assertEqual(fresh.unit_review(rid + ":unit:0")["spikeTimes"], [0., 5., 15.])
            checks = fresh.local_projects.checks(rid, opened["id"])["checks"]
            self.assertTrue(all(c["ready"] for c in checks if c["key"] in {"activity", "spatial", "template", "video", "alignment"}))
            project_files.write(fresh.local_projects, opened, file)
        finally:
            fresh.close()

    def test_allen_roundtrip_keeps_ids_coordinates_regions_and_missing_templates(self):
        result = self.imported(nwb=True)
        file = self.root / "allen.neuroproject.json"
        project_files.write(self.service.local_projects, result["project"], file)
        fresh = self.fresh_service()
        try:
            opened = fresh.local_projects.select_path("open-project", file)
            rid = opened["recordingId"]
            review = fresh.unit_review(rid + ":unit:1000000001")
            self.assertEqual(review["peakChannelPosition"], {"x": 0., "y": 0.})
            checks = {c["key"]: c for c in fresh.local_projects.checks(rid, opened["project"]["id"])["checks"]}
            self.assertTrue(checks["activity"]["ready"])
            self.assertTrue(checks["anatomy"]["ready"])
            self.assertFalse(checks["template"]["ready"])
        finally:
            fresh.close()

    def test_missing_optional_file_is_reported_without_losing_neural_data(self):
        result = self.imported()
        file = self.root / "missing.neuroproject.json"
        project_files.write(self.service.local_projects, result["project"], file)
        (self.root / "sort/templates.npy").unlink()
        fresh = self.fresh_service()
        try:
            opened = fresh.local_projects.select_path("open-project", file)
            rid = opened["recordingId"]
            checks = fresh.local_projects.checks(rid, opened["project"]["id"])
            self.assertIn("templates", checks["issues"])
            self.assertTrue(checks["checks"][0]["ready"])
            self.assertEqual(fresh.unit_review(rid + ":unit:0")["spikeTimes"], [0., 5., 15.])
        finally:
            fresh.close()

    def test_projects_of_same_recording_keep_independent_video_and_annotations(self):
        first, second = self.imported("A"), self.imported("B")
        self.assertEqual(first["recordingId"], second["recordingId"])
        self.assertNotEqual(first["project"]["id"], second["project"]["id"])
        video = self.root / "behavior.webm"
        video.write_bytes(b"fixture video")
        self.service.local_projects.attach_video(first["recordingId"], video, first["project"]["id"])
        self.assertEqual(second["project"]["videos"], {})
        self.assertEqual(second["project"]["mode"], "neural")

    def test_invalid_manifest_rolls_back_catalog(self):
        result = self.imported()
        value = project_files.document(self.service.local_projects, result["project"])
        value["catalog"]["units"][0]["unexpected_column"] = "bad"
        file = self.root / "invalid.neuroproject.json"
        file.write_text(json.dumps(value), encoding="utf-8")
        fresh = self.fresh_service()
        try:
            with self.assertRaisesRegex(ValueError, "unknown column"):
                fresh.local_projects.select_path("open-project", file)
            self.assertEqual(fresh.catalog()["recordings"], [])
            self.assertEqual(fresh.local_projects.state["projects"], [])
        finally:
            fresh.close()

    def test_adjacent_clock_matches_video_and_session_before_becoming_available(self):
        result = self.imported(nwb=True)
        local, rid = self.service.local_projects, result["recordingId"]
        video = self.root / "behavior.webm"
        video.write_bytes(b"frame-clock matching fixture")
        clock = {"session_id": "1234567890", "video": {"sha256": hashlib.sha256(video.read_bytes()).hexdigest()},
                 "timeMapping": {"method": "frame_timestamps", "verification_status": "verified", "offset_s": 2, "scale": 1,
                                 "provenance": {"frame_clock": {"video_s": [0, 1], "neural_s": [2, 3]}}}}
        video.with_suffix(".clock.json").write_text(json.dumps(clock), encoding="utf-8")
        attached = local.attach_video(rid, video, result["project"]["id"])
        self.assertEqual(attached["video"]["timeMapping"]["verification_status"], "verified")
        other = self.imported("Kilosort")
        attached = local.attach_video(other["recordingId"], video, other["project"]["id"])
        self.assertEqual(attached["video"]["timeMapping"]["verification_status"], "unverified")
        self.assertIn("different Allen session", attached["video"]["clockIssue"])

    def test_reopening_saved_snapshot_replaces_only_that_projects_working_draft(self):
        first, second = self.imported("Saved"), self.imported("Separate")
        file = self.root / "saved.neuroproject.json"
        local = self.service.local_projects
        project_files.write(local, first["project"], file)
        first["project"]["name"] = "Later working name"
        second["project"]["name"] = "Separate unsaved name"
        opened = local.select_path("open-project", file)
        self.assertEqual(opened["project"]["name"], "Saved")
        self.assertEqual(local.get_project(second["project"]["id"])["name"], "Separate unsaved name")


if __name__ == "__main__":
    unittest.main()
