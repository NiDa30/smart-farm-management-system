// Native tests for remote config and OTA verification/rollback.
// Build: g++ -std=c++17 -I<mbedtls>/include ... -L<mbedtls>/build/library -lmbedcrypto
#include "../../firmware/esp32/include/DeviceConfig.h"
#include "../../firmware/esp32/include/OtaGuard.h"
#include "../../firmware/esp32/include/OtaVerify.h"
#include "../../firmware/esp32/include/testvectors/OtaTestVector.h"
#include <cassert>
#include <cstdio>
#include <string>

static const int64_t E = 1800000000;
static bool is(const char* a, const char* b) { return a && b && strcmp(a, b) == 0; }
static const char* ID1 = "11111111-1111-4111-8111-111111111111";
static const char* ID2 = "22222222-2222-4222-8222-222222222222";
static const char* ID3 = "33333333-3333-4333-8333-333333333333";

static void config() {
  DeviceConfig c;
  assert(c.revision() == 0 && c.settings().telemetrySeconds == 5 && !DeviceConfig::validate(c.settings()));
  DeviceSettings s; s.telemetrySeconds = 10; s.heartbeatSeconds = 20; s.soilWetAdc = 900; s.soilDryAdc = 3100; s.pumpMaxSeconds = 600;
  assert(!c.apply(ID1, 2, s, E, E + 30, E));
  assert(c.revision() == 2 && c.settings().pumpMaxSeconds == 600);
  // Same configId again: same answer, nothing re-applied; a different id with the same revision is stale.
  assert(!c.apply(ID1, 2, s, E, E + 30, E + 5));
  assert(is(c.apply(ID2, 2, s, E, E + 30, E), "STALE_REVISION"));
  assert(is(c.apply(ID2, 2, s, E, E + 30, E), "STALE_REVISION"));       // remembered
  DeviceSettings bad = s; bad.telemetrySeconds = 11;
  assert(is(c.apply(ID3, 3, bad, E, E + 30, E), "INVALID_TELEMETRY_INTERVAL"));
  assert(c.revision() == 2 && c.settings().telemetrySeconds == 10);       // all or nothing
  const char* id = "44444444-4444-4444-8444-444444444444";
  bad = s; bad.soilDryAdc = 1000;
  assert(is(c.apply(id, 3, bad, E, E + 30, E), "INVALID_SOIL_CALIBRATION"));
  id = "55555555-5555-4555-8555-555555555555"; bad = s; bad.pumpMaxSeconds = 3601;
  assert(is(c.apply(id, 3, bad, E, E + 30, E), "INVALID_PUMP_CAP"));
  id = "66666666-6666-4666-8666-666666666666"; bad = s; bad.heartbeatSeconds = 4;
  assert(is(c.apply(id, 3, bad, E, E + 30, E), "INVALID_HEARTBEAT_INTERVAL"));
  assert(is(c.apply("77777777-7777-4777-8777-777777777777", 3, s, E, E + 61, E), "INVALID_LIFETIME"));
  assert(is(c.apply("88888888-8888-4888-8888-888888888888", 3, s, E - 40, E - 10, E), "EXPIRED"));
  assert(is(c.apply("99999999-9999-4999-8999-999999999999", 3, s, E + 11, E + 30, E), "CLOCK_SKEW"));
  assert(is(c.apply("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", 3, s, E, E + 30, 100), "CLOCK_NOT_READY"));
  assert(is(c.apply("short", 3, s, E, E + 30, E), "INVALID_CONFIG"));
  // Restore from NVS: valid persisted state wins, corrupt state keeps defaults.
  DeviceConfig restored; restored.restore(7, s);
  assert(restored.revision() == 7 && restored.settings().soilWetAdc == 900);
  DeviceConfig corrupt; corrupt.restore(9, bad);
  assert(corrupt.revision() == 0 && corrupt.settings().pumpMaxSeconds == 3600);
}

