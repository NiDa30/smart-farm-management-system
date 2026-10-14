#include "../../firmware/soil-node/include/SoilPacket.h"
#include <cassert>
#include <cstdio>
#include <string>
int main(){
 assert(soil::measure(0,0,4095,false,true).percent==0);
 assert(soil::measure(4095,0,4095,false,true).percent==100);
 assert(soil::measure(1000,3000,1000,false,true).percent==100);
 assert(soil::measure(4095,3000,1000,false,true).percent==0);
 for(auto r:{soil::measure(-1,0,4095,false,true),soil::measure(4096,0,4095,false,true),
  soil::measure(0,100,150,false,true),soil::measure(0,0,4095,true,true),soil::measure(0,0,4095,false,false)}) assert(!r.valid);
 soil::Reading values[]={soil::measure(0,0,4095,false,true),soil::measure(4095,0,4095,false,true),soil::measure(2000,0,4095,true,true)};
 const char* calibration[]={"SIM_LINEAR_V1","SIM_LINEAR_V1","SIM_LINEAR_V1"};
 JsonDocument doc;soil::packet(doc,"SOIL01","41000000-0000-4000-8000-000000000001",1,"2026-10-14T00:00:00Z",5000,true,values,calibration);
 assert(doc["readings"].size()==3);assert(doc["readings"][0]["value"].as<double>()==0);assert(doc["readings"][1]["value"].as<double>()==100);
 assert(doc["readings"][2]["value"].isNull());assert(doc["readings"][2]["quality"].as<std::string>()=="SENSOR_FAULT");
 std::string payload;serializeJson(doc,payload);puts(payload.c_str());
}
