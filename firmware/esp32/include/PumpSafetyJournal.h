#pragma once
#include <stdint.h>

// Loop-owned. Store writes are committed AND read back before permission changes.
// Never stores ON duration, a command, boot identity or permission to resume.
template<class Store> class PumpSafetyJournal {
 public:
  enum State { READY, ARMED, LOCKED, STORAGE_FAULT };
  static constexpr uint32_t cleanRecord=0x534601a1, armedRecord=0x534601b2, lockedRecord=0x534601c3;
  explicit PumpSafetyJournal(Store& value):store(value){}
  void boot(){
    uint32_t record=0;
    if(!store.read(record)||!(record==0||record==cleanRecord||record==armedRecord||record==lockedRecord)){current=STORAGE_FAULT;return;}
    // Even a previously clean stop requires recommissioning after a reboot.
    // Missing NVS is uncommissioned, never permission to energize.
    if(record!=lockedRecord&&!save(lockedRecord))return;
    current=LOCKED;
  }
  bool arm(){
    if(current!=READY)return false;
    if(!save(armedRecord))return false;
    current=ARMED;return true;
  }
  bool lock(){
    if(current==STORAGE_FAULT)return false;
    if(current!=LOCKED&&!save(lockedRecord))return false;
    current=LOCKED;return true;
  }
  // Caller has already cut GPIO and checked the other safety guards.
  bool complete(){
    if(current!=ARMED)return current==READY;
    if(!save(cleanRecord))return false;
    current=READY;return true;
  }
  bool reset(bool outputOff){
    if(!outputOff)return false;
    if(current==READY)return true;
    if(!save(cleanRecord))return false;
    current=READY;return true;
  }
  State state()const{return current;}
  bool outputAllowed()const{return current==ARMED;}
  static const char* name(State s){return s==READY?"READY":s==ARMED?"ARMED":s==LOCKED?"LOCKED":"STORAGE_FAULT";}
 private:
  bool save(uint32_t record){
    uint32_t actual=0;
    if(!store.write(record)||!store.read(actual)||actual!=record){current=STORAGE_FAULT;return false;}
    return true;
  }
  Store& store;State current=LOCKED;
};
