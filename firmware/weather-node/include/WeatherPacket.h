#pragma once
#include <ArduinoJson.h>
#include "WeatherMeasurements.h"
namespace weather {
inline void packet(JsonDocument& doc,const char* node,const char* boot,uint64_t sequence,
                   const char* utc,uint64_t uptime,const Readings& r) {
  doc["schemaVersion"]=2;doc["deviceId"]=node;doc["bootId"]=boot;doc["sequence"]=sequence;
  doc["timestamp"]=utc;doc["uptimeMs"]=uptime;doc["dataSource"]="SIMULATOR";
  auto values=doc["readings"].to<JsonArray>();
  auto rain=values.add<JsonObject>();rain["channelId"]="RAIN";rain["metric"]="RAIN_DETECTED";rain["unit"]="boolean";
  rain["quality"]=r.rainValid?"VALID":"SENSOR_FAULT";
  if(r.rainValid)rain["value"]=r.raining;else rain["value"]=nullptr;
  rain["calibrationVersion"]=nullptr;
  auto light=values.add<JsonObject>();light["channelId"]="LIGHT";light["metric"]="LIGHT_ILLUMINANCE";light["unit"]="lux";
  light["quality"]=r.lightValid?"VALID":"SENSOR_FAULT";
  if(r.lightValid)light["value"]=r.lux;else light["value"]=nullptr;
  light["calibrationVersion"]="SIM_LUX_V1";
}
}
