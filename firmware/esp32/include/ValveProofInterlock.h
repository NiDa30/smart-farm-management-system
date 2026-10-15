#pragma once
#include <stdint.h>
// Caller serializes access. Two independent active-low contacts on the pump board;
// never derive proof from the pump GPIO, remote MQTT state or a command ACK.
class ValveProofInterlock {
 public:
  enum State { UNKNOWN,CLOSED,OPEN,CONFLICT };
  enum Fault { NONE,NOT_OPEN,PROOF_LOST,SWITCH_CONFLICT };
  explicit ValveProofInterlock(bool value):enabled(value){}
  void sample(uint32_t now,bool openContact,bool closedContact){
    if(!enabled)return;
    State raw=openContact?(closedContact?CONFLICT:OPEN):(closedContact?CLOSED:UNKNOWN);
    bool missed=initialized&&uint32_t(now-lastSample)>250;
    lastSample=now;
    if(!initialized||raw!=candidate){candidate=raw;since=now;stable=UNKNOWN;initialized=true;}
    else if(uint32_t(now-since)>=100)stable=candidate;
    if(watching&&(raw!=OPEN||missed))trip(raw==CONFLICT?SWITCH_CONFLICT:PROOF_LOST);
  }
  bool ready()const{return !enabled||(initialized&&stable==OPEN&&candidate==OPEN&&latched==NONE);}
  // A cutoff may stop monitoring while a new ON is being armed. OPEN contacts
  // alone must never re-energize an output whose watcher was cancelled.
  Fault outputCheck(){if(!enabled)return NONE;if(latched!=NONE)return latched;if(!watching||!ready())return trip(candidate==CONFLICT?SWITCH_CONFLICT:PROOF_LOST);return NONE;}
  Fault start(){if(!enabled)return NONE;if(latched!=NONE)return latched;if(!ready())return trip(candidate==CONFLICT?SWITCH_CONFLICT:NOT_OPEN);watching=true;return NONE;}
  void stop(){watching=false;}
  Fault reset(){if(!enabled)return NONE;if(watching)return latched;if(!initialized||stable!=OPEN||candidate!=OPEN)return trip(candidate==CONFLICT?SWITCH_CONFLICT:NOT_OPEN);latched=NONE;return NONE;}
  Fault fault()const{return latched;}
  State state()const{return stable;}
  bool running()const{return watching;}
  static const char* stateName(State s){return s==OPEN?"OPEN":s==CLOSED?"CLOSED":s==CONFLICT?"CONFLICT":"UNKNOWN";}
  static const char* faultName(Fault f){return f==NOT_OPEN?"VALVE_NOT_OPEN":f==PROOF_LOST?"VALVE_PROOF_LOST":f==SWITCH_CONFLICT?"VALVE_SWITCH_CONFLICT":nullptr;}
 private:
  Fault trip(Fault f){if(latched==NONE)latched=f;watching=false;return latched;}
  bool enabled,initialized=false,watching=false;State candidate=UNKNOWN,stable=UNKNOWN;Fault latched=NONE;uint32_t since=0,lastSample=0;
};