static void guard() {
  OtaRecord r;
  assert(OtaGuard::onBoot(r) == OtaGuard::BOOT_NORMAL && OtaGuard::onTick(r, 999999, false) == OtaGuard::TRIAL_IDLE);
  r.pending = true; strcpy(r.previous, "app0");
  // Healthy trial: confirm.
  assert(OtaGuard::onBoot(r) == OtaGuard::BOOT_TRIAL && r.attempts == 1);
  assert(OtaGuard::onTick(r, 1000, false) == OtaGuard::TRIAL_WAIT);
  assert(OtaGuard::onTick(r, 5000, true) == OtaGuard::TRIAL_CONFIRM);
  OtaGuard::finish(r, true);
  assert(!r.pending && r.outcome == 1 && OtaGuard::onBoot(r) == OtaGuard::BOOT_NORMAL);
  // No healthy session before the deadline: roll back.
  OtaRecord slow; slow.pending = true;
  assert(OtaGuard::onBoot(slow) == OtaGuard::BOOT_TRIAL);
  assert(OtaGuard::onTick(slow, OtaGuard::kHealthDeadlineMs - 1, false) == OtaGuard::TRIAL_WAIT);
  assert(OtaGuard::onTick(slow, OtaGuard::kHealthDeadlineMs, false) == OtaGuard::TRIAL_ROLLBACK);
  // Crash loop: the 4th boot rolls back before running the new image's main logic.
  OtaRecord crash; crash.pending = true;
  for (int i = 1; i <= 3; i++) { assert(OtaGuard::onBoot(crash) == OtaGuard::BOOT_TRIAL); assert(crash.attempts == i); }
  assert(OtaGuard::onBoot(crash) == OtaGuard::BOOT_ROLLBACK);
  OtaGuard::finish(crash, false);
  assert(crash.outcome == 2 && !crash.pending);

  // Request validation.
  const char* sig = ota_test::kSignature;
  const char* url = "https://smartfarm-fw.s3.ap-southeast-1.amazonaws.com/env01/1.4.0.bin?X-Amz-Signature=abc";
  auto req = [&](const char* ver, const char* link, uint32_t size, const char* hash, bool idle) {
    return OtaGuard::request(ID1, ver, link, size, hash, sig, E, E + 30, E, 1310720, ".amazonaws.com", idle);
  };
  assert(!req("1.4.0", url, 900000, ota_test::kSha256, true));
  assert(!req("1.4.0-rc1", url, 900000, ota_test::kSha256, true));
  assert(is(req("1.4.0", url, 900000, ota_test::kSha256, false), "ACTUATORS_ACTIVE"));
  for (const char* v : {"1.4", "1.4.0.1", "v1.4.0", "1..0", "1.4.0-", "1.4.x"}) assert(is(req(v, url, 900000, ota_test::kSha256, true), "INVALID_VERSION"));
  for (const char* u : {"http://x.amazonaws.com/a.bin", "https://evil.com/x.amazonaws.com/a.bin", "https://amazonaws.com.evil.com/a.bin",
                        "https://user@x.amazonaws.com/a.bin", "https://x.amazonaws.com:444/a.bin", "https://x.amazonaws.com", "https://.amazonaws.com/a",
                        "https://x.amazonaws.com/a b.bin"})
    assert(is(req("1.4.0", u, 900000, ota_test::kSha256, true), "URL_NOT_ALLOWED"));
  assert(is(req("1.4.0", url, 1310721, ota_test::kSha256, true), "INVALID_SIZE"));
  assert(is(req("1.4.0", url, 100, ota_test::kSha256, true), "INVALID_SIZE"));
  std::string upper = ota_test::kSha256; upper[0] = 'D';
  assert(is(req("1.4.0", url, 900000, upper.c_str(), true), "INVALID_HASH"));
  assert(is(OtaGuard::request(ID1, "1.4.0", url, 900000, ota_test::kSha256, sig, E, E + 61, E, 1310720, ".amazonaws.com", true), "INVALID_LIFETIME"));
  assert(is(OtaGuard::request(ID1, "1.4.0", url, 900000, ota_test::kSha256, "short", E, E + 30, E, 1310720, ".amazonaws.com", true), "INVALID_SIGNATURE"));
}

static void verify() {
  FirmwareHash hash;
  assert(hash.begin());
  uint8_t chunk[333];
  for (uint32_t done = 0; done < ota_test::kImageSize;) {          // odd chunking, like HTTP reads
    uint32_t n = 0;
    while (n < sizeof(chunk) && done + n < ota_test::kImageSize) { chunk[n] = ota_test::imageByte(done + n); n++; }
    assert(hash.update(chunk, n)); done += n;
  }
  uint8_t digest[32];
  assert(hash.finish(digest));
  assert(!OtaVerify::check(digest, ota_test::kSha256, ota_test::kSignature, ota_test::kPublicKey));
  // Wrong key, tampered image, tampered signature, wrong expected hash, garbage key.
  assert(is(OtaVerify::check(digest, ota_test::kSha256, ota_test::kSignature, ota_test::kOtherPublicKey), "BAD_SIGNATURE"));
  uint8_t tampered[32]; memcpy(tampered, digest, 32); tampered[5] ^= 1;
  assert(is(OtaVerify::check(tampered, ota_test::kSha256, ota_test::kSignature, ota_test::kPublicKey), "HASH_MISMATCH"));
  std::string expected = ota_test::kSha256; expected[10] = expected[10] == 'a' ? 'b' : 'a';
  assert(is(OtaVerify::check(digest, expected.c_str(), ota_test::kSignature, ota_test::kPublicKey), "HASH_MISMATCH"));
  std::string sig = ota_test::kSignature; sig[20] = sig[20] == 'A' ? 'B' : 'A';
  const char* e = OtaVerify::check(digest, ota_test::kSha256, sig.c_str(), ota_test::kPublicKey);
  assert(is(e, "BAD_SIGNATURE") || is(e, "INVALID_SIGNATURE"));
  assert(is(OtaVerify::check(digest, ota_test::kSha256, "!!!notbase64!!!", ota_test::kPublicKey), "INVALID_SIGNATURE"));
  assert(is(OtaVerify::check(digest, ota_test::kSha256, ota_test::kSignature, "-----BEGIN PUBLIC KEY-----\nAAAA\n-----END PUBLIC KEY-----\n"), "BAD_PUBLIC_KEY"));
  assert(is(OtaVerify::check(digest, ota_test::kSha256, ota_test::kSignature, ""), "BAD_PUBLIC_KEY"));
}

int main() {
  config(); guard(); verify();
  puts("DeviceConfig/OtaGuard/OtaVerify: revision+dedup, trial boot/rollback, SHA-256 + ECDSA P-256 PASS");
  return 0;
}
