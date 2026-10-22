import React,{useEffect,useRef,useState} from 'react';
import {IrrigationQueuePanel} from '../irrigation/IrrigationQueuePanel';
import {normalizeSchedule,parseQueueSchedule,readQueueSchedule,saveQueueSchedule,sameSchedule,scheduleReasons,ScheduleSaveError,type ScheduleSave,type ScheduleView} from './queueScheduleApi';
const time=(s:string)=>new Date(s).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
const days=['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật'];
function draftFor(v:ScheduleView):ScheduleSave {const d=v.plan?.definition;return {revision:v.plan?.revision??0,enabled:d?.enabled??false,zoneRevision:v.zoneRevision,circuitId:v.circuit?.circuitId??d?.circuitId??'',circuitRevision:v.circuit?.revision??d?.circuitRevision??1,durationSeconds:d?.durationSeconds??5,timezone:'Asia/Ho_Chi_Minh',slots:d?.slots??[{days:[1,2,3,4,5,6,7],time:'06:00'}],reviewedAt:v.asOf};}
export function ZoneQueueSchedulePanel({zoneId,onBack}:{zoneId:string;onBack:()=>void}){
 const key='smartfarm-queue-schedule:'+zoneId;
 const [data,setData]=useState<ScheduleView|null>(null),[draft,setDraft]=useState<ScheduleSave|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[storage,setStorage]=useState(''),[showQueue,setShowQueue]=useState(false);
 const pending=useRef<ScheduleSave|null>(null),flight=useRef(false),mounted=useRef(false),version=useRef(0),abort=useRef<AbortController|null>(null);
 function remember(value:ScheduleSave|null){pending.current=value;try{if(value)sessionStorage.setItem(key,JSON.stringify(value));else sessionStorage.removeItem(key);}catch{setStorage('Không lưu được ý định qua reload; mã hiện chỉ giữ trong phiên trang này.');}}
 function accept(v:ScheduleView,reset=false){setData(v);const p=pending.current;if(p&&v.plan?.revision===p.revision+1&&sameSchedule(v.plan.definition,p)){remember(null);setMessage('Đã đối chiếu lịch đã lưu.');setDraft(draftFor(v));}else if(reset||!draft&&!p)setDraft(draftFor(v));}
 async function read(reset=false){if(flight.current)return;flight.current=true;const generation=++version.current;abort.current?.abort();const c=new AbortController();abort.current=c;setBusy(true);setError('');const timer=setTimeout(()=>c.abort(),7000);
  try{const v=await readQueueSchedule(zoneId,c.signal);if(!mounted.current||generation!==version.current)return;if(reset){remember(null);setMessage('Đã bỏ ý định chờ trên trình duyệt; thao tác này không hoàn tác lịch trên server.');}accept(v,reset);}
  catch(e){if(mounted.current&&generation===version.current){setData(null);setError(e instanceof Error&&e.name!=='AbortError'?e.message:'Đọc lịch quá hạn.');}}
  finally{clearTimeout(timer);if(mounted.current&&generation===version.current){flight.current=false;setBusy(false);}}
 }
 useEffect(()=>{mounted.current=true;try{const s=sessionStorage.getItem(key);if(s){pending.current=normalizeSchedule(JSON.parse(s));setDraft(pending.current);}}catch{setStorage('Không đọc được ý định lưu cũ; chỉ đối chiếu cấu hình server trước khi sửa.');}
  void read();return()=>{mounted.current=false;version.current++;abort.current?.abort();flight.current=false;};
 },[zoneId]);
 async function save(e:React.FormEvent){e.preventDefault();if(!draft||!data||flight.current||pending.current)return;let input:ScheduleSave;try{input=normalizeSchedule({...draft,reviewedAt:data.asOf});}catch(e){setError((e as Error).message);return;}
  flight.current=true;const generation=++version.current;abort.current?.abort();const c=new AbortController();abort.current=c;setBusy(true);setError('');setMessage('');const timer=setTimeout(()=>c.abort(),7000);
  try{const latest=await readQueueSchedule(zoneId,c.signal);if((latest.plan?.revision??0)!==input.revision)throw new ScheduleSaveError('Lịch đã đổi; đọc bản hiện tại trước khi lưu.',false);input=normalizeSchedule({...input,reviewedAt:latest.asOf});remember(input);const v=await saveQueueSchedule(zoneId,input,c.signal);if(!mounted.current||generation!==version.current)return;remember(null);setData(v);setDraft(draftFor(v));setMessage('Đã lưu lịch tạo lượt chờ. Chưa gửi lệnh tưới.');}
  catch(e){if(mounted.current&&generation===version.current){if(e instanceof ScheduleSaveError&&!e.uncertain)remember(null);setError((e as Error).message);}}
  finally{clearTimeout(timer);if(mounted.current&&generation===version.current){flight.current=false;setBusy(false);}}
 }
 if(showQueue)return <IrrigationQueuePanel onBack={()=>{setShowQueue(false);void read();}}/>;
 return <section aria-label="Lịch tạo lượt tưới" className="max-w-4xl mx-auto space-y-3">
  <button className="underline" disabled={busy} onClick={onBack}>Quay lại vùng tưới</button><h2 className="text-xl font-bold">Lịch tưới theo vùng {zoneId}</h2>
  <p>Đến giờ chỉ tạo lượt chờ để bạn duyệt sang phiên tưới. Không tự mở van hoặc bật bơm; không phụ thuộc đa số đất khô để lập lượt. Nước, mưa và phản hồi thiết bị được kiểm tra lại khi chuẩn bị/chạy phiên.</p>
  <p>Giờ Việt Nam (UTC+7), tối đa 8 dòng giờ theo tuần, 1–10 giây yêu cầu. Khởi động lại hoặc bỏ lỡ vòng đánh giá hơn 30 giây sẽ không tạo bù. Lượt chờ hết hạn sau 5 phút.</p>
  <button className="underline mr-3" disabled={busy} onClick={()=>void read()}>Đọc đối chiếu lịch</button><button className="underline" onClick={()=>setShowQueue(true)}>Mở hàng chờ tưới</button>
  {storage&&<p role="alert">{storage}</p>}{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}{busy&&<p role="status">Đang xử lý lịch…</p>}
  {pending.current&&<div className="bg-amber-50 p-3"><p>Ý định lưu chưa được đối chiếu. Không tự gửi lại sau reload. Tắt lịch không hủy lượt đã tạo; hủy riêng trong hàng chờ.</p><button disabled={busy} onClick={()=>void read(true)}>Bỏ ý định chờ và đọc bản hiện tại</button></div>}
  {data&&<>
   <p>Backend lập lịch: {data.workerEnabled?'Đã bật cấu hình':'Đang tắt cấu hình'} · mapping: {data.configurationState} · lịch v{data.plan?.revision??0}</p>
   <p>Vòng đánh giá cuối: {data.lastTickAt?time(data.lastTickAt):'Chưa có'} · {data.lastTickResult}. Đây là mốc đã lưu, không đảm bảo worker hiện còn chạy. Đọc snapshot lúc {time(data.asOf)}.</p>
   <p>Giờ kế hoạch tiếp theo: {data.nextDueAt?time(data.nextDueAt):'Chưa có lịch đủ điều kiện'}. Đây chưa phải xác nhận sẽ tưới.</p>
   {data.configurationState==='CONFIG_CHANGED'&&<p role="alert">Mapping đã đổi. Bật lại cần duyệt mapping hiện tại; vẫn có thể lưu tắt lịch.</p>}
  </>}
  {draft&&<form onSubmit={save} className="border rounded p-3 space-y-3" aria-label="Thiết lập lịch vùng">
   <fieldset disabled={busy||!!pending.current||!data} className="space-y-3">
    <p>Mapping sẽ lưu: vùng v{draft.zoneRevision} · {draft.circuitId||'Chưa có nhánh'} v{draft.circuitRevision}</p>
    <label><input type="checkbox" aria-label="Bật lịch tạo lượt chờ" checked={draft.enabled} disabled={!data?.workerEnabled&&!draft.enabled} onChange={e=>setDraft({...draft,enabled:e.target.checked})}/> Bật lịch tạo lượt chờ</label>
    <label className="block">Thời lượng yêu cầu (giây)<input aria-label="Thời lượng lịch" type="number" min={1} max={10} step={1} value={Number.isFinite(draft.durationSeconds)?draft.durationSeconds:''} onChange={e=>setDraft({...draft,durationSeconds:e.target.valueAsNumber})}/></label>
    {draft.slots.map((s,i)=><div key={i} className="border p-2"><label>Giờ {i+1}<input aria-label={`Giờ lịch ${i+1}`} type="time" required value={s.time} onChange={e=>setDraft({...draft,slots:draft.slots.map((x,n)=>n===i?{...x,time:e.target.value}:x)})}/></label>
     <div>{days.map((label,n)=><label key={n} className="mr-2"><input type="checkbox" aria-label={`Lịch ${i+1} ${label}`} checked={s.days.includes(n+1)} onChange={e=>setDraft({...draft,slots:draft.slots.map((x,k)=>k===i?{...x,days:e.target.checked?[...x.days,n+1]:x.days.filter(d=>d!==n+1)}:x)})}/>{label}</label>)}</div>
     <button type="button" onClick={()=>setDraft({...draft,slots:draft.slots.filter((_,n)=>n!==i)})}>Xóa giờ {i+1}</button>
    </div>)}
    <button type="button" disabled={draft.slots.length>=8} onClick={()=>setDraft({...draft,slots:[...draft.slots,{days:[1,2,3,4,5,6,7],time:'18:00'}]})}>Thêm giờ</button>
    <p>Tắt lịch ngăn lượt mới. Các lượt đã chờ không tự bị hủy.</p><button className="border p-2" type="submit" disabled={!data||draft.revision!==(data.plan?.revision??0)}>Lưu lịch vùng</button>
   </fieldset>
   <button type="button" disabled={busy||!!pending.current||!data} onClick={()=>data&&setDraft(draftFor(data))}>Dùng mapping và lịch hiện tại</button>
  </form>}
  {data&&<section aria-label="Các lần đến lịch"><h3 className="font-bold">20 lần đánh giá gần nhất</h3>{!data.occurrences.length&&<p>Chưa có lần đến lịch được ghi nhận. Thời gian backend dừng không được tạo bù.</p>}{data.occurrences.map(e=><article className="border p-2" key={e.dueAt}><p>{time(e.dueAt)} · lịch v{e.scheduleRevision} · {scheduleReasons[e.reason]}</p><p>{e.requestId?'Mã lượt chờ: '+e.requestId:'Không tạo lượt chờ'} · đánh giá lúc {time(e.evaluatedAt)}. Đã tạo lượt không có nghĩa đã tưới.</p></article>)}</section>}
 </section>;
}
