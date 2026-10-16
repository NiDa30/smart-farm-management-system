#pragma once
#include <ArduinoJson.h>
#include <cstring>
namespace pumpRoute {
struct Route {char circuit[33]={},zone[33]={},controller[13]={},valve[8]={};unsigned revision=0,zoneRevision=0;};
inline bool code(const char* s){if(!s||strlen(s)<2||strlen(s)>32||s[0]<'A'||s[0]>'Z')return false;for(size_t i=1;i<strlen(s);i++)if(!((s[i]>='A'&&s[i]<='Z')||(s[i]>='0'&&s[i]<='9')||s[i]=='_'||s[i]=='-'))return false;return true;}
inline bool numbered(const char* s,const char* prefix){size_t n=strlen(prefix);return s&&strlen(s)==n+2&&!strncmp(s,prefix,n)&&s[n]>='0'&&s[n]<='9'&&s[n+1]>='0'&&s[n+1]<='9'&&(s[n]>'0'||s[n+1]>='2');}
inline bool valid(const Route& r){return code(r.circuit)&&code(r.zone)&&numbered(r.controller,"IRRIGATION")&&numbered(r.valve,"VALVE")&&r.revision>0&&r.revision<=2147483647U&&r.zoneRevision>0&&r.zoneRevision<=2147483647U;}
inline Route make(const char* circuit,unsigned revision,const char* zone,unsigned zoneRevision,const char* controller,const char* valve){Route r;if(!code(circuit)||!code(zone)||!numbered(controller,"IRRIGATION")||!numbered(valve,"VALVE"))return r;strcpy(r.circuit,circuit);strcpy(r.zone,zone);strcpy(r.controller,controller);strcpy(r.valve,valve);r.revision=revision;r.zoneRevision=zoneRevision;return r;}
inline bool read(JsonVariantConst v,Route& r){if(!v.is<JsonObjectConst>()||v.size()!=6||!v["circuitRevision"].is<unsigned>()||!v["zoneRevision"].is<unsigned>())return false;const char* circuit=v["circuitId"]|"",*zone=v["zoneId"]|"",*controller=v["controllerId"]|"",*valve=v["valveId"]|"";if(!code(circuit)||!code(zone)||!numbered(controller,"IRRIGATION")||!numbered(valve,"VALVE"))return false;strcpy(r.circuit,circuit);strcpy(r.zone,zone);strcpy(r.controller,controller);strcpy(r.valve,valve);r.revision=v["circuitRevision"];r.zoneRevision=v["zoneRevision"];return valid(r);}
inline bool same(const Route& a,const Route& b){return valid(a)&&valid(b)&&!strcmp(a.circuit,b.circuit)&&!strcmp(a.zone,b.zone)&&!strcmp(a.controller,b.controller)&&!strcmp(a.valve,b.valve)&&a.revision==b.revision&&a.zoneRevision==b.zoneRevision;}
inline void write(JsonObject v,const Route& r){v["circuitId"]=r.circuit;v["circuitRevision"]=r.revision;v["zoneId"]=r.zone;v["zoneRevision"]=r.zoneRevision;v["controllerId"]=r.controller;v["valveId"]=r.valve;}
inline const char* check(bool enabled,bool off,bool present,const Route& command,const Route& configured){if(off)return nullptr;if(!enabled)return present?"CIRCUIT_ROUTE_UNSUPPORTED":nullptr;if(!valid(configured))return "CIRCUIT_ROUTE_INVALID";if(!present)return "CIRCUIT_ROUTE_REQUIRED";return same(command,configured)?nullptr:"CIRCUIT_ROUTE_MISMATCH";}
}
