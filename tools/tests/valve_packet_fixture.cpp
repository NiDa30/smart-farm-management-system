#include <iostream>
#include "ValvePacket.h"
int main(){JsonDocument d;valve::packet(d,"ZONE01","51000000-0000-4000-8000-000000000001",0,"2026-10-15T00:00:00Z",false,"BOOT",true,0);serializeJson(d,std::cout);std::cout<<'\n';}
