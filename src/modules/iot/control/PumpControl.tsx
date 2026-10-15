import React, { useEffect, useState, useRef } from 'react';
import {validContext,validOwnership,parseReceipt,loadIntents,PENDING_KEY,type PumpIntent,type IntentContext,type PumpOwnership} from './pumpIntentApi';
import { Power, ShieldCheck, RefreshCw } from 'lucide-react';

interface PumpStatus { deviceId: 'PUMP01'; reportedState: 'ON' | 'OFF' | 'UNKNOWN'; safetyLockout: boolean; fresh: boolean; controlEnabled: boolean; observedAt: string | null; commandFence?: {required:boolean;deviceEnabled:boolean;compatible:boolean;restartRequired:boolean;lastOrdinal:number|null;intent?:IntentContext|null;ownership?:PumpOwnership|null} }
interface Command { commandId: string; action: string; durationSeconds: number | null; issuedAt: string; state: string; reportedState: string | null; errorCode: string | null }
interface StateChange { id: number; observedAt: string; reportedState: string; safetyLockout: boolean; changeType: string; stateReason?: string | null }
const API = '/api/v1/actuators/PUMP01';
export const PumpControl: React.FC<{onValveDemo?:()=>void;onQueue?:()=>void;onCircuits?:()=>void}> = ({onValveDemo,onQueue,onCircuits}) => {
  const [status, setStatus] = useState<PumpStatus | null>(null);
  const [commands, setCommands] = useState<Command[]>([]);
  const [stateHistory, setStateHistory] = useState<StateChange[]>([]);
  const [error, setError] = useState('');
  const [notice,setNotice]=useState('');
  const [unknown,setUnknown]=useState<PumpIntent[]>(loadIntents);
  const unknownRef=useRef(unknown),flight=useRef(false),mounted=useRef(true);
  const contextClock=useRef({floor:0,at:0});
  const activeRequest=useRef<AbortController|null>(null);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;activeRequest.current?.abort();};},[]);
  function remember(values:PumpIntent[]){unknownRef.current=values;try{sessionStorage.setItem(PENDING_KEY,JSON.stringify(values));}catch{/* Visible IDs still allow manual reconciliation. */}if(mounted.current)setUnknown(values);}
  const [available, setAvailable] = useState(false);
  const [duration, setDuration] = useState(5);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [unit, setUnit] = useState<'seconds' | 'minutes'>('seconds');
  const durationSeconds = timerEnabled ? duration * (unit === 'minutes' ? 60 : 1) : 3600;
  const [sending, setSending] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if(sending)return;
    let active = true;
    let next: ReturnType<typeof setTimeout>;
    let controller: AbortController;
    let timeout: ReturnType<typeof setTimeout>;
    const poll = async () => {
      const requestStarted=performance.now();
      controller = new AbortController(); timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const responses = await Promise.all([fetch(`${API}/status`, { signal: controller.signal, cache: 'no-store' }), fetch(`${API}/commands`, { signal: controller.signal, cache: 'no-store' })]);
        if (responses.some(response => !response.ok)) throw new Error();
        const [value, history] = await Promise.all(responses.map(response => response.json()));
        if (!value || value.deviceId !== 'PUMP01' || !['ON','OFF','UNKNOWN'].includes(value.reportedState)
          || (value.commandFence!==undefined&&(!value.commandFence||typeof value.commandFence.required!=='boolean'||typeof value.commandFence.deviceEnabled!=='boolean'||typeof value.commandFence.compatible!=='boolean'||typeof value.commandFence.restartRequired!=='boolean'||(value.commandFence.deviceEnabled?(value.commandFence.lastOrdinal===null):value.commandFence.lastOrdinal!==null||value.commandFence.restartRequired)||value.commandFence.compatible!==(value.commandFence.required===value.commandFence.deviceEnabled)||(value.commandFence.lastOrdinal!==null&&(!Number.isSafeInteger(value.commandFence.lastOrdinal)||value.commandFence.lastOrdinal<0))))
          || (value.commandFence?.intent!==undefined&&value.commandFence.intent!==null&&!validContext(value.commandFence.intent))
          || (value.commandFence?.ownership!==undefined&&value.commandFence.ownership!==null&&!validOwnership(value.commandFence.ownership))
          || typeof value.fresh !== 'boolean' || typeof value.safetyLockout !== 'boolean' || typeof value.controlEnabled !== 'boolean'
          || (value.observedAt !== null && (typeof value.observedAt !== 'string' || !Number.isFinite(Date.parse(value.observedAt)))) || !Array.isArray(history) || !history.every(command => command && typeof command.commandId === 'string'
            && ['ON','OFF','RESET_LOCKOUT'].includes(command.action) && typeof command.state === 'string'
            && typeof command.issuedAt === 'string' && Number.isFinite(Date.parse(command.issuedAt)))) throw new Error();
        if (active) {
          if(validContext(value.commandFence?.intent)){const p=performance.now(),old=contextClock.current;contextClock.current={floor:Math.max(Date.parse(value.commandFence.intent.asOf)+p-requestStarted,old.floor+Math.max(0,p-old.at)),at:p};}
          setStatus(value); setCommands(history); setAvailable(true);
          try { const response = await fetch(`${API}/history`, { signal: controller.signal, cache: 'no-store' });
            if (response.ok) { const changes = await response.json();
              if (active && Array.isArray(changes) && changes.every(item => item && Number.isInteger(item.id) && Number.isFinite(Date.parse(item.observedAt)) && ['ON','OFF'].includes(item.reportedState) && typeof item.safetyLockout === 'boolean')) setStateHistory(changes);
            }
          } catch { /* State history must not block emergency OFF. */ } }
      } catch { if (active) setAvailable(false); }
      finally { clearTimeout(timeout); if (active) next = setTimeout(poll, 2000); }
    };
    void poll(); return () => { active = false; clearTimeout(next); clearTimeout(timeout); controller?.abort(); };
  }, [refresh,sending]);
  const age = status?.observedAt ? now - Date.parse(status.observedAt) : Infinity;
  const fresh = available && status?.fresh && age >= -2000 && age <= 15000;
  const state = fresh ? status?.reportedState : 'UNKNOWN';
  const pending = commands.some(command => ['PENDING','SENT','PUBLISH_UNCERTAIN'].includes(command.state));
  const protocolReady = !status?.commandFence || status.commandFence.compatible&&!status.commandFence.restartRequired;
  const intent=status?.commandFence?.intent;
  const intentFresh=!!intent&&intent.ready&&validContext(intent)&&contextClock.current.floor+Math.max(0,performance.now()-contextClock.current.at)-Date.parse(intent.asOf)<8000;
  const protectedProfile=status?.commandFence?.required===true;
  const owner=status?.commandFence?.ownership;
  const ownerBlocked=owner?.blocked===true;
  const canOn = !ownerBlocked&&(!protectedProfile||intentFresh)&&unknown.length===0&&protocolReady && !!fresh && status?.controlEnabled && state === 'OFF' && !status.safetyLockout && !pending && !sending && Number.isInteger(durationSeconds) && durationSeconds >= 1 && durationSeconds <= 3600;
  const send = async (action:'ON'|'OFF'|'RESET_LOCKOUT') => {
    if(flight.current)return;
    if(action!=='OFF'&&(ownerBlocked||unknownRef.current.length||protectedProfile&&!intentFresh))return;
    flight.current=true;setSending(true);setError('');setNotice('');
    const protectedRequest=protectedProfile&&intentFresh&&unknownRef.current.length<20;
    const request:PumpIntent|null=protectedRequest?{requestId:crypto.randomUUID(),action,durationSeconds:action==='ON'?durationSeconds:null,expectedBootId:action==='OFF'?null:intent!.bootId,intentRevision:intent!.revision,reviewedAt:intent!.asOf}:null;
    if(request)remember([...unknownRef.current,request]);
    const controller=new AbortController();activeRequest.current=controller;const timer=setTimeout(()=>controller.abort(),15000);
    try {
      const response=await fetch(API+(request?'/requests':'/commands'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request??(action==='ON'?{action,durationSeconds}:{action})),signal:controller.signal});
      if([400,403,409,503].includes(response.status)){
        if(request)remember(unknownRef.current.filter(x=>x.requestId!==request.requestId));
        throw new Error(response.status===409?'Ý định hoặc thiết bị đã đổi. Đọc trạng thái mới trước khi xác nhận lại.':response.status===403?'Backend chưa bật điều khiển.':'Yêu cầu chưa được chấp nhận. Đọc lại trạng thái và lịch sử.');
      }
      if(!response.ok||(request&&response.status!==202))throw new Error('Chưa rõ kết quả lưu. Không tự gửi lại; đối chiếu theo mã hoặc yêu cầu tắt.');
      const value=await response.json(),command=request?parseReceipt(value,request).command:value;
      if(!command||typeof command.commandId!=='string'||command.action!==action)throw new Error('Phản hồi không khớp. Giữ mã và đối chiếu; không tự gửi lại.');
      if(action==='OFF')remember([]);else if(request)remember(unknownRef.current.filter(x=>x.requestId!==request.requestId));
      if(mounted.current){setCommands(previous=>[command,...previous.filter(x=>x.commandId!==command.commandId)].slice(0,20));setNotice(command.state==='FAILED'?'Yêu cầu đã lưu nhưng chưa thực hiện: '+(command.errorCode??'Thiết bị từ chối')+'. Chưa xác nhận GPIO.':action==='OFF'?'Đã lưu yêu cầu tắt và chặn ý định bật cũ. Chờ ACK/status; chưa xác nhận đã tắt.':'Đã lưu yêu cầu. Chờ ACK/status riêng; không tự coi là đã thực thi.');}
    } catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Chưa rõ kết quả. Đối chiếu theo mã, không tự gửi lại.');}
    finally{clearTimeout(timer);flight.current=false;if(mounted.current){setAvailable(false);setSending(false);setRefresh(v=>v+1);}}
  };
  async function reconcile(request:PumpIntent){if(flight.current)return;flight.current=true;setSending(true);setError('');const controller=new AbortController();activeRequest.current=controller;const timer=setTimeout(()=>controller.abort(),7000);
    try{const response=await fetch(API+'/requests/'+request.requestId,{signal:controller.signal,cache:'no-store'});if(!response.ok)throw new Error('Chưa tìm được bản lưu chắc chắn. Giữ mã, không gửi lại ON; có thể yêu cầu tắt để chặn ý định cũ.');const receipt=parseReceipt(await response.json(),request);remember(unknownRef.current.filter(x=>x.requestId!==request.requestId));if(mounted.current){setCommands(v=>[receipt.command,...v.filter(x=>x.commandId!==request.requestId)].slice(0,20));setNotice('Đã đối chiếu bản lưu: '+(receipt.command.errorCode==='MQTT_UNAVAILABLE'?'Chưa gửi: MQTT chưa sẵn sàng':labels[receipt.command.state]??receipt.command.state)+'. Không phát lại yêu cầu.');}}
    catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Chưa đối chiếu được.');}
    finally{clearTimeout(timer);flight.current=false;if(mounted.current){setAvailable(false);setSending(false);setRefresh(v=>v+1);}}
  }
  const reasons: Record<string,string> = { VALVE_NOT_OPEN: 'Chưa có phản hồi van mở tại bơm', VALVE_PROOF_LOST: 'Mất phản hồi van mở khi bơm đang bật', VALVE_SWITCH_CONFLICT: 'Hai công tắc van tại bơm mâu thuẫn', BOOT: 'Khởi động thiết bị', COMMAND_ON: 'Nhận lệnh bật', COMMAND_OFF: 'Tắt thủ công', LOCKOUT_RESET: 'Reset khóa', TIMER_EXPIRED: 'Hết thời gian hẹn', CONNECTION_LOST: 'Mất kết nối khi đang bật', DEVICE_FAULT: 'Lỗi thiết bị', WATER_LOW: 'Bồn cạn nước hoặc đứt dây phao', FLOW_LOW: 'Thiếu lưu lượng tại bộ điều khiển (thiết bị báo)', FLOW_SENSOR_FAULT: 'Tín hiệu lưu lượng tại bộ điều khiển lỗi (thiết bị báo)' };
  const labels: Record<string,string> = { PENDING: 'Đang gửi', SENT: 'Đã gửi, chờ ACK', EXECUTED: 'Thiết bị đã ACK', FAILED: 'Thiết bị từ chối', TIMED_OUT: 'Quá hạn ACK', PUBLISH_UNCERTAIN: 'Chưa xác nhận gửi' };
  return <div className="max-w-5xl mx-auto space-y-5">
    {onValveDemo&&<button className="underline" onClick={onValveDemo}>Mở controller van mô phỏng</button>}
    {onCircuits&&<button className="underline ml-4" onClick={onCircuits}>Cấu hình nhánh tưới</button>}
    {onQueue&&<button className="underline ml-4" onClick={onQueue}>Mở hàng chờ tưới diễn tập</button>}
    <header><h1 className="text-xl font-bold flex gap-2 items-center"><Power className="w-5 h-5 text-emerald-600" /> Điều khiển PUMP01</h1><p className="text-sm text-slate-500 mt-1">Demo GPIO26 trên Wokwi · FARM001 / ENV01</p></header>
    <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-sm">Mô phỏng Wokwi với relay và LED tải. ACK xác nhận GPIO đã áp dụng, không chứng minh bơm vật lý đang chạy.</div>
    {status?.commandFence&&<div className="bg-slate-50 border rounded-xl p-3 text-sm"><p>Bảo vệ lệnh đến muộn qua MQTT: {status.commandFence.required?'Backend đã bật':'Backend chưa bật'} · Thiết bị: {status.commandFence.deviceEnabled?'Đã bật':'Chưa nhận xác nhận bảo vệ'}.</p>{!status.commandFence.compatible&&<p role="alert">Chế độ backend và thiết bị chưa khớp. Chưa cho phép bật hoặc reset khóa; lệnh tắt vẫn có thể yêu cầu.</p>}{status.commandFence.restartRequired&&<p role="alert">Thiết bị đã khóa sau lệnh tắt từ chế độ cũ. Cần khởi động lại thiết bị trước khi bật/reset; không tự chạy lại.</p>}</div>}
    {protectedProfile&&owner&&<section aria-label="Quyền sử dụng bơm" className="bg-slate-50 border rounded-xl p-4 text-sm space-y-1">
      <h2 className="font-semibold">Quyền sử dụng bơm</h2>
      {owner.holder?<><p>Nguồn giữ quyền: {owner.holder.source==='AUTOMATION'?'Tưới tự động':owner.holder.source==='MANUAL'?'Điều khiển thủ công':'Lệnh từ phiên bản trước'}.</p>
        <p>{owner.blocked?'Chưa đủ bằng chứng OFF để chuyển quyền. Bật/reset đang bị chặn; vẫn có thể yêu cầu tắt.':'Đã có bằng chứng OFF mới. Quyền cũ sẽ được khép trong giao dịch nhận lệnh tiếp theo.'}</p>
        <p className="text-slate-500">Hết thời gian hẹn hoặc restart backend không tự giải phóng quyền. Đây là bản ghi điều phối, chưa xác nhận bơm vật lý.</p></>:<p>Chưa có lượt giữ quyền chưa khép. Bật bơm vẫn cần các điều kiện trạng thái và an toàn.</p>}
    </section>}
    <section className="bg-white border rounded-xl p-5 space-y-4">
      <div className="flex justify-between items-center"><h2 className="font-semibold">Trạng thái thiết bị: <span role="status">{state === 'UNKNOWN' ? 'Chưa xác định' : state === 'ON' ? 'Đang bật' : 'Đang tắt'}</span></h2><button type="button" onClick={() => setRefresh(value => value + 1)} aria-label="Làm mới trạng thái"><RefreshCw className="w-4 h-4" /></button></div>
      <p className="text-sm text-slate-500">{status?.observedAt ? `Báo lúc: ${new Date(status.observedAt).toLocaleString('vi-VN')}` : 'Chưa nhận status từ thiết bị.'}</p>
      {!available && <p role="alert" className="text-rose-700 text-sm">Backend chưa khả dụng; không thể xác nhận trạng thái relay.</p>}
      {status && !status.controlEnabled && <p className="text-amber-800 text-sm">Chế độ điều khiển chưa bật trên backend.</p>}
      {status?.safetyLockout && <p className="text-rose-700 text-sm">Khóa an toàn đang bật. Kiểm tra lý do trong lịch sử; nếu bồn cạn, đưa phao về có nước trước khi reset. Chỉ reset khi thiết bị báo OFF mới.</p>}
      <div className="flex items-center gap-3">
        <button type="button" role="switch" aria-label="Công tắc từ xa" aria-checked={state === 'ON'}
          disabled={state === 'UNKNOWN' || (state === 'OFF' ? !canOn : !available || !status?.controlEnabled || sending)}
          onClick={() => void send(state === 'ON' ? 'OFF' : 'ON')}
          className={`relative w-14 h-8 rounded-full transition-colors disabled:opacity-40 ${state === 'ON' ? 'bg-emerald-600' : 'bg-slate-300'}`}>
          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${state === 'ON' ? 'left-7' : 'left-1'}`} />
        </button><span className="font-semibold">Công tắc từ xa{sending || pending ? ' · Đang chờ xác nhận' : ''}</span>
      </div>
      <fieldset className="border rounded-lg p-4 space-y-3">
        <legend className="px-2 font-semibold">Hẹn giờ tắt</legend>
        <label className="flex items-center gap-2"><input type="checkbox" checked={timerEnabled} onChange={event => setTimerEnabled(event.target.checked)} />Tự tắt sau thời gian cài đặt</label>
        {timerEnabled && <div className="flex gap-2 items-center">
          <label>Thời gian<input aria-label="Thời gian hẹn tắt" type="number" min={1} max={unit === 'minutes' ? 60 : 3600} step={1} value={Number.isFinite(duration) ? duration : ''} onChange={event => setDuration(event.target.valueAsNumber)} className="ml-2 border rounded-lg px-3 py-2 w-28" /></label>
          <select aria-label="Đơn vị thời gian" value={unit} onChange={event => { setUnit(event.target.value as 'seconds' | 'minutes'); setDuration(1); }} className="border rounded-lg px-3 py-2"><option value="seconds">Giây</option><option value="minutes">Phút</option></select>
        </div>}
        <p className="text-sm text-slate-500">{timerEnabled ? 'Tối đa 60 phút. Cài đặt áp dụng cho lần bật tiếp theo.' : 'Bật bằng công tắc và tắt thủ công; giới hạn an toàn tự tắt sau 60 phút.'}</p>
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={!canOn} onClick={() => void send('ON')} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-40">Bật đèn</button>
        <button type="button" disabled={!status?.controlEnabled || sending} onClick={() => void send('OFF')} className="bg-rose-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-40">Gửi lệnh tắt</button>
        <button type="button" disabled={ownerBlocked || unknown.length>0 || (protectedProfile&&!intentFresh) || !protocolReady || !fresh || state !== 'OFF' || !status?.safetyLockout || !status?.controlEnabled || sending} onClick={() => void send('RESET_LOCKOUT')} className="border px-4 py-2 rounded-lg disabled:opacity-40">Reset khóa</button>
      </div>
      <p className="text-xs text-slate-500 flex gap-2"><ShieldCheck className="w-4 h-4" /> Bật tối đa 60 phút; chưa có status mới hoặc ACK thì không tự coi lệnh đã thực thi.</p>
      {notice&&<p role="status">{notice}</p>}
      {protectedProfile&&!intentFresh&&<p className="text-amber-800 text-sm">Chưa có phiên xác nhận mới. Bật/reset cần đọc lại; yêu cầu tắt vẫn có thể gửi.</p>}
      {unknown.map(r=><p key={r.requestId} className="text-sm">Chưa đối chiếu {r.action} · {r.requestId} <button type="button" className="underline" disabled={sending} onClick={()=>void reconcile(r)}>Đọc yêu cầu {r.requestId}</button></p>)}
      {error && <p role="alert" className="text-rose-700 text-sm">{error}</p>}
    </section>
    <section className="bg-white border rounded-xl p-4 space-y-3">
      <h2 className="font-semibold">Lịch sử trạng thái thiết bị</h2>
      <p className="text-xs text-slate-500">Lý do do thiết bị báo. Mất kết nối chỉ được báo sau khi thiết bị nối lại; dữ liệu cũ có thể chưa có lý do.</p>
      {!stateHistory.length && <p className="text-sm text-slate-500">Chưa có thay đổi được ghi nhận.</p>}
      {stateHistory.map(change => <div key={change.id} className="border-t pt-2 text-sm flex flex-wrap gap-3">
        <time>{new Date(change.observedAt).toLocaleString('vi-VN')}</time>
        <span>{change.reportedState === 'ON' ? 'Bật' : 'Tắt'}</span>
        <span>{change.stateReason ? reasons[change.stateReason] ?? 'Chưa xác định lý do' : 'Chưa có lý do'}</span>
        <span>{change.safetyLockout ? 'Có khóa an toàn' : 'Không khóa'}</span>
        <span>{change.changeType === 'NEW_BOOT' ? 'Thiết bị khởi động lại' : change.changeType === 'FIRST_STATUS' ? 'Trạng thái đầu tiên' : 'Trạng thái thay đổi'}</span>
      </div>)}
    </section>
    <section className="bg-white border rounded-xl overflow-x-auto"><h2 className="p-4 font-semibold border-b">20 lệnh gần nhất</h2><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Thời điểm</th><th className="p-3">Lệnh</th><th className="p-3">Kết quả</th><th className="p-3">ACK / lỗi</th></tr></thead><tbody>{commands.map(command => <tr key={command.commandId} className="border-t"><td className="p-3">{new Date(command.issuedAt).toLocaleString('vi-VN')}</td><td className="p-3">{command.action}{command.durationSeconds ? ` ${command.durationSeconds}s` : ''}</td><td className="p-3">{command.errorCode==='MQTT_UNAVAILABLE'?'Chưa gửi: MQTT chưa sẵn sàng':labels[command.state] ?? command.state}</td><td className="p-3">{command.errorCode ?? command.reportedState ?? '—'}</td></tr>)}{!commands.length && <tr><td colSpan={4} className="p-8 text-center text-slate-400">Chưa có lệnh.</td></tr>}</tbody></table></section>
  </div>;
};
