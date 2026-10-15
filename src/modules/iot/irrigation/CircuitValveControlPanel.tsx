import React,{useEffect,useRef,useState} from 'react';
import {commandLabels} from './valveApi';
import {circuitLabels,type CircuitConfig} from './circuitApi';
import {parseCircuitControl,parseCircuitCommand,matchesCircuitRequest,sameControlConfig,controlEligible,freshCircuitStatus,type CircuitControl,type CircuitRequest} from './circuitControlApi';
export function CircuitValveControlPanel({circuitId,onBack}:{circuitId:string;onBack:()=>void}){
 const [data,setData]=useState<CircuitControl|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[epoch,setEpoch]=useState(0),[seconds,setSeconds]=useState(5),[unknown,setUnknown]=useState<{request:CircuitRequest;config:CircuitConfig}[]>([]),[,tick]=useState(0);
 const mounted=useRef(true),flight=useRef(false),operation=useRef<AbortController|null>(null),clock=useRef({floor:0,at:0,received:-Infinity});
 const api='/api/v1/irrigation-circuits/'+encodeURIComponent(circuitId)+'/control';
 useEffect(()=>{mounted.current=true;const t=setInterval(()=>tick(v=>v+1),500);return()=>{mounted.current=false;operation.current?.abort();clearInterval(t);};},[]);
 useEffect(()=>{if(busy)return;let alive=true,running=false,active:AbortController|null=null;
  async function load(){if(running)return;running=true;const a=new AbortController();active=a;const start=performance.now(),timer=setTimeout(()=>a.abort(),7000);try{const r=await fetch(api,{signal:a.signal,cache:'no-store'});if(!r.ok)throw new Error();const v=parseCircuitControl(await r.json(),circuitId);if(!alive||flight.current)return;const now=performance.now(),old=clock.current;clock.current={floor:Math.max(Date.parse(v.asOf)+now-start,old.floor+Math.max(0,now-old.at)),at:now,received:now};setData(v);setError('');}catch{if(alive)setError('Không đọc được điều khiển nhánh. Dữ liệu có thể cũ; chưa cho phép gửi lệnh.');}finally{clearTimeout(timer);running=false;}}
  void load();const t=setInterval(()=>void load(),2000);return()=>{alive=false;active?.abort();clearInterval(t);};
 },[api,circuitId,busy,epoch]);
 const now=clock.current.floor+Math.max(0,performance.now()-clock.current.at),fresh=!!data&&!error&&performance.now()-clock.current.received<10000&&now-Date.parse(data.asOf)<10000;
 const matching=!!data?.latest&&sameControlConfig(data.config,data.latest.config),known=fresh&&matching&&freshCircuitStatus(data?.latest??null,now);
 const canClose=!!data&&fresh&&data.enabled&&data.connected&&controlEligible(data.config)&&matching&&!busy;
 const canOpen=canClose&&known&&!!data?.readyToOpen&&unknown.length===0&&Number.isInteger(seconds)&&seconds>=1&&seconds<=30;
 async function perform(work:(signal:AbortSignal)=>Promise<void>){if(flight.current)return;flight.current=true;setBusy(true);clock.current.received=-Infinity;const a=new AbortController();operation.current=a;const timer=setTimeout(()=>a.abort(),10000);try{await work(a.signal);}finally{clearTimeout(timer);flight.current=false;if(mounted.current){setBusy(false);setEpoch(v=>v+1);}}}
 async function send(action:'OPEN'|'CLOSE'){
  if(!data?.latest||(action==='OPEN'?!canOpen:!canClose))return;
  const config=data.config,request:CircuitRequest={requestId:crypto.randomUUID(),action,durationSeconds:action==='OPEN'?seconds:null,expectedBootId:data.latest.bootId,expectedRevision:config.revision,expectedZoneRevision:config.zoneRevision,requestedAt:new Date(now).toISOString()};
  await perform(async signal=>{try{const r=await fetch(api+'/commands',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal});if([400,403,404,409,503].includes(r.status)){if(mounted.current)setMessage('Chưa gửi lệnh. Đọc lại profile, kết nối, phiên khởi động và vị trí đóng của đúng nhánh.');return;}if(r.status!==202)throw new Error();const c=parseCircuitCommand(await r.json());if(!matchesCircuitRequest(c,request,config))throw new Error();if(mounted.current)setMessage('Đã ghi nhận lệnh '+action+' #'+c.ordinal+'. '+commandLabels[c.state]+'. Chờ trạng thái thiết bị mới để xác nhận GPIO và vị trí.');}
   catch{if(mounted.current){setUnknown(v=>[...v,{request,config}]);setMessage('Chưa rõ kết quả gửi. Giữ mã yêu cầu để đối chiếu; không tự gửi lại hoặc coi van đã đổi trạng thái.');}}});
 }
 async function reconcile(item:typeof unknown[number]){await perform(async signal=>{try{const r=await fetch(api+'/commands/'+item.request.requestId,{signal,cache:'no-store'});if(!r.ok)throw new Error();const c=parseCircuitCommand(await r.json());if(!matchesCircuitRequest(c,item.request,item.config))throw new Error();if(mounted.current){setUnknown(v=>v.filter(x=>x.request.requestId!==item.request.requestId));setMessage('Đã đối chiếu #'+c.ordinal+': '+commandLabels[c.state]+'. Không gửi lại lệnh.');}}catch{if(mounted.current)setMessage('Chưa đối chiếu được yêu cầu. Không tự gửi lại; có thể gửi Đóng van nếu cần và đọc trạng thái mới.');}});}
 return <section className="max-w-5xl mx-auto space-y-4" aria-label="Điều khiển LED theo nhánh">
  <button className="underline" disabled={busy} onClick={onBack}>Quay lại danh sách nhánh</button>
  <h1 className="text-xl font-bold">Điều khiển LED nhánh {circuitId}</h1>
  <p className="bg-amber-50 rounded p-3">Mô phỏng một van trên một ESP32 riêng, GPIO26. Mở 1–30 giây, tự đóng khi hết giờ hoặc phát hiện mất kết nối. Không nối van vật lý hoặc bơm chung; chưa điều phối tưới nhiều vùng.</p>
  {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  {data&&<><p>{data.config.controllerId} / {data.config.valveId} · {data.config.zoneId} · phiên bản nhánh {data.config.revision}, vùng {data.config.zoneRevision}</p>
   <p>Profile điều khiển: {data.enabled?'Đã bật trên backend':'Chưa bật trên backend'} · MQTT: {data.connected?'Sẵn sàng gửi cho van này':'Chưa sẵn sàng'} · {circuitLabels[data.configurationState]}.</p>
   <p>GPIO thiết bị báo: <strong>{known?(data.latest!.gpioState==='OPEN'?'Đang mở':'Đang đóng'):'Chưa có trạng thái mới khớp cấu hình'}</strong>.</p>
   <p>Vị trí độc lập: {known?circuitLabels[data.latest!.positionFeedback.state]:'Chưa xác định'} · lỗi lưu: {data.latest?.positionFeedback.fault??'Không có trong mẫu lưu'}.</p>
   {data.latest&&<p className="text-sm">Báo lúc {new Date(data.latest.observedAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})} · nhận lúc {new Date(data.latest.receivedAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})} · boot {data.latest.bootId} · lệnh đã thấy #{data.latest.lastOrdinal}. ACK không thay thế mẫu trạng thái hoặc xác nhận nước chảy.</p>}
   <label>Thời hạn mở LED (giây)<input aria-label="Thời hạn mở LED nhánh" type="number" min={1} max={30} step={1} value={Number.isFinite(seconds)?seconds:''} onChange={e=>setSeconds(e.target.valueAsNumber)} className="border p-2 ml-2"/></label>
   <div className="flex gap-3"><button className="border rounded p-2 disabled:opacity-40" disabled={!canOpen} onClick={()=>void send('OPEN')}>Mở LED van có thời hạn</button><button className="border rounded p-2 disabled:opacity-40" disabled={!canClose} onClick={()=>void send('CLOSE')}>Đóng LED van</button><button className="underline" disabled={busy} onClick={()=>setEpoch(v=>v+1)}>Đọc lại điều khiển nhánh</button></div>
   {!data.enabled&&<p>Bật profile CIRCUIT_LED_DEMO theo chương46, cùng firmware và policy riêng. Gói monitor/công cụ đăng ký monitor không tự cấp quyền mở van.</p>}
   {unknown.map(x=><p key={x.request.requestId}>Chưa rõ {x.request.action} · {x.request.requestId} <button className="underline" disabled={busy} onClick={()=>void reconcile(x)}>Đối chiếu lệnh {x.request.requestId}</button></p>)}
   <h2 className="font-bold">20 lệnh gần nhất của nhánh</h2>{!data.commands.length&&<p>Chưa có lệnh theo nhánh.</p>}{data.commands.map(c=><p key={c.commandId}>#{c.ordinal} · {c.config.valveId} · {c.action==='OPEN'?'Mở':'Đóng'} · {commandLabels[c.state]} · {c.errorCode??'—'}</p>)}
  </>}
 </section>;
}
