#pragma once
#include <stdint.h>

// Two independent simulated end stops; GPIO command is not position feedback.
// Caller serializes access. Debounce 100ms, travel/unstable timeout 3s, sticky fault.
class ValveFeedback {
 enum Position {UNKNOWN,CLOSED,OPEN,CONFLICT};
 bool enabled,initialized=false,stableValid=false,desired=false,reached=false,waiting=false;
 Position candidate=UNKNOWN,stable=UNKNOWN;
 uint32_t candidateAt=0,travelAt=0,unmatchedAt=0;
 const char* failure=nullptr;
 static const char* name(Position p){return p==CLOSED?"CLOSED":p==OPEN?"OPEN":p==CONFLICT?"CONFLICT":"UNKNOWN";}
 public:
 explicit ValveFeedback(bool active=false):enabled(active){}
 bool isEnabled()const{return enabled;}
 const char* state()const{return enabled&&stableValid&&candidate==stable?name(stable):"UNKNOWN";}
 const char* fault()const{return enabled?failure:nullptr;}
 bool canOpen()const{return !enabled||(!failure&&stableValid&&candidate==stable&&stable==CLOSED);}
 void sample(uint32_t now,bool closedStop,bool openStop,bool commandedOpen){
  if(!enabled)return;
  Position raw=closedStop?(openStop?CONFLICT:CLOSED):(openStop?OPEN:UNKNOWN);
  if(!initialized){initialized=true;candidate=raw;candidateAt=travelAt=now;desired=commandedOpen;}
  if(raw!=candidate){candidate=raw;candidateAt=now;stableValid=false;}
  if(uint32_t(now-candidateAt)>=100){stable=candidate;stableValid=true;}
  if(commandedOpen!=desired){desired=commandedOpen;travelAt=now;reached=false;waiting=false;}
  bool settled=stableValid&&candidate==stable;
  if(!failure&&settled&&stable==CONFLICT)failure="SWITCH_CONFLICT";
  bool matched=settled&&stable==(desired?OPEN:CLOSED);
  if(matched){reached=true;waiting=false;}
  if(!failure&&!matched){
   if(!waiting){waiting=true;unmatchedAt=now;}
   if(reached&&settled)failure="POSITION_LOST";
   else if(uint32_t(now-(reached?unmatchedAt:travelAt))>=3000)failure=reached?"POSITION_LOST":desired?"OPEN_TIMEOUT":"CLOSE_TIMEOUT";
  }
 }
 // CLOSE always de-energizes. Clear the sticky feedback fault only on stable CLOSED.
 void acknowledgeClose(){if(enabled&&stableValid&&candidate==stable&&stable==CLOSED){failure=nullptr;desired=false;reached=true;}}
};
