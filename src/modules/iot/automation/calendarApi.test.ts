import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validCalendar,parseCalendar,sameCalendar,vietnamTime,type CalendarSettings} from './calendarApi';
const settings=(windows:CalendarSettings['windows']):CalendarSettings=>({mode:'TIME_WINDOWS',zone:'Asia/Ho_Chi_Minh',revision:1,windows});
test('weekly overlap detection includes Sunday overnight into Monday and allows adjacent windows',()=>{
 const one={days:[7],startTime:'23:00',endTime:'01:00'};
 assert.equal(validCalendar(settings([one,{days:[1],startTime:'00:30',endTime:'02:00'}])),false);
 assert.equal(validCalendar(settings([one,{days:[1],startTime:'01:00',endTime:'02:00'}])),true);
});
test('reject invalid day/time/mode/empty limited schedule',()=>{
 for(const value of [settings([]),settings([{days:[],startTime:'06:00',endTime:'06:10'}]),settings([{days:[1,1],startTime:'06:00',endTime:'06:10'}]),settings([{days:[1],startTime:'06:00',endTime:'06:00'}]),settings([{days:[1],startTime:'24:00',endTime:'01:00'}]),{...settings([]),zone:'UTC'}])assert.equal(validCalendar(value),false);
});
test('confirmation compares canonical days; Vietnam display is independent of viewer timezone',()=>{
 const a=settings([{days:[3,1],startTime:'06:00',endTime:'06:10'}]),b=settings([{days:[1,3],startTime:'06:00',endTime:'06:10'}]);
 assert.equal(sameCalendar(a,b),true);assert.match(vietnamTime('2026-10-11T23:00:00Z'),/06:00:00/);
 const view={settings:{mode:'ANY_TIME',zone:'Asia/Ho_Chi_Minh',revision:1,windows:[]},asOf:'2026-10-14T00:00:00Z',withinWindow:true,windowStart:null,windowEnd:null};
 assert.equal(parseCalendar(view).settings.mode,'ANY_TIME');assert.throws(()=>parseCalendar({...view,withinWindow:false}));
});
