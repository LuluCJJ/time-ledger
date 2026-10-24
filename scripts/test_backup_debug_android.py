import importlib.util
import io
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location("backup_debug_android", Path(__file__).with_name("backup-debug-android.py"))
BACKUP = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BACKUP)


def sample_archive():
    data = io.BytesIO()
    with tarfile.open(fileobj=data, mode="w") as archive:
        item = tarfile.TarInfo("app_webview/Default/Local Storage/example")
        item.size = 7
        archive.addfile(item, io.BytesIO(b"fixture"))
    return data.getvalue()


class FakeProcess:
    def __init__(self, content):
        self.stdout = io.BytesIO(content)
        self.stderr = io.BytesIO()

    def wait(self):
        return 0


class BackupTests(unittest.TestCase):
    def test_streams_private_archive_without_printing_contents(self):
        content = sample_archive()
        with tempfile.TemporaryDirectory() as folder:
            with patch.object(BACKUP, "run_text", side_effect=["List of devices attached\nTEST123\tdevice", "/data/user/0/app.personal.timeledger"]):
                with patch.object(BACKUP.subprocess, "Popen", return_value=FakeProcess(content)):
                    with patch.object(sys, "argv", ["backup", "--output-dir", folder]):
                        with patch("sys.stdout", new_callable=io.StringIO) as output:
                            self.assertEqual(BACKUP.main(), 0)
            archives = list(Path(folder).glob("*.tar"))
            self.assertEqual(len(archives), 1)
            self.assertEqual(archives[0].read_bytes(), content)
            self.assertNotIn("fixture", output.getvalue())

    def test_rejects_missing_device_without_creating_archive(self):
        with tempfile.TemporaryDirectory() as folder:
            with patch.object(BACKUP, "run_text", return_value="List of devices attached"):
                with patch.object(sys, "argv", ["backup", "--output-dir", folder]):
                    with self.assertRaises(RuntimeError):
                        BACKUP.main()
            self.assertEqual(list(Path(folder).iterdir()), [])

    def test_rejects_output_inside_git_repository(self):
        with tempfile.TemporaryDirectory() as folder:
            (Path(folder) / ".git").mkdir()
            with patch.object(BACKUP, "run_text", side_effect=["List of devices attached\nTEST123\tdevice", "/data/user/0/app.personal.timeledger"]):
                with patch.object(sys, "argv", ["backup", "--output-dir", str(Path(folder) / "backup")]):
                    with self.assertRaisesRegex(RuntimeError, "Git repository"):
                        BACKUP.main()
            self.assertFalse((Path(folder) / "backup").exists())

    def test_existing_archive_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as folder:
            fixed_name = "time-ledger-debug-data-20261024-120000.tar"
            existing = Path(folder) / fixed_name
            existing.write_bytes(b"existing private archive")
            with patch.object(BACKUP.datetime, "now") as now:
                now.return_value.strftime.return_value = "20261024-120000"
                with patch.object(BACKUP, "run_text", side_effect=["List of devices attached\nTEST123\tdevice", "/data/user/0/app.personal.timeledger"]):
                    with patch.object(sys, "argv", ["backup", "--output-dir", folder]):
                        with self.assertRaisesRegex(RuntimeError, "already exists"):
                            BACKUP.main()
            self.assertEqual(existing.read_bytes(), b"existing private archive")


if __name__ == "__main__":
    unittest.main()
