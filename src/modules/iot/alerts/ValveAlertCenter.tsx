import React,{useEffect,useRef,useState} from 'react';
import {AlertAcknowledgement} from './AlertAcknowledgement';
import {parseValveAlert,parseValveAlerts,sameValveEpisode,valveAlertTitle,valveAlertContext,type ValveAlert} from './valveAlertApi';
const API='/api/v1/valve-alerts';
const time=(t:string)=>new Date(t).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
export function ValveAlertCenter({onBusyChange}:{onBusyChange:(busy:boolean)=>void}){
 const [data,setData]=useState<ValveAlert[]>([]),[loaded,setLoaded]=useState(false),[error,setError]=useState(false),[refresh,setRefresh]=useState(0),[filter,setFilter]=useState('all'),[seen,setSeen]=useState('all');
 const [selected,setSelected]=useState<ValveAlert|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[check,setCheck]=useState(false),[success,setSuccess]=useState(false);
 const flight=useRef(false),version=useRef(0);
 useEffect(()=>onBusyChange(busy),[busy,onBusyChange]);
 useEffect(()=>{if(busy)return;let alive=true,current:AbortController|null=null;let timer:ReturnType<typeof setTimeout>;
  async function load(){const v=version.current,abort=new AbortController();current=abort;const timeout=setTimeout(()=>abort.abort(),5000);try{const r=await fetch(API,{signal:abort.signal,cache:'no-store'});if(!r.ok)throw new Error();const a=parseValveAlerts(await r.json());if(alive&&v===version.current){setData(a);setError(false);setSelected(s=>s?(a.find(x=>x.id===s.id)??s):null);}}catch{if(alive&&v===version.current)setError(true);}finally{clearTimeout(timeout);if(alive){setLoaded(true);timer=setTimeout(()=>void load(),5000);}}}
  void load();return()=>{alive=false;current?.abort();clearTimeout(timer);};
 },[busy,refresh]);
 async function act(note?:string):Promise<boolean>{if(!selected||flight.current)return false;flight.current=true;version.current++;setBusy(true);setMessage('');setSuccess(false);const saving=note!==undefined,target=selected;let uncertain=saving;
  try{const r=await fetch(API+'/'+target.id+(saving?'/acknowledgement':''),{method:saving?'PUT':'GET',signal:AbortSignal.timeout(10000),cache:'no-store',...(saving?{headers:{'Content-Type':'application/json'},body:JSON.stringify({note})}:{})});
   if(!r.ok){if(r.status===400)uncertain=false;throw new Error(r.status===409?'Đợt cảnh báo đã thay đổi hoặc đã phục hồi. Đối chiếu trạng thái; không tự gửi lại.':'Chưa xác nhận được kết quả. Đối chiếu trạng thái; không tự gửi lại.');}
   const a=parseValveAlert(await r.json());if(!sameValveEpisode(a,target)||saving&&(!a.acknowledgedAt||a.acknowledgementNote!==(note||null)))throw new Error('Phản hồi không khớp. Đối chiếu trạng thái; không tự gửi lại.');
   setSelected(a);setData(all=>all.map(x=>x.id===a.id?a:x));setCheck(false);setSuccess(saving);return saving;
  }catch(e){if(uncertain)setCheck(true);setMessage(e instanceof Error&&!(e instanceof TypeError||e instanceof DOMException)?e.message:'Chưa xác nhận được kết quả. Đối chiếu trạng thái; không tự gửi lại.');return false;}
  finally{flight.current=false;setBusy(false);setRefresh(v=>v+1);}
 }
 const shown=data.filter(a=>(filter==='all'||(filter==='active'?!a.clearedAt:!!a.clearedAt))&&(seen==='all'||(seen==='unseen'?!a.acknowledgedAt:!!a.acknowledgedAt)));
 return <section className="max-w-6xl mx-auto space-y-4" aria-label="Cảnh báo van theo nhánh">
  <h1 className="text-xl font-bold">Cảnh báo van và controller</h1>
  <div className="border rounded p-4 bg-white space-y-2 text-sm"><p>Ghi nhận lỗi vị trí và lỗi controller từ packet giám sát mới, nguồn mô phỏng. Đây là lịch sử điều kiện, không khẳng định tình trạng hiện tại khi dữ liệu đã cũ.</p><p>Lỗi mở đợt ngay khi được thiết bị báo. Phục hồi cần hai packet mới liên tiếp, cùng boot, cách nhau tối đa 15 giây; lỗi vị trí cần phản hồi CLOSED không lỗi. Mất dữ liệu hoặc GPIO tắt không tự xóa lỗi vị trí.</p><p>Đổi cấu hình hoặc tắt giám sát giữ đợt cũ để đối chiếu. Xác nhận đã xem chỉ lưu ghi chú, không đóng cảnh báo, reset lỗi, gửi email hoặc điều khiển thiết bị.</p></div>
  <div className="flex gap-3 flex-wrap"><label>Điều kiện<select aria-label="Điều kiện cảnh báo van" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Tất cả</option><option value="active">Đang cảnh báo</option><option value="cleared">Đã trở về bình thường</option></select></label><label>Xác nhận<select aria-label="Xác nhận cảnh báo van" value={seen} onChange={e=>setSeen(e.target.value)}><option value="all">Tất cả</option><option value="unseen">Chưa xem</option><option value="seen">Đã xem</option></select></label><button className="underline" disabled={busy} onClick={()=>setRefresh(v=>v+1)}>Làm mới cảnh báo van</button></div>
  {!loaded&&<p role="status">Đang tải cảnh báo van…</p>}{error&&<p role="alert">Không đọc được cảnh báo van. Dữ liệu có thể cũ; tạm khóa xác nhận.</p>}
  {selected&&<AlertAcknowledgement key={selected.id} alert={selected} title={valveAlertTitle(selected)} conditionLabel="Điều kiện van" busy={busy} unavailable={error} needsCheck={check} error={message} success={success} onSave={act} onCheck={()=>void act()} onClose={()=>{if(!flight.current)setSelected(null);}}/>}
  {loaded&&!error&&!shown.length&&<p>Chưa có cảnh báo van trong bộ lọc này.</p>}
  <div className="space-y-3" aria-label="Danh sách cảnh báo van">{shown.map(a=><article key={a.id} className={'border rounded p-4 space-y-2 '+(a.clearedAt?'bg-white':'bg-amber-50')}>
   <h2 className="font-bold">{valveAlertTitle(a)} · {a.clearedAt?'Đã trở về bình thường':'Đang cảnh báo'}</h2><p>{a.circuitSnapshot.controllerId}/{a.circuitSnapshot.valveId} · {a.circuitSnapshot.zoneId} · Phiên bản nhánh {a.circuitSnapshot.revision} · Mô phỏng</p><p>{valveAlertContext[a.context]}</p>
   <p>Backend ghi nhận: {time(a.openedAt)} · Giờ đo: {time(a.openedSourceAt)}</p><p>Bằng chứng mở đợt: boot {a.openedEvidence.bootId} · sequence {a.openedEvidence.sequence} · {a.openedEvidence.positionFeedback?.fault??a.openedEvidence.reason}</p>
   {a.clearedAt&&<p>Đã phục hồi lúc: {time(a.clearedAt)} · Giờ đo phục hồi: {time(a.clearedSourceAt!)} · boot {a.clearedEvidence!.bootId} · sequence {a.clearedEvidence!.sequence} · Không có nghĩa đã tưới.</p>}
   <p>{a.acknowledgedAt?'Đã xem lúc: '+time(a.acknowledgedAt):'Chưa xác nhận đã xem'}</p>{a.acknowledgementNote&&<p className="whitespace-pre-wrap break-words">Ghi chú: {a.acknowledgementNote}</p>}<button className="underline" disabled={busy} onClick={()=>{if(!flight.current){setSelected(a);setMessage('');setCheck(false);setSuccess(false);}}}>Chi tiết cảnh báo van #{a.id}</button>
  </article>)}</div><p className="text-xs">Tải mỗi 5 giây, tối đa 100 đợt; ưu tiên đang cảnh báo rồi chưa xem. Bộ lọc chỉ áp dụng cho danh sách đã tải. Đợt ngoài danh sách vẫn đối chiếu được khi đang mở chi tiết.</p>
 </section>;
}
