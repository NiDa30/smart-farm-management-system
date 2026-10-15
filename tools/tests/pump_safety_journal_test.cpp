#include "PumpSafetyJournal.h"
#include "RelaySafety.h"
#include "PumpCommandFence.h"
#include <cassert>
#include <iostream>
struct MemoryStore {
  uint32_t record=0;unsigned writes=0;bool readOk=true,writeOk=true,mismatch=false,commitThenFail=false;
  bool read(uint32_t& value){value=mismatch?0:record;return readOk;}
  bool write(uint32_t value){++writes;if(writeOk||commitThenFail)record=value;return writeOk;}
};
using J=PumpSafetyJournal<MemoryStore>;
int main(){
 {MemoryStore s;J j(s);j.boot();assert(j.state()==J::LOCKED&&!j.outputAllowed()&&s.record==J::lockedRecord);assert(!j.arm());}
 for(auto record:{J::cleanRecord,J::armedRecord,J::lockedRecord}){MemoryStore s;s.record=record;J j(s);j.boot();assert(j.state()==J::LOCKED&&!j.outputAllowed());assert(s.record==J::lockedRecord);}
 {MemoryStore s;s.record=123;J j(s);j.boot();assert(j.state()==J::STORAGE_FAULT&&s.writes==0&&!j.arm());assert(!j.reset(false)&&s.writes==0);assert(j.reset(true)&&s.record==J::cleanRecord&&!j.outputAllowed());}
 {MemoryStore s;s.readOk=false;J j(s);j.boot();assert(j.state()==J::STORAGE_FAULT&&!j.arm());s.readOk=true;assert(j.reset(true));}
 {MemoryStore s;s.writeOk=false;J j(s);j.boot();assert(j.state()==J::STORAGE_FAULT&&!j.arm());s.writeOk=true;assert(j.reset(true));}
 {MemoryStore s;J j(s);j.boot();assert(j.reset(true));unsigned before=s.writes;assert(j.reset(true)&&s.writes==before);assert(j.arm()&&j.outputAllowed()&&s.record==J::armedRecord);assert(!j.arm()&&s.writes==before+1);}
 {MemoryStore s;J j(s);j.boot();j.reset(true);s.writeOk=false;assert(!j.arm()&&j.state()==J::STORAGE_FAULT&&!j.outputAllowed()&&s.record==J::cleanRecord);}
 {MemoryStore s;J j(s);j.boot();j.reset(true);s.commitThenFail=true;s.writeOk=false;assert(!j.arm()&&!j.outputAllowed()&&s.record==J::armedRecord);s.writeOk=true;J reboot(s);reboot.boot();assert(reboot.state()==J::LOCKED&&!reboot.outputAllowed());}
 {MemoryStore s;J j(s);j.boot();j.reset(true);s.mismatch=true;assert(!j.arm()&&j.state()==J::STORAGE_FAULT&&!j.outputAllowed());}
 {MemoryStore s;J j(s);j.boot();j.reset(true);s.readOk=false;assert(!j.arm()&&j.state()==J::STORAGE_FAULT&&!j.outputAllowed());}
 {MemoryStore s;J j(s);j.boot();j.reset(true);j.arm();assert(j.complete()&&s.record==J::cleanRecord&&!j.outputAllowed());unsigned before=s.writes;assert(j.complete()&&before==s.writes);J reboot(s);reboot.boot();assert(reboot.state()==J::LOCKED);}
 {MemoryStore s;J j(s);j.boot();j.reset(true);j.arm();assert(j.lock()&&!j.outputAllowed()&&s.record==J::lockedRecord);unsigned before=s.writes;for(int i=0;i<1000;++i){assert(j.lock());assert(!j.complete());assert(!j.arm());}assert(s.writes==before);J reboot(s);reboot.boot();assert(reboot.state()==J::LOCKED);}
 {MemoryStore s;J j(s);j.boot();j.reset(true);j.arm();s.writeOk=false;assert(!j.complete()&&j.state()==J::STORAGE_FAULT&&!j.outputAllowed());assert(!j.lock()&&!j.reset(true));s.writeOk=true;assert(j.reset(true)&&!j.outputAllowed());}
 {MemoryStore s;J j(s);j.boot();j.reset(true);j.arm();s.writeOk=false;assert(!j.lock()&&j.state()==J::STORAGE_FAULT&&!j.outputAllowed());}
 {MemoryStore s;J j(s);j.boot();j.reset(true);j.arm();assert(!j.reset(false)&&j.outputAllowed());assert(j.lock());s.mismatch=true;assert(!j.reset(true)&&!j.outputAllowed());}
 {MemoryStore s;J first(s);first.boot();first.reset(true);first.arm();J reboot(s);reboot.boot();RelaySafety relay;relay.trip();PumpCommandFence fence;const int64_t epoch=1800000000;assert(fence.accept(1,"old-boot","new-boot",false)!=nullptr);assert(relay.apply("on",RelaySafety::ON,600,epoch,epoch+10,epoch,0)!=nullptr);assert(!relay.isOn()&&!reboot.outputAllowed());assert(!fence.accept(2,"new-boot","new-boot",false));assert(!relay.apply("reset",RelaySafety::RESET,0,epoch,epoch+10,epoch,1));assert(reboot.reset(true)&&!relay.isOn());assert(!relay.apply("new-on",RelaySafety::ON,1,epoch,epoch+10,epoch,2));assert(reboot.arm());relay.tickSafety(1002,true);assert(!relay.isOn()&&reboot.complete());}
 {RelaySafety relay;const int64_t epoch=1800000000;assert(!relay.apply("slow-write",RelaySafety::ON,5,epoch,epoch+10,epoch,UINT32_MAX-500));assert(relay.remainingMillis(499)==4000);assert(relay.remainingMillis(4499)==0);relay.tickSafety(4499,true);assert(!relay.isOn()&&relay.remainingMillis(4500)==0);}
 std::cout<<"PASS 17 journal groups (19 boot/case variants): reboot always locked, missing/corrupt NVS, IO/readback/uncertain commit, no resume, explicit reset, write dedup, clean OFF, boot fence, remaining cutoff and tick wrap\n";
}
