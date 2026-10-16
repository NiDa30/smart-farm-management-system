#include "../../firmware/weather-node/include/WeatherPacket.h"
#include <cassert>
#include <cmath>
#include <cstdio>
#include <string>
int main(int argc,char** argv) {
  auto dark=weather::measure(false,0,false,false),sun=weather::measure(true,4095,false,false);
  assert(dark.rainValid && !dark.raining && dark.lightValid && dark.lux==0);
  assert(sun.raining && sun.lightValid && sun.lux==200000);
  assert(std::abs(weather::measure(false,2048,false,false).lux-100024.420024)<.001);
  assert(!weather::measure(false,-1,false,false).lightValid);
  assert(!weather::measure(false,4096,false,false).lightValid);
  auto rainFault=weather::measure(false,4095,true,false);
  assert(!rainFault.rainValid && rainFault.lightValid);
  auto lightFault=weather::measure(true,0,false,true);
  assert(lightFault.rainValid && lightFault.raining && !lightFault.lightValid);
  const char* utc=argc==2?argv[1]:"2026-10-16T00:00:00Z";
  weather::Readings samples[]={weather::measure(false,4095,false,false),dark,sun,weather::measure(false,2000,true,true),weather::measure(true,2048,false,false)};
  for(int i=0;i<(argc==2?5:1);i++) {
    JsonDocument doc;weather::packet(doc,"WEATHER01","85000000-0000-4000-8000-000000000001",i+1,utc,5000*(i+1),samples[i]);
    assert(doc["readings"].size()==2 && doc["dataSource"].as<std::string>()=="SIMULATOR");
    assert(doc["readings"][0]["calibrationVersion"].isNull());
    assert(doc["readings"][1]["calibrationVersion"].as<std::string>()=="SIM_LUX_V1");
    if(i==0){assert(!doc["readings"][0]["value"].as<bool>());assert(doc["readings"][1]["value"].as<double>()==200000);}
    if(i==3){assert(doc["readings"][0]["value"].isNull());assert(doc["readings"][1]["value"].isNull());}
    std::string json;serializeJson(doc,json);puts(json.c_str());
  }
}
