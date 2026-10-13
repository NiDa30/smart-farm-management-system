#!/usr/bin/env bash
# Run in Windows Git Bash. No key values are read into this script.
set -euo pipefail
project_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$project_root"

if ! command -v javac >/dev/null 2>&1; then
  echo 'Missing full JDK 21. Install it and reopen Git Bash; javac -version must work.' >&2
  exit 1
fi
jdk_version=$(javac -version 2>&1)
if [[ ! "$jdk_version" =~ ^javac\ 21([.]|$) ]]; then
  echo "Expected JDK 21; found: $jdk_version" >&2
  exit 1
fi
python_executable="$project_root/.local/day1-venv/Scripts/python.exe"
if [[ ! -f "$python_executable" ]]; then
  echo 'Missing Windows Day 1 Python venv.' >&2
  exit 1
fi
export AWS_PROFILE="${AWS_PROFILE:-smartfarm}"
export AWS_REGION=ap-southeast-1
export AWS_DEFAULT_REGION="$AWS_REGION"
export AWS_IOT_ENDPOINT
AWS_IOT_ENDPOINT=$("$python_executable" -c 'from pathlib import Path; print(Path(".local/aws/endpoint.txt").read_text().strip())')
export PROBE_SECONDS="${PROBE_SECONDS:-300}"
account=$("$python_executable" -m awscli sts get-caller-identity --profile "$AWS_PROFILE" --region "$AWS_REGION" --query Account --output text)
if [[ "$account" != 110035681534 ]]; then
  echo 'AWS profile is not the expected project account; stopping.' >&2
  exit 1
fi
cd backend
bash ./mvnw -B verify
bash ./mvnw -B exec:java \
  -Dexec.mainClass=vn.smartfarm.iot.mqtt.MqttConnectivityProbe
