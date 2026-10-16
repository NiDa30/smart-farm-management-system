#include "PumpStatusPacket.h"
#include "FencedPumpPacket.h"
#include "PumpCommandFence.h"
#include "RelaySafety.h"
#include "ValveMonitor.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <chrono>
#include <iomanip>
#include <cassert>
const char* boot="89000000-0000-4000-8000-000000000001";
std::string at(){auto now=std::chrono::system_clock::now();auto t=std::chrono::system_clock::to_time_t(now);struct tm tm;gmtime_r(&t,&tm);std::ostringstream s;s<<std::put_time(&tm,"%Y-%m-%dT%H:%M:%S")<<'.'<<std::setfill('0')<<std::setw(6)<<(std::chrono::duration_cast<std::chrono::microseconds>(now.time_since_epoch()).count()%1000000)<<'Z';return s.str();}
std::string file(const char* name){std::ifstream in(name);std::stringstream text;text<<in.rdbuf();return text.str();}
void base(JsonDocument& d,unsigned seq){d["schemaVersion"]=1;d["bootId"]=boot;d["sequence"]=seq;d["timestamp"]=at();}
int main(int argc,char** argv){setenv("TZ","UTC0",1);tzset();if(argc<2)return 2;
 if(!strcmp(argv[1],"valve")){
  if(argc<3||argc>4)return 2;
  bool second=!strcmp(argv[2],"VALVE19");if(!second&&strcmp(argv[2],"VALVE18"))return 2;ValveModel model;ValveFeedback feedback(true);feedback.sample(0,true,false,false);feedback.sample(100,true,false,false);
  auto emit=[&](unsigned seq,const valve::Command* c){JsonDocument d;auto timestamp=at();if(!valve::circuitPacket(d,second?"IRRIGATION19":"IRRIGATION18",argv[2],second?"PC2":"PC1",1,1,second?"PZONE2":"PZONE1",boot,seq,timestamp.c_str(),model.isOpen(),model.reason(),true,model.lastOrdinal(),&feedback))exit(3);if(c){d["commandId"]=c->id;d["ordinal"]=c->ordinal;d["action"]="OPEN";d["result"]="EXECUTED";d["errorCode"]=nullptr;}serializeJson(d,std::cout);std::cout<<'\n';};
  if(argc==3){emit(0,nullptr);return 0;}valve::Command c;auto text=file(argv[3]);if(second||!valve::decodeCircuit(text.c_str(),"IRRIGATION18","VALVE18","PC1",1,1,"PZONE1",c)||!c.open||c.seconds!=30||valve::applyCircuit(model,c,boot,time(nullptr),100,true,true,feedback.canOpen()))return 4;feedback.sample(101,false,true,true);feedback.sample(201,false,true,true);emit(1,&c);emit(2,nullptr);return 0;
 }
 if(strcmp(argv[1],"pump")||argc>3)return 2;
 auto configured=pumpRoute::make("PC1",1,"PZONE1",1,"IRRIGATION18","VALVE18");ValveProofInterlock proof(true);proof.sample(0,true,false);proof.sample(100,true,false);PumpCommandFence order;RelaySafety relay;
 auto emit=[&](unsigned seq,const char* reason,const char* id){JsonDocument d;base(d,seq);fillPumpStatus(d,relay.isOn()?"ON":"OFF",relay.lockout(),reason,id);fillValveProof(d,proof);pumpRoute::write(d["valveInterlock"]["route"].to<JsonObject>(),configured);pumpFence::status(d,order.lastOrdinal(),false);serializeJson(d,std::cout);std::cout<<'\n';};
 if(argc==2){emit(0,"BOOT",nullptr);return 0;}pumpFence::Command c;auto text=file(argv[2]);if(!pumpFence::decode(text.c_str(),c)||!c.on||c.seconds!=5||pumpRoute::check(true,false,c.hasRoute,c.route,configured)||order.accept(c.ordinal,c.target,boot,false)||relay.apply(c.id,RelaySafety::ON,c.seconds,c.issued,c.expires,time(nullptr),100)||proof.start()!=ValveProofInterlock::NONE)return 5;
 JsonDocument ack;base(ack,1);ack["deviceId"]="PUMP01";ack["commandId"]=c.id;ack["stage"]="EXECUTED";ack["status"]="SUCCESS";ack["reportedState"]="ON";ack["safetyLockout"]=false;pumpFence::ack(ack,c.ordinal);serializeJson(ack,std::cout);std::cout<<'\n';emit(2,"COMMAND_ON",c.id);
 // Fast logical millis checks the timer; source timestamps remain actual current time.
 assert(relay.tickSafety(5100,true)&&!relay.isOn());proof.stop();emit(3,"TIMER_EXPIRED",nullptr);return 0;
}
