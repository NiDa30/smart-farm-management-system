#!/usr/bin/env python3
"""Create a private 4 MiB ESP32 flash image for local Wokwi (contains keys)."""
import argparse
import os
from pathlib import Path
import runpy
import struct
import tempfile

ROOT = Path(__file__).resolve().parents[2]
FLASH_SIZE = 4 * 1024 * 1024


def partitions(data):
    result = {}
    for offset in range(0, len(data) - 31, 32):
        magic, kind, subtype, start, size, label, flags = struct.unpack(
            "<HBBII16sI", data[offset:offset + 32])
        if magic != 0x50AA:
            break  # MD5 marker or end of table
        name = label.split(b"\0", 1)[0].decode("ascii")
        if name in result or start + size > FLASH_SIZE:
            raise ValueError("Invalid or duplicate partition")
        result[name] = (start, size)
    for name in ("app0", "otadata", "spiffs"):
        if name not in result:
            raise ValueError("Required partition missing: " + name)
    return result


def assemble(segments):
    flash = bytearray(b"\xff" * FLASH_SIZE)
    end = 0
    for start, data, limit in sorted(segments, key=lambda item: item[0]):
        if not data or len(data) > limit or start < end or start + len(data) > FLASH_SIZE:
            raise ValueError("Flash segment is empty, oversized or overlapping")
        flash[start:start + len(data)] = data
        end = start + len(data)
    return flash


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--core-dir", type=Path, default=Path(
        os.environ.get("PLATFORMIO_CORE_DIR", str(Path.home() / ".platformio"))))
    parser.add_argument("--project-dir", type=Path, default=ROOT / "firmware/esp32",
                        help="PlatformIO project (default: legacy ENV01 project)")
    args = parser.parse_args()
    build = args.project_dir.resolve() / ".pio/build/esp32dev"
    table = (build / "partitions.bin").read_bytes()
    layout = partitions(table)
    boot_app = args.core_dir / "packages/framework-arduinoespressif32/tools/partitions/boot_app0.bin"
    app_start, app_size = layout["app0"]
    ota_start, ota_size = layout["otadata"]
    fs_start, fs_size = layout["spiffs"]
    segments = [
        (0x1000, (build / "bootloader.bin").read_bytes(), 0x7000),
        (0x8000, table, 0x1000),
        (ota_start, boot_app.read_bytes(), ota_size),
        (app_start, (build / "firmware.bin").read_bytes(), app_size),
        (fs_start, (build / "littlefs.bin").read_bytes(), fs_size),
    ]
    flash = assemble(segments)
    output_dir = build / "wokwi-private"
    provision = runpy.run_path(str(ROOT / "tools/aws/provision_day1.py"))
    provision["prepare_private_directory"](output_dir)
    fd, temp_name = tempfile.mkstemp(dir=output_dir, suffix=".tmp")
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(flash)
        destination = output_dir / "flash.bin"
        os.replace(temp_name, destination)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)
    print("Private flash image created:", destination)
    print("LittleFS offset:", hex(fs_start), "| flash size:", len(flash))
    print("Contains private key: keep local; do not publish or commit.")


if __name__ == "__main__":
    main()
