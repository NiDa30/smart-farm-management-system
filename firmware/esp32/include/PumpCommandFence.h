#pragma once
#include <stdint.h>
#include <string.h>
// Loop-owned, RAM only. New boot creates a new instance/target UUID. Never clears the legacy-OFF latch.
class PumpCommandFence {
 public:
  const char* accept(uint64_t ordinal,const char* target,const char* boot,bool off) {
    if(ordinal==0||ordinal>9007199254740991ULL)return "INVALID_FENCE";
    if(!off&&strcmp(target,boot)!=0)return "BOOT_MISMATCH";
    if(ordinal<=last)return "STALE_ORDINAL";
    last=ordinal; // a rejected ON/RESET is consumed, not retried after recovery
    if(halted&&!off)return "FENCE_RESTART_REQUIRED";
    return nullptr;
  }
  void legacyEmergencyStop(){halted=true;}
  uint64_t lastOrdinal()const{return last;}
  bool restartRequired()const{return halted;}
 private:
  uint64_t last=0;bool halted=false;
};
