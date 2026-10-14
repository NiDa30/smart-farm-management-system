import {WaterHistoryPanel} from './WaterHistoryPanel';
import React,{useEffect,useRef,useState} from 'react';
import {channelFreshness,createWaterNode,matchesDeclaration,metricLabels,NodeSaveError,parseNode,parseNodes,tankState,tankLabels,sourceLabels,type NodeChannel,type NodesSnapshot,type WaterDeclaration} from './nodeApi';
const labels={EMPTY:'Chưa có dữ liệu',CLOCK_SKEW:'Lệch giờ nguồn',STALE:'Dữ liệu cũ',SENSOR_FAULT:'Cảm biến báo lỗi',FRESH:'Dữ liệu mới'};
export function WaterNodesPanel(){
 const [history,setHistory]=useState<{nodeId:string;channel:NodeChannel;asOf:string}|null>(null);
 const [snapshot,setSnapshot]=useState<NodesSnapshot|null>(null),[areas,setAreas]=useState<{id:string;name:string}[]>([]),[error,setError]=useState(''),[reload,setReload]=useState(0),[now,setNow]=useState(performance.now());
 const [form,setForm]=useState(false),[id,setId]=useState(''),[name,setName]=useState(''),[area,setArea]=useState(''),[flowCalibration,setFlowCalibration]=useState(''),[withTemp,setWithTemp]=useState(false);
 const [saving,setSaving]=useState(false),[uncertain,setUncertain]=useState(false),[formError,setFormError]=useState(''),[message,setMessage]=useState('');
 const receipt=useRef(0),busy=useRef(false),submission=useRef<AbortController|null>(null),pending=useRef<WaterDeclaration|null>(null),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;const tick=setInterval(()=>setNow(performance.now()),1000);return()=>{mounted.current=false;clearInterval(tick);submission.current?.abort();};},[]);
 useEffect(()=>{
  if(history)return;
  let active=true;let timer:ReturnType<typeof setTimeout>;let controller:AbortController;
  async function poll(){controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),8000);
   try{
    const [n,a]=await Promise.all([fetch('/api/v1/nodes',{signal:controller.signal,cache:'no-store'}),fetch('/api/v1/areas',{signal:controller.signal,cache:'no-store'})]);
    if(!n.ok||!a.ok)throw new Error();const value=parseNodes(await n.json()),areaValue=await a.json();
    if(!Array.isArray(areaValue)||!areaValue.every(v=>v&&typeof v.id==='string'&&typeof v.name==='string'))throw new Error();
    if(active){receipt.current=performance.now();setSnapshot(value);setAreas(areaValue);setError('');setNow(performance.now());}
   }catch{if(active)setError('Không tải được node/kênh. Dữ liệu đã lưu còn hiển thị; chưa xác nhận dữ liệu mới.');}
   finally{clearTimeout(timeout);if(active)timer=setTimeout(poll,5000);}
  }void poll();return()=>{active=false;clearTimeout(timer);controller?.abort();};
 },[reload,!!history]);
 const serverNow=snapshot?Date.parse(snapshot.asOf)+Math.max(0,now-receipt.current):now;
 function declaration():WaterDeclaration{return {nodeId:id.trim(),name:name.trim(),areaId:area,channels:[
  {channelId:'LOW',metric:'WATER_PRESENT',unit:'boolean',calibrationVersion:null},
  {channelId:'HIGH',metric:'WATER_PRESENT',unit:'boolean',calibrationVersion:null},
  {channelId:'FLOW',metric:'FLOW_RATE',unit:'L/min',calibrationVersion:flowCalibration.trim()||null},
  ...(withTemp?[{channelId:'WATER_TEMP',metric:'WATER_TEMPERATURE' as const,unit:'°C',calibrationVersion:null}]:[])]};}
 async function save(event:React.FormEvent){event.preventDefault();if(busy.current||uncertain)return;busy.current=true;setSaving(true);setFormError('');
  const candidate=declaration();pending.current=candidate;const controller=new AbortController();submission.current=controller;const timeout=setTimeout(()=>controller.abort(),8000);
  try{await createWaterNode(candidate,controller.signal);if(mounted.current){setForm(false);setMessage(`Đã khai báo ${candidate.nodeId}; chưa tự provision AWS hoặc firmware.`);setReload(v=>v+1);}}
  catch(e){if(mounted.current){setFormError(e instanceof Error?e.message:'Không lưu được.');setUncertain(e instanceof NodeSaveError&&e.uncertain);}}
  finally{clearTimeout(timeout);busy.current=false;if(mounted.current)setSaving(false);}
 }
 async function reconcile(){if(busy.current||!pending.current)return;busy.current=true;setSaving(true);const candidate=pending.current,controller=new AbortController();submission.current=controller;const timeout=setTimeout(()=>controller.abort(),8000);
  try{const r=await fetch(`/api/v1/nodes/${encodeURIComponent(candidate.nodeId)}`,{signal:controller.signal,cache:'no-store'});
   if(r.status===404){if(mounted.current){setUncertain(false);setFormError('Chưa tìm thấy khai báo theo mã. Bạn có thể kiểm tra và lưu lại.');}return;}
   if(!r.ok)throw new Error();const n=parseNode(await r.json());
   if(mounted.current){if(matchesDeclaration(n,candidate)){setForm(false);setUncertain(false);setMessage(`Đã đối chiếu khai báo ${n.nodeId}.`);setReload(v=>v+1);}else{setUncertain(false);setFormError('Mã đã tồn tại với khai báo khác. Đổi mã hoặc đối chiếu danh sách, không ghi đè.');}}
  }catch{if(mounted.current)setFormError('Vẫn chưa đối chiếu được. Kiểm tra backend rồi thử đọc lại.');}
  finally{clearTimeout(timeout);busy.current=false;if(mounted.current)setSaving(false);}
 }
 if(history)return <WaterHistoryPanel {...history} onBack={()=>setHistory(null)} />;
 return <div className="space-y-4">
  <header className="flex justify-between gap-3"><div><h2 className="text-xl font-bold">Node & trạm nước</h2><p className="text-sm text-slate-500">Một node vật lý có nhiều kênh cảm biến và actuator được gán.</p></div><button type="button" disabled={!!error||!snapshot||!areas.length||form} onClick={()=>{setForm(true);setId('');setName('');setArea(areas[0]?.id??'');setFlowCalibration('');setWithTemp(false);setUncertain(false);setFormError('');}} className="border rounded-lg p-2 disabled:opacity-40">Khai báo trạm nước</button></header>
  <p className="bg-amber-50 p-3 rounded text-sm">Khai báo chỉ lưu registry. Chưa tự tạo Thing/certificate, nạp firmware hoặc thêm thiết bị vào Wokwi. Trạm mô phỏng cần firmware WATER riêng. Dữ liệu nước v2 chưa điều khiển PUMP01 hay thay liên động phao GPIO27.</p>
  {message&&<p role="status">{message}</p>}{error&&<p role="alert" className="text-rose-700">{error}</p>}
  <button type="button" onClick={()=>setReload(v=>v+1)} className="underline">Làm mới node</button>
  {!snapshot&&!error&&<p>Đang tải node…</p>}{snapshot&&!snapshot.nodes.length&&<p>Chưa có node được khai báo.</p>}
  {snapshot?.nodes.map(n=><section key={n.nodeId} aria-label={`Node ${n.nodeId}`} className="bg-white border rounded-xl p-4 space-y-3">
   <h3 className="font-bold">{n.name} · {n.nodeId}</h3><p className="text-sm">{areas.find(a=>a.id===n.areaId)?.name??n.areaId} · {n.nodeType==='WATER'?'Trạm nước':'Môi trường'} · Hợp đồng v{n.telemetryVersion}</p>
   {n.nodeType==='WATER'&&<p aria-label={`Mức bồn ${n.nodeId}`} className="text-sm font-semibold">{error?'Chưa xác định mức bồn':tankLabels[tankState(n,serverNow)]} · Chẩn đoán từ hai phao cùng mẫu, không phải quyền bật bơm.</p>}
   <p className="text-sm">Actuator: {n.actuators.length?n.actuators.map(a=>`${a.actuatorId} (${a.commandContract})`).join(', '):'Chưa có actuator được gán'}</p>
   <div className="grid sm:grid-cols-2 gap-3">{n.channels.map(c=>{const r=c.latest,state=channelFreshness(r,serverNow);return <article key={c.channelId} aria-label={`${n.nodeId} ${c.channelId}`} className="border rounded p-3">
    <h4 className="font-semibold">{c.channelId} · {metricLabels[c.metric]}</h4>
    {n.nodeType==='WATER'&&<button type="button" disabled={!!error} onClick={()=>setHistory({nodeId:n.nodeId,channel:c,asOf:snapshot.asOf})} className="text-sm underline disabled:opacity-40">Lịch sử {n.nodeId} {c.channelId}</button>}
    <p className="text-xl">{!r||r.value===null?'—':typeof r.value==='boolean'?(r.value?'Có nước':'Không có nước'):r.value.toLocaleString('vi-VN',{maximumFractionDigits:2})} {c.unit==='boolean'?'':c.unit}</p>
    <p className="text-sm">{error?'Chưa xác nhận dữ liệu mới':labels[state]}{r?.quality==='SENSOR_FAULT'&&state!=='SENSOR_FAULT'?' · Mẫu đã lưu báo lỗi cảm biến':''}</p>
    <p className="text-xs text-slate-500">Nguồn: {r?sourceLabels[r.dataSource??'UNSPECIFIED']:'Chưa có mẫu để xác định nguồn'}</p>
    <p className="text-xs text-slate-500">Hiệu chuẩn: {r?.calibrationVersion??c.calibrationVersion??'Chưa khai báo phiên bản hiệu chuẩn'}</p>
    <p className="text-xs text-slate-500">Đo: {r?new Date(r.observedAt).toLocaleString('vi-VN'):'—'} · Nhận: {r?new Date(r.receivedAt).toLocaleString('vi-VN'):'—'}</p>
   </article>;})}</div>
  </section>)}
  {form&&<div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"><form role="dialog" aria-modal="true" aria-label="Khai báo trạm nước" onSubmit={save} className="bg-white border rounded-xl p-5 space-y-3 w-full max-w-xl max-h-[90vh] overflow-y-auto">
   <h3 className="font-bold">Khai báo trạm nước</h3><fieldset disabled={saving||uncertain} className="space-y-3">
    <label className="block">Mã node<input autoFocus required pattern="[A-Z][A-Z0-9_-]{1,31}" maxLength={32} value={id} onChange={e=>setId(e.target.value.toUpperCase())} className="border rounded p-2 ml-2" /></label>
    <label className="block">Tên trạm<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} className="border rounded p-2 ml-2" /></label>
    <label className="block">Khu vực trạm<select required value={area} onChange={e=>setArea(e.target.value)} className="border rounded p-2 ml-2">{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    <label className="block">Phiên bản hiệu chuẩn flow (nếu có)<input maxLength={40} value={flowCalibration} onChange={e=>setFlowCalibration(e.target.value)} className="border rounded p-2 ml-2" /></label>
    <label className="block"><input type="checkbox" checked={withTemp} onChange={e=>setWithTemp(e.target.checked)} /> Thêm kênh nhiệt độ nước</label>
    <p className="text-sm">Các kênh khai báo: LOW, HIGH (phao có nước) và FLOW (L/min). Chưa có dữ liệu sẽ hiển thị —. Không suy ra phần trăm bồn từ hai phao.</p>
   </fieldset>
   {formError&&<p role="alert" className="text-rose-700">{formError}</p>}
   <div className="flex gap-3"><button type="submit" disabled={saving||uncertain} className="border rounded p-2 disabled:opacity-40">Lưu khai báo</button>{uncertain&&<button type="button" disabled={saving} onClick={()=>void reconcile()} className="border rounded p-2">Kiểm tra khai báo</button>}<button type="button" disabled={saving||uncertain} onClick={()=>setForm(false)}>Đóng</button></div>
  </form></div>}
 </div>;
}
