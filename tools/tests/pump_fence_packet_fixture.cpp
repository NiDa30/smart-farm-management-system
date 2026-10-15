#include "../../firmware/esp32/include/PumpStatusPacket.h"
#include "../../firmware/esp32/include/FencedPumpPacket.h"
#include <iostream>
int main(){JsonDocument d;d["schemaVersion"]=1;d["bootId"]="71000000-0000-4000-8000-000000000001";d["sequence"]=1;d["timestamp"]="2026-10-15T03:00:00Z";fillPumpStatus(d,"OFF",false,"BOOT",nullptr);pumpFence::status(d,0,false);serializeJson(d,std::cout);}
