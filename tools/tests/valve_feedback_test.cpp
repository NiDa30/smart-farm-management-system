#include <cassert>
#include <iostream>
#include <string>
#include "ValvePacket.h"
static bool eq(const char* a,const char* b){return a&&std::string(a)==b;}
static void closed(ValveFeedback& p,uint32_t at=0){p.sample(at,true,false,false);p.sample(at+100,true,false,false);assert(p.canOpen());}
int main(){
 ValveFeedback legacy;legacy.sample(5000,true,true,true);assert(legacy.canOpen());assert(!legacy.fault());assert(eq(legacy.state(),"UNKNOWN"));
 ValveFeedback p(true);p.sample(0,true,false,false);assert(!p.canOpen());p.sample(99,true,false,false);assert(!p.canOpen());p.sample(100,true,false,false);assert(p.canOpen());assert(eq(p.state(),"CLOSED"));
 p.sample(101,false,false,false);assert(!p.canOpen());p.sample(120,true,false,false);assert(!p.canOpen());p.sample(220,true,false,false);assert(p.canOpen());
 p.sample(300,true,false,true);p.sample(301,false,false,true);p.sample(401,false,false,true);assert(!p.fault());p.sample(1000,false,true,true);p.sample(1100,false,true,true);assert(eq(p.state(),"OPEN"));assert(!p.fault());
 p.sample(1200,false,false,true);p.sample(1300,false,false,true);assert(eq(p.fault(),"POSITION_LOST"));assert(!p.canOpen());p.sample(1400,true,false,false);p.sample(1500,true,false,false);assert(p.fault());p.acknowledgeClose();assert(!p.fault());assert(p.canOpen());
 ValveFeedback timeout(true);closed(timeout);timeout.sample(200,true,false,true);timeout.sample(3199,true,false,true);assert(!timeout.fault());timeout.sample(3200,true,false,true);assert(eq(timeout.fault(),"OPEN_TIMEOUT"));timeout.acknowledgeClose();assert(!timeout.fault());
 ValveFeedback stuck(true);stuck.sample(0,false,true,false);stuck.sample(100,false,true,false);stuck.sample(3000,false,true,false);assert(eq(stuck.fault(),"CLOSE_TIMEOUT"));stuck.acknowledgeClose();assert(stuck.fault());
 ValveFeedback conflict(true);conflict.sample(0,true,true,false);conflict.sample(100,true,true,false);assert(eq(conflict.state(),"CONFLICT"));assert(eq(conflict.fault(),"SWITCH_CONFLICT"));conflict.acknowledgeClose();assert(conflict.fault());
 ValveFeedback bounce(true);closed(bounce);bounce.sample(200,true,false,true);for(uint32_t t=300;t<=3200;t+=50)bounce.sample(t,(t/50)%2==0,false,true);assert(bounce.fault());
 ValveFeedback lostBounce(true);closed(lostBounce);lostBounce.sample(200,false,true,true);lostBounce.sample(300,false,true,true);for(uint32_t t=400;t<=3500;t+=50)lostBounce.sample(t,false,(t/50)%2==0,true);assert(eq(lostBounce.fault(),"POSITION_LOST"));
 ValveFeedback wrap(true);closed(wrap,0xffffff00u);wrap.sample(0xfffffff0u,true,false,true);wrap.sample(0xfffffff0u+3000u,true,false,true);assert(eq(wrap.fault(),"OPEN_TIMEOUT"));
 ValveModel v;const int64_t epoch=1792000000;assert(eq(v.apply(1,true,5,epoch,epoch+10,epoch,0,true,true,true,false),"POSITION_NOT_READY"));assert(v.lastOrdinal()==1&&!v.isOpen());assert(eq(v.apply(1,true,5,epoch,epoch+10,epoch,1,true,true,true,true),"STALE_COMMAND"));assert(!v.apply(2,false,0,epoch,epoch+10,epoch,2,false,true,true,false));
 JsonDocument d;valve::packet(d,"ZONE01","51000000-0000-4000-8000-000000000001",0,"2026-10-15T00:00:00Z",false,"COMMAND_CLOSE",true,0,&p);assert(d["feedbackState"]=="CLOSED");assert(d["positionFeedback"]["enabled"]==true);assert(d["positionFeedback"]["fault"].isNull());
 std::cout<<"PASS independent valve feedback: opt-in, debounce, travel, position loss, sticky clear, conflict, bouncing, wrap, ordinal and packet\n";
}
