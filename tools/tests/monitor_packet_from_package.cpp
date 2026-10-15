#include "config.example.h"
#include "ValveMonitor.h"
#include <iostream>
static_assert(IRRIGATION_MONITOR_ONLY==1&&IRRIGATION_DEMO_ENABLED==0&&IRRIGATION_SIMULATOR==1&&IRRIGATION_POSITION_FEEDBACK_ENABLED==1,"Expected exported monitor profile");
int main(){
 ValveFeedback position(true);position.sample(0,true,false,false);position.sample(100,true,false,false);
 JsonDocument d;
 if(!valve::monitorPacket(d,IRRIGATION_CONTROLLER_ID,IRRIGATION_VALVE_ID,IRRIGATION_CIRCUIT_ID,
     IRRIGATION_CIRCUIT_REVISION,IRRIGATION_ZONE_REVISION,IRRIGATION_ZONE_ID,
     "86000000-0000-4000-8000-000000000001",0,"2026-10-15T00:00:00Z","BOOT",&position))return 1;
 serializeJson(d,std::cout);std::cout<<'\n';
}
