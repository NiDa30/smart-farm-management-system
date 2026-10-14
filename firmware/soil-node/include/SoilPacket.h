#pragma once
#include <ArduinoJson.h>
#include "SoilMeasurements.h"
namespace soil {
inline void packet(JsonDocument& doc,const char* node,const char* boot,uint64_t sequence,
                   const char* utc,uint64_t uptime,bool simulator,const Reading* readings,const char* const* calibration) {
  doc["schemaVersion"]=2;doc["deviceId"]=node;doc["bootId"]=boot;doc["sequence"]=sequence;
  doc["timestamp"]=utc;doc["uptimeMs"]=uptime;doc["dataSource"]=simulator?"SIMULATOR":"PHYSICAL";
  const char* ids[]={"SOIL1","SOIL2","SOIL3"};
  auto values=doc["readings"].to<JsonArray>();
  for(int i=0;i<3;i++) {
    auto value=values.add<JsonObject>();value["channelId"]=ids[i];value["metric"]="SOIL_MOISTURE";value["unit"]="%";
    value["quality"]=readings[i].valid?"VALID":"SENSOR_FAULT";
    if(readings[i].valid)value["value"]=readings[i].percent;else value["value"]=nullptr;
    if(calibration[i] && *calibration[i])value["calibrationVersion"]=calibration[i];else value["calibrationVersion"]=nullptr;
  }
}
}
