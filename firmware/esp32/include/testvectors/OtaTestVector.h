#pragma once
// Test vector for OTA verification (native tests and the Wokwi self-test). Generated once with a
// throwaway P-256 key whose private half was never stored. NOT a release key.
#include <stdint.h>
namespace ota_test {
inline uint8_t imageByte(uint32_t i) { return uint8_t((i * 31 + 7) & 0xff); }
const uint32_t kImageSize = 4096;
const char* const kSha256 = "d41d438c379110c7f7b2c561b1f04f26c1b4549110791f8e022f48974280c13e";
const char* const kSignature = "MEQCIADcNXuyXODTKcdFKSYhmJbRWiflqboeoY8rrCd2Hhx+AiBXRP3c0VgxHg1/QQAap2aOhjYUlAxIeUfNK6G1ihynKA==";
const char* const kPublicKey =
  "-----BEGIN PUBLIC KEY-----\n"
  "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE/sz0vBXbKszKdyOmEbYMp26iJXyB\n"
  "qFS2MbIOjlDVLggu0KGuTH7JH3jbW8gO8Ss/LG2W1PJ5mTpJrI30aUZMNg==\n"
  "-----END PUBLIC KEY-----\n";
const char* const kOtherPublicKey =
  "-----BEGIN PUBLIC KEY-----\n"
  "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE9+6Ale0uJH5dcjPzrNOskDZPry9F\n"
  "4Ly0Y09ogFCLFLiKqwuZGRlCoIgfKU2WlvWoyahm1o3x5IOF2mRLzg0fKg==\n"
  "-----END PUBLIC KEY-----\n";
}  // namespace ota_test
