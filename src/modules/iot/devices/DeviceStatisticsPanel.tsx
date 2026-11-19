import React,{useEffect,useState} from 'react';
import {createLiveLoop} from '../live/iotLive';
import {completenessTone,parseStatistics,uptimeLabel,type StatisticsReport} from './statisticsApi';

const tones={good:'text-emerald-700',warn:'text-amber-700',bad:'text-rose-700'};

/** Data quality per node over the last 1 or 24 hours, computed by the backend from stored samples. */
export const DeviceStatisticsPanel:React.FC=()=>{
  const [hours,setHours]=useState(1),[report,setReport]=useState<StatisticsReport|null>(null),[error,setError]=useState(false);
  useEffect(()=>{
    let active=true;let controller:AbortController;
    // Heavier query: refresh on change but at most every 30 s without a socket.
    const loop=createLiveLoop(['monitoring'],30000);
    const poll=async()=>{
      controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
      try{
        const response=await fetch(`/api/v1/monitoring/statistics?hours=${hours}`,{signal:controller.signal,cache:'no-store'});
        if(!response.ok)throw new Error();const value=parseStatistics(await response.json());
        if(active&&value.hours===hours){setReport(value);setError(false);}
      }catch{if(active)setError(true);}
      finally{clearTimeout(timeout);if(active)loop.next(poll);}
    };void poll();return()=>{active=false;controller?.abort();loop.dispose();};
  },[hours]);
  return <section aria-label="Chất lượng dữ liệu thiết bị" className="bg-white border rounded-xl p-4 space-y-3">
    <div className="flex flex-wrap justify-between items-center gap-2">
      <h2 className="font-semibold">Chất lượng dữ liệu</h2>
      <label className="text-sm">Khoảng thời gian <select aria-label="Khoảng thống kê" value={hours} onChange={e=>setHours(Number(e.target.value))} className="border rounded p-1 ml-1"><option value={1}>1 giờ qua</option><option value={24}>24 giờ qua</option></select></label>
    </div>
    {error&&<p role="alert" className="text-sm text-rose-700">Không tải được thống kê. Số liệu bên dưới có thể đã cũ.</p>}
    {!report&&!error&&<p role="status" className="text-sm">Đang tính thống kê…</p>}
    {report&&<>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-slate-500">
        <th className="p-2">Thiết bị</th><th>Đủ dữ liệu</th><th>Số mẫu</th><th>Lần đứt quãng</th><th>Khoảng trống dài nhất</th><th>Khởi động lại</th><th>Giá trị nhảy</th><th>Chạy liên tục</th>
      </tr></thead><tbody>{report.devices.map(d=><tr key={d.deviceId} className="border-t">
        <td className="p-2 font-semibold">{d.deviceId}<span className="block text-xs font-normal text-slate-500">{d.nodeType==='ENVIRONMENT'?'Môi trường':'Trạm nước'}</span></td>
        <td className={`font-semibold ${tones[completenessTone(d.completeness)]}`}>{Math.round(d.completeness*100)}%</td>
        <td>{d.samples.toLocaleString('vi-VN')} / {d.expectedSamples.toLocaleString('vi-VN')}</td>
        <td>{d.gaps}</td><td>{d.samples>1?`${Math.round(d.maxGapSeconds)} giây`:'—'}</td><td>{d.reboots}</td>
        <td>{d.spikes===null?'—':d.spikes}</td><td>{uptimeLabel(d.latestUptimeMs)}</td>
      </tr>)}</tbody></table></div>
      <p className="text-xs text-slate-500">Tính trên mẫu đã lưu theo giờ đo, chu kỳ chuẩn {report.cadenceSeconds} giây. Đứt quãng: hai mẫu liên tiếp cách nhau quá {report.gapSeconds} giây. Giá trị nhảy (chỉ cảm biến môi trường): nhiệt độ đổi quá {report.spikeTemperature}°C hoặc độ ẩm đất quá {report.spikeSoilMoisture} điểm giữa hai mẫu liền nhau. Pin và cường độ sóng chưa có trong dữ liệu thiết bị gửi lên.</p>
    </>}
  </section>;
};
