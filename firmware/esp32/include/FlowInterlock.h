#pragma once
#include <stdint.h>
#include <math.h>

// Caller serializes access. GPIO/ISR/timers stay in the platform adapter.
class FlowInterlock {
 public:
  enum Fault { NONE, LOW_FLOW, SENSOR_FAULT };
  struct Config { bool enabled, calibrationDeclared; double pulsesPerLitre, minimumLpm, maximumHz; uint32_t graceMs; };
  explicit FlowInterlock(Config value):config(value) {}
  bool validConfig() const {
    return !config.enabled || (config.calibrationDeclared && isfinite(config.pulsesPerLitre) && config.pulsesPerLitre>0
      && isfinite(config.minimumLpm) && config.minimumLpm>0 && isfinite(config.maximumHz) && config.maximumHz>0
      && config.minimumLpm*config.pulsesPerLitre/60.0<=config.maximumHz && config.graceMs>=1000 && config.graceMs<=30000);
  }
  Fault start(uint32_t now) {
    if(!config.enabled)return NONE;
    if(latched!=NONE)return latched;
    if(!validConfig())return trip(SENSOR_FAULT);
    watching=true;priming=true;started=windowStart=now;pulses=0;lowWindows=0;hasRate=false;return NONE;
  }
  void stop(){watching=false;pulses=0;lowWindows=0;}
  Fault reset(){
    if(watching)return latched;
    latched=NONE;if(!validConfig())return trip(SENSOR_FAULT);return NONE;
  }
  Fault sample(uint32_t now,uint32_t delta,bool overflow) {
    if(!config.enabled||!watching)return NONE;
    uint32_t elapsed=now-windowStart;
    pulses+=delta;
    if(overflow||pulses>UINT32_MAX||elapsed>2500||!validConfig())return trip(SENSOR_FAULT);
    if(elapsed<1000)return NONE;
    double hz=double(pulses)*1000.0/elapsed;
    if(!isfinite(hz)||hz>config.maximumHz)return trip(SENSOR_FAULT);
    rate=hz*60.0/config.pulsesPerLitre;
    if(!isfinite(rate))return trip(SENSOR_FAULT);
    hasRate=true;
    windowStart=now;pulses=0;
    if(priming){
      // Discard the entire final priming window; only full post-grace windows count.
      if(uint32_t(now-started)>=config.graceMs)priming=false;
      return NONE;
    }
    lowWindows=rate<config.minimumLpm?lowWindows+1:0;
    if(lowWindows>=2)return trip(LOW_FLOW);
    return NONE;
  }
  Fault fault() const{return latched;}
  bool running() const{return watching;}
  bool measured() const{return hasRate;}
  double lpm() const{return rate;}
 private:
  Fault trip(Fault cause){latched=cause;stop();return cause;}
  Config config;Fault latched=NONE;bool watching=false,priming=false,hasRate=false;
  uint32_t started=0,windowStart=0;uint64_t pulses=0;unsigned lowWindows=0;double rate=0;
};
