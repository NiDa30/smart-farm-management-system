import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "provision", Path(__file__).resolve().parents[1] / "aws/provision_day1.py")
provision = importlib.util.module_from_spec(spec)
spec.loader.exec_module(provision)


class PrivateDirectoryTest(unittest.TestCase):
    @unittest.skipIf(os.name == "nt", "POSIX modes only")
    def test_rejects_shared_directory(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "shared"
            output.mkdir(mode=0o755)
            output.chmod(0o755)
            with self.assertRaises(ValueError):
                provision.prepare_private_directory(output)

    def test_windows_acl_failure_blocks_provisioning(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            with patch.object(provision.os, "name", "nt"), patch.object(
                provision.subprocess, "run",
                side_effect=subprocess.CalledProcessError(1, "powershell.exe"),
            ) as run:
                with self.assertRaises(subprocess.CalledProcessError):
                    provision.prepare_private_directory(output)
                self.assertTrue(run.call_args.kwargs["check"])
                self.assertEqual(run.call_args.kwargs["env"]["SMARTFARM_PRIVATE_DIRECTORY"], str(output))
