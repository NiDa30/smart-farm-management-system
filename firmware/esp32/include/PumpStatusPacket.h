#pragma once
#include <ArduinoJson.h>
// Common native-testable status encoder; caller supplies base schema/boot/sequence/time.
inline void fillPumpStatus(JsonDocument& doc,const char* state,bool locked,const char* reason,const char* activeId) {
  doc["deviceId"]="PUMP01";doc["connection"]="ONLINE";doc["reportedState"]=state;
  doc["safetyLockout"]=locked;doc["stateReason"]=reason;
  if(activeId&&*activeId)doc["activeCommandId"]=activeId;else doc["activeCommandId"]=nullptr;
}
