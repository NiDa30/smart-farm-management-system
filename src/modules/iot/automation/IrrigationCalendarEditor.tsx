import React,{useEffect,useState} from 'react';
import {validCalendar,vietnamTime,type CalendarSettings,type CalendarView,type IrrigationWindow} from './calendarApi';
const dayNames=['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật'];
const blankWindow=():IrrigationWindow=>({days:[1,2,3,4,5,6,7],startTime:'06:00',endTime:'06:10'});
interface Props {view:CalendarView;editable:boolean;busy:boolean;error:string;unconfirmed:boolean;onDirty:(dirty:boolean)=>void;onSave:(settings:CalendarSettings)=>Promise<CalendarSettings|null>;onReload:()=>Promise<CalendarSettings|null>}
export const IrrigationCalendarEditor:React.FC<Props>=({view,editable,busy,error,unconfirmed,onDirty,onSave,onReload})=>{
 const [draft,setDraft]=useState<CalendarSettings>(view.settings),[dirty,setDirty]=useState(false),[saved,setSaved]=useState(false);
 useEffect(()=>{if(!dirty)setDraft(view.settings);},[view.settings,dirty]);
 useEffect(()=>{onDirty(dirty);},[dirty,onDirty]);
 const edit=(next:CalendarSettings)=>{setDraft(next);setDirty(true);setSaved(false);};
 const updateWindow=(index:number,next:IrrigationWindow)=>edit({...draft,windows:draft.windows.map((w,i)=>i===index?next:w)});
 const adopt=(settings:CalendarSettings)=>{setDraft(settings);setDirty(false);};
 const conflict=dirty&&draft.revision!==view.settings.revision,valid=validCalendar(draft);
 return <section aria-label="Lịch tưới theo tuần" className="bg-white border rounded-xl p-5 space-y-3">
  <h2 className="font-semibold">Lịch tưới theo tuần · phiên bản {view.settings.revision}</h2>
  <p className="text-sm">Giờ Việt Nam (UTC+7). Lịch giới hạn thời điểm quy tắc đất khô được tưới; chỉ lưu lịch không tự bật quy tắc. Tắt quy tắc và chờ lần tưới kết thúc trước khi sửa.</p>
  <p className="text-sm">Theo lần tải {vietnamTime(view.asOf)}: {view.settings.mode==='ANY_TIME'?'Cho phép cả ngày khi đất khô':view.withinWindow?'Đang trong khung giờ cho phép':'Đang ngoài khung giờ cho phép'}.</p>
  {view.windowStart&&view.windowEnd&&<p className="text-sm">{view.withinWindow?'Khung hiện tại':'Khung tiếp theo'}: {vietnamTime(view.windowStart)} → {vietnamTime(view.windowEnd)}.</p>}
  <form className="space-y-3" onSubmit={event=>{event.preventDefault();if(!editable||busy||!dirty||!valid||conflict||unconfirmed)return;void onSave(draft).then(confirmed=>{if(confirmed){adopt(confirmed);setSaved(true);}});}}>
   <label className="block text-sm">Chế độ lịch tưới <select aria-label="Chế độ lịch tưới" disabled={!editable||busy} value={draft.mode} onChange={event=>{const mode=event.target.value as CalendarSettings['mode'];edit({...draft,mode,windows:mode==='TIME_WINDOWS'&&!draft.windows.length?[blankWindow()]:draft.windows});}} className="border rounded p-2 ml-2"><option value="ANY_TIME">Cả ngày, theo độ ẩm</option><option value="TIME_WINDOWS">Chỉ trong khung giờ đã chọn</option></select></label>
   {draft.mode==='ANY_TIME'&&<p className="text-amber-800 text-sm">Cả ngày: quy tắc đã bật có thể tưới bất kỳ giờ nào nếu đất khô và đủ điều kiện.</p>}
   {draft.windows.map((window,index)=><fieldset key={index} disabled={!editable||busy} className="border rounded-lg p-3 space-y-3">
    <legend className="font-semibold text-sm">Khung {index+1}</legend>
    <div className="flex flex-wrap gap-3">{dayNames.map((name,day)=><label key={day} className="flex items-center gap-1 text-sm"><input type="checkbox" aria-label={`${name}, khung ${index+1}`} checked={window.days.includes(day+1)} onChange={event=>updateWindow(index,{...window,days:(event.target.checked?[...window.days,day+1]:window.days.filter(d=>d!==day+1)).sort((a,b)=>a-b)})}/>{name}</label>)}</div>
    <div className="flex flex-wrap items-center gap-3 text-sm"><label>Bắt đầu <input aria-label={`Giờ bắt đầu khung ${index+1}`} type="time" required value={window.startTime} onChange={event=>updateWindow(index,{...window,startTime:event.target.value})} className="border rounded p-2"/></label><label>Kết thúc <input aria-label={`Giờ kết thúc khung ${index+1}`} type="time" required value={window.endTime} onChange={event=>updateWindow(index,{...window,endTime:event.target.value})} className="border rounded p-2"/></label>
     <button type="button" onClick={()=>edit({...draft,windows:draft.windows.filter((_,i)=>i!==index)})} className="border rounded px-3 py-2">Xóa khung {index+1}</button></div>
    {window.startTime&&window.endTime&&window.endTime<window.startTime&&<p className="text-xs text-slate-500">Qua nửa đêm; ngày được chọn là ngày bắt đầu khung.</p>}
   </fieldset>)}
   <button type="button" disabled={!editable||busy||draft.windows.length>=8} onClick={()=>edit({...draft,mode:'TIME_WINDOWS',windows:[...draft.windows,blankWindow()]})} className="border rounded px-3 py-2 disabled:opacity-40">Thêm khung giờ</button>
   <p className="text-sm text-slate-500">Tối đa 8 khung, không chồng nhau. Trong khung, quy tắc có thể tưới nhiều đợt khi đất còn khô; thời gian bật và khoảng nghỉ lấy từ cài đặt tưới. Qua giờ, backend yêu cầu OFF theo nhịp kiểm tra; không phải timer phần cứng chính xác đến giây.</p>
   {dirty&&<p className="text-amber-800">Lịch có thay đổi chưa lưu; chưa thể bật quy tắc.</p>}
   {dirty&&!valid&&<p className="text-rose-700">Chọn ngày, giờ bắt đầu/kết thúc khác nhau và bỏ các khung chồng nhau, kể cả qua nửa đêm.</p>}
   {conflict&&<p role="alert" className="text-rose-700">Lịch đã thay đổi ở phiên khác. Tải lại lịch trước khi sửa tiếp.</p>}
   {error&&<p role="alert" className="text-rose-700">{error}</p>}
   {saved&&!dirty&&!error&&<p className="text-emerald-700">Đã lưu lịch tưới.</p>}
   <div className="flex flex-wrap gap-3"><button type="submit" disabled={!editable||busy||!dirty||!valid||conflict||unconfirmed} className="bg-emerald-700 text-white rounded px-4 py-2 disabled:opacity-40">Lưu lịch tưới</button>
   <button type="button" disabled={busy} onClick={()=>void onReload().then(confirmed=>{if(confirmed){adopt(confirmed);setSaved(false);}})} className="border rounded px-3 py-2 disabled:opacity-40">Tải lại lịch (bỏ thay đổi)</button></div>
  </form>
 </section>;
};
