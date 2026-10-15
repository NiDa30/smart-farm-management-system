#pragma once
#include <ArduinoJson.h>
#include "ValveProofInterlock.h"
#include "PumpSafetyJournal.h"
// Common native-testable status encoder; caller supplies base schema/boot/sequence/time.
inline void fillPumpStatus(JsonDocument& doc,const char* state,bool locked,const char* reason,const char* activeId) {
  doc["deviceId"]="PUMP01";doc["connection"]="ONLINE";doc["reportedState"]=state;
  doc["safetyLockout"]=locked;doc["stateReason"]=reason;
  if(activeId&&*activeId)doc["activeCommandId"]=activeId;else doc["activeCommandId"]=nullptr;
}
inline void fillValveProof(JsonDocument& doc,const ValveProofInterlock& proof){
  auto p=doc["valveInterlock"].to<JsonObject>();p["version"]=1;p["enabled"]=true;p["dataSource"]="SIMULATOR";
  p["state"]=ValveProofInterlock::stateName(proof.state());const char* fault=ValveProofInterlock::faultName(proof.fault());if(fault)p["fault"]=fault;else p["fault"]=nullptr;
}
template<class Store> inline void fillDurableSafety(JsonDocument& doc,const PumpSafetyJournal<Store>& journal){
  auto p=doc["durableSafety"].to<JsonObject>();p["version"]=1;p["enabled"]=true;p["storage"]="NVS";
  p["state"]=PumpSafetyJournal<Store>::name(journal.state());
}
