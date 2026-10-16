#include "../../firmware/water-node/include/WaterPacket.h"
#include <cassert>
#include <cstdio>
#include <string>
int main(int argc,char** argv){
 if(argc!=2)return 2;
 for(int i=0;i<4;i++){
  JsonDocument doc;bool valid=i!=2,present=i==0||i==3;
  water::packet(doc,"WATER01","86000000-0000-4000-8000-000000000001",i+1,argv[1],5000*(i+1),true,valid,present,false,{true,0,"VALID"},"SIM_FLOW_V1");
  assert(doc["readings"][2]["value"].as<double>()==0);
  if(valid)assert(doc["readings"][0]["value"].as<bool>()==present);
  else assert(doc["readings"][0]["value"].isNull());
  std::string json;serializeJson(doc,json);puts(json.c_str());
 }
}
