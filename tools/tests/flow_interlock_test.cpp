#include "../../firmware/esp32/include/FlowInterlock.h"
#include "../../firmware/esp32/include/RelaySafety.h"
#include <cassert>
#include <cstdio>
#include <limits>
static FlowInterlock::Config config(){return {true,true,450.0,1.0,2000.0,5000};}
int main(){
 FlowInterlock flow(config());assert(flow.validConfig());assert(flow.start(0)==FlowInterlock::NONE);
 for(uint32_t t=1000;t<=6000;t+=1000)assert(flow.sample(t,0,false)==FlowInterlock::NONE);
 assert(flow.sample(7000,0,false)==FlowInterlock::LOW_FLOW);assert(!flow.running());
 assert(flow.start(8000)==FlowInterlock::LOW_FLOW);assert(flow.fault()==FlowInterlock::LOW_FLOW);
 assert(flow.reset()==FlowInterlock::NONE);assert(flow.start(8000)==FlowInterlock::NONE);
 for(uint32_t t=9000;t<=20000;t+=1000)assert(flow.sample(t,45,false)==FlowInterlock::NONE);
 assert(flow.measured());assert(flow.lpm()==6.0);
 // One low window recovers; low samples during grace never count as a failure.
 assert(flow.sample(21000,0,false)==FlowInterlock::NONE);assert(flow.sample(22000,45,false)==FlowInterlock::NONE);
 assert(flow.sample(23000,0,false)==FlowInterlock::NONE);assert(flow.sample(24000,0,false)==FlowInterlock::LOW_FLOW);
 // Explicit stop/timer does not produce a flow lockout, and restart gets new grace.
 FlowInterlock stop(config());stop.start(0);stop.stop();assert(stop.sample(50000,0,false)==FlowInterlock::NONE);assert(stop.fault()==FlowInterlock::NONE);
 assert(stop.start(50000)==FlowInterlock::NONE);assert(stop.sample(51000,0,false)==FlowInterlock::NONE);
 // Jitter uses real elapsed time and accumulating callbacks, not nominal tick rate.
 FlowInterlock jitter(config());jitter.start(0);assert(jitter.sample(400,18,false)==FlowInterlock::NONE);assert(jitter.sample(1000,27,false)==FlowInterlock::NONE);assert(jitter.lpm()==6.0);
 assert(jitter.sample(2200,54,false)==FlowInterlock::NONE);assert(jitter.lpm()==6.0);
 FlowInterlock late(config());late.start(0);assert(late.sample(2501,45,false)==FlowInterlock::SENSOR_FAULT);
 FlowInterlock fast(config());fast.start(0);assert(fast.sample(1000,2001,false)==FlowInterlock::SENSOR_FAULT);
 FlowInterlock overflow(config());overflow.start(0);assert(overflow.sample(1,0,true)==FlowInterlock::SENSOR_FAULT);
 FlowInterlock wrap(config());uint32_t start=UINT32_MAX-3000;wrap.start(start);
 for(uint32_t t=1000;t<=6000;t+=1000)assert(wrap.sample(start+t,0,false)==FlowInterlock::NONE);
 assert(wrap.sample(start+7000,0,false)==FlowInterlock::LOW_FLOW);
 for(int i=0;i<6;i++){
  auto c=config();
  if(i==0)c.calibrationDeclared=false;
  if(i==1)c.pulsesPerLitre=0;
  if(i==2)c.minimumLpm=-1;
  if(i==3)c.maximumHz=std::numeric_limits<double>::quiet_NaN();
  if(i==4)c.graceMs=999;
  if(i==5)c.graceMs=30001;
  FlowInterlock invalid(c);assert(!invalid.validConfig());assert(invalid.start(0)==FlowInterlock::SENSOR_FAULT);assert(invalid.reset()==FlowInterlock::SENSOR_FAULT);
 }
 auto disabledConfig=config();disabledConfig.enabled=false;disabledConfig.calibrationDeclared=false;
 FlowInterlock disabled(disabledConfig);assert(disabled.start(0)==FlowInterlock::NONE);assert(disabled.sample(999999,0,true)==FlowInterlock::NONE);
 // Local trip never depends on cloud; relay remains OFF after pulses return/duplicate ON.
 RelaySafety relay;FlowInterlock integrated(config());const int64_t epoch=1800000000;
 assert(!relay.apply("pre-reset",RelaySafety::RESET,0,epoch,epoch+10,epoch,0));
 assert(!relay.apply("on",RelaySafety::ON,20,epoch,epoch+10,epoch,0));integrated.start(0);
 for(uint32_t t=1000;t<=7000;t+=1000)if(integrated.sample(t,0,false)!=FlowInterlock::NONE)relay.fail("on","FLOW_LOW");
 assert(!relay.isOn()&&relay.lockout());
 assert(!relay.apply("pre-reset",RelaySafety::RESET,0,epoch,epoch+10,epoch+8,8000));
 if(!relay.lockout())integrated.reset();
 assert(relay.lockout()&&integrated.fault()==FlowInterlock::LOW_FLOW);
 assert(integrated.sample(8000,45,false)==FlowInterlock::NONE);assert(!relay.isOn());
 assert(relay.apply("on",RelaySafety::ON,20,epoch,epoch+10,epoch+8,8000));assert(!relay.isOn());
 assert(!relay.apply("reset",RelaySafety::RESET,0,epoch+8,epoch+18,epoch+8,8000));integrated.reset();assert(!relay.isOn());
 assert(!relay.apply("next",RelaySafety::ON,20,epoch+8,epoch+18,epoch+8,8000));assert(integrated.start(8000)==FlowInterlock::NONE);
 puts("FlowInterlock: grace, two windows, recovery, jitter, overflow, config, rollover and relay integration PASS");
}
