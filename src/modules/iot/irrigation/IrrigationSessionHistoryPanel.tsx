import React,{useEffect,useRef,useState} from 'react';
import {fetchSessionHistory,fetchSessionSteps,historyFollows,sessionsCsv,sessionStepsCsv,sessionConditions,sessionPhases,type SessionQuery,type SessionCondition,type SessionEntry,type SessionHistoryStep,type Loaded} from './sessionHistoryApi';
// SessionRun is owned by the workflow API; this panel performs GETs only.
import type {SessionRun as Run} from './irrigationSessionApi';
const time=(s:string)=>new Date(s).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
const windowQuery=(hours:number,circuitId:string,condition:SessionCondition):SessionQuery=>{
 const to=new Date();return {from:new Date(to.getTime()-hours*3600000).toISOString(),to:to.toISOString(),circuitId,condition};
};
function download(text:string,name:string){const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function IrrigationSessionHistoryPanel({onBack,initialCircuitId=''}:{onBack:()=>void;initialCircuitId?:string}){
 const [hours,setHours]=useState('24'),[circuit,setCircuit]=useState(initialCircuitId),[condition,setCondition]=useState<SessionCondition>('ALL');
 const [query,setQuery]=useState(()=>windowQuery(24,initialCircuitId,'ALL'));
 const [rows,setRows]=useState<Loaded<SessionEntry>[]>([]),[cursor,setCursor]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loaded,setLoaded]=useState(false);
 const [selected,setSelected]=useState<Run|null>(null),[steps,setSteps]=useState<Loaded<SessionHistoryStep>[]>([]),[stepCursor,setStepCursor]=useState<string|null>(null),[stepBusy,setStepBusy]=useState(false),[stepError,setStepError]=useState('');
 const list=useRef({version:0,abort:null as AbortController|null,ceiling:null as number|null,cursor:null as string|null,busy:false});
 const detail=useRef({version:0,abort:null as AbortController|null,ceiling:null as number|null,cursor:null as string|null,busy:false});
 function closeDetail(){detail.current.version++;detail.current.abort?.abort();detail.current.busy=false;detail.current.cursor=null;detail.current.ceiling=null;setSelected(null);setSteps([]);setStepCursor(null);setStepBusy(false);setStepError('');}
 async function load(q:SessionQuery,more=false){
  const s=list.current;if(more&&s.busy)return;const version=++s.version;s.abort?.abort();const abort=new AbortController();s.abort=abort;s.busy=true;setBusy(true);setError('');const timer=setTimeout(()=>abort.abort(),7000);
  try{
   const page=await fetchSessionHistory(q,more?s.cursor:null,abort.signal);if(version!==s.version)return;
   if(more&&(page.ceilingId!==s.ceiling||rows.length&&page.items.length&&!historyFollows({id:rows.at(-1)!.id,createdAt:rows.at(-1)!.session.createdAt},{id:page.items[0].id,createdAt:page.items[0].session.createdAt})||page.items.some(x=>rows.some(y=>y.session.sessionId===x.session.sessionId))))throw new Error('Trang phiên không nối tiếp. Đọc lại lịch sử.');
   const items=page.items.map(x=>({...x,readAt:page.asOf}));setRows(old=>more?[...old,...items]:items);s.ceiling=page.ceilingId;s.cursor=page.nextCursor;setCursor(page.nextCursor);setLoaded(true);
  }catch(e){if(version===s.version){setError(e instanceof Error&&e.name!=='AbortError'?e.message:'Đọc lịch sử quá hạn. Thử đọc lại.');setLoaded(true);}}
  finally{clearTimeout(timer);if(version===s.version){s.busy=false;setBusy(false);}}
 }
 async function loadSteps(run:Run,more=false){
  const s=detail.current;if(more&&s.busy)return;const version=++s.version;s.abort?.abort();const abort=new AbortController();s.abort=abort;s.busy=true;setStepBusy(true);setStepError('');
  if(!more){setSelected(run);setSteps([]);setStepCursor(null);s.cursor=null;s.ceiling=null;}
  const timer=setTimeout(()=>abort.abort(),7000);
  try{
   const page=await fetchSessionSteps(run.config.circuitId,run.sessionId,more?s.cursor:null,abort.signal);if(version!==s.version)return;
   if(more&&(page.ceilingId!==s.ceiling||page.session.revision!==run.revision||steps.length&&page.items.length&&!historyFollows(steps.at(-1)!,page.items[0])||page.items.some(x=>steps.some(y=>y.operation.requestId===x.operation.requestId))))throw new Error('Phiên đã đổi hoặc các bước không nối tiếp. Đọc lại chi tiết.');
   const items=page.items.map(x=>({...x,readAt:page.asOf}));setSelected(page.session);setSteps(old=>more?[...old,...items]:items);s.ceiling=page.ceilingId;s.cursor=page.nextCursor;setStepCursor(page.nextCursor);
  }catch(e){if(version===s.version)setStepError(e instanceof Error&&e.name!=='AbortError'?e.message:'Đọc chi tiết quá hạn. Thử đọc lại.');}
  finally{clearTimeout(timer);if(version===s.version){s.busy=false;setStepBusy(false);}}
 }
 useEffect(()=>{
  setRows([]);setCursor(null);setLoaded(false);list.current.cursor=null;list.current.ceiling=null;closeDetail();void load(query);
  return()=>{list.current.version++;list.current.abort?.abort();list.current.busy=false;detail.current.version++;detail.current.abort?.abort();detail.current.busy=false;};
 },[query]);
 const valid=!circuit||/^[A-Z][A-Z0-9_-]{1,31}$/.test(circuit);
 return <section aria-label="Lịch sử phiên tưới" className="max-w-6xl mx-auto space-y-4">
  <button className="underline" onClick={onBack}>Quay lại danh sách nhánh</button><h1 className="text-xl font-bold">Lịch sử phiên tưới</h1>
  <p className="bg-amber-50 p-3 rounded">Xem lại các phiên có người xác nhận và từng yêu cầu đã lưu. Thời gian bật là thời gian yêu cầu; ACK không chứng minh bơm đang chạy hoặc lượng nước đã tưới.</p>
  <form className="flex gap-3 flex-wrap items-end" onSubmit={e=>{e.preventDefault();if(valid)setQuery(windowQuery(Number(hours),circuit,condition));}}>
   <label>Khoảng lịch sử<select aria-label="Khoảng lịch sử phiên" className="border p-2 block" value={hours} onChange={e=>setHours(e.target.value)}>{[['1','1 giờ'],['24','24 giờ'],['168','7 ngày'],['744','31 ngày']].map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
   <label>Mã nhánh<input aria-label="Lọc nhánh phiên" className="border p-2 block" value={circuit} maxLength={32} onChange={e=>setCircuit(e.target.value)}/></label>
   <label>Trạng thái phiên<select aria-label="Lọc trạng thái phiên" className="border p-2 block" value={condition} onChange={e=>setCondition(e.target.value as SessionCondition)}>{Object.entries(sessionConditions).map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
   <button className="border rounded p-2" disabled={!valid} type="submit">Đọc lịch sử phiên</button><button className="border rounded p-2" type="button" disabled={!rows.length||busy||!!error} onClick={()=>download(sessionsCsv(rows),'irrigation-sessions-loaded.csv')}>CSV phiên đã tải</button>
  </form>
  {!valid&&<p role="alert">Mã nhánh cần chữ in hoa, số, _ hoặc -.</p>}
  <p>Bộ lọc đã áp dụng: {query.circuitId||'mọi nhánh'} · {sessionConditions[query.condition]} · từ {time(query.from)} đến {time(query.to)} (giờ Việt Nam), theo giờ tạo phiên.</p>
  {busy&&<p role="status">Đang đọc lịch sử phiên…</p>}{error&&<p role="alert">{error} Các dòng cũ nếu có chưa phải dữ liệu đầy đủ.</p>}
  {loaded&&!busy&&!error&&!rows.length&&<p>Chưa có phiên theo bộ lọc.</p>}
  {rows.map(x=><article className="border rounded p-3" key={x.session.sessionId}>
   <p>{x.session.config.circuitId} v{x.session.config.revision} · {sessionPhases[x.session.phase]} · {x.session.durationSeconds} giây yêu cầu</p>
   <p>{time(x.session.createdAt)} · {x.actionCount} bước đã lưu · {x.unresolvedCount} bước chưa có kết quả gọi</p>
   <button className="underline" onClick={()=>void loadSteps(x.session)}>Xem phiên {x.session.sessionId}</button>
  </article>)}
  {cursor&&<button className="border p-2" disabled={busy} onClick={()=>void load(query,true)}>Tải thêm phiên</button>}
  <p>Đã tải {rows.length} phiên. CSV chỉ gồm dòng đã tải. Phân trang loại các bản ghi tạo sau mốc đầu; trạng thái phiên và ACK vẫn có thể đổi. Đọc lại để lấy tình trạng mới.</p>
  {selected&&<section aria-label="Chi tiết phiên tưới" className="border rounded p-4 space-y-3">
   <button className="underline mr-3" onClick={closeDetail}>Đóng chi tiết phiên</button><button className="underline" onClick={()=>void loadSteps(selected)}>Đọc lại chi tiết phiên</button>
   <h2 className="font-bold">Phiên {selected.sessionId}</h2><p>{selected.config.name} · {selected.config.circuitId} v{selected.config.revision} · {selected.config.zoneId} v{selected.config.zoneRevision} · {selected.config.controllerId}/{selected.config.valveId} · {selected.config.expectedSource}</p>
   <p>{sessionPhases[selected.phase]} · {selected.durationSeconds} giây yêu cầu · {selected.stopRequested?'Đã yêu cầu dừng':'Chưa ghi yêu cầu dừng'} · {selected.reason}</p>
   <p>Tạo {time(selected.createdAt)} · kết thúc {selected.finishedAt?time(selected.finishedAt):'Chưa khép'} · boot bơm {selected.pumpBootId} · boot van gốc {selected.valveBootId}</p>
   <p>Cấu hình được giữ tại lúc tạo phiên. Kết quả gọi ban đầu và bản lưu ACK lúc đọc là hai nguồn riêng. Thiếu lệnh hoặc ACK không được coi là đã tắt. Trang này chỉ xem, không gửi lại bước.</p>
   {stepBusy&&<p role="status">Đang đọc các bước…</p>}{stepError&&<p role="alert">{stepError} Chưa coi chi tiết đã đầy đủ.</p>}
   <button className="border p-2" disabled={!steps.length||stepBusy||!!stepError} onClick={()=>download(sessionStepsCsv(selected,steps),'irrigation-session-steps-loaded.csv')}>CSV bước đã tải</button>
   {!stepBusy&&!stepError&&!steps.length&&<p>Phiên chưa lưu bước nào.</p>}
   {steps.map(x=><article className="border rounded p-3" key={x.operation.requestId}>
    <h3>{x.operation.action} · {x.operation.requestId}</h3><p>Lưu lúc {time(x.createdAt)} · {x.operation.state==='RETURNED'?'Đã lưu kết quả gọi':x.operation.state==='RESERVED'?'Đang giữ mã, chưa có kết quả':'Kết quả gọi chưa rõ'}</p>
    <p>Kết quả gọi ban đầu: {x.operation.action==='FINISH'?'Chỉ khép bản ghi, không có lệnh':x.operation.result?.state??x.operation.result?.command?.state??'Chưa có'}.</p>
    {x.command?<><p>Bản lưu lệnh lúc đọc: {x.command.state} · lỗi {x.command.errorCode??'Không ghi lỗi'} · ordinal #{x.command.ordinal} · boot đích {x.command.targetBootId??'Không ràng boot'}</p>
     <p>{x.command.ackSequence!==null?`ACK sequence ${x.command.ackSequence}, boot ${x.command.ackBootId}${x.command.acknowledgedAt?', nhận lúc '+time(x.command.acknowledgedAt):', chưa lưu giờ nhận ACK'}${x.command.reportedState?', báo '+x.command.reportedState:''}`:'Chưa có ACK trong bản lưu.'} Chưa suy ra trạng thái hiện tại.</p></>:<p>{x.operation.action==='FINISH'?'Bước kết thúc không phát lệnh.':'Chưa có bản lưu lệnh khớp yêu cầu để đối chiếu.'}</p>}
    <p className="text-sm">Đọc lúc {time(x.readAt)}</p>
   </article>)}
   {stepCursor&&<button className="border p-2" disabled={stepBusy} onClick={()=>void loadSteps(selected,true)}>Tải thêm bước</button>}<p>Đã tải {steps.length} bước, mới nhất trước. CSV không tự tải các trang còn lại.</p>
  </section>}
 </section>;
}
