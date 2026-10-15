#pragma once
#include <Preferences.h>

// Dedicated key, one atomic NVS u32; no global erase, filesystem or credentials.
// No calls from an ISR, ESP timer or with relayMux held.
class PumpSafetyNvs {
 public:
  bool read(uint32_t& record){
    if(!open())return false;
    if(!prefs.isKey("journal")){record=0;return true;}
    if(prefs.getType("journal")!=PT_U32)return false;
    record=prefs.getUInt("journal",0);return record!=0;
  }
  bool write(uint32_t record){return open()&&prefs.putUInt("journal",record)==sizeof(record);}
 private:
  bool open(){if(!opened)opened=prefs.begin("sf-pump-safety",false);return opened;}
  Preferences prefs;bool opened=false;
};
