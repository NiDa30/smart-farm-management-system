#pragma once
#include "ValvePacket.h"
namespace valve {
inline bool numbered(const char* s,const char* prefix){size_t n=strlen(prefix);return s&&strlen(s)==n+2&&strncmp(s,prefix,n)==0&&s[n]>='0'&&s[n]<='9'&&s[n+1]>='0'&&s[n+1]<='9'&&(s[n]>'0'||s[n+1]>='2');}
inline bool monitorIdentity(const char* controller,const char* actuator,const char* circuit,unsigned revision,unsigned zoneRevision){return numbered(controller,"IRRIGATION")&&numbered(actuator,"VALVE")&&code(circuit)&&revision>0&&revision<=2147483647U&&zoneRevision>0&&zoneRevision<=2147483647U;}
// Separate observation contract. No command decoder is introduced for these IDs.
inline bool monitorPacket(JsonDocument& d,const char* controller,const char* actuator,const char* circuit,unsigned revision,unsigned zoneRevision,const char* zone,const char* boot,uint64_t sequence,const char* timestamp,const char* reason,const ValveFeedback* feedback=nullptr){
 if(!monitorIdentity(controller,actuator,circuit,revision,zoneRevision)||!code(zone)||!uuid(boot)||sequence>9007199254740991ULL)return false;
 packet(d,zone,boot,sequence,timestamp,false,reason,false,0,feedback);d["controllerId"]=controller;d["actuatorId"]=actuator;d["monitorOnly"]=true;d["circuitId"]=circuit;d["circuitRevision"]=revision;d["zoneRevision"]=zoneRevision;return true;
}
}
