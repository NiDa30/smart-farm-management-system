export const historyBoot='86000000-0000-4000-8000-000000000001';
export const historySession='86000000-0000-4000-8000-000000000002';
export const historyRequest='86000000-0000-4000-8000-000000000003';
export const historyConfig={circuitId:'PC1',name:'Nhánh lịch sử',zoneId:'PZONE1',zoneRevision:1,controllerId:'IRRIGATION18',valveId:'VALVE18',pumpId:'PUMP01',waterNodeId:'PWATER',lowChannelId:'LOW',flowChannelId:'FLOW',expectedSource:'SIMULATOR',revision:1};
export function historyRun(at:string,id=historySession){return {sessionId:id,config:{...historyConfig},pumpBootId:historyBoot,valveBootId:historyBoot,durationSeconds:5,requestedAt:at,createdAt:at,revision:10,phase:'CLOSED_CONFIRMED',stopRequested:true,reason:'OPERATOR_FINISH',openId:null,onId:historyRequest,offId:null,closeId:null,finishedAt:at};}
export function historyStep(at:string){
 const definition={requestId:historyRequest,action:'ON',expectedRevision:1,reviewedAt:at};
 const payload={requestId:historyRequest,action:'ON',durationSeconds:5,expectedBootId:historyBoot,intentRevision:1,reviewedAt:at,route:{circuitId:'PC1',circuitRevision:1,zoneId:'PZONE1',zoneRevision:1,controllerId:'IRRIGATION18',valveId:'VALVE18'}};
 const expiresAt=new Date(Date.parse(at)+10000).toISOString();
 return {id:1,createdAt:at,operation:{requestId:historyRequest,sessionId:historySession,action:'ON',definition,payload,state:'RETURNED',result:{request:payload,command:{commandId:historyRequest,action:'ON',durationSeconds:5,issuedAt:at,expiresAt,state:'SENT',reportedState:null,errorCode:null}}},command:{kind:'PUMP',commandId:historyRequest,action:'ON',state:'EXECUTED',reportedState:'ON',errorCode:null,issuedAt:at,expiresAt,targetBootId:historyBoot,ordinal:1,acknowledgedAt:at,ackBootId:historyBoot,ackSequence:2}};
}
