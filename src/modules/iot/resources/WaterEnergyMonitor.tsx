import React,{useEffect,useState} from 'react';
import {Droplets, Zap} from 'lucide-react';
import {parseNodes,sourceLabels,type FarmNode} from '../nodes/nodeApi';
import {localTimeInput} from '../nodes/waterHistoryApi';
import {exclusionLabels,parseVolume,sameVolumeScope,volumeUrl,type VolumeQuery,type VolumeReport} from './waterVolumeApi';
const inputTime=(v:string)=>Number.isFinite(Date.parse(v))?localTimeInput(v):'';
const inputIso=(v:string)=>Number.isFinite(new Date(v).getTime())?new Date(v).toISOString():'';
const number=(v:number)=>v.toLocaleString('vi-VN',{maximumFractionDigits:4});
export const WaterEnergyMonitor:React.FC=()=>{
 const [tab,setTab]=useState<'WATER'|'ENERGY'>('WATER'),[nodes,setNodes]=useState<FarmNode[]>([]),[inventoryError,setInventoryError]=useState(''),[inventoryLoading,setInventoryLoading]=useState(true),[reload,setReload]=useState(0);
 const [draft,setDraft]=useState<VolumeQuery|null>(null),[query,setQuery]=useState<VolumeQuery|null>(null),[report,setReport]=useState<VolumeReport|null>(null);
 const [error,setError]=useState(''),[formError,setFormError]=useState(''),[loading,setLoading]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let active=true;const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);setInventoryLoading(true);
  void(async()=>{try{
   const r=await fetch('/api/v1/nodes',{signal:controller.signal,cache:'no-store'});if(!r.ok)throw new Error();const inventory=parseNodes(await r.json()),eligible=inventory.nodes.filter(n=>n.nodeType==='WATER'&&n.channels.some(c=>c.metric==='FLOW_RATE'));
   if(active){setNodes(eligible);setInventoryError('');const first=eligible[0];if(first){const to=new Date(Math.floor(Date.parse(inventory.asOf)/1000)*1000).toISOString();const q:VolumeQuery={nodeId:first.nodeId,channelId:first.channels.find(c=>c.metric==='FLOW_RATE')!.channelId,from:new Date(Date.parse(to)-3600000).toISOString(),to,dataSource:'SIMULATOR'};setDraft(q);setQuery(q);}else{setDraft(null);setQuery(null);setReport(null);}}
  }catch{if(active)setInventoryError('Không tải được node FLOW. Kiểm tra backend rồi tải lại danh sách.');}
  finally{clearTimeout(timeout);if(active)setInventoryLoading(false);}})();return()=>{active=false;controller.abort();clearTimeout(timeout);};
 },[reload]);
 useEffect(()=>{
  if(!query){setLoading(false);return;}let active=true;const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);setLoading(true);setError('');
  void(async()=>{try{
   const r=await fetch(volumeUrl(query),{signal:controller.signal,cache:'no-store'});
   if(!r.ok)throw new Error(r.status===422?'Khoảng có quá nhiều packet hoặc giá trị quá lớn. Chọn khoảng ngắn hơn.':r.status===404?'Kênh FLOW không còn tồn tại. Tải lại danh sách node.':'Không tính được lượng nước. Chọn nguồn và khoảng quá khứ tối đa 24 giờ.');
   const v=parseVolume(await r.json(),query);if(active)setReport(v);
  }catch(e){if(active)setError(e instanceof Error&&e.name!=='AbortError'?e.message:'Không tải được lượng nước trong thời gian chờ.');}
  finally{clearTimeout(timeout);if(active)setLoading(false);}})();return()=>{active=false;controller.abort();clearTimeout(timeout);};
 },[query,attempt]);
 const changed=!!draft&&!!query&&!sameVolumeScope(draft,query),usable=report&&query&&sameVolumeScope(report,query)&&!changed&&!loading&&!error&&!inventoryError&&!inventoryLoading&&!formError;
 function apply(e:React.FormEvent){e.preventDefault();if(!draft)return;const duration=Date.parse(draft.to)-Date.parse(draft.from);
  if(!Number.isFinite(duration)||duration<=0||duration>86400000||Date.parse(draft.from)<0){setFormError('Chọn khoảng tăng dần, từ năm 1970, tối đa 24 giờ.');return;}
  setFormError('');setQuery({...draft});setAttempt(v=>v+1);
 }
 return <div className="max-w-6xl mx-auto space-y-5">
  <header><h1 className="font-bold text-xl flex items-center gap-2"><Droplets/>Tiêu thụ Nước &amp; Điện</h1><p className="text-sm text-slate-500">Lượng nước ước tính từ lịch sử FLOW đã lưu. Không phải công tơ tổng hoặc lượng nước thực nhận tại từng cây.</p></header>
  <div className="flex gap-3"><button onClick={()=>setTab('WATER')} aria-pressed={tab==='WATER'} className="border rounded p-2">Nước</button><button onClick={()=>setTab('ENERGY')} aria-pressed={tab==='ENERGY'} className="border rounded p-2 flex gap-2"><Zap size={18}/>Điện</button></div>
  {tab==='ENERGY'?<section aria-label="Điện năng" className="bg-white border rounded-xl p-5"><h2 className="font-semibold">Chưa có dữ liệu đo điện</h2><p>Chưa tích hợp kênh công suất hoặc công tơ điện năng; chưa tính kWh, chi phí hoặc lượng điện theo thời gian bật relay.</p></section>:<>
   <p className="bg-amber-50 rounded p-3 text-sm">Ước tính hình thang từ hai mẫu FLOW cùng nguồn, boot và hiệu chuẩn; sequence liền nhau, cách nhau tối đa 15 giây. Không nội suy qua packet thiếu/lỗi hoặc ngoài biên khoảng đã chọn. Mẫu không trễ hơn 30 giây và giờ nguồn không đi trước giờ nhận quá 2 giây. Mỗi phiên bản hiệu chuẩn được tách riêng.</p>
   <button disabled={inventoryLoading||loading} onClick={()=>setReload(v=>v+1)} className="underline disabled:opacity-40">Tải lại node FLOW</button>
   {inventoryLoading&&<p role="status">Đang tải node…</p>}{inventoryError&&<p role="alert">{inventoryError}</p>}
   {!inventoryLoading&&!inventoryError&&!nodes.length&&<p>Chưa có node WATER khai báo kênh FLOW_RATE. Khai báo và phát telemetry trước khi tính lượng nước.</p>}
   {draft&&<form onSubmit={apply} aria-label="Bộ lọc lượng nước" className="bg-white border rounded-xl p-4 flex flex-wrap gap-3 items-end">
    <fieldset disabled={inventoryLoading||!!inventoryError} className="contents">
     <label>Node nước<select aria-label="Node lượng nước" value={draft.nodeId} onChange={e=>{const n=nodes.find(n=>n.nodeId===e.target.value)!;setDraft({...draft,nodeId:n.nodeId,channelId:n.channels.find(c=>c.metric==='FLOW_RATE')!.channelId});}} className="block border rounded p-2">{nodes.map(n=><option key={n.nodeId} value={n.nodeId}>{n.name} · {n.nodeId}</option>)}</select></label>
     <label>Kênh FLOW<select aria-label="Kênh lượng nước" value={draft.channelId} onChange={e=>setDraft({...draft,channelId:e.target.value})} className="block border rounded p-2">{nodes.find(n=>n.nodeId===draft.nodeId)?.channels.filter(c=>c.metric==='FLOW_RATE').map(c=><option key={c.channelId} value={c.channelId}>{c.channelId}</option>)}</select></label>
     <label>Nguồn đo<select aria-label="Nguồn lượng nước" value={draft.dataSource} onChange={e=>setDraft({...draft,dataSource:e.target.value as VolumeQuery['dataSource']})} className="block border rounded p-2">{(['SIMULATOR','PHYSICAL','UNSPECIFIED'] as const).map(s=><option key={s} value={s}>{sourceLabels[s]}</option>)}</select></label>
     <label>Từ (giờ máy)<input aria-label="Lượng nước từ" type="datetime-local" step="1" required value={inputTime(draft.from)} onChange={e=>setDraft({...draft,from:inputIso(e.target.value)})} className="block border rounded p-2"/></label>
     <label>Đến, không gồm mốc này (giờ máy)<input aria-label="Lượng nước đến" type="datetime-local" step="1" required value={inputTime(draft.to)} onChange={e=>setDraft({...draft,to:inputIso(e.target.value)})} className="block border rounded p-2"/></label>
     <button type="submit" className="border rounded p-2">Tính lượng nước</button>
    </fieldset>
   </form>}
   {changed&&<p role="status">Bộ lọc đã đổi; tính lại để xem kết quả tương ứng.</p>}{formError&&<p role="alert">{formError}</p>}
   {loading&&<p role="status">Đang tính lượng nước…</p>}{error&&<p role="alert">{error} Kết quả trước đang ẩn; không tự coi mẫu thiếu là 0 lít.</p>}
   {usable&&<section aria-label="Kết quả lượng nước" className="bg-white border rounded-xl p-5 space-y-3">
    <h2 className="font-bold">{report.nodeId} / {report.channelId} · {sourceLabels[report.dataSource]}</h2>
    <p className="text-sm">{new Date(report.from).toLocaleString('vi-VN')} → trước {new Date(report.to).toLocaleString('vi-VN')}</p>
    <p className="text-xl font-semibold">{report.estimatedLitres===null?(report.groups.length>1?'Nhiều phiên bản hiệu chuẩn; không cộng tổng':'Chưa đủ khoảng đo hợp lệ'):`Ước tính trong các đoạn hợp lệ: ${number(report.estimatedLitres)} lít`}</p>
    <p>Độ phủ: {number(report.coveredSeconds)} giây ({number(100*report.coveredSeconds/(report.coveredSeconds+report.uncoveredSeconds))}%) · Chưa có ước tính: {number(report.uncoveredSeconds)} giây.</p>
    <p className="text-sm">{report.packetCount} packet mọi nguồn · {report.sourcePacketCount} packet nguồn đã chọn · {report.acceptedIntervals} khoảng được tính.</p>
    <p className="text-sm text-slate-500">Chỉ lượng nước trong các đoạn có dữ liệu, không phải tổng cả kỳ. Nguồn/hiệu chuẩn do thiết bị khai báo; SIMULATOR là mô phỏng, chưa chứng minh đo lường thực địa.</p>
    {report.groups.map(g=><p key={JSON.stringify(g.calibrationVersion)}>Hiệu chuẩn {g.calibrationVersion??'chưa khai báo'}: {number(g.estimatedLitres)} lít / {number(g.coveredSeconds)} giây / {g.intervals} khoảng.</p>)}
    <h3 className="font-semibold">Khoảng bị loại</h3>{!Object.keys(report.excluded).length&&<p>Không có cặp mẫu bị loại; hai mép khoảng vẫn không được ngoại suy.</p>}
    {Object.entries(report.excluded).map(([reason,count])=><p key={reason}>{exclusionLabels[reason]}: {count}</p>)}
   </section>}
   <p className="text-xs text-slate-500">Chỉ đọc dữ liệu. Chưa quy đổi tiền, chia lượng nước cho zone/cây, kết luận rò nước hoặc điều khiển bơm.</p>
  </>}
 </div>;
};
