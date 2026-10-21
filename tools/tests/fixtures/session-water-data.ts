import {historyRun,historyRequest} from './session-history-data';
export const waterOff='86000000-0000-4000-8000-000000000099';
export function sessionWaterData(at:string,session?:string){
 const run=historyRun(at,session),c=run.config,to=new Date(Date.parse(at)+10000).toISOString().replace('Z',(at.match(/\.\d{3}(\d+)Z$/)?.[1]??'')+'Z');
 return {mode:'SESSION_STATION_FLOW',asOf:to,sessionId:run.sessionId,circuitId:c.circuitId,circuitRevision:c.revision,zoneId:c.zoneId,waterNodeId:c.waterNodeId,flowChannelId:c.flowChannelId,dataSource:c.expectedSource,state:'ESTIMATED',reason:'OBSERVED_INTERVALS',from:at,to,onId:historyRequest,offId:waterOff,
  volume:{nodeId:c.waterNodeId,channelId:c.flowChannelId,from:at,to,dataSource:c.expectedSource,method:'TRAPEZOID_V1',maxGapSeconds:15,packetCount:2,sourcePacketCount:2,acceptedIntervals:1,excluded:{},coveredSeconds:5,uncoveredSeconds:5,estimatedLitres:.5,groups:[{calibrationVersion:'F1',intervals:1,coveredSeconds:5,estimatedLitres:.5}]}};
}
