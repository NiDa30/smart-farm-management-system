import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { currentDataState, Monitoring, MonitoredDevice, parseMonitoring } from './monitoringApi';
const time=(value:string|null)=>value?new Date(value).toLocaleString('vi-VN'):'Chưa có';
const number=(value:number|null)=>value===null?'—':value.toLocaleString('vi-VN',{maximumFractionDigits:1});
const dataLabels={FRESH:'Dữ liệu mới',STALE:'Dữ liệu đã cũ',EMPTY:'Chưa có dữ liệu',CLOCK_SKEW:'Lệch thời gian'};
const brokerLabels={DISABLED:'Backend chưa bật MQTT',STARTING:'Backend đang kết nối MQTT',CONNECTED:'Backend đã kết nối MQTT',DISCONNECTED:'Backend mất kết nối MQTT',STOPPED:'Backend đã ngừng MQTT'};
export const DeviceMonitor:React.FC=()=>{
  const [snapshot,setSnapshot]=useState<Monitoring|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const [refresh,setRefresh]=useState(0),[kind,setKind]=useState(''),[area,setArea]=useState(''),[search,setSearch]=useState('');
  const [selection,setSelection]=useState<string|null>(null),[elapsed,setElapsed]=useState(0),[loadedAt,setLoadedAt]=useState(0);
  useEffect(()=>{const timer=setInterval(()=>setElapsed(performance.now()),1000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{
    let active=true;let next:ReturnType<typeof setTimeout>;let controller:AbortController;
    const poll=async()=>{
      controller=new AbortController();const requestedAt=performance.now();const timeout=setTimeout(()=>controller.abort(),5000);
      try{
        const response=await fetch('/api/v1/monitoring',{signal:controller.signal,cache:'no-store'});
        if(!response.ok)throw new Error();
        const value=parseMonitoring(await response.json());
        if(active){setSnapshot(value);setLoadedAt(requestedAt);setElapsed(performance.now());setError('');}
      }catch{if(active)setError('Không tải được giám sát. Chưa thể kết luận thiết bị mất mạng; dữ liệu đang hiển thị là lần tải trước.');}
      finally{clearTimeout(timeout);if(active){setLoading(false);next=setTimeout(poll,5000);}}
    };void poll();return()=>{active=false;controller?.abort();clearTimeout(next);};
  },[refresh]);
  const now=snapshot?Date.parse(snapshot.asOf)+Math.max(0,elapsed-loadedAt):0;
  const areas=[...new Map(snapshot?.devices.filter(d=>d.areaId).map(d=>[d.areaId!,d.areaName??d.areaId!])??[]).entries()];
  const filtered=snapshot?.devices.filter(d=>(!kind||d.kind===kind)&&(!area||d.areaId===area)&&`${d.deviceId} ${d.name}`.toLowerCase().includes(search.toLowerCase()))??[];
  const selected=snapshot?.devices.find(d=>d.deviceId===selection);
  const activity=(d:MonitoredDevice)=>{
    if(d.lastMessageAt===null)return 'Chưa từng nhận bản tin';
    const age=now-Date.parse(d.lastMessageAt);
    if(age < -2000)return 'Thời gian nhận không hợp lệ';
    return age<30000?'Có bản tin trong 30 giây':'Chưa thấy bản tin mới trong 30 giây';
  };
  return <div className="max-w-6xl mx-auto space-y-4">
    <header className="flex justify-between items-center"><h1 className="font-bold text-xl flex gap-2 items-center"><Activity />Giám sát thiết bị</h1><button onClick={()=>setRefresh(v=>v+1)} className="border rounded p-2 flex gap-2"><RefreshCw size={18} />Làm mới</button></header>
    <section className="border rounded-xl bg-white p-4 space-y-2">
      <p role="status">{error?'Không tải được trạng thái backend':snapshot?brokerLabels[snapshot.mqtt.state]:loading?'Đang tải giám sát…':'Chưa xác định kết nối backend'}</p>
      {snapshot&&<><p className="text-sm">Lần xử lý bản tin MQTT cuối: {time(snapshot.mqtt.lastProcessedAt)}</p><p className="text-xs text-slate-500">Đồng bộ lúc {time(snapshot.asOf)} · Tự tải mỗi 5 giây.</p></>}
      <p className="text-sm text-slate-500">Đây là hoạt động nhận bản tin, không xác nhận Wi-Fi/nguồn điện của thiết bị. Cảm biến dùng ngưỡng mới 30 giây; trạng thái relay 15 giây. Quy tắc tưới vẫn yêu cầu số đo mới trong 15 giây.</p>
      {snapshot&&snapshot.mqtt.state!=='CONNECTED'&&<p className="text-amber-800 text-sm">Backend chưa sẵn sàng nhận MQTT. Bản ghi có sẵn không chứng minh thiết bị đang online.</p>}
      {error&&<p role="alert" className="text-rose-700">{error}</p>}
    </section>
    <div className="flex flex-wrap gap-3">
      <label>Tìm thiết bị<input aria-label="Tìm thiết bị" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Mã hoặc tên" className="block border rounded p-2" /></label>
      <label>Loại<select aria-label="Loại thiết bị" value={kind} onChange={e=>setKind(e.target.value)} className="block border rounded p-2"><option value="">Tất cả</option><option value="SENSOR">Cảm biến</option><option value="ACTUATOR">Relay điều khiển</option></select></label>
      <label>Khu vực<select aria-label="Khu vực" value={area} onChange={e=>setArea(e.target.value)} className="block border rounded p-2"><option value="">Tất cả</option>{areas.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
    </div>
    {!loading&&!filtered.length&&!error&&<p>Chưa có thiết bị phù hợp bộ lọc.</p>}
    {!!filtered.length&&<div className="bg-white border rounded-xl overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Thiết bị</th><th>Dữ liệu</th><th>Bản tin đã lưu gần nhất</th><th>Cảnh báo đang mở</th><th>Chi tiết</th></tr></thead><tbody>{filtered.map(d=><tr key={d.deviceId} className="border-t"><td className="p-3 font-semibold">{d.name}<span className="block text-xs text-slate-500">{d.deviceId} · {d.areaName??'Thiết bị điều khiển'}</span></td><td>{dataLabels[currentDataState(d,now)]}{error&&<span className="block text-xs text-rose-700">Chưa cập nhật được</span>}</td><td>{activity(d)}<span className="block text-xs text-slate-500">{time(d.lastMessageAt)}</span></td><td>{d.kind==='SENSOR'?d.activeAlerts:'—'}</td><td><button className="p-2 underline text-emerald-700" aria-label={`Chi tiết ${d.deviceId}`} onClick={()=>setSelection(d.deviceId)}>Xem</button></td></tr>)}</tbody></table></div>}
    {selected&&<section aria-label="Chi tiết thiết bị" className="bg-white border rounded-xl p-4 space-y-2 text-sm">
      <div className="flex justify-between"><h2 className="font-semibold">{selected.name} · {selected.deviceId}</h2><button onClick={()=>setSelection(null)}>Đóng chi tiết</button></div>
      <p>Đo/báo lúc: {time(selected.observedAt)}</p><p>Backend ghi nhận mẫu này: {time(selected.receivedAt)}</p><p>Bản tin đã lưu gần nhất: {time(selected.lastMessageAt)}</p>
      <p>Độ mới: {dataLabels[currentDataState(selected,now)]}{error?' · Không tải được trạng thái mới':''}</p>
      {selected.kind==='SENSOR'?<><p>Nhiệt độ: {number(selected.temperature)} °C · Độ ẩm không khí: {number(selected.humidity)}% · Đất: {number(selected.soilMoisture)}%</p><p>Cảnh báo đang mở: {selected.activeAlerts}. Không tự đóng cảnh báo khi mất dữ liệu.</p></>:<><p>Trạng thái relay: {!error&&currentDataState(selected,now)==='FRESH'?(selected.reportedState??'Chưa xác định'):'Chưa xác định'} · Lần báo trước: {selected.reportedState??'Chưa có'}</p><p>Khóa an toàn ở lần báo trước: {selected.safetyLockout===null?'Chưa có':selected.safetyLockout?'Có':'Không'}</p></>}
      <p className="text-xs text-slate-500">Màn này chỉ giám sát, không phát lệnh điều khiển, OTA hoặc thay cấu hình thiết bị. Dữ liệu đã cũ chỉ là giá trị lịch sử.</p>
    </section>}
  </div>;
};
