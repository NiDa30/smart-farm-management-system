#include <cassert>
#include <iostream>
#include "ValvePacket.h"
int main(){setenv("TZ","UTC0",1);tzset();const int64_t epoch=1792000000;
 ValveModel v;assert(!v.isOpen());assert(!v.apply(1,true,5,epoch,epoch+10,epoch,1000,true,true,true));assert(v.isOpen());assert(v.apply(1,true,5,epoch,epoch+10,epoch,2000,true,true,true));v.tick(6000,true);assert(!v.isOpen());assert(std::string(v.reason())=="TIMER_EXPIRED");
 assert(!v.apply(2,false,0,epoch,epoch+10,epoch,7000,false,true,true));assert(v.apply(1,true,5,epoch,epoch+10,epoch,7001,true,true,true));assert(!v.isOpen());
 assert(v.apply(3,true,5,epoch,epoch+10,epoch,8000,false,true,true));assert(!v.isOpen());assert(v.apply(3,true,31,epoch,epoch+10,epoch,8000,true,true,true));assert(v.apply(3,true,5,epoch+3,epoch+13,epoch,8000,true,true,true));
 assert(!v.apply(3,true,5,epoch,epoch+10,epoch,8000,true,true,true));v.tick(8001,false);assert(!v.isOpen());assert(std::string(v.reason())=="CONNECTION_LOST");v.tick(8002,true);assert(!v.isOpen());
 ValveModel wrap;assert(!wrap.apply(1,true,1,epoch,epoch+10,epoch,0xfffffff0u,true,true,true));wrap.tick(0xfffffff0u+999u,true);assert(wrap.isOpen());wrap.tick(0xfffffff0u+1000u,true);assert(!wrap.isOpen());
 ValveModel disabled;assert(disabled.apply(1,true,1,epoch,epoch+10,epoch,0,true,false,true));assert(!disabled.isOpen());assert(disabled.apply(1,true,1,epoch,epoch+10,epoch,1,true,true,true));
 const char* json="{\"schemaVersion\":1,\"controllerId\":\"IRRIGATION01\",\"actuatorId\":\"VALVE01\",\"zoneId\":\"ZONE01\",\"commandId\":\"51000000-0000-4000-8000-000000000001\",\"bootId\":\"51000000-0000-4000-8000-000000000001\",\"ordinal\":4,\"action\":\"OPEN\",\"issuedAt\":\"2026-10-15T00:00:00Z\",\"expiresAt\":\"2026-10-15T00:00:10Z\",\"durationSeconds\":5}";
 valve::Command c;assert(valve::decode(json,"ZONE01",c));assert(!valve::decode((std::string(json)+"{}").c_str(),"ZONE01",c));assert(!valve::decode(json,"ZONE02",c));std::string duplicate(json);duplicate.insert(1,"\"action\":\"OPEN\",");assert(!valve::decode(duplicate.c_str(),"ZONE01",c));assert(valve::utc("2026-02-30T00:00:00Z")==0);
 JsonDocument packet;valve::packet(packet,"ZONE01","51000000-0000-4000-8000-000000000001",0,"2026-10-15T00:00:00Z",false,"BOOT",true,0);assert(packet["feedbackState"]=="UNKNOWN");assert(packet["dataSource"]=="SIMULATOR");assert(packet["gpioState"]=="CLOSED");
 std::cout<<"PASS valve model/decode: bounded timer, duplicate fence, boot binding, close ordering, disconnect, wrap, disabled, strict JSON and packet provenance\n";
}
