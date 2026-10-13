#!/usr/bin/env bash
set -euo pipefail
project_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$project_root"
if ! command -v javac >/dev/null 2>&1; then
  echo 'Install full JDK21 and reopen Git Bash.' >&2
  exit 1
fi
jdk_version=$(javac -version 2>&1)
if [[ ! "$jdk_version" =~ ^javac\ 21([.]|$) ]]; then
  echo 'JDK21 is required.' >&2
  exit 1
fi
if [[ ! -f .local/postgres/db.env ]]; then
  echo 'Run tools/backend/init_local_database.py first.' >&2
  exit 1
fi
# This ignored file contains only the generated hex password; never commit it.
set -a
source .local/postgres/db.env
set +a
export AWS_PROFILE="${AWS_PROFILE:-smartfarm}"
export AWS_REGION=ap-southeast-1
export AWS_DEFAULT_REGION="$AWS_REGION"
export AWS_IOT_ENDPOINT
AWS_IOT_ENDPOINT=$(./.local/day1-venv/Scripts/python.exe -c 'from pathlib import Path; print(Path(".local/aws/endpoint.txt").read_text().strip())')
export SMARTFARM_MQTT_ENABLED=true
cd backend
bash ./mvnw -B verify
bash ./mvnw -B spring-boot:run
