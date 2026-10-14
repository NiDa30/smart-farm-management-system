#include "../../firmware/water-node/include/WaterMeasurements.h"
#include <cassert>
#include <cstdio>
#include <limits>
#include <initializer_list>
int main(){
 using water::Tank;
 water::Floats f;assert(f.state(1000)==Tank::WARMING_UP);
 f.update(false,false,100);assert(f.state(199)==Tank::WARMING_UP);assert(f.state(200)==Tank::EMPTY);
 f.update(true,false,300);assert(f.state(400)==Tank::MID);
 f.update(true,true,500);assert(f.state(600)==Tank::FULL);
 f.update(false,true,700);assert(f.state(800)==Tank::INCONSISTENT);
 f.update(false,false,801);assert(f.state(850)==Tank::WARMING_UP);assert(f.state(901)==Tank::EMPTY);
 water::Floats wrap;wrap.update(true,false,UINT32_MAX-50);assert(wrap.state(48)==Tank::WARMING_UP);assert(wrap.state(49)==Tank::MID);
 auto flow=water::measureFlow(225,5000,450,2000,false,true);assert(flow.valid&&fabs(flow.litresPerMinute-6.0)<0.000001);
 flow=water::measureFlow(226,5020,450,2000,false,true);assert(flow.valid&&fabs(flow.litresPerMinute-6.002656)<0.00001);
 flow=water::measureFlow(0,5000,450,2000,false,true);assert(flow.valid&&flow.litresPerMinute==0);
 for(unsigned interval:{0u,15001u})assert(!water::measureFlow(1,interval,450,2000,false,true).valid);
 for(double calibration:{0.0,-1.0,std::numeric_limits<double>::quiet_NaN(),std::numeric_limits<double>::infinity()})assert(!water::measureFlow(1,5000,calibration,2000,false,true).valid);
 assert(!water::measureFlow(1,5000,450,2000,false,false).valid);
 assert(!water::measureFlow(1,5000,450,0,false,true).valid);
 assert(!water::measureFlow(1,5000,450,2000,true,true).valid);
 assert(!water::measureFlow(10001,5000,450,2000,false,true).valid);
 assert(water::measureFlow(10000,5000,450,2000,false,true).valid);
 puts("PASS water model: 4float states, debounce/wrap, pulse units/window/rate/calibration/zero/fault");
}
