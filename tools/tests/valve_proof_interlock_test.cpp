#include "ValveProofInterlock.h"
#include "RelaySafety.h"
#include <cassert>
#include <iostream>
using G=ValveProofInterlock;
static void open(G& g,uint32_t start=0){g.sample(start,true,false);g.sample(start+100,true,false);}
int main(){
 {G g(false);assert(g.ready()&&g.start()==G::NONE);g.sample(9999,true,true);assert(g.fault()==G::NONE&&g.reset()==G::NONE);}
 {G g(true);assert(!g.ready());assert(g.start()==G::NOT_OPEN);assert(g.fault()==G::NOT_OPEN&&!g.running());}
 {G g(true);g.sample(0,false,true);g.sample(100,false,true);assert(g.state()==G::CLOSED&&!g.ready()&&g.start()==G::NOT_OPEN);}
 {G g(true);g.sample(0,true,true);g.sample(100,true,true);assert(g.state()==G::CONFLICT&&g.start()==G::SWITCH_CONFLICT);}
 {G g(true);g.sample(0,true,false);g.sample(99,true,false);assert(!g.ready());g.sample(100,true,false);assert(g.ready()&&g.start()==G::NONE&&g.running());}
 {G g(true);g.sample(0,true,false);g.sample(90,false,false);g.sample(91,true,false);g.sample(190,true,false);assert(!g.ready());g.sample(191,true,false);assert(g.ready());}
 {G g(true);open(g);g.start();g.sample(101,false,false);assert(g.fault()==G::PROOF_LOST&&!g.running()&&!g.ready());open(g,102);assert(g.state()==G::OPEN&&g.fault()==G::PROOF_LOST);assert(g.start()==G::PROOF_LOST);}
 {G g(true);open(g);g.start();g.sample(101,true,true);assert(g.fault()==G::SWITCH_CONFLICT);g.sample(102,false,true);assert(g.reset()==G::SWITCH_CONFLICT);open(g,103);assert(g.reset()==G::NONE&&g.ready()&&!g.running());}
 {G g(true);open(g);g.start();g.stop();g.sample(101,false,true);assert(g.fault()==G::NONE);}
 {G g(true);open(g);g.start();g.sample(351,true,false);assert(g.fault()==G::PROOF_LOST);}
 {G g(true);open(g,UINT32_MAX-50);assert(g.ready());g.start();g.sample(50,true,false);assert(g.fault()==G::NONE);g.sample(51,false,false);assert(g.fault()==G::PROOF_LOST);}
 {G g(true);RelaySafety relay;const int64_t epoch=1800000000;open(g);assert(!relay.apply("on",RelaySafety::ON,20,epoch,epoch+10,epoch,100));assert(g.start()==G::NONE);g.sample(125,false,false);relay.fail("on",G::faultName(g.fault()));assert(!relay.isOn()&&relay.lockout());open(g,126);assert(relay.apply("on",RelaySafety::ON,20,epoch,epoch+10,epoch,227)!=nullptr);assert(!relay.isOn());assert(!relay.apply("reset",RelaySafety::RESET,0,epoch,epoch+10,epoch,228));assert(g.reset()==G::NONE&&!g.running()&&!relay.isOn());assert(!relay.apply("new",RelaySafety::ON,1,epoch,epoch+10,epoch,229));assert(g.start()==G::NONE);relay.tickSafety(1229,true);g.stop();assert(!relay.isOn()&&!relay.lockout());}
 {G g(true);open(g);g.start();g.stop();assert(g.ready()&&g.outputCheck()==G::PROOF_LOST&&!g.running());}
 std::cout<<"PASS 13 valve proof scenarios: disabled, missing/closed/conflict, debounce/bounce, loss/latch/reset, stop, watchdog, wrap, relay dedup/cutoff and cancelled watcher before output\n";
}
