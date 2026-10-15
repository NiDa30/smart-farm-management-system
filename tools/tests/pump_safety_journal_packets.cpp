#include "PumpStatusPacket.h"
#include "FencedPumpPacket.h"
#include <iostream>
#include <cassert>
struct Store {uint32_t record=0;bool ok=true;bool read(uint32_t& v){v=record;return ok;}bool write(uint32_t v){if(ok)record=v;return ok;}};
int main(){Store store;PumpSafetyJournal<Store> journal(store);JsonDocument result;auto rows=result.to<JsonArray>();
 auto packet=[&](int sequence,const char* reason){JsonDocument p;p["schemaVersion"]=1;p["bootId"]="85000000-0000-4000-8000-000000000001";p["sequence"]=sequence;p["timestamp"]="2026-10-15T00:00:00Z";fillPumpStatus(p,"OFF",true,reason,nullptr);fillDurableSafety(p,journal);pumpFence::status(p,0,false);rows.add(p.as<JsonObject>());};
 journal.boot();assert(!journal.outputAllowed());packet(0,"RESTART_LOCKOUT");
 assert(journal.reset(true));store.ok=false;assert(!journal.arm());packet(1,"SAFETY_STORAGE_FAULT");
 serializeJson(result,std::cout);std::cout<<'\n';
}
