#include "../../firmware/esp32/include/PumpCommandFence.h"
#include "../../firmware/esp32/include/FencedPumpPacket.h"
#include "../../firmware/esp32/include/RelaySafety.h"
#include <cassert>
#include <cstdio>
#include <string>
const char* boot="71000000-0000-4000-8000-000000000001";
const char* other="71000000-0000-4000-8000-000000000002";
const int64_t epoch=1800000000;
const char* apply(PumpCommandFence& fence,RelaySafety& relay,uint64_t ordinal,const char* id,RelaySafety::Action action,unsigned seconds,uint32_t tick,const char* target=boot,int64_t issued=epoch){
 const char* e=fence.accept(ordinal,target,boot,action==RelaySafety::OFF);
 return e?e:relay.apply(id,action,seconds,issued,issued+10,epoch,tick);
}
int main(){
 PumpCommandFence f;RelaySafety r;
 assert(!apply(f,r,2,"off",RelaySafety::OFF,0,0));
 assert(!r.isOn());assert(strcmp(apply(f,r,1,"late-on",RelaySafety::ON,3,0),"STALE_ORDINAL")==0);assert(!r.isOn());
 assert(!apply(f,r,3,"on",RelaySafety::ON,3,0));assert(r.isOn());
 assert(strcmp(apply(f,r,3,"on",RelaySafety::ON,3,2000),"STALE_ORDINAL")==0);assert(r.tickSafety(3000,true));assert(!r.isOn());
 assert(strcmp(apply(f,r,3,"on",RelaySafety::ON,3,3001),"STALE_ORDINAL")==0);assert(!r.isOn());
 assert(strcmp(apply(f,r,4,"old-boot",RelaySafety::ON,3,4000,other),"BOOT_MISMATCH")==0);assert(f.lastOrdinal()==3);
 assert(strcmp(apply(f,r,4,"old-reset",RelaySafety::RESET,0,4000,other),"BOOT_MISMATCH")==0);
 assert(!apply(f,r,4,"cross-boot-off",RelaySafety::OFF,0,4000,other));assert(!r.isOn());
 r.setWaterAvailable(false);assert(strcmp(apply(f,r,5,"dry",RelaySafety::ON,3,4000),"WATER_LOW")==0);r.setWaterAvailable(true);
 assert(strcmp(apply(f,r,5,"dry",RelaySafety::ON,3,4000),"STALE_ORDINAL")==0);assert(!r.isOn());
 assert(!apply(f,r,6,"reset",RelaySafety::RESET,0,4000));assert(!r.lockout());
 assert(strcmp(apply(f,r,7,"future",RelaySafety::ON,3,4000,boot,epoch+9),"CLOCK_SKEW")==0);
 assert(strcmp(apply(f,r,7,"future",RelaySafety::ON,3,4000),"STALE_ORDINAL")==0);
 assert(!apply(f,r,8,"active",RelaySafety::ON,30,4000));r.trip();f.legacyEmergencyStop();assert(!r.isOn()&&r.lockout());
 assert(strcmp(apply(f,r,9,"cannot-reset",RelaySafety::RESET,0,4000),"FENCE_RESTART_REQUIRED")==0);
 assert(strcmp(apply(f,r,10,"cannot-start",RelaySafety::ON,3,4000),"FENCE_RESTART_REQUIRED")==0);
 assert(!apply(f,r,11,"still-off",RelaySafety::OFF,0,4000));assert(!r.isOn());
 PumpCommandFence reboot;RelaySafety fresh;
 assert(strcmp(reboot.accept(12,boot,other,false),"BOOT_MISMATCH")==0);assert(!fresh.isOn());
 assert(strcmp(reboot.accept(0,other,other,false),"INVALID_FENCE")==0);
 assert(strcmp(reboot.accept(9007199254740992ULL,other,other,false),"INVALID_FENCE")==0);
 std::string wire="{\"schemaVersion\":1,\"deviceId\":\"PUMP01\",\"commandId\":\"72000000-0000-4000-8000-000000000001\",\"action\":\"ON\",\"durationSeconds\":5,\"issuedAt\":\"2026-10-15T03:00:00Z\",\"expiresAt\":\"2026-10-15T03:00:10Z\",\"commandFence\":{\"version\":1,\"ordinal\":1,\"targetBootId\":\"71000000-0000-4000-8000-000000000001\"}}";
 pumpFence::Command c;assert(pumpFence::decode(wire.c_str(),c));assert(c.on&&!c.off&&!c.legacyOff&&c.seconds==5&&c.ordinal==1&&strcmp(c.target,boot)==0);
 assert(!pumpFence::decode((wire+"{}").c_str(),c));
 auto invalid=wire;invalid.insert(1,"\"action\":\"OFF\",");assert(!pumpFence::decode(invalid.c_str(),c));
 invalid=wire;auto pos=invalid.find("\"ordinal\":1");invalid.replace(pos,11,"\"ordinal\":0");assert(!pumpFence::decode(invalid.c_str(),c));
 invalid=wire;pos=invalid.find("2026-10-15");invalid.replace(pos,10,"2026-02-31");assert(!pumpFence::decode(invalid.c_str(),c));
 const char* legacyOff="{\"schemaVersion\":1,\"deviceId\":\"PUMP01\",\"commandId\":\"72000000-0000-4000-8000-000000000002\",\"action\":\"OFF\",\"issuedAt\":\"2026-10-15T03:00:00Z\",\"expiresAt\":\"2026-10-15T03:00:10Z\"}";
 assert(pumpFence::decode(legacyOff,c)&&c.legacyOff);
 invalid=legacyOff;pos=invalid.find("\"OFF\"");invalid.replace(pos,5,"\"RESET_LOCKOUT\"");assert(!pumpFence::decode(invalid.c_str(),c));
 puts("PASS pump fencing: delayed ON/OFF, reboot, duplicate/timer, rejection consumed, emergency latch and strict parser");
}
