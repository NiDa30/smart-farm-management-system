import React,{useEffect,useRef,useState} from 'react';
import {parseNodes,sourceLabels,type FarmNode} from '../nodes/nodeApi';
import {parseRainView,parseRainPolicy,rainMatches,rainState,rainLabels,type RainView,type RainRequest} from './rainGateApi';
export function ZoneRainGatePanel({zoneId,onBack,backLabel='Quay lại vùng tưới'}:{zoneId:string;onBack:()=>void;backLabel?:string}){
 const [view,setView]=useState<RainView|null>(null),[nodes,setNodes]=useState<FarmNode[]>([]),[draft,setDraft]=useState<RainRequest|null>(null),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false),[conflict,setConflict]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[epoch,setEpoch]=useState(0),[,tick]=useState(0);
 const mounted=useRef(true),flight=useRef(false),pending=useRef<RainRequest|null>(null),mutation=useRef<AbortController|null>(null),clock=useRef({floor:0,at:0,received:-Infinity}),dirtyRef=useRef(false);
 dirtyRef.current=dirty;
 const url=`/api/v1/irrigation-zones/${encodeURIComponent(zoneId)}/weather`;
 function accept(v:RainView,start:number){const now=performance.now(),old=clock.current;clock.current={floor:Math.max(Date.parse(v.asOf)+now-start,old.floor+Math.max(0,now-old.at)),at:now,received:now};setView(v);}
 function from(v:RainView):RainRequest {const p=v.policy;return {expectedRevision:p?.revision??0,zoneRevision:v.zoneRevision,nodeId:p?.nodeId??'',channelId:p?.channelId??'',expectedSource:v.zoneSource,calibrationVersion:p?.calibrationVersion??null,enabled:p?.enabled??false};}
 useEffect(()=>{mounted.current=true;const timer=setInterval(()=>tick(v=>v+1),500);return()=>{mounted.current=false;mutation.current?.abort();clearInterval(timer);};},[]);
 useEffect(()=>{let active=true,running=false,controller:AbortController;
  async function load(){if(running||flight.current||busy)return;running=true;controller=new AbortController();const start=performance.now(),timeout=setTimeout(()=>controller.abort(),7000);
   try{const [a,b]=await Promise.all([fetch(url,{signal:controller.signal,cache:'no-store'}),fetch('/api/v1/nodes',{signal:controller.signal,cache:'no-store'})]);if(!a.ok||!b.ok)throw new Error();const v=parseRainView(await a.json()),n=parseNodes(await b.json());if(v.zoneId!==zoneId)throw new Error();if(active&&!flight.current){accept(v,start);setNodes(n.nodes);setError('');if(!dirtyRef.current)setDraft(from(v));}}
   catch{if(active&&!flight.current)setError('Không đọc được chốt mưa. Chưa xác nhận dữ liệu mới.');}finally{clearTimeout(timeout);running=false;}}
  void load();const timer=setInterval(()=>void load(),5000);return()=>{active=false;controller?.abort();clearInterval(timer);};
 },[url,zoneId,epoch,busy]);
 const elapsed=performance.now(),serverNow=clock.current.floor+Math.max(0,elapsed-clock.current.at),fresh=!!view&&!error&&elapsed-clock.current.received<8000&&serverNow-Date.parse(view.asOf)<8000;
 const state=view?rainState(view,serverNow,!fresh):'UNKNOWN',eligible=nodes.filter(n=>n.nodeType==='WEATHER'&&n.telemetryVersion===2&&n.areaId===view?.areaId),selected=eligible.find(n=>n.nodeId===draft?.nodeId),channels=selected?.channels.filter(c=>c.metric==='RAIN_DETECTED');
 const changed=!!view&&!!draft&&((view.policy?.revision??0)!==draft.expectedRevision||view.zoneRevision!==draft.zoneRevision),valid=!!draft&&(draft.enabled?channels?.some(c=>c.channelId===draft.channelId&&c.calibrationVersion===draft.calibrationVersion):!!draft.nodeId&&!!draft.channelId);
 function edit(v:RainRequest){dirtyRef.current=true;setDirty(true);setDraft(v);setMessage('');}
 async function save(e:React.FormEvent){e.preventDefault();if(!draft||!valid||flight.current||uncertain||conflict||changed||!fresh)return;
  const candidate={...draft};pending.current=candidate;flight.current=true;setBusy(true);setMessage('');const abort=new AbortController();mutation.current=abort;const timeout=setTimeout(()=>abort.abort(),7000);
  try{const r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(candidate),signal:abort.signal});
   if([400,404,409].includes(r.status)){if(mounted.current){setConflict(true);setMessage('Chưa lưu. Kiểm tra vùng/kênh, phiên bản và profile điều khiển; cần kết thúc phiên tưới và xác nhận bơm nghỉ trước khi sửa.');}return;}
   if(!r.ok||!rainMatches(parseRainPolicy(await r.json()),candidate,zoneId))throw new Error();if(mounted.current){dirtyRef.current=false;setDirty(false);setMessage('Đã lưu chốt mưa. Chưa gửi lệnh thiết bị.');}
  }catch{if(mounted.current){setUncertain(true);setMessage('Chưa rõ kết quả lưu. Đối chiếu cấu hình trước khi tiếp tục; không tự gửi lại.');}}
  finally{clearTimeout(timeout);flight.current=false;if(mounted.current){setBusy(false);setEpoch(v=>v+1);}}
 }
 async function readback(){if(flight.current)return;flight.current=true;setBusy(true);const abort=new AbortController();mutation.current=abort;const start=performance.now(),timeout=setTimeout(()=>abort.abort(),7000);
  try{const r=await fetch(url,{signal:abort.signal,cache:'no-store'});if(!r.ok)throw new Error();const v=parseRainView(await r.json());if(v.zoneId!==zoneId)throw new Error();if(!mounted.current)return;accept(v,start);
   if(uncertain&&!rainMatches(v.policy,pending.current!,zoneId)){setMessage('Chưa xác nhận yêu cầu đã lưu: cấu hình hiện tại khác. Giữ nguyên yêu cầu, không tự gửi lại.');return;}
   setDraft(from(v));dirtyRef.current=false;setDirty(false);setUncertain(false);setConflict(false);setError('');setMessage(uncertain?'Đã đối chiếu đúng cấu hình đã lưu. Không gửi lại yêu cầu.':'Đã đọc cấu hình mới nhất. Kiểm tra trước khi sửa.');
  }catch{if(mounted.current)setMessage('Chưa đối chiếu được. Kiểm tra backend rồi đọc lại.');}finally{clearTimeout(timeout);flight.current=false;if(mounted.current)setBusy(false);}
 }
 return <section aria-label={`Chốt mưa ${zoneId}`} className="space-y-4">
  <button className="underline disabled:opacity-40" disabled={busy||uncertain} onClick={onBack}>{backLabel}</button><h2 className="text-xl font-bold">Chốt mưa · {zoneId}</h2>
  <p className="bg-amber-50 rounded p-3">Khi bật chốt, chỉ mẫu không mưa hợp lệ, đúng nguồn/hiệu chuẩn và mới trong 30 giây mới qua điều kiện bắt đầu tưới. Thiếu mẫu, mẫu cũ, lỗi hoặc có mưa sẽ chặn lượt bật mới. Các điều kiện bơm, van và nguồn nước vẫn được kiểm tra riêng.</p>
  <p>Đây là kiểm tra trước khi bắt đầu: mưa xuất hiện sau khi bật chưa tự dừng bơm; cần gửi OFF. Không tự tiếp tục tưới khi hết mưa. Ánh sáng chỉ để theo dõi.</p>
  <p aria-label="Kết quả chốt mưa" className="font-semibold">{rainLabels[state]}</p>{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  {view&&<div className="border rounded p-3"><p>Khu vực {view.areaId} · Phiên bản vùng {view.zoneRevision} · {sourceLabels[view.zoneSource]}</p><p>Cấu hình đã lưu: {view.policy?`${view.policy.nodeId} / ${view.policy.channelId} · v${view.policy.revision} · ${view.policy.enabled?'Bật':'Tắt'}`:'Chưa có'}</p>{view.sample&&<><p>Mẫu đã lưu: {view.sample.value===null?'Lỗi cảm biến':view.sample.value?'Có mưa':'Không mưa'} · {sourceLabels[view.sample.dataSource??'UNSPECIFIED']}</p><p>Đo: {new Date(view.sample.observedAt).toLocaleString('vi-VN')} · Nhận: {new Date(view.sample.receivedAt).toLocaleString('vi-VN')}</p><p>Boot {view.sample.bootId} · Seq {view.sample.sequence} · Hiệu chuẩn {view.sample.calibrationVersion??'Chưa khai báo'}</p></>}</div>}
  <button className="underline" disabled={busy} onClick={()=>setEpoch(v=>v+1)}>Làm mới chốt mưa</button>
  {draft&&<form aria-label="Cấu hình chốt mưa" onSubmit={save} className="border rounded p-4 space-y-3"><fieldset disabled={busy||uncertain||conflict||changed} className="space-y-3">
   <label className="block"><input type="checkbox" checked={draft.enabled} onChange={e=>edit({...draft,enabled:e.target.checked})}/> Bật chốt mưa cho vùng</label>
   <label className="block">Node mưa<select aria-label="Node mưa" className="border p-2 ml-2" value={draft.nodeId} onChange={e=>{const n=eligible.find(n=>n.nodeId===e.target.value),c=n?.channels.find(c=>c.metric==='RAIN_DETECTED');edit({...draft,nodeId:e.target.value,channelId:c?.channelId??'',calibrationVersion:c?.calibrationVersion??null});}}><option value="">Chọn node WEATHER cùng khu vực</option>{draft.nodeId&&!selected&&<option value={draft.nodeId}>{draft.nodeId} · không còn phù hợp</option>}{eligible.map(n=><option key={n.nodeId} value={n.nodeId}>{n.name} · {n.nodeId}</option>)}</select></label>
   <label className="block">Kênh mưa<select aria-label="Kênh mưa" className="border p-2 ml-2" value={draft.channelId} onChange={e=>edit({...draft,channelId:e.target.value,calibrationVersion:channels?.find(c=>c.channelId===e.target.value)?.calibrationVersion??null})}><option value="">Chọn kênh RAIN_DETECTED</option>{draft.channelId&&!channels?.some(c=>c.channelId===draft.channelId)&&<option value={draft.channelId}>{draft.channelId} · không còn phù hợp</option>}{channels?.map(c=><option key={c.channelId} value={c.channelId}>{c.channelId}</option>)}</select></label>
   <p>Nguồn khớp vùng: {sourceLabels[draft.expectedSource]} · Hiệu chuẩn: {draft.calibrationVersion??'Chưa khai báo'}</p>
  </fieldset>{changed&&<p role="alert">Cấu hình đã đổi ở nơi khác. Đọc lại trước khi sửa.</p>}
  <div className="flex gap-3"><button className="border rounded p-2 disabled:opacity-40" type="submit" disabled={busy||uncertain||conflict||changed||!fresh||!valid||!dirty}>Lưu chốt mưa</button><button className="underline" type="button" disabled={busy} onClick={()=>void readback()}>{uncertain?'Đối chiếu chốt mưa':'Đọc cấu hình chốt mưa mới nhất'}</button></div></form>}
 </section>;
}
