import type { SafetySnapshot } from '../../src/modules/iot/safety/safetyApi';
export function safetyFixture():SafetySnapshot {
 const now=new Date().toISOString();
 return {
  farmId:'FARM001',asOf:now,mqtt:{state:'CONNECTED',changedAt:now,lastProcessedAt:now},controlEnabled:true,controlTransportConnected:true,
  sensor:{observedAt:now,receivedAt:now,soilMoisture:28},relay:{observedAt:now,receivedAt:now,reportedState:'OFF',safetyLockout:false,stateReason:'COMMAND_OFF'},
  rule:{enabled:false,lowCount:0,activeCommand:null,cooldownUntil:null,lastResult:'MANUAL_HOLD'},
  settings:{dryThreshold:25,wetThreshold:40,durationSeconds:12,cooldownSeconds:120,revision:3},
  queue:{unresolved:0,overdue:0},recentProblems:[],stateHistory:[],
 };
}
