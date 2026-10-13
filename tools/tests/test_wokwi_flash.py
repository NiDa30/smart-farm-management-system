import importlib.util
from pathlib import Path
import struct
import unittest

spec = importlib.util.spec_from_file_location(
    "merge_flash", Path(__file__).resolve().parents[1] / "wokwi/merge_flash.py")
merge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(merge)


class FlashTest(unittest.TestCase):
    def test_partition_offsets_and_md5_marker(self):
        table = b"".join(struct.pack("<HBBII16sI", 0x50AA, 1, 0, start, size,
                                    name.encode(), 0)
                         for name, start, size in [
                             ("otadata", 0xe000, 0x2000),
                             ("app0", 0x10000, 0x140000),
                             ("spiffs", 0x290000, 0x160000)])
        layout = merge.partitions(table + b"\xeb\xeb" + b"\xff" * 30)
        self.assertEqual(layout["spiffs"], (0x290000, 0x160000))
        with self.assertRaises(ValueError):
            merge.partitions(table[:32])

    def test_flash_placement_erased_gaps_and_rejected_overlap(self):
        image = merge.assemble([(0x1000, b"boot", 0x7000),
                                (0x290000, b"filesystem", 0x160000)])
        self.assertEqual(len(image), merge.FLASH_SIZE)
        self.assertEqual(image[0x290000:0x29000a], b"filesystem")
        self.assertEqual(image[:16], b"\xff" * 16)
        for invalid in [[(0, b"abc", 3), (2, b"def", 3)],
                        [(0, b"abc", 2)],
                        [(merge.FLASH_SIZE - 1, b"ab", 2)]]:
            with self.assertRaises(ValueError):
                merge.assemble(invalid)
