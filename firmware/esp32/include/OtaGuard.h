#pragma once
#include <stdint.h>
#include <string.h>

// OTA request validation and the trial-boot / rollback state machine. Pure C++ (native-tested);
// the caller persists OtaRecord in NVS and performs partition switches and restarts.
//
// Trial boot: after a verified image is written, the record is marked pending with the previous
// partition. Every boot of the new image counts an attempt; more than kMaxAttempts (crash loop)
// or no healthy backend session within kHealthDeadlineMs rolls back to the previous partition.
// Health = MQTT connected and the config-state report published (the device is manageable).
struct OtaRecord {
  bool pending = false;
  uint8_t attempts = 0;
  char otaId[37] = {};
  char previous[17] = {};   // partition label to return to
  char version[24] = {};
  uint8_t outcome = 0;      // last finished trial, reported once: 0 none, 1 confirmed, 2 rolled back
};

class OtaGuard {
 public:
  static const uint8_t kMaxAttempts = 3;
  static const uint32_t kHealthDeadlineMs = 120000;
  enum Boot { BOOT_NORMAL, BOOT_TRIAL, BOOT_ROLLBACK };
  enum Trial { TRIAL_IDLE, TRIAL_WAIT, TRIAL_CONFIRM, TRIAL_ROLLBACK };

  // Call once per boot, before anything that could crash; persist the record afterwards.
  static Boot onBoot(OtaRecord& r) {
    if (!r.pending) return BOOT_NORMAL;
    if (r.attempts >= kMaxAttempts) return BOOT_ROLLBACK;
    r.attempts++;
    return BOOT_TRIAL;
  }
  static Trial onTick(const OtaRecord& r, uint32_t uptimeMs, bool healthy) {
    if (!r.pending) return TRIAL_IDLE;
    if (healthy) return TRIAL_CONFIRM;
    if (uptimeMs >= kHealthDeadlineMs) return TRIAL_ROLLBACK;
    return TRIAL_WAIT;
  }
  static void finish(OtaRecord& r, bool confirmed) {
    r.pending = false; r.attempts = 0; r.outcome = confirmed ? 1 : 2;
  }

  // ---- request validation (no network, no flash) ----
  static bool hexDigest(const char* hex) {
    if (!hex || strlen(hex) != 64) return false;
    for (int i = 0; i < 64; i++) {
      const char c = hex[i];
      if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f'))) return false;  // lowercase only
    }
    return true;
  }
  static bool version(const char* v) {
    if (!v) return false;
    const size_t n = strlen(v);
    if (n < 5 || n > 23) return false;
    int dots = 0; bool digit = false;
    for (size_t i = 0; i < n; i++) {
      if (v[i] >= '0' && v[i] <= '9') digit = true;
      else if (v[i] == '.' && digit) { dots++; digit = false; }
      else if (v[i] == '-' && dots == 2 && digit) {  // pre-release suffix: 1..8 [a-z0-9]
        const size_t rest = n - i - 1;
        if (rest < 1 || rest > 8) return false;
        for (size_t j = i + 1; j < n; j++) if (!((v[j] >= 'a' && v[j] <= 'z') || (v[j] >= '0' && v[j] <= '9'))) return false;
        return true;
      }
      else return false;
    }
    return dots == 2 && digit;
  }
  // https only, no credentials/port tricks, host must end with the allowed suffix
  // (e.g. ".amazonaws.com" so the device's pinned Amazon Root CA validates it).
  static bool url(const char* u, const char* allowedHostSuffix) {
    if (!u || strncmp(u, "https://", 8) != 0 || strlen(u) > 1024) return false;
    const char* host = u + 8;
    const char* end = host;
    while (*end && *end != '/' && *end != '?') {
      if (*end == '@' || *end == ':' || *end == '\\') return false;
      end++;
    }
    const size_t hostLen = end - host, suffixLen = strlen(allowedHostSuffix);
    if (hostLen <= suffixLen || *end != '/') return false;
    if (strncmp(end - suffixLen, allowedHostSuffix, suffixLen) != 0) return false;
    for (const char* p = u; *p; p++) if ((unsigned char)*p <= ' ' || *p == '"' || *p == '<' || *p == '>') return false;
    return true;
  }
  static const char* request(const char* otaId, const char* ver, const char* link, uint32_t size, const char* sha256,
                             const char* signature, int64_t issued, int64_t expires, int64_t epoch,
                             uint32_t partitionSize, const char* allowedHostSuffix, bool actuatorsIdle) {
    if (!otaId || strlen(otaId) != 36) return "INVALID_OTA";
    if (epoch < 1700000000) return "CLOCK_NOT_READY";
    if (issued <= 0 || expires <= issued || expires - issued > 60) return "INVALID_LIFETIME";
    if (issued > epoch + 10) return "CLOCK_SKEW";
    if (expires <= epoch) return "EXPIRED";
    if (!version(ver)) return "INVALID_VERSION";
    if (!url(link, allowedHostSuffix)) return "URL_NOT_ALLOWED";
    if (size < 1024 || size > partitionSize) return "INVALID_SIZE";
    if (!hexDigest(sha256)) return "INVALID_HASH";
    if (!signature || strlen(signature) < 80 || strlen(signature) > 200) return "INVALID_SIGNATURE";
    if (!actuatorsIdle) return "ACTUATORS_ACTIVE";
    return nullptr;
  }
};
