#include <iostream>
#include "ValveMonitor.h"
int main(){JsonDocument result;auto list=result.to<JsonArray>();
 for(int i=0;i<3;i++){ValveFeedback feedback(true);feedback.sample(0,true,i==0,false);feedback.sample(100,true,i==0,false);JsonDocument d;
  if(!valve::monitorPacket(d,"IRRIGATION04","VALVE04","ALERTC1",1,1,"AZONE1",i==0?"82000000-0000-4000-8000-000000000001":"82000000-0000-4000-8000-000000000002",i==2?1:0,"2026-10-15T00:00:00Z",i==0?"POSITION_FAULT":"BOOT",&feedback))return 1;
  list.add(d.as<JsonObject>());
 }serializeJson(result,std::cout);std::cout<<'\n';}
