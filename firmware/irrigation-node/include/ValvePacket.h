#pragma once
#include <ArduinoJson.h>
#include <cstring>
#include <ctype.h>
#include <time.h>
#include "ValveModel.h"
#include "ValveFeedback.h"
namespace valve {
inline bool uuid(const char* v){if(!v||strlen(v)!=36)return false;for(int i=0;i<36;i++)if(i==8||i==13||i==18||i==23){if(v[i]!='-')return false;}else if(!isxdigit((unsigned char)v[i]))return false;return true;}
inline bool code(const char* v){if(!v||strlen(v)<2||strlen(v)>32||v[0]<'A'||v[0]>'Z')return false;for(size_t i=1;i<strlen(v);i++)if(!((v[i]>='A'&&v[i]<='Z')||(v[i]>='0'&&v[i]<='9')||v[i]=='_'||v[i]=='-'))return false;return true;}
inline int64_t utc(const char* v){if(!v||strlen(v)!=20)return 0;struct tm tm={};const char* end=strptime(v,"%Y-%m-%dT%H:%M:%SZ",&tm);if(!end||*end)return 0;time_t epoch=mktime(&tm);char check[21];strftime(check,sizeof(check),"%Y-%m-%dT%H:%M:%SZ",&tm);return strcmp(v,check)==0?epoch:0;}
struct Command {char id[37]={},boot[37]={};uint64_t ordinal=0;bool open=false;unsigned seconds=0;int64_t issued=0,expires=0;};
inline bool decode(const char* text,const char* zone,Command& out){
 if(!text||strlen(text)>1023||strchr(text,'\\'))return false;
 bool quoted=false,closed=false;int depth=0;
 for(const char* p=text;*p;p++){
  if(closed){if(!isspace((unsigned char)*p))return false;continue;}
  if(*p=='"')quoted=!quoted;
  else if(!quoted&&*p=='{')depth++;
  else if(!quoted&&*p=='}'){if(--depth==0)closed=true;}
 }
 if(!closed)return false;
 JsonDocument d;if(deserializeJson(d,text)||!d.is<JsonObject>())return false;
 const char* action=d["action"]|"";bool open=strcmp(action,"OPEN")==0;if(!open&&strcmp(action,"CLOSE")!=0)return false;
 const char* keys[]={"schemaVersion","controllerId","actuatorId","zoneId","commandId","bootId","ordinal","action","issuedAt","expiresAt","durationSeconds"};
 if(d.size()!=(open?11:10))return false;
 for(unsigned i=0;i<(open?11u:10u);i++){char token[32];snprintf(token,sizeof(token),"\"%s\"",keys[i]);const char* p=strstr(text,token);if(!p||strstr(p+strlen(token),token))return false;}
 if(!d["schemaVersion"].is<int>()||d["schemaVersion"].as<int>()!=1||strcmp(d["controllerId"]|"","IRRIGATION01")||strcmp(d["actuatorId"]|"","VALVE01")||strcmp(d["zoneId"]|"",zone)||!uuid(d["commandId"]|"")||!uuid(d["bootId"]|"")||!d["ordinal"].is<uint64_t>()||d["ordinal"].as<uint64_t>()==0||d["ordinal"].as<uint64_t>()>9007199254740991ULL||(open&&(!d["durationSeconds"].is<unsigned>()||d["durationSeconds"].as<unsigned>()<1||d["durationSeconds"].as<unsigned>()>30)))return false;
 strcpy(out.id,d["commandId"]);strcpy(out.boot,d["bootId"]);out.ordinal=d["ordinal"];out.open=open;out.seconds=open?d["durationSeconds"].as<unsigned>():0;out.issued=utc(d["issuedAt"]|"");out.expires=utc(d["expiresAt"]|"");return out.issued>0&&out.expires>0;
}
inline void packet(JsonDocument& d,const char* zone,const char* boot,uint64_t seq,const char* timestamp,bool open,const char* reason,bool enabled,uint64_t rank,const ValveFeedback* feedback=nullptr){
 d["schemaVersion"]=1;d["controllerId"]="IRRIGATION01";d["actuatorId"]="VALVE01";d["zoneId"]=zone;d["bootId"]=boot;d["sequence"]=seq;d["timestamp"]=timestamp;d["dataSource"]="SIMULATOR";d["feedbackState"]="UNKNOWN";d["gpioState"]=open?"OPEN":"CLOSED";d["reason"]=reason;d["demoEnabled"]=enabled;d["lastOrdinal"]=rank;
 if(feedback&&feedback->isEnabled()){d["feedbackState"]=feedback->state();auto f=d["positionFeedback"].to<JsonObject>();f["version"]=1;f["enabled"]=true;f["state"]=feedback->state();if(feedback->fault())f["fault"]=feedback->fault();else f["fault"]=nullptr;}
}
}
