import React,{useEffect,useRef,useState} from 'react';
import {parseNodes,sourceLabels,type FarmNode} from '../nodes/nodeApi';
import {assessmentLabels,displayedAssessment,parseZone,parseZones,pointLabels,sameZone,saveZone,ZoneSaveError,type ZoneConfig,type ZoneSnapshot} from './zoneApi';
export function IrrigationZonesPanel({onBack}:{onBack:()=>void}){
 const [data,setData]=useState<ZoneSnapshot|null>(null),[nodes,setNodes]=useState<FarmNode[]>([]),[areas,setAreas]=useState<{id:string;name:string}[]>([]);
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[reload,setReload]=useState(0),[now,setNow]=useState(performance.now());
 const [draft,setDraft]=useState<ZoneConfig|null>(null),[editing,setEditing]=useState(false),[saving,setSaving]=useState(false),[uncertain,setUncertain]=useState(false),[conflict,setConflict]=useState(false),[formError,setFormError]=useState('');
 const receipt=useRef(0),inFlight=useRef(false),mounted=useRef(true),pending=useRef<{config:ZoneConfig;editing:boolean}|null>(null),request=useRef<AbortController|null>(null);
 useEffect(()=>{mounted.current=true;const tick=setInterval(()=>setNow(performance.now()),1000);return()=>{mounted.current=false;clearInterval(tick);request.current?.abort();};},[]);
 useEffect(()=>{
  if(draft)return;
  let active=true,timer:ReturnType<typeof setTimeout>,controller:AbortController;
  async function poll(){controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),8000);
   try{
    const [z,n,a]=await Promise.all(['/api/v1/irrigation-zones','/api/v1/nodes','/api/v1/areas'].map(url=>fetch(url,{signal:controller.signal,cache:'no-store'})));
    if(!z.ok||!n.ok||!a.ok)throw new Error();const snapshot=parseZones(await z.json()),inventory=parseNodes(await n.json()),list=await a.json();
    if(!Array.isArray(list)||!list.every(v=>v&&typeof v.id==='string'&&typeof v.name==='string'))throw new Error();
    if(active){receipt.current=performance.now();setData(snapshot);setNodes(inventory.nodes);setAreas(list);setError('');setNow(performance.now());}
   }catch{if(active)setError('Không tải được vùng tưới. Dữ liệu đã lưu có thể cũ; chưa xác nhận khảo sát mới.');}
   finally{clearTimeout(timeout);if(active)timer=setTimeout(poll,5000);}
  }void poll();return()=>{active=false;controller?.abort();clearTimeout(timer);};
 },[reload,!!draft]);
 const serverNow=data?Date.parse(data.asOf)+Math.max(0,now-receipt.current):0;
 const eligible=nodes.filter(n=>n.nodeType==='SOIL'&&n.telemetryVersion===2&&n.channels.length>=3);
 const used=(node:string,id:string)=>data?.zones.some(z=>z.config.zoneId!==draft?.zoneId&&z.config.soilNodeId===node&&z.config.channelIds.includes(id))??false;
 function open(config?:ZoneConfig){setDraft(config?{...config,channelIds:[...config.channelIds]}:{zoneId:'',name:'',areaId:areas[0]?.id??'',soilNodeId:'',channelIds:[],expectedSource:'SIMULATOR',dryThreshold:30,wetThreshold:35,revision:1});setEditing(!!config);setUncertain(false);setConflict(false);setFormError('');}
 function finish(text:string){setDraft(null);setUncertain(false);setConflict(false);setMessage(text);setReload(v=>v+1);}
 async function save(event:React.FormEvent){event.preventDefault();if(!draft||inFlight.current||uncertain||conflict)return;
  if(draft.channelIds.length!==3||draft.wetThreshold<draft.dryThreshold+5){setFormError('Chọn đúng ba điểm và ngưỡng đủ ẩm cao hơn ngưỡng khô ít nhất 5%.');return;}
  const candidate={...draft,name:draft.name.trim()};pending.current={config:candidate,editing};inFlight.current=true;setSaving(true);setFormError('');
  const controller=new AbortController();request.current=controller;const timeout=setTimeout(()=>controller.abort(),8000);
  try{await saveZone(candidate,editing,controller.signal);if(mounted.current)finish(`Đã lưu vùng ${candidate.zoneId}.`);}
  catch(e){if(mounted.current){setFormError(e instanceof Error?e.message:'Không lưu được vùng.');setUncertain(e instanceof ZoneSaveError&&e.uncertain);setConflict(e instanceof ZoneSaveError&&e.conflict);}}
  finally{clearTimeout(timeout);inFlight.current=false;if(mounted.current)setSaving(false);}
 }
 async function readback(replace:boolean){
  const candidate=pending.current;if(!draft||inFlight.current||!candidate&&!replace)return;
  inFlight.current=true;setSaving(true);const controller=new AbortController();request.current=controller;const timeout=setTimeout(()=>controller.abort(),8000);
  try{
   const response=await fetch(`/api/v1/irrigation-zones/${encodeURIComponent(draft.zoneId)}`,{signal:controller.signal,cache:'no-store'});
   if(response.status===404&&!editing){if(mounted.current){setUncertain(false);setConflict(false);setFormError('Chưa có vùng theo mã này. Có thể kiểm tra rồi lưu lại.');}return;}
   if(!response.ok)throw new Error();const saved=parseZone(await response.json()).config;
   if(!mounted.current)return;
   if(replace){setDraft({...saved,channelIds:[...saved.channelIds]});setEditing(true);setUncertain(false);setConflict(false);setFormError('Đã đọc cấu hình mới nhất. Kiểm tra lại trước khi sửa.');}
   else if(candidate&&sameZone(saved,candidate.config)&&saved.revision===(candidate.editing?candidate.config.revision+1:1))finish(`Đã đối chiếu vùng ${saved.zoneId}.`);
   else if(candidate?.editing&&saved.revision===candidate.config.revision){setUncertain(false);setFormError('Chưa thấy phiên bản tăng. Kiểm tra lại rồi lưu nếu cần.');}
   else{setUncertain(false);setConflict(true);setFormError('Vùng đã có cấu hình hoặc phiên bản khác. Đọc cấu hình mới nhất trước khi sửa.');}
  }catch{if(mounted.current)setFormError('Chưa đối chiếu được. Kiểm tra backend rồi thử đọc lại; không tự gửi lại.');}
  finally{clearTimeout(timeout);inFlight.current=false;if(mounted.current)setSaving(false);}
 }
 const selected=draft?nodes.find(n=>n.nodeId===draft.soilNodeId):undefined;
 return <section aria-label="Quản lý vùng tưới" className="space-y-4">
  <button onClick={onBack} disabled={saving||uncertain} className="underline disabled:opacity-40">Quay lại danh sách node</button>
  <header className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-bold">Vùng tưới & ba điểm đất</h2><p className="text-sm text-slate-500">Gán ba kênh của một node đất cho mỗi vùng trong cùng khu vực.</p></div><button disabled={!data||!!error||!!draft||!eligible.length} onClick={()=>open()} className="border rounded p-2 disabled:opacity-40">Thêm vùng tưới</button></header>
  <p className="bg-amber-50 rounded p-3 text-sm">Khảo sát hiện tại cần cả ba điểm hợp lệ, đúng nguồn, mới trong 30 giây và cùng một packet. Từ hai điểm dưới ngưỡng là đa số khô; từ hai điểm đạt ngưỡng đủ ẩm là đa số đủ ẩm. Khai báo vùng chưa bật tưới tự động; quy tắc ENV01 → PUMP01 hiện có hoạt động riêng.</p>
  <p className="text-sm">Ngưỡng vùng dùng tại màn hình này. Cảnh báo đất vẫn có ngưỡng riêng 30/35%. Nguồn và hiệu chuẩn do thiết bị khai báo, chưa chứng minh phần cứng đã được kiểm định.</p>
  {message&&<p role="status">{message}</p>}{error&&<p role="alert" className="text-rose-700">{error}</p>}
  <button onClick={()=>setReload(v=>v+1)} disabled={!!draft} className="underline">Làm mới vùng</button>
  {!data&&!error&&<p>Đang tải vùng…</p>}{data&&!data.zones.length&&<p>Chưa khai báo vùng tưới.</p>}{data&&!eligible.length&&<p>Cần khai báo node SOIL với ít nhất ba kênh đất trước.</p>}
  {data?.zones.map(v=>{const c=v.config,state=displayedAssessment(v,serverNow,!!error),counted=['DRY','WET','MIXED'].includes(state);return <article key={c.zoneId} aria-label={`Vùng ${c.zoneId}`} className="border bg-white rounded-xl p-4 space-y-3">
   <h3 className="font-bold">{c.name} · {c.zoneId}</h3><p>{areas.find(a=>a.id===c.areaId)?.name??c.areaId} · {c.soilNodeId} · Phiên bản {c.revision}</p>
   <p>Nguồn dự kiến: {sourceLabels[c.expectedSource]} · Khô dưới {c.dryThreshold}%, đủ ẩm từ {c.wetThreshold}%</p>
   <p className="font-semibold" aria-label={`Khảo sát ${c.zoneId}`}>{assessmentLabels[state]}{counted?` · ${v.assessment.dryCount}/3 khô · ${v.assessment.wetCount}/3 đủ ẩm`:''}</p>
   <div className="grid sm:grid-cols-3 gap-3">{v.points.map(p=>{const r=p.latest,expired=r&&Math.min(Date.parse(r.observedAt),Date.parse(r.receivedAt))+30000<=serverNow;return <div key={p.channelId} className="border rounded p-3" aria-label={`${c.zoneId} ${p.channelId}`}>
    <h4 className="font-semibold">{p.channelId}</h4><p>{typeof r?.value==='number'?`${r.value.toLocaleString('vi-VN',{maximumFractionDigits:2})}%`:'—'}</p>
    <p className="text-sm">{error?'Chưa xác nhận dữ liệu mới':pointLabels[expired?'STALE':p.state]}</p><p className="text-xs">{r?sourceLabels[r.dataSource??'UNSPECIFIED']:'Chưa có nguồn'} · {r?.calibrationVersion??'Chưa khai báo hiệu chuẩn'}</p>
    <p className="text-xs">Đo: {r?new Date(r.observedAt).toLocaleString('vi-VN'):'—'} · Seq {r?.sequence??'—'}</p>
   </div>;})}</div>
   <button disabled={!!error||!!draft} onClick={()=>open(c)} className="border rounded p-2 disabled:opacity-40">Sửa vùng {c.zoneId}</button>
  </article>;})}
  {draft&&<form aria-label="Cấu hình vùng tưới" onSubmit={save} className="border bg-white rounded-xl p-5 space-y-3">
   <h3 className="font-bold">{editing?'Sửa':'Thêm'} vùng tưới</h3><fieldset disabled={saving||uncertain} className="space-y-3">
    <label className="block">Mã vùng<input required disabled={editing} pattern="[A-Z][A-Z0-9_-]{1,31}" maxLength={32} value={draft.zoneId} onChange={e=>{setDraft({...draft,zoneId:e.target.value.toUpperCase()});setConflict(false);}} className="border rounded p-2 ml-2" /></label>
    <label className="block">Tên vùng<input required maxLength={80} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} className="border rounded p-2 ml-2" /></label>
    <label className="block">Khu vực vùng<select aria-label="Khu vực vùng" value={draft.areaId} onChange={e=>setDraft({...draft,areaId:e.target.value,soilNodeId:'',channelIds:[]})} className="border rounded p-2 ml-2">{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    <label className="block">Node đất của vùng<select aria-label="Node đất của vùng" required value={draft.soilNodeId} onChange={e=>setDraft({...draft,soilNodeId:e.target.value,channelIds:[]})} className="border rounded p-2 ml-2"><option value="">Chọn node đất</option>{eligible.filter(n=>n.areaId===draft.areaId).map(n=><option key={n.nodeId} value={n.nodeId}>{n.name} · {n.nodeId}</option>)}</select></label>
    <div><p>Chọn đúng ba điểm; mỗi kênh chỉ gán một vùng.</p>{selected?.channels.map(c=><label key={c.channelId} className="block"><input type="checkbox" checked={draft.channelIds.includes(c.channelId)} disabled={used(selected.nodeId,c.channelId)||draft.channelIds.length>=3&&!draft.channelIds.includes(c.channelId)} onChange={e=>setDraft({...draft,channelIds:e.target.checked?[...draft.channelIds,c.channelId]:draft.channelIds.filter(id=>id!==c.channelId)})} /> {c.channelId}{used(selected.nodeId,c.channelId)?' · đã thuộc vùng khác':''}</label>)}</div>
    <label className="block">Nguồn của vùng<select aria-label="Nguồn của vùng" value={draft.expectedSource} onChange={e=>setDraft({...draft,expectedSource:e.target.value as ZoneConfig['expectedSource']})} className="border rounded p-2 ml-2"><option value="SIMULATOR">Mô phỏng</option><option value="PHYSICAL">Phần cứng (thiết bị khai báo)</option></select></label>
    <label className="block">Ngưỡng khô (%)<input required type="number" min={0} max={95} step={1} value={Number.isFinite(draft.dryThreshold)?draft.dryThreshold:''} onChange={e=>setDraft({...draft,dryThreshold:e.target.valueAsNumber})} className="border rounded p-2 ml-2" /></label>
    <label className="block">Ngưỡng đủ ẩm (%)<input required type="number" min={5} max={100} step={1} value={Number.isFinite(draft.wetThreshold)?draft.wetThreshold:''} onChange={e=>setDraft({...draft,wetThreshold:e.target.valueAsNumber})} className="border rounded p-2 ml-2" /></label>
   </fieldset>
   {formError&&<p role="alert" className="text-rose-700">{formError}</p>}
   <div className="flex flex-wrap gap-3"><button type="submit" disabled={saving||uncertain||conflict} className="border rounded p-2 disabled:opacity-40">Lưu vùng</button>{uncertain&&<button type="button" disabled={saving} onClick={()=>void readback(false)} className="border rounded p-2">Đối chiếu vùng</button>}{conflict&&<button type="button" disabled={saving} onClick={()=>void readback(true)} className="border rounded p-2">Đọc cấu hình mới nhất</button>}<button type="button" disabled={saving||uncertain} onClick={()=>setDraft(null)} className="border rounded p-2">Đóng cấu hình</button></div>
  </form>}
 </section>;
}
