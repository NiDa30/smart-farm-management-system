#include "../../firmware/water-node/include/WaterPacket.h"
#include <string>
#include <cassert>
#include <cstdio>
int main(){
 JsonDocument doc;
 water::packet(doc,"WATER01","34000000-0000-4000-8000-000000000001",1,"2026-10-14T00:00:00Z",5000,true,true,true,false,{true,6.0,"VALID"},"");
 assert(doc["readings"][0]["value"].as<bool>()==true);
 assert(doc["readings"][1]["value"].as<bool>()==false);
 assert(doc["readings"][2]["value"].as<double>()==6.0);
 assert(doc["dataSource"].as<std::string>()=="SIMULATOR");
 std::string payload;serializeJson(doc,payload);puts(payload.c_str());
 JsonDocument fault;
 water::packet(fault,"WATER01","34000000-0000-4000-8000-000000000001",2,"2026-10-14T00:00:05Z",10000,false,false,false,true,{false,0,"SIGNAL_TOO_FAST"},"FLOW-V1");
 assert(fault["readings"][0]["value"].isNull());assert(fault["readings"][1]["value"].isNull());assert(fault["readings"][2]["value"].isNull());
 assert(fault["readings"][2]["quality"].as<std::string>()=="SENSOR_FAULT");assert(fault["dataSource"].as<std::string>()=="PHYSICAL");
}
