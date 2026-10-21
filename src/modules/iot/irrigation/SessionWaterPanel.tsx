import React,{useEffect,useRef,useState} from 'react';
import type {SessionRun} from './irrigationSessionApi';
import {fetchSessionWater,sessionWaterCsv,waterUsageReasons,type SessionWaterReport} from './sessionWaterApi';
import {exclusionLabels} from '../resources/waterVolumeApi';
const time=(x:string)=>new Date(x).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
export function SessionWaterPanel({run}:{run:SessionRun}){
 const [report,setReport]=useState<SessionWaterReport|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[reload,setReload]=useState(0);
 const generation=useRef(0);
 useEffect(()=>{
  if(reload===0)return;
  const version=++generation.current,abort=new AbortController();setReport(null);setError('');setBusy(true);
  const timer=setTimeout(()=>abort.abort(),7000);
  void fetchSessionWater(run,abort.signal).then(r=>{if(version===generation.current)setReport(r);}).catch(e=>{if(version===generation.current)setError(e instanceof Error&&e.name!=='AbortError'?e.message:'Đọc báo cáo nước quá hạn. Thử đọc lại.');}).finally(()=>{clearTimeout(timer);if(version===generation.current)setBusy(false);});
  return()=>{generation.current++;abort.abort();clearTimeout(timer);};
 },[run.sessionId,run.revision,reload]);
 function download(){if(!report)return;const url=URL.createObjectURL(new Blob([sessionWaterCsv(report)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='session-station-water.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const v=report?.volume;
 return <section aria-label="Lượng nước theo phiên" className="border rounded p-3 space-y-2">
  <h3 className="font-bold">Lượng nước ước tính theo phiên</h3>
  <p>FLOW tại trạm trong khoảng lưu yêu cầu ON đến yêu cầu OFF đầu tiên. Chưa xác nhận thời gian bơm thực chạy hoặc phân bổ nước tới luống; trạm có thể dùng chung.</p>
  <button className="underline mr-3" disabled={busy} onClick={()=>setReload(x=>x+1)}>{reload===0?'Đọc lượng nước phiên':'Đọc lại lượng nước'}</button>
  <button className="border p-2" disabled={!report||busy||!!error} onClick={download}>CSV lượng nước phiên</button>
  {busy&&<p role="status">Đang đọc lượng nước…</p>}{error&&<p role="alert">{error}</p>}
  {report&&<>
   <p>{report.waterNodeId}/{report.flowChannelId} · {report.dataSource==='SIMULATOR'?'Nguồn mô phỏng':'Nguồn khai báo vật lý'} · cấu hình nhánh v{report.circuitRevision}</p>
   <p>{waterUsageReasons[report.reason]}</p>
   {report.from&&report.to&&<p>Cửa sổ yêu cầu: {time(report.from)} đến {time(report.to)} (giờ Việt Nam).</p>}
   <p>Ước tính tại trạm (phần có mẫu): <strong>{v?.estimatedLitres!=null?v.estimatedLitres.toLocaleString('vi-VN',{maximumFractionDigits:6})+' lít':'Chưa xác định'}</strong></p>
   {v&&<><p>Có mẫu hợp lệ {v.coveredSeconds.toLocaleString('vi-VN')} giây · chưa được phủ {v.uncoveredSeconds.toLocaleString('vi-VN')} giây. Không nội suy qua khoảng lỗi hoặc ngoại suy ở hai đầu.</p>
    {v.groups.map((g,i)=><p key={i}>Hiệu chuẩn {g.calibrationVersion??'Chưa ghi nhận'}: {g.estimatedLitres.toLocaleString('vi-VN',{maximumFractionDigits:6})} lít · {g.intervals} khoảng đo.</p>)}
    {Object.entries(v.excluded).map(([k,n])=><p key={k}>{exclusionLabels[k]}: {n} khoảng loại.</p>)}
   </>}
   <p className="text-sm">Đọc lúc {time(report.asOf)}. Mẫu đến sau có thể thay đổi lần đọc tiếp theo; báo cáo không gửi lệnh.</p>
  </>}
 </section>;
}
