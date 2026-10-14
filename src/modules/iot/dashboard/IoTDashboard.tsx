import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { currentDataState } from '../devices/monitoringApi';
import { freshAverages, Overview, parseOverview } from './overviewApi';
const number=(v:number|null)=>v===null?'—':v.toLocaleString('vi-VN',{maximumFractionDigits:1});
const time=(v:string|null)=>v?new Date(v).toLocaleString('vi-VN'):'Chưa có';
const brokerLabels={DISABLED:'MQTT backend chưa bật',STARTING:'MQTT backend đang kết nối',CONNECTED:'MQTT backend đã kết nối',DISCONNECTED:'MQTT backend mất kết nối',STOPPED:'MQTT backend đã dừng'};
const ruleLabels:Record<string,string>={DISABLED:'Đã tắt',RESTART_PAUSED:'Tạm dừng sau khởi động',WAITING_SAMPLES:'Chờ hai mẫu đất thấp',COOLDOWN:'Đang nghỉ giữa các lần chạy',MANUAL_HOLD:'Tạm dừng do thao tác thủ công',STALE_SENSOR:'Dữ liệu cảm biến đã cũ',SAFETY_LOCKOUT:'Khóa an toàn',DEVICE_NOT_READY:'Thiết bị chưa sẵn sàng',COMMAND_PENDING:'Còn lệnh chờ',COMMAND_SENT:'Đã gửi lệnh bật, theo dõi ACK',COMMAND_UNCONFIRMED:'Chưa xác nhận lệnh',STOP_REQUESTED:'Yêu cầu tắt',STOP_SENT:'Đã gửi lệnh tắt',STOP_UNCONFIRMED:'Chưa xác nhận tắt',REPORTED_OFF:'Đã nhận trạng thái OFF',DISPATCH_FAILED:'Chưa xác nhận gửi lệnh'};
const resultLabels:Record<string,string>={...ruleLabels,OPEN:'Đang cảnh báo',ACKNOWLEDGED:'Đã xem cảnh báo',CLEARED:'Đã bình thường',PENDING:'Đang gửi',SENT:'Đã gửi, chờ ACK',EXECUTED:'Thiết bị đã ACK',FAILED:'Thiết bị từ chối',TIMED_OUT:'Quá hạn ACK',PUBLISH_UNCERTAIN:'Chưa xác nhận gửi',ON:'Bật',OFF:'Tắt'};
const eventLabels:Record<string,string>={ALERT_OPENED:'Phát sinh cảnh báo',ALERT_CLEARED:'Cảnh báo đã bình thường',ALERT_ACKNOWLEDGED:'Xác nhận đã xem cảnh báo',COMMAND_CREATED:'Tạo lệnh',COMMAND_ACK:'Nhận ACK thiết bị',DEVICE_STATE:'Trạng thái thiết bị',RULE_STARTED:'Bắt đầu lần chạy tưới'};
export const IoTOverview:React.FC<{navigate:(route:string)=>void}>=({navigate})=>{
  const [snapshot,setSnapshot]=useState<Overview|null>(null),[error,setError]=useState(false),[loading,setLoading]=useState(true),[refresh,setRefresh]=useState(0);
  const [elapsed,setElapsed]=useState(0),[requestedAt,setRequestedAt]=useState(0);
  useEffect(()=>{const timer=setInterval(()=>setElapsed(performance.now()),1000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{
    let active=true;let next:ReturnType<typeof setTimeout>;let controller:AbortController;
    const poll=async()=>{
      controller=new AbortController();const started=performance.now();const timeout=setTimeout(()=>controller.abort(),5000);
      try{
        const response=await fetch('/api/v1/dashboard/overview',{signal:controller.signal,cache:'no-store'});if(!response.ok)throw new Error();
        const value=parseOverview(await response.json());
        if(active){setSnapshot(value);setRequestedAt(started);setElapsed(performance.now());setError(false);}
      }catch{if(active)setError(true);}
      finally{clearTimeout(timeout);if(active){setLoading(false);next=setTimeout(poll,5000);}}
    };void poll();return()=>{active=false;controller?.abort();clearTimeout(next);};
  },[refresh]);
  const now=snapshot?Date.parse(snapshot.monitoring.asOf)+Math.max(0,elapsed-requestedAt):0;
  const sensors=snapshot?.monitoring.devices.filter(d=>d.kind==='SENSOR')??[];
  const fresh=sensors.filter(d=>currentDataState(d,now)==='FRESH').length;
  const pump=snapshot?.monitoring.devices.find(d=>d.deviceId==='PUMP01'&&d.kind==='ACTUATOR');
  const pumpKnown=!error&&pump&&currentDataState(pump,now)==='FRESH';
  const open=(route:string)=>()=>navigate(route);
  return <div className="max-w-6xl mx-auto space-y-5">
    <header className="flex justify-between items-center"><h1 className="font-bold text-xl flex gap-2 items-center"><Activity />Tổng quan IoT</h1><button onClick={()=>setRefresh(v=>v+1)} className="border rounded p-2 flex gap-2"><RefreshCw size={18} />Làm mới</button></header>
    <p className="text-sm text-slate-500">FARM001 · Dữ liệu đã lưu trong backend.</p>
    {loading&&<p role="status">Đang tải tổng quan…</p>}
    {error&&<p role="alert" className="text-rose-700">Không tải được tổng quan. Các thông tin còn hiển thị là bản chụp trước đó; chưa xác nhận trạng thái hiện tại.</p>}
    {snapshot&&<>
      <section className="bg-white border rounded-xl p-4 space-y-2"><p role="status">{error?'Chưa xác định kết nối backend':brokerLabels[snapshot.monitoring.mqtt.state]}</p><p className="text-xs text-slate-500">Bản chụp lúc {time(snapshot.monitoring.asOf)} · Tự tải mỗi 5 giây. MQTT backend không xác nhận Wi-Fi của thiết bị.</p></section>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article aria-label="Cảm biến đã đăng ký" className="bg-white border rounded-xl p-4"><h2>Cảm biến đã đăng ký</h2><p className="text-3xl font-bold">{sensors.length}</p><button className="text-emerald-700 underline text-sm" onClick={open('/iot/devices')}>Mở giám sát</button></article>
        <article aria-label="Cảm biến có dữ liệu mới" className="bg-white border rounded-xl p-4"><h2>Cảm biến có dữ liệu mới</h2><p className="text-3xl font-bold">{error?'—':fresh}</p><p className="text-xs text-slate-500">Trong 30 giây; không phải số thiết bị chắc chắn online.</p></article>
        <article aria-label="Cảnh báo đang mở" className="bg-white border rounded-xl p-4"><h2>Cảnh báo đang mở</h2><p className="text-3xl font-bold">{snapshot.activeAlertCount}</p><button className="text-emerald-700 underline text-sm" onClick={open('/iot/alerts')}>Mở cảnh báo</button></article>
        <article aria-label="Khu vực đã đăng ký" className="bg-white border rounded-xl p-4"><h2>Khu vực đã đăng ký</h2><p className="text-3xl font-bold">{snapshot.areas.length}</p><button className="text-emerald-700 underline text-sm" onClick={open('/iot/realtime')}>Mở Sensor Realtime</button></article>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section aria-label="Relay PUMP01" className="bg-white border rounded-xl p-4 space-y-2"><h2 className="font-semibold">Relay PUMP01</h2><p>Trạng thái: {pumpKnown?(pump.reportedState??'Chưa xác định'):'Chưa xác định'}</p><p className="text-sm">Lần báo trước: {pump?.reportedState??'Chưa có'} · {time(pump?.observedAt??null)}</p><p className="text-sm">Khóa ở lần báo trước: {pump?.safetyLockout==null?'Chưa có':pump.safetyLockout?'Có':'Không'}</p><button className="text-emerald-700 underline" onClick={open('/iot/control')}>Mở điều khiển</button></section>
        <section aria-label="Quy tắc tưới" className="bg-white border rounded-xl p-4 space-y-2"><h2 className="font-semibold">Quy tắc tưới</h2><p className="text-xs text-slate-500">Quy tắc yêu cầu số đo mới trong 15 giây, chặt hơn chỉ số tổng quan 30 giây.</p><p>{error?'Chưa xác nhận hiện tại':snapshot.rule.enabled?'Quy tắc đang bật':'Quy tắc đang tắt'}</p><p className="text-sm">{ruleLabels[snapshot.rule.lastResult]??snapshot.rule.lastResult}</p>{snapshot.rule.cooldownUntil&&Date.parse(snapshot.rule.cooldownUntil)>now&&<p>Nghỉ đến {time(snapshot.rule.cooldownUntil)}</p>}<button className="text-emerald-700 underline" onClick={open('/iot/automation')}>Mở quy tắc</button></section>
      </div>
      <section className="space-y-3"><h2 className="font-semibold">Môi trường theo khu vực</h2><p className="text-xs text-slate-500">Trung bình các cảm biến có dữ liệu mới trong 30 giây, không tính mẫu cũ hoặc chưa có số đo. Không phải thống kê theo thời gian.</p><div className="grid gap-3 md:grid-cols-2">{snapshot.areas.map(area=>{
        const assigned=sensors.filter(d=>d.areaId===area.id);const avg=freshAverages(assigned,now);
        return <article key={area.id} aria-label={`Khu vực ${area.name}`} className="bg-white border rounded-xl p-4 space-y-2"><h3 className="font-semibold">{area.name}</h3><p className="text-sm">{assigned.length} cảm biến · {error?'Chưa xác nhận độ mới':`${avg.count} có số đo mới`}</p><p>Nhiệt độ: {number(error?null:avg.temperature)} °C</p><p>Không khí: {number(error?null:avg.humidity)}% · Đất: {number(error?null:avg.soilMoisture)}%</p>{!assigned.length&&<p className="text-xs text-slate-500">Chưa gán cảm biến cho khu vực.</p>}</article>;
      })}</div>{!snapshot.areas.length&&<p>Chưa có khu vực.</p>}</section>
      <section className="bg-white border rounded-xl p-4 space-y-3"><h2 className="font-semibold">Cảnh báo đang mở gần nhất</h2>{!snapshot.recentActiveAlerts.length&&<p>Chưa có cảnh báo đang mở; không đồng nghĩa mọi thiết bị đang hoạt động bình thường.</p>}{snapshot.recentActiveAlerts.map(a=><p key={a.id} className="text-sm">{a.deviceId} · {a.type==='LOW_SOIL'?'Đất thấp':'Nhiệt độ cao'} · {number(a.openedValue)}{a.type==='LOW_SOIL'?'%':'°C'} lúc {time(a.openedAt)}</p>)}{snapshot.activeAlertCount>snapshot.recentActiveAlerts.length&&<p className="text-xs text-slate-500">Đang hiển thị {snapshot.recentActiveAlerts.length}/{snapshot.activeAlertCount} cảnh báo đang mở.</p>}</section>
      <section className="bg-white border rounded-xl p-4 space-y-3"><h2 className="font-semibold">Sự kiện gần nhất trong 24 giờ</h2>{!snapshot.recentEvents.length&&<p>Chưa có sự kiện trong khoảng này.</p>}{snapshot.recentEvents.map(event=><p key={event.id} className="text-sm">{time(event.eventAt)} · {event.deviceId} · {eventLabels[event.type]} · {resultLabels[event.state]??event.state} <span className="text-xs text-slate-500">({event.sourceAt?'Giờ thiết bị':'Giờ backend'})</span></p>)}<button className="text-emerald-700 underline" onClick={open('/iot/events')}>Mở nhật ký sự kiện</button><p className="text-xs text-slate-500">Tối đa 8 bản ghi. Tạo/gửi lệnh chưa chứng minh GPIO đã áp dụng; xem ACK và chi tiết nhật ký.</p></section>
      <p className="text-xs text-slate-500">Trang tổng quan chỉ đọc. Không gửi lệnh bật/tắt hoặc bật quy tắc khi mở trang.</p>
    </>}
  </div>;
};
export const IoTDashboard:React.FC=()=>{const {navigate}=useApp();return <IoTOverview navigate={navigate}/>;};
