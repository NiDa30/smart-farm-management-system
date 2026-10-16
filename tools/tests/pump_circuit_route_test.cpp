#include "../../firmware/esp32/include/FencedPumpPacket.h"
#include "../../firmware/esp32/include/PumpCommandFence.h"
#include "../../firmware/esp32/include/RelaySafety.h"
#include <cassert>
#include <string>
#include <cstdio>
int main(){
 auto configured=pumpRoute::make("CIRCUIT08",1,"ZONE08",2,"IRRIGATION08","VALVE08");assert(pumpRoute::valid(configured));
 assert(!pumpRoute::valid(pumpRoute::make("BAD",1,"ZONE08",1,"IRRIGATION01","VALVE01")));
 assert(!pumpRoute::valid(pumpRoute::make("CIRCUIT08",0,"ZONE08",2,"IRRIGATION08","VALVE08")));
 JsonDocument doc;auto f=doc.to<JsonObject>();pumpRoute::write(f,configured);pumpRoute::Route restored;assert(pumpRoute::read(doc.as<JsonVariantConst>(),restored));assert(pumpRoute::same(configured,restored));
 assert(!pumpRoute::check(true,false,true,restored,configured));assert(!pumpRoute::check(false,false,false,restored,configured));assert(!pumpRoute::check(true,true,false,restored,configured));
 assert(std::string(pumpRoute::check(true,false,false,restored,configured))=="CIRCUIT_ROUTE_REQUIRED");assert(std::string(pumpRoute::check(false,false,true,restored,configured))=="CIRCUIT_ROUTE_UNSUPPORTED");
 restored.zoneRevision++;assert(std::string(pumpRoute::check(true,false,true,restored,configured))=="CIRCUIT_ROUTE_MISMATCH");assert(!pumpRoute::check(true,true,true,restored,configured));
 std::string wire=R"({"schemaVersion":1,"deviceId":"PUMP01","commandId":"89000000-0000-4000-8000-000000000001","action":"ON","durationSeconds":5,"issuedAt":"2026-10-16T03:00:00Z","expiresAt":"2026-10-16T03:00:06Z","commandFence":{"version":1,"ordinal":2,"targetBootId":"89000000-0000-4000-8000-000000000002","route":{"circuitId":"CIRCUIT08","circuitRevision":1,"zoneId":"ZONE08","zoneRevision":2,"controllerId":"IRRIGATION08","valveId":"VALVE08"}}})";
 pumpFence::Command command;assert(pumpFence::decode(wire.c_str(),command)&&command.hasRoute&&pumpRoute::same(command.route,configured));
 PumpCommandFence fence;RelaySafety relay;auto apply=[&](const pumpFence::Command& c){const char* e=pumpRoute::check(true,c.off,c.hasRoute,c.route,configured);if(!e)e=fence.accept(c.ordinal,c.target,c.target,c.off);if(!e)e=relay.apply(c.id,c.on?RelaySafety::ON:c.off?RelaySafety::OFF:RelaySafety::RESET,c.seconds,c.issued,c.expires,c.issued,0);return e;};
 auto wrong=command;wrong.route.revision++;assert(std::string(apply(wrong))=="CIRCUIT_ROUTE_MISMATCH");assert(fence.lastOrdinal()==0&&!relay.isOn());assert(!apply(command)&&relay.isOn());assert(std::string(apply(command))=="STALE_ORDINAL");assert(relay.tickSafety(5000,true)&&!relay.isOn());
 auto bad=wire;auto at=bad.find("\"durationSeconds\":5");bad.replace(at,19,"\"durationSeconds\":31");assert(!pumpFence::decode(bad.c_str(),command));
 bad=wire;at=bad.find("\"zoneRevision\":2");bad.replace(at,16,"\"zoneRevision\":true");assert(!pumpFence::decode(bad.c_str(),command));
 bad=wire;at=bad.find("\"circuitId\":");bad.insert(at,"\"circuitId\":\"OTHER\",");assert(!pumpFence::decode(bad.c_str(),command));
 bad=wire;at=bad.find("\"VALVE08\"");bad.replace(at,9,"\"VALVE01\"");assert(!pumpFence::decode(bad.c_str(),command));
 JsonDocument packet;deserializeJson(packet,wire);packet["action"]="OFF";packet.remove("durationSeconds");std::string off;serializeJson(packet,off);assert(!pumpFence::decode(off.c_str(),command));packet["commandFence"].remove("route");off.clear();serializeJson(packet,off);assert(pumpFence::decode(off.c_str(),command)&&!command.hasRoute&&command.off);
 packet["commandFence"].remove("ordinal");off.clear();serializeJson(packet,off);assert(!pumpFence::decode(off.c_str(),command));
 puts("PASS route: strict packet, immutable identities, revision mismatch before ordinal, bounded timer, OFF compatibility");
}
