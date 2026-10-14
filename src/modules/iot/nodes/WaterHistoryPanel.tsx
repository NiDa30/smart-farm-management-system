import React,{useEffect,useRef,useState} from 'react';
import {metricLabels,sourceLabels,type NodeChannel} from './nodeApi';
import {historyUrl,localTimeInput,parseWaterHistory,waterHistoryCsv,type HistoryPage,type HistoryQuery,type HistoryQuality,type HistorySource} from './waterHistoryApi';
interface Props {nodeId:string;channel:NodeChannel;asOf:string;onBack:()=>void}
export function WaterHistoryPanel({nodeId,channel,asOf,onBack}:Props){
 const initial=useRef(new Date(Math.ceil(Date.parse(asOf)/1000)*1000));
 const [from,setFrom]=useState(()=>localTimeInput(new Date(initial.current.getTime()-86400000).toISOString()));
 const [to,setTo]=useState(()=>localTimeInput(initial.current.toISOString()));
 const [source,setSource]=useState(''),[quality,setQuality]=useState('');
 const [request,setRequest]=useState<HistoryQuery>(()=>({from:new Date(initial.current.getTime()-86400000).toISOString(),to:initial.current.toISOString(),dataSource:null,quality:null,limit:100,cursor:null}));
 const [page,setPage]=useState<HistoryPage|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[formError,setFormError]=useState('');
 const cap=useRef<number|null>(null);
 useEffect(()=>{
  let active=true;const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  setLoading(true);setError('');
  void(async()=>{try{
   const r=await fetch(historyUrl(nodeId,channel.channelId,request),{signal:controller.signal,cache:'no-store'});
   if(!r.ok)throw new Error(r.status===404?'Không tìm thấy kênh nước. Quay lại danh sách node để đối chiếu.':'Không tải được lịch sử. Kiểm tra backend rồi áp dụng lại bộ lọc.');
   const value=parseWaterHistory(await r.json(),nodeId,channel,request);
   if(request.cursor&&cap.current!==null&&value.snapshotId!==cap.current)throw new Error('Mốc phân trang đã thay đổi. Tải lại từ đầu.');
   if(active){cap.current=value.snapshotId;setPage(value);}
  }catch(e){if(active)setError(e instanceof Error&&e.name!=='AbortError'?e.message:'Không tải được lịch sử trong thời gian chờ. Áp dụng lại bộ lọc.');}
  finally{clearTimeout(timeout);if(active)setLoading(false);}})();
  return()=>{active=false;controller.abort();clearTimeout(timeout);};
 },[nodeId,channel,request]);
 const changed=new Date(from).getTime()!==Date.parse(request.from)||new Date(to).getTime()!==Date.parse(request.to)||source!==(request.dataSource??'')||quality!==(request.quality??'');
 function apply(event:React.FormEvent){event.preventDefault();
  const start=new Date(from),end=new Date(to),duration=end.getTime()-start.getTime();
  if(!Number.isFinite(duration)||duration<=0||duration>31*86400000){setFormError('Chọn khoảng tăng dần, tối đa 31 ngày.');return;}
  setFormError('');cap.current=null;setRequest({from:start.toISOString(),to:end.toISOString(),dataSource:(source||null) as HistorySource|null,quality:(quality||null) as HistoryQuality|null,limit:100,cursor:null});
 }
 function download(){if(!page||loading||error||changed||formError)return;
  const url=URL.createObjectURL(new Blob([waterHistoryCsv(page)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
  a.href=url;a.download=`water-history-${nodeId}-${channel.channelId}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return <section aria-label="Lịch sử kênh nước" className="space-y-4">
  <button type="button" onClick={onBack} className="border rounded px-3 py-2">Quay lại Node & trạm nước</button>
  <h2 className="text-xl font-bold">Lịch sử {nodeId} · {channel.channelId} · {metricLabels[channel.metric]}</h2>
  <p className="text-sm text-slate-500">Giữ giá trị, chất lượng, nguồn và phiên bản hiệu chuẩn từng mẫu. Dữ liệu lịch sử không xác nhận thiết bị hiện đang online. Chưa tính tổng lượng nước từ lưu lượng.</p>
  <form onSubmit={apply} className="bg-white border rounded-xl p-4 flex flex-wrap items-end gap-3">
   <label>Từ (giờ máy)<input aria-label="Lịch sử từ" type="datetime-local" step="1" required value={from} onChange={e=>setFrom(e.target.value)} className="block border rounded p-2" /></label>
   <label>Đến, không gồm mốc này (giờ máy)<input aria-label="Lịch sử đến" type="datetime-local" step="1" required value={to} onChange={e=>setTo(e.target.value)} className="block border rounded p-2" /></label>
   <label>Nguồn<select aria-label="Nguồn lịch sử" value={source} onChange={e=>setSource(e.target.value)} className="block border rounded p-2"><option value="">Tất cả</option><option value="SIMULATOR">Mô phỏng</option><option value="PHYSICAL">Phần cứng (khai báo)</option><option value="UNSPECIFIED">Chưa khai báo</option></select></label>
   <label>Chất lượng<select aria-label="Chất lượng lịch sử" value={quality} onChange={e=>setQuality(e.target.value)} className="block border rounded p-2"><option value="">Tất cả</option><option value="VALID">Hợp lệ</option><option value="SENSOR_FAULT">Lỗi cảm biến</option></select></label>
   <button type="submit" className="border rounded p-2">Áp dụng lịch sử</button>
  </form>
  {formError&&<p role="alert" className="text-rose-700">{formError}</p>}
  {changed&&<p role="status">Bộ lọc đã đổi; áp dụng để xem kết quả và xuất CSV tương ứng.</p>}
  {loading&&<p role="status">Đang tải lịch sử…</p>}
  {error&&<p role="alert" className="text-rose-700">{error} Bảng đã tải có thể thuộc lượt trước; tạm khóa xuất và phân trang.</p>}
  {page&&<>
   <p className="text-sm">Khoảng đã tải: {new Date(page.from).toLocaleString('vi-VN')} → trước {new Date(page.to).toLocaleString('vi-VN')} · Nguồn: {page.dataSource?sourceLabels[page.dataSource]:'Tất cả'} · Chất lượng: {page.quality??'Tất cả'}.</p>
   <p className="text-sm">Trang hiện tại: {page.items.length} mẫu, tối đa 100. CSV chỉ chứa trang đang hiển thị; không phải toàn bộ khoảng thời gian.</p>
   <div className="flex gap-3"><button type="button" disabled={loading||!!error||changed||!!formError||!page.items.length} onClick={download} className="border rounded p-2 disabled:opacity-40">Xuất CSV trang này</button>
    <button type="button" disabled={loading||!!error||changed||!!formError||!page.nextCursor} onClick={()=>setRequest({...request,cursor:page.nextCursor})} className="border rounded p-2 disabled:opacity-40">Trang tiếp theo</button>
    <button type="button" disabled={loading} onClick={()=>{cap.current=null;setRequest({...request,cursor:null});}} className="border rounded p-2 disabled:opacity-40">Tải lại từ đầu</button></div>
   {!page.items.length?<p>Không có mẫu khớp bộ lọc trong khoảng này.</p>:<div className="overflow-x-auto bg-white border rounded-xl"><table className="w-full text-sm" aria-label="Mẫu lịch sử kênh nước"><thead><tr>{['Mẫu / lần khởi động','Giờ đo','Giờ nhận','Giá trị','Chất lượng','Nguồn','Hiệu chuẩn'].map(t=><th key={t} className="text-left p-3">{t}</th>)}</tr></thead>
    <tbody>{page.items.map(r=><tr key={r.sampleId} className="border-t"><td className="p-3">#{r.sampleId} · seq {r.sequence}<span className="block text-xs break-all">{r.bootId}</span></td><td className="p-3">{r.observedAt}</td><td className="p-3">{r.receivedAt}</td><td className="p-3">{r.value===null?'—':typeof r.value==='boolean'?(r.value?'Có nước':'Không có nước'):r.value.toLocaleString('vi-VN',{maximumFractionDigits:4})} {channel.unit==='boolean'?'':channel.unit}</td><td className="p-3">{r.quality==='SENSOR_FAULT'?'Lỗi cảm biến':'Hợp lệ'}</td><td className="p-3">{sourceLabels[r.dataSource]}</td><td className="p-3">{r.calibrationVersion??'Chưa khai báo'}</td></tr>)}</tbody>
   </table></div>}
  </>}
 </section>;
}
