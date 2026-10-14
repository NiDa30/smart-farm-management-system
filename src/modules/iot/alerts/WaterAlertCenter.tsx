import React,{useEffect,useRef,useState} from 'react';
import {AlertTriangle,RefreshCw} from 'lucide-react';
import {AlertAcknowledgement} from './AlertAcknowledgement';
import {waterAlertTitle as alertTitle,parseWaterAlert as parseAlert,parseWaterAlerts as parseAlerts,waterSourceLabel,sameWaterEpisode,type WaterAlert} from './waterAlertApi';
export const WaterAlertCenter:React.FC<{onBusyChange:(busy:boolean)=>void}>=({onBusyChange})=>{
  const [alerts,setAlerts]=useState<WaterAlert[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(false);
  const [refresh,setRefresh]=useState(0),[filter,setFilter]=useState<'all'|'active'|'cleared'>('all'),[seen,setSeen]=useState('all'),[source,setSource]=useState('all');
  const [selected,setSelected]=useState<WaterAlert|null>(null),[busy,setBusy]=useState(false);
  const [actionError,setActionError]=useState(''),[needsCheck,setNeedsCheck]=useState(false),[success,setSuccess]=useState(false);
  useEffect(()=>onBusyChange(busy),[busy,onBusyChange]);
  const version=useRef(0),inFlight=useRef(false);
  useEffect(()=>{
    if(busy)return;
    let active=true;let next:ReturnType<typeof setTimeout>;let controller:AbortController;
    const poll=async()=>{
      const requestVersion=version.current;
      controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),5000);
      try{
        const response=await fetch('/api/v1/water-alerts',{signal:controller.signal,cache:'no-store'});
        if(!response.ok)throw new Error();const value=parseAlerts(await response.json());
        if(active&&requestVersion===version.current){setAlerts(value);setError(false);setSelected(current=>current?(value.find(a=>a.id===current.id)??current):null);}
      }catch{if(active&&requestVersion===version.current)setError(true);}
      finally{clearTimeout(timeout);if(active){setLoading(false);next=setTimeout(poll,5000);}}
    };void poll();return()=>{active=false;controller?.abort();clearTimeout(next);};
  },[refresh,busy]);
  const open=(alert:WaterAlert)=>{if(inFlight.current)return;setSelected(alert);setNeedsCheck(false);setActionError('');setSuccess(false);};
  const act=async(note?:string):Promise<boolean>=>{
    if(!selected||inFlight.current)return false;
    const target=selected.id;const saving=note!==undefined;
    inFlight.current=true;version.current++;setBusy(true);setActionError('');setSuccess(false);
    let uncertain=saving;
    try{
      const response=await fetch(`/api/v1/water-alerts/${target}${saving?'/acknowledgement':''}`,{
        method:saving?'PUT':'GET',cache:'no-store',signal:AbortSignal.timeout(15000),
        ...(saving?{headers:{'Content-Type':'application/json'},body:JSON.stringify({note})}:{}),
      });
      if(!response.ok){
        if(response.status===400)uncertain=false;
        throw new Error(response.status===409?'Cảnh báo đã được xem ở phiên khác hoặc đã trở về bình thường. Đối chiếu trạng thái trước khi tiếp tục.':response.status===404?'Không tìm thấy cảnh báo. Kiểm tra lại danh sách.':response.status===400?'Ghi chú không hợp lệ; dùng tối đa 500 ký tự.':'Chưa xác nhận được kết quả. Đối chiếu trạng thái; không tự gửi lại.');
      }
      const confirmed=parseAlert(await response.json());
      if(!sameWaterEpisode(confirmed,selected)||(saving&&(!confirmed.acknowledgedAt||confirmed.acknowledgementNote!==(note||null))))throw new Error('Phản hồi xác nhận không khớp. Đối chiếu trạng thái; không tự gửi lại.');
      setSelected(confirmed);setAlerts(current=>current.map(a=>a.id===target?confirmed:a));
      setNeedsCheck(false);setSuccess(saving);return saving;
    }catch(reason){
      if(uncertain)setNeedsCheck(true);
      setActionError(reason instanceof TypeError||reason instanceof DOMException?'Chưa xác nhận được kết quả. Đối chiếu trạng thái; không tự gửi lại.':reason instanceof Error?reason.message:'Không đọc được cảnh báo.');
      return false;
    }finally{inFlight.current=false;setBusy(false);setRefresh(v=>v+1);}
  };
  const shown=alerts.filter(a=>(filter==='all'||(filter==='active'?a.clearedAt===null:a.clearedAt!==null))&&(source==='all'||a.dataSource===source)&&(seen==='all'||(seen==='unseen'?a.acknowledgedAt===null:a.acknowledgedAt!==null)));
  return <div className="max-w-6xl mx-auto space-y-4">
    <h1 className="text-xl font-bold flex gap-2 items-center"><AlertTriangle />Cảnh báo trạm nước</h1>
    <section className="bg-white rounded-xl border p-4 space-y-2 text-sm">
      <p>Nước dưới LOW: hai phao khô. Phao bất nhất: HIGH có nước nhưng LOW khô. Lỗi cảm biến: quality SENSOR_FAULT; không coi lưu lượng 0 là lỗi.</p>
      <p>Mở và hết cảnh báo cần hai packet mới liên tiếp, cùng lần khởi động và nguồn, cách nhau tối đa 15 giây. Chỉ xét mẫu không quá 30 giây.</p>
      <p>Mất dữ liệu hoặc lỗi phao không tự xóa cảnh báo nước thấp. Nguồn mô phỏng và vật lý có đợt cảnh báo riêng; đổi nguồn không xóa đợt cũ.</p>
      <p className="text-slate-500">Đây là lịch sử điều kiện đã ghi nhận. Đối chiếu dữ liệu mới tại Sensor Realtime để biết tình trạng hiện tại. Xác nhận đã xem không đóng cảnh báo, không điều khiển bơm hoặc gửi email.</p>
    </section>
    <div className="flex flex-wrap gap-3 items-center">
      <label>Điều kiện <select aria-label="Điều kiện" value={filter} onChange={e=>setFilter(e.target.value as typeof filter)} className="border rounded p-2"><option value="all">Tất cả</option><option value="active">Đang cảnh báo</option><option value="cleared">Đã trở về bình thường</option></select></label>
      <label>Xác nhận <select aria-label="Xác nhận" value={seen} onChange={e=>setSeen(e.target.value)} className="border rounded p-2"><option value="all">Tất cả</option><option value="unseen">Chưa xem</option><option value="seen">Đã xem</option></select></label>
      <label>Nguồn <select aria-label="Nguồn cảnh báo nước" value={source} onChange={e=>setSource(e.target.value)} className="border rounded p-2"><option value="all">Tất cả</option><option value="SIMULATOR">Mô phỏng</option><option value="PHYSICAL">Vật lý (khai báo)</option><option value="UNSPECIFIED">Chưa khai báo</option></select></label>
      <button disabled={busy} onClick={()=>setRefresh(v=>v+1)} className="border rounded p-2 flex gap-2 disabled:opacity-40"><RefreshCw size={18} />Làm mới</button>
    </div>
    {loading&&<p role="status">Đang tải cảnh báo…</p>}
    {error&&<p role="alert" className="text-rose-700">Không tải được cảnh báo. Dữ liệu trước đó có thể đã cũ; thao tác xác nhận tạm khóa.</p>}
    {selected&&<AlertAcknowledgement key={selected.id} alert={selected} title={`${alertTitle(selected)} · ${waterSourceLabel(selected)}`} busy={busy} unavailable={error} needsCheck={needsCheck} error={actionError} success={success}
      onSave={act} onCheck={()=>void act()} onClose={()=>{if(!inFlight.current)setSelected(null);}} />}
    {!loading&&!error&&!shown.length&&<p>Chưa có cảnh báo trong bộ lọc này.</p>}
    {!loading&&<div className="space-y-3" aria-label="Danh sách cảnh báo">{shown.map(alert=><article key={alert.id} className={`border rounded-xl p-4 space-y-2 ${alert.clearedAt?'bg-white':'bg-amber-50'}`}>
      <h2 className="font-semibold">{alertTitle(alert)} · {alert.clearedAt?'Đã trở về bình thường':'Đang cảnh báo'}</h2>
      <p className="text-sm font-medium">{waterSourceLabel(alert)}</p>
      <p className="text-sm">Phát sinh theo giờ đo: {new Date(alert.openedAt).toLocaleString('vi-VN')} · Mẫu #{alert.openedSampleId}</p>
      <p className="text-xs text-slate-500">Backend nhận mẫu: {new Date(alert.openedReceivedAt).toLocaleString('vi-VN')}</p>
      {alert.clearedAt&&<p className="text-sm">Hết điều kiện theo giờ đo: {new Date(alert.clearedAt).toLocaleString('vi-VN')} · Mẫu #{alert.clearedSampleId}</p>}
      <p className="text-sm">{alert.acknowledgedAt?`Đã xem lúc: ${new Date(alert.acknowledgedAt).toLocaleString('vi-VN')}`:'Chưa xác nhận đã xem'}</p>
      {alert.acknowledgementNote&&<p className="text-sm whitespace-pre-wrap break-words">Ghi chú: {alert.acknowledgementNote}</p>}
      <button disabled={busy} onClick={()=>open(alert)} className="border rounded px-3 py-1 disabled:opacity-40">Chi tiết cảnh báo nước #{alert.id}</button>
    </article>)}</div>}
    <p className="text-xs text-slate-500">Tự tải mỗi 5 giây. Tối đa 100 cảnh báo nước, ưu tiên đang hoạt động rồi chưa xem. Bộ lọc áp dụng cho danh sách đã tải; không phải tổng toàn bộ lịch sử. Chi tiết đang mở được giữ khi cảnh báo ra khỏi danh sách.</p>
  </div>;
};
