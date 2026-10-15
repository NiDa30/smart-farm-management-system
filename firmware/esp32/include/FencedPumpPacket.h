#pragma once
#include <ArduinoJson.h>
#include <ctype.h>
#include <cstring>
#include <time.h>
namespace pumpFence {
inline bool uuid(const char* v){if(!v||strlen(v)!=36)return false;for(int i=0;i<36;i++)if(i==8||i==13||i==18||i==23){if(v[i]!='-')return false;}else if(!isxdigit((unsigned char)v[i]))return false;return true;}
inline int64_t utc(const char* v){if(!v||strlen(v)!=20)return 0;struct tm tm={};const char* end=strptime(v,"%Y-%m-%dT%H:%M:%SZ",&tm);if(!end||*end)return 0;time_t epoch=mktime(&tm);char check[21];strftime(check,sizeof(check),"%Y-%m-%dT%H:%M:%SZ",&tm);return strcmp(v,check)==0?epoch:0;}
struct Command {char id[37]={},target[37]={};uint64_t ordinal=0;bool off=false,on=false,legacyOff=false;unsigned seconds=0;int64_t issued=0,expires=0;};
inline bool decode(const char* text,Command& out){
 if(!text||strlen(text)>768||strchr(text,'\\'))return false;
 bool quoted=false,closed=false;int depth=0;
 for(const char* p=text;*p;p++){if(closed){if(!isspace((unsigned char)*p))return false;continue;}if(*p=='"')quoted=!quoted;else if(!quoted&&*p=='{')depth++;else if(!quoted&&*p=='}'&&--depth==0)closed=true;}
 if(!closed)return false;
 JsonDocument d;if(deserializeJson(d,text)||!d.is<JsonObject>())return false;
 const char* action=d["action"]|"";out.on=strcmp(action,"ON")==0;out.off=strcmp(action,"OFF")==0;if(!out.on&&!out.off&&strcmp(action,"RESET_LOCKOUT"))return false;
 bool fenced=d["commandFence"].is<JsonObject>();out.legacyOff=out.off&&!fenced;
 if(!fenced&&!out.legacyOff)return false;
 if(d.size()!=(out.on?7u:6u)+(fenced?1u:0u)||!d["schemaVersion"].is<int>()||d["schemaVersion"].as<int>()!=1||strcmp(d["deviceId"]|"","PUMP01")||!uuid(d["commandId"]|""))return false;
 const char* keys[]={"schemaVersion","commandId","deviceId","action","issuedAt","expiresAt","durationSeconds","commandFence","version","ordinal","targetBootId"};
 for(unsigned i=0;i<11;i++){
  bool needed=i<6||(i==6&&out.on)||(i>6&&fenced);if(!needed)continue;
  char token[32];snprintf(token,sizeof(token),"\"%s\"",keys[i]);const char* p=strstr(text,token);if(!p||strstr(p+strlen(token),token))return false;
 }
 if(out.on&&(!d["durationSeconds"].is<unsigned>()||d["durationSeconds"].as<unsigned>()<1||d["durationSeconds"].as<unsigned>()>3600))return false;
 if(!out.on&&!d["durationSeconds"].isUnbound())return false;
 if(fenced){auto f=d["commandFence"].as<JsonObjectConst>();if(f.size()!=3||!f["version"].is<int>()||f["version"].as<int>()!=1||!f["ordinal"].is<uint64_t>()||f["ordinal"].as<uint64_t>()==0||f["ordinal"].as<uint64_t>()>9007199254740991ULL||!uuid(f["targetBootId"]|""))return false;out.ordinal=f["ordinal"];strcpy(out.target,f["targetBootId"]);}
 strcpy(out.id,d["commandId"]);out.seconds=out.on?d["durationSeconds"].as<unsigned>():0;out.issued=utc(d["issuedAt"]|"");out.expires=utc(d["expiresAt"]|"");return out.issued>0&&out.expires>0;
}
inline void status(JsonDocument& d,uint64_t ordinal,bool restart){auto f=d["commandFence"].to<JsonObject>();f["version"]=1;f["lastOrdinal"]=ordinal;f["restartRequired"]=restart;}
inline void ack(JsonDocument& d,uint64_t ordinal){auto f=d["commandFence"].to<JsonObject>();f["version"]=1;f["ordinal"]=ordinal;}
}
