#pragma once
#include <stdint.h>
#include <string.h>
#include <mbedtls/sha256.h>
#include <mbedtls/pk.h>
#include <mbedtls/base64.h>

// Streaming SHA-256 of the downloaded image and ECDSA P-256 verification of its signature.
// Signature = ECDSA(SHA-256(image)), DER, base64 — what tools/ota/sign_firmware.py produces
// with cryptography's ec.ECDSA(hashes.SHA256()). Uses mbedtls 2.28 (ESP-IDF 4.4), native-tested.
class FirmwareHash {
 public:
  FirmwareHash() { mbedtls_sha256_init(&ctx); }
  ~FirmwareHash() { mbedtls_sha256_free(&ctx); }
  bool begin() { return mbedtls_sha256_starts_ret(&ctx, 0) == 0; }
  bool update(const uint8_t* data, size_t len) { return mbedtls_sha256_update_ret(&ctx, data, len) == 0; }
  bool finish(uint8_t out[32]) { return mbedtls_sha256_finish_ret(&ctx, out) == 0; }
 private:
  mbedtls_sha256_context ctx;
};

class OtaVerify {
 public:
  static bool parseHex(const char* hex, uint8_t out[32]) {
    if (!hex || strlen(hex) != 64) return false;
    for (int i = 0; i < 32; i++) {
      int hi = nibble(hex[2 * i]), lo = nibble(hex[2 * i + 1]);
      if (hi < 0 || lo < 0) return false;
      out[i] = uint8_t(hi << 4 | lo);
    }
    return true;
  }
  // Returns nullptr when the image digest matches and the signature verifies with the
  // compiled-in public key; otherwise an ACK error code. Constant-time digest compare.
  static const char* check(const uint8_t digest[32], const char* expectedHex, const char* signatureB64, const char* publicKeyPem) {
    uint8_t expected[32];
    if (!parseHex(expectedHex, expected)) return "INVALID_HASH";
    uint8_t diff = 0;
    for (int i = 0; i < 32; i++) diff |= uint8_t(digest[i] ^ expected[i]);
    if (diff) return "HASH_MISMATCH";
    uint8_t signature[160];
    size_t length = 0;
    if (!signatureB64 || mbedtls_base64_decode(signature, sizeof(signature), &length,
          reinterpret_cast<const unsigned char*>(signatureB64), strlen(signatureB64)) != 0 || length < 8) return "INVALID_SIGNATURE";
    mbedtls_pk_context key;
    mbedtls_pk_init(&key);
    const char* error = nullptr;
    if (!publicKeyPem || mbedtls_pk_parse_public_key(&key, reinterpret_cast<const unsigned char*>(publicKeyPem), strlen(publicKeyPem) + 1) != 0
        || !mbedtls_pk_can_do(&key, MBEDTLS_PK_ECKEY)) error = "BAD_PUBLIC_KEY";
    else if (mbedtls_pk_verify(&key, MBEDTLS_MD_SHA256, digest, 32, signature, length) != 0) error = "BAD_SIGNATURE";
    mbedtls_pk_free(&key);
    return error;
  }
 private:
  static int nibble(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    return -1;
  }
};
