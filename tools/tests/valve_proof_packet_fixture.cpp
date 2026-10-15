#include "ValveProofInterlock.h"
#include "PumpStatusPacket.h"
#include <iostream>
#include <cassert>
int main(){ValveProofInterlock proof(true);JsonDocument result;auto rows=result.to<JsonArray>();
 auto packet=[&](int sequence,const char* state,bool lock,const char* reason){JsonDocument p;p["schemaVersion"]=1;p["bootId"]="84000000-0000-4000-8000-000000000001";p["sequence"]=sequence;p["timestamp"]="2026-10-15T00:00:00Z";fillPumpStatus(p,state,lock,reason,nullptr);fillValveProof(p,proof);rows.add(p.as<JsonObject>());};
 proof.sample(0,true,false);proof.sample(100,true,false);assert(proof.ready());packet(0,"OFF",false,"BOOT");
 assert(proof.start()==ValveProofInterlock::NONE);packet(1,"ON",false,"COMMAND_ON");
 proof.sample(125,false,false);assert(proof.fault()==ValveProofInterlock::PROOF_LOST);packet(2,"OFF",true,"VALVE_PROOF_LOST");
 proof.sample(150,true,false);proof.sample(250,true,false);assert(proof.reset()==ValveProofInterlock::NONE);packet(3,"OFF",false,"LOCKOUT_RESET");
 serializeJson(result,std::cout);std::cout<<'\n';}
