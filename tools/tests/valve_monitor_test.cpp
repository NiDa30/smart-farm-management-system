#include <cassert>
#include <string>
#include <initializer_list>
#include "ValveMonitor.h"
int main(){
 assert(valve::monitorIdentity("IRRIGATION02","VALVE02","CIRCUIT01",1,1));
 assert(valve::monitorIdentity("IRRIGATION99","VALVE99","CIRCUIT_9",2147483647U,1));
 for(const char* id:{"IRRIGATION01","IRRIGATION00","IRRIGATION100","IRRIGATION0*","BAD"})assert(!valve::monitorIdentity(id,"VALVE02","CIRCUIT01",1,1));
 assert(!valve::monitorIdentity("IRRIGATION02","VALVE01","CIRCUIT01",1,1));assert(!valve::monitorIdentity("IRRIGATION02","VALVE02","bad",1,1));assert(!valve::monitorIdentity("IRRIGATION02","VALVE02","CIRCUIT01",0,1));
 ValveFeedback feedback(true);feedback.sample(0,true,false,false);feedback.sample(100,true,false,false);JsonDocument d;
 assert(valve::monitorPacket(d,"IRRIGATION02","VALVE02","CIRCUIT01",2,3,"ZONE01","71000000-0000-4000-8000-000000000001",4,"2026-10-15T00:00:00Z","BOOT",&feedback));
 assert(d["monitorOnly"].as<bool>()&&!d["demoEnabled"].as<bool>()&&d["gpioState"]=="CLOSED"&&d["lastOrdinal"]==0&&d["controllerId"]=="IRRIGATION02"&&d["actuatorId"]=="VALVE02");
 assert(d["circuitRevision"]==2&&d["zoneRevision"]==3&&d["positionFeedback"]["state"]=="CLOSED");
 // Monitor JSON is not a command, and changing its identity never extends the legacy command decoder.
 std::string text;serializeJson(d,text);valve::Command command;assert(!valve::decode(text.c_str(),"ZONE01",command));
}
