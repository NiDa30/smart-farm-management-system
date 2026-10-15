#include <iostream>
#include "ValveMonitor.h"
int main(int argc,char** argv){ValveFeedback position(true);position.sample(0,true,false,false);position.sample(100,true,false,false);JsonDocument d;char timestamp[21]="2026-10-15T00:00:00Z";uint64_t sequence=0;
 // An explicit second measurement, not a timestamp rewrite of the retained sequence0 fixture.
 if(argc==3){if(strcmp(argv[2],"1"))return 1;sequence=1;time_t now=time(nullptr);struct tm tm;gmtime_r(&now,&tm);strftime(timestamp,sizeof(timestamp),"%Y-%m-%dT%H:%M:%SZ",&tm);}
 if(argc>3||!valve::monitorPacket(d,"IRRIGATION02","VALVE02","CIRCUIT01",1,1,argc>=2?argv[1]:"ZONE01","71000000-0000-4000-8000-000000000001",sequence,timestamp,"BOOT",&position))return 1;
 serializeJson(d,std::cout);std::cout<<'\n';}
