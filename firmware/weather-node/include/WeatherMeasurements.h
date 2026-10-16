#pragma once
namespace weather {
struct Readings {bool rainValid; bool raining; bool lightValid; double lux;};
inline Readings measure(bool rainSwitch,int lightRaw,bool rainFault,bool lightFault) {
  return {!rainFault,rainSwitch,!lightFault && lightRaw>=0 && lightRaw<=4095,
    lightRaw>=0 && lightRaw<=4095 ? 200000.0*lightRaw/4095.0 : 0};
}
}
