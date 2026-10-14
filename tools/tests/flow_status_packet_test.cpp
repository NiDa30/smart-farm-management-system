#include "../../firmware/esp32/include/FlowInterlock.h"
#include "../../firmware/esp32/include/RelaySafety.h"
#include "../../firmware/esp32/include/PumpStatusPacket.h"
#include <cassert>
#include <iostream>
int main(){
 RelaySafety relay;FlowInterlock guard({true,true,450,1,2000,5000});const int64_t epoch=1800000000;
 assert(!relay.apply("trip",RelaySafety::ON,20,epoch,epoch+10,epoch,0));guard.start(0);
 for(uint32_t t=1000;t<=7000;t+=1000)if(guard.sample(t,0,false)==FlowInterlock::LOW_FLOW)relay.fail("trip","FLOW_LOW");
 assert(!relay.isOn()&&relay.lockout());JsonDocument doc;
 doc["schemaVersion"]=1;doc["bootId"]="38000000-0000-4000-8000-000000000001";doc["sequence"]=7;doc["timestamp"]="2026-10-14T17:00:00Z";
 fillPumpStatus(doc,relay.isOn()?"ON":"OFF",relay.lockout(),"FLOW_LOW",nullptr);
 assert(doc["stateReason"]=="FLOW_LOW"&&doc["activeCommandId"].isNull());serializeJson(doc,std::cout);std::cout<<'\n';
}
