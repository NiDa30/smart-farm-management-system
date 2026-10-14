#pragma once
#include <cmath>
namespace soil {
struct Reading { bool valid; double percent; };
// Calibration is independent per probe. Never convert a failed read to dry soil.
inline Reading measure(int raw,int dry,int wet,bool fault,bool calibrated) {
  if(fault || !calibrated || raw<0 || raw>4095 || dry<0 || dry>4095 || wet<0 || wet>4095 || std::abs(dry-wet)<100)
    return {false,0};
  double percent=100.0*(raw-dry)/(wet-dry);
  // Saturation is a legitimate endpoint, not evidence of a disconnected probe.
  return {true,percent<0?0:percent>100?100:percent};
}
}
