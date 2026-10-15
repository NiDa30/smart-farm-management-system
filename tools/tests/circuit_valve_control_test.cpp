#include <cassert>
#include <string>
#include <iostream>
#include "ValveMonitor.h"
int main(){
 setenv("TZ","UTC0",1);tzset();
 JsonDocument d;d["schemaVersion"]=1;d["controlProfile"]="CIRCUIT_LED_DEMO";d["controllerId"]="IRRIGATION08";d["actuatorId"]="VALVE08";d["circuitId"]="CIRCUIT08";d["circuitRevision"]=2;d["zoneId"]="ZONE08";d["zoneRevision"]=3;d["commandId"]="87000000-0000-4000-8000-000000000001";d["bootId"]="87000000-0000-4000-8000-000000000002";d["ordinal"]=5;d["action"]="OPEN";d["issuedAt"]="2026-10-16T00:00:00Z";d["expiresAt"]="2026-10-16T00:00:10Z";d["durationSeconds"]=5;
 auto text=[&](){std::string s;serializeJson(d,s);return s;};
 auto decode=[&](const std::string& s){valve::Command c;return valve::decodeCircuit(s.c_str(),"IRRIGATION08","VALVE08","CIRCUIT08",2,3,"ZONE08",c);};
 assert(decode(text()));valve::Command c;assert(!valve::decode(text().c_str(),"ZONE08",c));
 auto original=text();
 for(const char* field:{"controllerId","actuatorId","circuitId","zoneId","controlProfile"}){auto copy=d[field].as<std::string>();d[field]="WRONG";assert(!decode(text()));d[field]=copy;}
 for(const char* field:{"circuitRevision","zoneRevision"}){unsigned v=d[field];d[field]=v+1;assert(!decode(text()));d[field]=true;assert(!decode(text()));d[field]=v;}
 assert(!decode(original.substr(0,original.size()-1)+",\"circuitRevision\":2}"));
 d["action"]="CLOSE";d.remove("durationSeconds");assert(decode(text()));d["durationSeconds"]=1;assert(!decode(text()));d.remove("durationSeconds");
 ValveFeedback feedback(true);feedback.sample(0,true,false,false);feedback.sample(100,true,false,false);ValveModel model;auto epoch=valve::utc("2026-10-16T00:00:00Z");
 assert(!model.apply(5,true,5,epoch,epoch+10,epoch,100,true,true,true,feedback.canOpen()));assert(model.isOpen());model.tick(5100,true);assert(!model.isOpen());assert(std::string(model.reason())=="TIMER_EXPIRED");assert(std::string(model.apply(4,true,5,epoch,epoch+10,epoch,5200,true,true,true))=="STALE_COMMAND");assert(!model.apply(6,false,0,epoch,epoch+10,epoch,5300,true,true,true));
 assert(!model.apply(7,true,5,epoch,epoch+10,epoch,5400,true,true,true));model.tick(5401,false);assert(!model.isOpen());assert(std::string(model.reason())=="CONNECTION_LOST");
 JsonDocument packet;assert(valve::circuitPacket(packet,"IRRIGATION08","VALVE08","CIRCUIT08",2,3,"ZONE08","87000000-0000-4000-8000-000000000002",0,"2026-10-16T00:00:00Z",false,"BOOT",true,0,&feedback));assert(packet["controlProfile"]=="CIRCUIT_LED_DEMO"&&packet["controllerId"]=="IRRIGATION08"&&packet["monitorOnly"].isNull());assert(!valve::circuitPacket(packet,"IRRIGATION01","VALVE08","CIRCUIT08",2,3,"ZONE08","87000000-0000-4000-8000-000000000002",0,"2026-10-16T00:00:00Z",false,"BOOT",true,0,&feedback));
 valve::Command wrong;strcpy(wrong.boot,"87000000-0000-4000-8000-000000000003");wrong.ordinal=99;wrong.open=false;wrong.issued=epoch;wrong.expires=epoch+10;
 assert(!model.apply(8,true,5,epoch,epoch+10,epoch,6000,true,true,true));assert(std::string(valve::applyCircuit(model,wrong,"87000000-0000-4000-8000-000000000002",epoch,6001,true,true,true))=="BOOT_MISMATCH");assert(model.isOpen()&&model.lastOrdinal()==8);strcpy(wrong.boot,"87000000-0000-4000-8000-000000000002");assert(!valve::applyCircuit(model,wrong,wrong.boot,epoch,6002,true,true,true));assert(!model.isOpen());
 std::cout<<"CIRCUIT_VALVE_NATIVE_PASS identity/revisions/duplicates/profile/timer/network/ordinal/packet\n";
}
