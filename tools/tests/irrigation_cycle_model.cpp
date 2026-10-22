#include "PumpStatusPacket.h"
#include "FencedPumpPacket.h"
#include "PumpCommandFence.h"
#include "RelaySafety.h"
#include "ValveMonitor.h"
#include <iostream>
#include <sstream>
#include <chrono>
#include <iomanip>
// Persistent native models behind fake transports. Feedback is a test input, not hardware proof.
const char* boot="91000000-0000-4000-8000-000000000001";
std::string at(){auto now=std::chrono::system_clock::now();auto t=std::chrono::system_clock::to_time_t(now);struct tm tm;gmtime_r(&t,&tm);std::ostringstream s;s<<std::put_time(&tm,"%Y-%m-%dT%H:%M:%S")<<'.'<<std::setfill('0')<<std::setw(6)<<(std::chrono::duration_cast<std::chrono::microseconds>(now.time_since_epoch()).count()%1000000)<<'Z';return s.str();}
void emit(JsonDocument& d){serializeJson(d,std::cout);std::cout<<std::endl;}
int main(int argc,char** argv){setenv("TZ","UTC0",1);tzset();if(argc!=2)return 2;unsigned sequence=0;auto began=std::chrono::steady_clock::now();auto ms=[&](){return static_cast<uint32_t>(std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now()-began).count()+100);};std::string input;
 if(!strcmp(argv[1],"pump")){
  auto route=pumpRoute::make("PC1",1,"PZONE1",1,"IRRIGATION18","VALVE18");RelaySafety relay;PumpCommandFence order;ValveProofInterlock proof(true);proof.sample(0,true,false);proof.sample(100,true,false);
  auto status=[&](const char* reason){JsonDocument d;d["schemaVersion"]=1;d["bootId"]=boot;d["sequence"]=sequence++;d["timestamp"]=at();fillPumpStatus(d,relay.isOn()?"ON":"OFF",relay.lockout(),reason,nullptr);fillValveProof(d,proof);pumpRoute::write(d["valveInterlock"]["route"].to<JsonObject>(),route);pumpFence::status(d,order.lastOrdinal(),false);emit(d);};status("BOOT");
  while(std::getline(std::cin,input)){pumpFence::Command c;if(!pumpFence::decode(input.c_str(),c)||(!c.on&&!c.off)||pumpRoute::check(true,c.off,c.hasRoute,c.route,route)||order.accept(c.ordinal,c.target,boot,c.off)||relay.apply(c.id,c.on?RelaySafety::ON:RelaySafety::OFF,c.seconds,c.issued,c.expires,time(nullptr),ms()))return 3;if(c.on){if(proof.start()!=ValveProofInterlock::NONE)return 4;}else proof.stop();JsonDocument ack;ack["schemaVersion"]=1;ack["deviceId"]="PUMP01";ack["bootId"]=boot;ack["sequence"]=sequence++;ack["timestamp"]=at();ack["commandId"]=c.id;ack["stage"]="EXECUTED";ack["status"]="SUCCESS";ack["reportedState"]=c.on?"ON":"OFF";ack["safetyLockout"]=false;pumpFence::ack(ack,c.ordinal);emit(ack);status(c.on?"COMMAND_ON":"COMMAND_OFF");}
  return 0;
 }
 bool second=!strcmp(argv[1],"VALVE19");if(!second&&strcmp(argv[1],"VALVE18"))return 2;ValveModel valve;ValveFeedback feedback(true);feedback.sample(0,true,false,false);feedback.sample(100,true,false,false);
 auto status=[&](const valve::Command* c){JsonDocument d;auto stamp=at();if(!valve::circuitPacket(d,second?"IRRIGATION19":"IRRIGATION18",argv[1],second?"PC2":"PC1",1,1,second?"PZONE2":"PZONE1",boot,sequence++,stamp.c_str(),valve.isOpen(),valve.reason(),true,valve.lastOrdinal(),&feedback))exit(5);if(c){d["commandId"]=c->id;d["ordinal"]=c->ordinal;d["action"]=c->open?"OPEN":"CLOSE";d["result"]="EXECUTED";d["errorCode"]=nullptr;}emit(d);};status(nullptr);
 while(std::getline(std::cin,input)){valve::Command c;if(second||!valve::decodeCircuit(input.c_str(),"IRRIGATION18","VALVE18","PC1",1,1,"PZONE1",c)||valve::applyCircuit(valve,c,boot,time(nullptr),ms(),true,true,feedback.canOpen()))return 6;auto now=ms();feedback.sample(now+1,!valve.isOpen(),valve.isOpen(),valve.isOpen());feedback.sample(now+101,!valve.isOpen(),valve.isOpen(),valve.isOpen());status(&c);status(nullptr);}
 return 0;
}
