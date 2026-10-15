#include <iostream>
#include "ValvePacket.h"
int main(){ValveFeedback position(true);position.sample(0,true,false,false);position.sample(100,true,false,false);JsonDocument d;valve::packet(d,"ZONE01","51000000-0000-4000-8000-000000000001",0,"2026-10-15T00:00:00Z",false,"BOOT",true,0,&position);serializeJson(d,std::cout);std::cout<<'\n';}
