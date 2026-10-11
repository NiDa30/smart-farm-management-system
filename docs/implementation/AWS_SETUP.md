# Day 1 — AWS IoT + Wokwi setup

Status: code/local checks prepared; **AWS provisioning and live telemetry not yet executed**. Region default `ap-southeast-1` (Singapore) for latency from Vietnam, not a claim that it has the cheapest current tariff. One ESP32/60 telemetry messages per5 minutes. Keep backend/DB local for MVP; no EC2/RDS/Shadow/CloudWatch provisioning in Day1 script.

## 1. Authenticate privately

Use an existing authenticated AWS profile/role on your local machine or a securely configured cloud runtime. Check read-only identity:

```bash
aws sts get-caller-identity --region ap-southeast-1 --query Account --output text
```

Current cloud machine has no usable AWS profile (identity check returned profile-not-found). It has no injected AWS access key/session/web-identity/container credentials. A GitHub/Atlassian connection is not AWS authentication. Do not send AWS keys/cert/private key in chat. If using SSO, authenticate with your organization's AWS CLI SSO instructions first. This repository does not invent an SSO role or assume administrator privileges.

Management principal needs STS identity plus scoped IoT Describe/CreateThing, Get/CreatePolicy, CreateKeysAndCertificate, DescribeCertificate, AttachThingPrincipal, AttachPolicy, DescribeEndpoint. Device runtime policy is narrower and rendered by script. Existing ENV01 must be tagged with attribute farmId=FARM001; conflicting existing Thing/policy is not overwritten.

## 2. Render policies before provisioning

From repository root (ACCOUNT_ID must be your verified12-digit account):

```bash
python -m venv .local/day1-venv
.local/day1-venv/bin/pip install -r tools/requirements-day1.txt
.local/day1-venv/bin/python tools/aws/provision_day1.py \
  --region ap-southeast-1 --account-id ACCOUNT_ID
```

This default is local rendering only: `.local/aws/device-policy.json` and `backend-iam-policy.json`. Review the exact ARNs. For device, Connect=ENV01; publish ENV01 telemetry/status and PUMP01 ACK/status/event; subscribe/receive only PUMP01 command. No FARM002 or global resource wildcard. Backend may read FARM001, publish PUMP01 command, plus its own isolated probe echo. A backend IAM policy must be attached to your existing runtime role/principal by an authorized AWS operator; script does not create a role/trust policy or grant IAM administrator.

## 3. Apply authenticated provisioning

```bash
.local/day1-venv/bin/python tools/aws/provision_day1.py \
  --region ap-southeast-1 --account-id ACCOUNT_ID --apply
```

Creates Thing ENV01, ACTIVE certificate and SmartFarmMvpENV01 policy, attaches them and stores certificate/key/manifest/endpoint in ignored private `.local/aws/` (directory700, key600). Script stops before provisioning if active AWS account differs from requested account. Repeat with same output reuses certificate manifest; does not deliberately generate another certificate or change an existing mismatching policy. Partial failure leaves a manifest to recover; if cert files are missing do not blindly retry creation—review/revoke the recorded resource privately. Never print complete SDK create-certificate response because it contains private key.

Provisioning script offline rendering/least-privilege tests passed. Live apply/retry/idempotency behavior remains untested until AWS credentials are available. No AWS resources were created in this chat.

## 4. Provision Wokwi privately

Use [firmware README](../../firmware/esp32/README.md) and authoritative PlatformIO project, not the legacy HiveMQ sketch. Diagram has DHT22GPIO15 and soil potentiometerGPIO34; relay stays OFF in Day1.

1. Copy example config to ignored config.local.h and enter Data-ATS endpoint from endpoint.txt.
2. Place AWS certificate/private key and official Amazon Root CA1 in ignored firmware data directory privately.
3. Build firmware and LittleFS image with the pinned PlatformIO project.
4. Verify your private Wokwi/VS Code setup supports flashing/attaching the filesystem image. `wokwi.toml` points to firmware/ELF; it alone does not guarantee private LittleFS provisioning. Do not make project/filesystem image public.
5. Run simulator, change DHT/potentiometer and inspect serial for TLS connection/PUBACK. No command/actuator ON in Day1 firmware.

If your simulator cannot load private certificate files, stop at this prerequisite. Do not disable TLS or replace AWS with HiveMQ. Board hardware is unavailable per user; a supported private Wokwi provisioning path is therefore required to pass G1.

## 5. Observe and record G1

AWS console → IoT Core in Singapore → MQTT Test Client → subscribe `smartfarm/FARM001/ENV01/telemetry` and status. Run5 minutes; expect about60 valid packets with changing actual virtual sensor input, source timestamp and bootId/sequence.

Run backend live probe with AWS_REGION, AWS_IOT_ENDPOINT and default-chain credentials for the scoped backend principal. It verifies WSS443 signing/subscribe/PUBACK/echo, then counts ENV01 messages for300 seconds. Follow [backend README](../../backend/README.md). Do not treat `--self-test` as live AWS verification. Save sanitized timestamps/message IDs/counts and screenshots, not keys. Console policy/certificate denial tests are still pending.

## 6. Cloud prerequisites currently outstanding

- Authenticated AWS identity/role is absent; user has account permissions but they are not connected to this runtime.
- PlatformIO registry returns proxy CONNECT403. Added domain requirements to environment draft: api.registry.platformio.org, dl.registry.platformio.org, dl.espressif.com, www.amazontrust.com. Saving draft did not apply networking; review/save environment settings and publish prepared environment when appropriate. Retry firmware build after network settings actually change.
- Account-specific IoT endpoint/STS access may need explicit allowed hostname after endpoint is known; do not broaden allowlist to all AWS domains.
- Wokwi simulator runs on your side; private certificate/filesystem support and actual telemetry must be verified there.

No private-key values should be put in environment draft/scripts/reports/chat. Locally generated provisioning output is ignored and must not be published in a public environment snapshot. Future Day3 backend requires secure runtime credential provision, not browser AWS credentials.
