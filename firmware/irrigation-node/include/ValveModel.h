#pragma once
#include <stdint.h>
// Caller serializes all access. Ordinal barrier survives connection loss, not reboot;
// OPEN additionally targets a random boot UUID so old-boot commands cannot resume.
class ValveModel {
 bool opened=false;uint32_t started=0,duration=0;uint64_t ordinal=0;const char* why="BOOT";
 public:
 bool isOpen()const{return opened;}uint64_t lastOrdinal()const{return ordinal;}const char* reason()const{return why;}
 void close(const char* reason){opened=false;why=reason;}
 void tick(uint32_t now,bool link){if(opened&&!link)close("CONNECTION_LOST");else if(opened&&uint32_t(now-started)>=duration)close("TIMER_EXPIRED");}
 const char* apply(uint64_t rank,bool open,unsigned seconds,int64_t issued,int64_t expires,int64_t epoch,uint32_t now,bool bootMatches,bool enabled,bool link){
  tick(now,link);
  if(open&&!bootMatches)return "BOOT_MISMATCH";
  if(epoch<1700000000)return "CLOCK_NOT_READY";
  if(issued<=0||expires<=issued||expires-issued>15)return "INVALID_LIFETIME";
  if(issued>epoch+2)return "CLOCK_SKEW";
  if(expires<=epoch)return "EXPIRED";
  if(rank==0||rank>9007199254740991ULL)return "INVALID_ORDINAL";
  if(rank<=ordinal)return "STALE_COMMAND";
  if(open&&(seconds<1||seconds>30))return "INVALID_DURATION";
  ordinal=rank; // A rejected new attempt is never retried later with the same ordinal.
  if(!open){close("COMMAND_CLOSE");return nullptr;}
  if(!enabled||!link)return "DEMO_DISABLED";
  if(opened)return "BUSY";
  opened=true;started=now;duration=seconds*1000;why="COMMAND_OPEN";return nullptr;
 }
};
