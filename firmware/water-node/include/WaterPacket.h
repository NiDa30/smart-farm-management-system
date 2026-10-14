#pragma once
#include <ArduinoJson.h>
#include "WaterMeasurements.h"
namespace water {
inline JsonObject channel(JsonArray values,const char* id,const char* metric,const char* unit,bool valid,const char* calibration) {
  JsonObject value=values.add<JsonObject>();value["channelId"]=id;value["metric"]=metric;value["unit"]=unit;
  value["quality"]=valid?"VALID":"SENSOR_FAULT";
  if(calibration && *calibration)value["calibrationVersion"]=calibration;else value["calibrationVersion"]=nullptr;
  return value;
}
inline void packet(JsonDocument& doc,const char* node,const char* boot,uint64_t sequence,
                   const char* utc,uint64_t uptime,bool simulator,bool floatsValid,
                   bool lowWet,bool highWet,Flow flow,const char* calibration) {
  doc["schemaVersion"]=2;doc["deviceId"]=node;doc["bootId"]=boot;doc["sequence"]=sequence;
  doc["timestamp"]=utc;doc["uptimeMs"]=uptime;doc["dataSource"]=simulator?"SIMULATOR":"PHYSICAL";
  JsonArray values=doc["readings"].to<JsonArray>();
  auto low=channel(values,"LOW","WATER_PRESENT","boolean",floatsValid,nullptr);
  auto high=channel(values,"HIGH","WATER_PRESENT","boolean",floatsValid,nullptr);
  if(floatsValid){low["value"]=lowWet;high["value"]=highWet;}
  else {low["value"]=nullptr;high["value"]=nullptr;}
  auto rate=channel(values,"FLOW","FLOW_RATE","L/min",flow.valid,calibration);
  if(flow.valid)rate["value"]=flow.litresPerMinute;else rate["value"]=nullptr;
}
}
