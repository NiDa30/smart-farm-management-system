#include "../../firmware/esp32/include/RelaySafety.h"
#include <cassert>
#include <cstdio>
int main() {
  const int64_t epoch = 1800000000;
  RelaySafety relay;
  assert(!relay.isOn());
  assert(!relay.apply("on", RelaySafety::ON, 3, epoch, epoch+10, epoch, 1000));
  assert(relay.isOn());
  assert(!relay.apply("on", RelaySafety::ON, 3, epoch, epoch+10, epoch+2, 3000));
  assert(relay.tickSafety(4000, true)); // duplicate did not renew timer
  assert(!relay.isOn());
  assert(!relay.apply("on", RelaySafety::ON, 3, epoch, epoch+10, epoch+4, 5000));
  assert(!relay.isOn()); // duplicate after timeout does not turn on again
  assert(relay.apply("expired", RelaySafety::ON, 3, epoch-20, epoch-10, epoch, 6000));
  assert(!relay.isOn());
  assert(relay.apply("long", RelaySafety::ON, 31, epoch, epoch+10, epoch, 6000));
  assert(!relay.apply("new", RelaySafety::ON, 30, epoch, epoch+10, epoch, 6000));
  assert(relay.tickSafety(6100, false));
  assert(relay.lockout() && !relay.isOn());
  assert(relay.apply("locked", RelaySafety::ON, 1, epoch, epoch+10, epoch, 6200));
  assert(!relay.apply("reset", RelaySafety::RESET, 0, epoch, epoch+10, epoch, 6200));
  assert(!relay.lockout());
  assert(!relay.apply("wrap", RelaySafety::ON, 1, epoch, epoch+10, epoch, UINT32_MAX-500));
  assert(!relay.tickSafety(100, true));
  assert(relay.tickSafety(500, true));
  assert(!relay.isOn());
  RelaySafety crowded;
  assert(!crowded.apply("first",RelaySafety::ON,30,epoch,epoch+10,epoch,0));
  for(int i=0;i<31;i++) {
    char id[37]; snprintf(id,sizeof(id),"busy%d",i);
    assert(crowded.apply(id,RelaySafety::ON,30,epoch,epoch+10,epoch,1));
  }
  assert(!crowded.apply("emergency",RelaySafety::OFF,0,epoch,epoch+10,epoch,2));
  assert(!crowded.isOn());
}
