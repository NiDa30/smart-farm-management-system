#pragma once
#include "ValvePacket.h"
namespace valve {
inline bool numbered(const char* s,const char* prefix){size_t n=strlen(prefix);return s&&strlen(s)==n+2&&strncmp(s,prefix,n)==0&&s[n]>='0'&&s[n]<='9'&&s[n+1]>='0'&&s[n+1]<='9'&&(s[n]>'0'||s[n+1]>='2');}
inline bool monitorIdentity(const char* controller,const char* actuator,const char* circuit,unsigned revision,unsigned zoneRevision){return numbered(controller,"IRRIGATION")&&numbered(actuator,"VALVE")&&code(circuit)&&revision>0&&revision<=2147483647U&&zoneRevision>0&&zoneRevision<=2147483647U;}
// Separate observation contract; control uses its own explicit profile and topics.
inline bool monitorPacket(JsonDocument& d,const char* controller,const char* actuator,const char* circuit,unsigned revision,unsigned zoneRevision,const char* zone,const char* boot,uint64_t sequence,const char* timestamp,const char* reason,const ValveFeedback* feedback=nullptr){
 if(!monitorIdentity(controller,actuator,circuit,revision,zoneRevision)||!code(zone)||!uuid(boot)||sequence>9007199254740991ULL)return false;
 packet(d,zone,boot,sequence,timestamp,false,reason,false,0,feedback);d["controllerId"]=controller;d["actuatorId"]=actuator;d["monitorOnly"]=true;d["circuitId"]=circuit;d["circuitRevision"]=revision;d["zoneRevision"]=zoneRevision;return true;
}
// This decoder is called only by the opt-in CIRCUIT_LED_DEMO build profile.
inline bool decodeCircuit(const char* text,const char* controller,const char* actuator,const char* circuit,unsigned revision,unsigned zoneRevision,const char* zone,Command& out){
 return monitorIdentity(controller,actuator,circuit,revision,zoneRevision)&&code(zone)&&decodeFor(text,zone,out,controller,actuator,circuit,revision,zoneRevision);
}
inline bool circuitPacket(JsonDocument& d,const char* controller,const char* actuator,const char* circuit,unsigned revision,unsigned zoneRevision,const char* zone,const char* boot,uint64_t sequence,const char* timestamp,bool open,const char* reason,bool enabled,uint64_t ordinal,const ValveFeedback* feedback){
 if(!monitorIdentity(controller,actuator,circuit,revision,zoneRevision)||!code(zone)||!uuid(boot)||!feedback||!feedback->isEnabled()||sequence>9007199254740991ULL)return false;
 packet(d,zone,boot,sequence,timestamp,open,reason,enabled,ordinal,feedback);d["controlProfile"]="CIRCUIT_LED_DEMO";d["controllerId"]=controller;d["actuatorId"]=actuator;d["circuitId"]=circuit;d["circuitRevision"]=revision;d["zoneRevision"]=zoneRevision;return true;
}
inline const char* applyCircuit(ValveModel& model,const Command& c,const char* boot,int64_t epoch,uint32_t now,bool enabled,bool link,bool positionReady){
 model.tick(now,link);if(strcmp(c.boot,boot))return "BOOT_MISMATCH";
 return model.apply(c.ordinal,c.open,c.seconds,c.issued,c.expires,epoch,now,true,enabled,link,positionReady);
}

}
