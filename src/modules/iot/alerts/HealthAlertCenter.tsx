import React,{useEffect,useRef,useState} from 'react';
import {HeartPulse,RefreshCw} from 'lucide-react';
import {createLiveLoop} from '../live/iotLive';
import {AlertAcknowledgement} from './AlertAcknowledgement';
import {healthAlertTitle as alertTitle,healthRules,parseHealthAlert as parseAlert,parseHealthAlerts as parseAlerts,parseHealthSettings,sameHealthEpisode,type HealthAlert,type HealthSettings} from './healthAlertApi';

export const HealthAlertCenter:React.FC<{onBusyChange:(busy:boolean)=>void}>=({onBusyChange})=>{
  const [alerts,setAlerts]=useState<HealthAlert[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(false);
  const [settings,setSettings]=useState<HealthSettings|null>(null);
  const [refresh,setRefresh]=useState(0),[filter,setFilter]=useState<'all'|'active'|'cleared'>('all'),[seen,setSeen]=useState('all'),[type,setType]=useState('all');
  const [selected,setSelected]=useState<HealthAlert|null>(null),[busy,setBusy]=useState(false);
  const [actionError,setActionError]=useState(''),[needsCheck,setNeedsCheck]=useState(false),[success,setSuccess]=useState(false);
  useEffect(()=>onBusyChange(busy),[busy,onBusyChange]);
  const version=useRef(0),inFlight=useRef(false);
  useEffect(()=>{
    const controller=new AbortController();
    fetch('/api/v1/health-alerts/settings',{signal:controller.signal,cache:'no-store'})
      .then(r=>{if(!r.ok)throw new Error();return r.json();}).then(v=>setSettings(parseHealthSettings(v))).catch(()=>{/* rules text stays generic */});
    return()=>controller.abort();
  },[]);
  useEffect(()=>{
    if(busy)return;
    let active=true;let controller:AbortController;const loop=createLiveLoop(['alerts'],5000);
    const poll=async()=>{
      const requestVersion=version.current;
      controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),5000);
      try{
        const response=await fetch('/api/v1/health-alerts',{signal:controller.signal,cache:'no-store'});
        if(!response.ok)throw new Error();const value=parseAlerts(await response.json());
        if(active&&requestVersion===version.current){setAlerts(value);setError(false);setSelected(current=>current?(value.find(a=>a.id===current.id)??current):null);}
      }catch{if(active&&requestVersion===version.current)setError(true);}
      finally{clearTimeout(timeout);if(active){setLoading(false);loop.next(poll);}}
    };void poll();return()=>{active=false;controller?.abort();loop.dispose();};
  },[refresh,busy]);
  const open=(alert:HealthAlert)=>{if(inFlight.current)return;setSelected(alert);setNeedsCheck(false);setActionError('');setSuccess(false);};
  const act=async(note?:string):Promise<boolean>=>{
    if(!selected||inFlight.current)return false;
    const target=selected.id;const saving=note!==undefined;
    inFlight.current=true;version.current++;setBusy(true);setActionError('');setSuccess(false);
    let uncertain=saving;
    try{
      const response=await fetch(`/api/v1/health-alerts/${target}${saving?'/acknowledgement':''}`,{
        method:saving?'PUT':'GET',cache:'no-store',signal:AbortSignal.timeout(15000),
        ...(saving?{headers:{'Content-Type':'application/json'},body:JSON.stringify({note})}:{}),
      });
      if(!response.ok){
        if(response.status===400)uncertain=false;
        throw new Error(response.status===409?'Cảnh báo đã được xem ở phiên khác hoặc đã trở về bình thường. Đối chiếu trạng thái trước khi tiếp tục.':response.status===404?'Không tìm thấy cảnh báo. Kiểm tra lại danh sách.':response.status===400?'Ghi chú không hợp lệ; dùng tối đa 500 ký tự.':'Chưa xác nhận được kết quả. Đối chiếu trạng thái; không tự gửi lại.');
      }
      const confirmed=parseAlert(await response.json());
      if(!sameHealthEpisode(confirmed,selected)||(saving&&(!confirmed.acknowledgedAt||confirmed.acknowledgementNote!==(note||null))))throw new Error('Phản hồi xác nhận không khớp. Đối chiếu trạng thái; không tự gửi lại.');
      setSelected(confirmed);setAlerts(current=>current.map(a=>a.id===target?confirmed:a));
      setNeedsCheck(false);setSuccess(saving);return saving;
    }catch(reason){
      if(uncertain)setNeedsCheck(true);
      setActionError(reason instanceof TypeError||reason instanceof DOMException?'Chưa xác nhận được kết quả. Đối chiếu trạng thái; không tự gửi lại.':reason instanceof Error?reason.message:'Không đọc được cảnh báo.');
      return false;
    }finally{inFlight.current=false;setBusy(false);setRefresh(v=>v+1);}
  };
  const shown=alerts.filter(a=>(filter==='all'||(filter==='active'?a.clearedAt===null:a.clearedAt!==null))&&(type==='all'||a.type===type)&&(seen==='all'||(seen==='unseen'?a.acknowledgedAt===null:a.acknowledgedAt!==null)));
  return <div className="max-w-6xl mx-auto space-y-4">
    <h1 className="text-xl font-bold flex gap-2 items-center"><HeartPulse />Sức khỏe thiết bị</h1>
    <section className="bg-white rounded-xl border p-4 space-y-2 text-sm" aria-label="Quy tắc sức khỏe thiết bị">
      {(settings?healthRules(settings):['Đang tải quy tắc từ backend…']).map(rule=><p key={rule}>{rule}</p>)}
      <p className="text-slate-500">Chỉ đánh giá khi backend đang kết nối MQTT ổn định; lúc backend mất kết nối, không cảnh báo nào được mở hay đóng. Pin và cường độ sóng chưa có trong hợp đồng dữ liệu nên không hiển thị.</p>
    </section>
    <div className="flex flex-wrap gap-3 items-center">
      <label>Điều kiện <select aria-label="Điều kiện" value={filter} onChange={e=>setFilter(e.target.value as typeof filter)} className="border rounded p-2"><option value="all">Tất cả</option><option value="active">Đang cảnh báo</option><option value="cleared">Đã trở về bình thường</option></select></label>
      <label>Loại <select aria-label="Loại cảnh báo sức khỏe" value={type} onChange={e=>setType(e.target.value)} className="border rounded p-2"><option value="all">Tất cả</option><option value="DEVICE_OFFLINE">Mất tín hiệu</option><option value="STUCK_VALUE">Giá trị không đổi</option><option value="PUMP_NO_FLOW">Bơm không có lưu lượng</option></select></label>
      <label>Xác nhận <select aria-label="Xác nhận" value={seen} onChange={e=>setSeen(e.target.value)} className="border rounded p-2"><option value="all">Tất cả</option><option value="unseen">Chưa xem</option><option value="seen">Đã xem</option></select></label>
      <button disabled={busy} onClick={()=>setRefresh(v=>v+1)} className="border rounded p-2 flex gap-2 disabled:opacity-40"><RefreshCw size={18} />Làm mới</button>
    </div>
    {loading&&<p role="status">Đang tải cảnh báo…</p>}
    {error&&<p role="alert" className="text-rose-700">Không tải được cảnh báo. Dữ liệu trước đó có thể đã cũ; thao tác xác nhận tạm khóa.</p>}
    {selected&&<AlertAcknowledgement key={selected.id} alert={selected} title={alertTitle(selected)} busy={busy} unavailable={error} needsCheck={needsCheck} error={actionError} success={success}
      onSave={act} onCheck={()=>void act()} onClose={()=>{if(!inFlight.current)setSelected(null);}} />}
    {!loading&&!error&&!shown.length&&<p>Chưa có cảnh báo trong bộ lọc này.</p>}
    {!loading&&<div className="space-y-3" aria-label="Danh sách cảnh báo">{shown.map(alert=><article key={alert.id} className={`border rounded-xl p-4 space-y-2 ${alert.clearedAt?'bg-white':'bg-amber-50'}`}>
      <h2 className="font-semibold">{alertTitle(alert)} · {alert.clearedAt?'Đã trở về bình thường':'Đang cảnh báo'}</h2>
      <p className="text-sm">Phát hiện lúc: {new Date(alert.openedAt).toLocaleString('vi-VN')}</p>
      <p className="text-xs text-slate-500 font-mono break-all">{alert.detail}</p>
      {alert.clearedAt&&<p className="text-sm">Trở về bình thường: {new Date(alert.clearedAt).toLocaleString('vi-VN')}</p>}
      <p className="text-sm">{alert.acknowledgedAt?`Đã xem lúc: ${new Date(alert.acknowledgedAt).toLocaleString('vi-VN')}`:'Chưa xác nhận đã xem'}</p>
      {alert.acknowledgementNote&&<p className="text-sm whitespace-pre-wrap break-words">Ghi chú: {alert.acknowledgementNote}</p>}
      <button disabled={busy} onClick={()=>open(alert)} className="border rounded px-3 py-1 disabled:opacity-40">Chi tiết cảnh báo sức khỏe #{alert.id}</button>
    </article>)}</div>}
    <p className="text-xs text-slate-500">Tải lại ngay khi backend báo thay đổi; nếu không có kênh realtime thì tự tải mỗi 5 giây. Tối đa 100 cảnh báo, ưu tiên đang hoạt động rồi chưa xem.</p>
  </div>;
};
