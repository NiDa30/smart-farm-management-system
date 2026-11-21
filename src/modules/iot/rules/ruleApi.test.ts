import {test} from 'node:test';import assert from 'node:assert/strict';
import {definitionError,blankDefinition,leaves,longestAction,parseRules,parseSimulation,type Definition,type Catalog} from './ruleApi';
const catalog:Catalog={channels:[{nodeId:'ENV01',channelId:'AIR_TEMP',metric:'AIR_TEMPERATURE'},{nodeId:'WATER01',channelId:'LOW',metric:'WATER_PRESENT'}],
 actuators:[{actuatorId:'FAN01',actuatorType:'FAN',maxSeconds:14400},{actuatorId:'MIST01',actuatorType:'MIST',maxSeconds:600},{actuatorId:'VALVE01',actuatorType:'VALVE',maxSeconds:3600}]};
const good=():Definition=>({conditions:{op:'ALL',items:[{type:'SENSOR',nodeId:'ENV01',channelId:'AIR_TEMP',comparator:'GT',value:32,forSeconds:300},
 {op:'ANY',items:[{type:'TIME',start:'22:00',end:'06:00',days:[1,2]},{type:'ACTUATOR_STATE',actuatorId:'PUMP01',state:'OFF'}]}]},
 actions:[{type:'ACTUATOR',actuatorId:'FAN01',action:'ON',durationSeconds:900},{type:'ZONE_SEQUENCE',zones:[{valveId:'VALVE01',pumpSeconds:120}]}],cooldownSeconds:1800,maxRunsPerDay:6,manualHoldSeconds:600});

test('valid definition passes and limits match the backend',()=>{
 assert.equal(definitionError(good(),catalog),null);
 assert.equal(leaves(good().conditions),3);assert.equal(longestAction(good()),900);
 assert.match(definitionError(blankDefinition(),catalog)!,/1–8 điều kiện/);
});
test('refuses what the backend would refuse',()=>{
 const cases:[(d:Definition)=>void,RegExp][]=[
  [d=>{d.cooldownSeconds=600;},/hành động dài nhất/],
  [d=>{d.actions=[{type:'ACTUATOR',actuatorId:'PUMP01',action:'ON',durationSeconds:60}];},/bơm chỉ qua tưới theo zone/],
  [d=>{d.actions.unshift({type:'ACTUATOR',actuatorId:'FAN01',action:'OFF'});},/hai lần/],
  [d=>{d.actions.reverse();},/hành động cuối/],
  [d=>{d.actions[0]={type:'ACTUATOR',actuatorId:'MIST01',action:'ON',durationSeconds:601};},/1–600/],
  [d=>{(d.conditions.items[1] as any).items.push({op:'ALL',items:[]});},/một cấp/],
  [d=>{d.conditions.items.push({type:'SENSOR',nodeId:'WATER01',channelId:'LOW',comparator:'GT',value:1,forSeconds:0});},/Phép so sánh/],
  [d=>{d.conditions.items.push({type:'TIME',start:'08:00',end:'08:00',days:[1]});},/Khung giờ/],
  [d=>{d.maxRunsPerDay=49;},/1–48/],
  [d=>{for(let i=0;i<6;i++)d.conditions.items.push({type:'TIME',start:'08:00',end:'09:00',days:[1]});},/1–8/]];
 for(const [mutate,expected] of cases){const d=good();mutate(d);assert.match(definitionError(d,catalog)??'',expected);}
});
test('parsers reject malformed responses',()=>{
 assert.throws(()=>parseRules({enabled:true,rules:[]}));
 assert.equal(parseRules({enabled:true,wateringRule:{name:'x',enabled:false,targets:['PUMP01']},rules:[]}).rules.length,0);
 assert.throws(()=>parseSimulation({hours:1,trueMinutes:-1,falseMinutes:0,unknownMinutes:0,fires:[],truncated:false}));
});
