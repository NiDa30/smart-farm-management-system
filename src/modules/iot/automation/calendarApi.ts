export interface IrrigationWindow { days:number[];startTime:string;endTime:string }
export interface CalendarSettings {mode:'ANY_TIME'|'TIME_WINDOWS';zone:'Asia/Ho_Chi_Minh';revision:number;windows:IrrigationWindow[]}
export interface CalendarView {settings:CalendarSettings;asOf:string;withinWindow:boolean;windowStart:string|null;windowEnd:string|null}
const time=(v:unknown):v is string=>typeof v==='string'&&/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(v);
const minute=(v:string)=>Number(v.slice(0,2))*60+Number(v.slice(3));
export function validCalendar(value:unknown):value is CalendarSettings {
 const s=value as CalendarSettings;
 if(!s||!['ANY_TIME','TIME_WINDOWS'].includes(s.mode)||s.zone!=='Asia/Ho_Chi_Minh'||!Number.isSafeInteger(s.revision)||s.revision<1
   ||!Array.isArray(s.windows)||s.windows.length>8||(s.mode==='TIME_WINDOWS'&&!s.windows.length))return false;
 const ranges:{start:number;end:number}[]=[];
 for(const w of s.windows){
  if(!w||!Array.isArray(w.days)||!w.days.length||w.days.length>7||!w.days.every(d=>Number.isInteger(d)&&d>=1&&d<=7)||new Set(w.days).size!==w.days.length
    ||!time(w.startTime)||!time(w.endTime)||w.startTime===w.endTime)return false;
  const from=minute(w.startTime),to=minute(w.endTime);
  for(const day of w.days){const start=(day-1)*1440+from,end=(day-1)*1440+to+(to<from?1440:0);ranges.push({start,end:Math.min(end,10080)});if(end>10080)ranges.push({start:0,end:end-10080});}
 }
 ranges.sort((a,b)=>a.start-b.start);
 return ranges.every((range,index)=>!index||range.start>=ranges[index-1].end);
}
export function parseCalendar(value:unknown):CalendarView {
 const v=value as CalendarView;
 const date=(s:unknown):s is string=>typeof s==='string'&&Number.isFinite(Date.parse(s));
 if(!v||!validCalendar(v.settings)||!date(v.asOf)||typeof v.withinWindow!=='boolean'
   ||!(v.windowStart===null||date(v.windowStart))||!(v.windowEnd===null||date(v.windowEnd))
   ||(v.settings.mode==='ANY_TIME'?(v.withinWindow!==true||v.windowStart!==null||v.windowEnd!==null):(!v.windowStart||!v.windowEnd||Date.parse(v.windowStart)>=Date.parse(v.windowEnd))))throw new Error('Phản hồi lịch tưới không hợp lệ.');
 return v;
}
export function sameCalendar(a:CalendarSettings,b:CalendarSettings):boolean {
 return a.mode===b.mode&&a.zone===b.zone&&a.windows.length===b.windows.length&&a.windows.every((w,i)=>{
  const other=b.windows[i];return w.startTime===other.startTime&&w.endTime===other.endTime&&[...w.days].sort().join(',')===[...other.days].sort().join(',');
 });
}
export const vietnamTime=(value:string)=>new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
