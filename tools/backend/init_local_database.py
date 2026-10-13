#!/usr/bin/env python3
"""Initialize a private local PostgreSQL env file; never print the password."""
import os
from pathlib import Path
import runpy
import secrets

root = Path(__file__).resolve().parents[2]
output = root / ".local/postgres"
provision = runpy.run_path(str(root / "tools/aws/provision_day1.py"))
provision["prepare_private_directory"](output)
env_file = output / "db.env"
if env_file.exists():
    print("Existing database configuration kept:", env_file)
else:
    fd = os.open(env_file, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    # LF is required when Git Bash sources this file on Windows.
    with os.fdopen(fd, "w", newline="\n") as stream:
        stream.write("SMARTFARM_DB_PASSWORD=" + secrets.token_hex(24) + "\n")
    print("Private database configuration created:", env_file)
