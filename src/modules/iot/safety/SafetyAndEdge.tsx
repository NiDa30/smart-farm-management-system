import React, { useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { parseSafety, reasonLabels, ruleLabels, safetyFreshness, type SafetySnapshot } from './safetyApi';
const time=(value:string|null)=>value?new Date(value).toLocaleString('vi-VN'):'Chưa có';
const freshnessLabels={EMPTY:'Chưa có dữ liệu',FRESH:'Dữ liệu mới (15 giây)',STALE:'Dữ liệu đã cũ',CLOCK_SKEW:'Lệch thời gian'};
const mqttLabels={DISABLED:'Backend chưa bật MQTT',STARTING:'Backend đang kết nối MQTT',CONNECTED:'Backend đã kết nối MQTT',DISCONNECTED:'Backend mất kết nối MQTT',STOPPED:'Backend đã ngừng MQTT'};
const commandLabels:Record<string,string>={PENDING:'Chờ gửi',SENT:'Đã gửi, chưa xác nhận thực thi',PUBLISH_UNCERTAIN:'Chưa xác nhận publish',FAILED:'Thiết bị báo thất bại',TIMED_OUT:'Quá hạn xác nhận'};
const changeLabels:Record<string,string>={FIRST_STATUS:'Trạng thái đầu tiên',NEW_BOOT:'Phiên khởi động mới',STATE_CHANGED:'Trạng thái / lý do thay đổi'};

export const SafetyPanel:React.FC<{navigate:(route:string)=>void}>=({navigate})=>{
  const [snapshot,setSnapshot]=useState<SafetySnapshot|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const [refresh,setRefresh]=useState(0),[elapsed,setElapsed]=useState(0),[loadedAt,setLoadedAt]=useState(0);
  useEffect(()=>{const clock=setInterval(()=>setElapsed(performance.now()),1000);return()=>clearInterval(clock);},[]);
  useEffect(()=>{
    let active=true;let next:ReturnType<typeof setTimeout>;let controller:AbortController;
    const poll=async()=>{
      controller=new AbortController();const requestedAt=performance.now();const timeout=setTimeout(()=>controller.abort(),5000);
      try{
        const response=await fetch('/api/v1/safety',{signal:controller.signal,cache:'no-store'});
        if(!response.ok)throw new Error();
        const value=parseSafety(await response.json());
        if(active){setSnapshot(value);setLoadedAt(requestedAt);setElapsed(performance.now());setError('');}
      }catch{if(active)setError('Không tải được trạng thái an toàn. Các bản ghi giữ lại thuộc lần tải trước; chưa thể kết luận thiết bị mất mạng.');}
      finally{clearTimeout(timeout);if(active){setLoading(false);next=setTimeout(poll,3000);}}
    };void poll();return()=>{active=false;controller?.abort();clearTimeout(next);};
  },[refresh]);
  const current=!!snapshot&&!error&&elapsed-loadedAt<10000;
  const now=snapshot?Date.parse(snapshot.asOf)+Math.max(0,elapsed-loadedAt):0;
  const sensorFresh=safetyFreshness(snapshot?.sensor??null,now),relayFresh=safetyFreshness(snapshot?.relay??null,now);
  const relayCurrent=current&&relayFresh==='FRESH';
  return <div className="max-w-6xl mx-auto space-y-4 pb-8">
    <header className="flex flex-wrap gap-3 justify-between items-center">
      <h1 className="text-xl font-bold flex gap-2 items-center"><ShieldCheck className="text-emerald-700" />An toàn Fail-Safe & Edge</h1>
      <button onClick={()=>setRefresh(v=>v+1)} className="flex gap-2 border rounded px-3 py-2"><RefreshCw size={18} />Làm mới</button>
    </header>
    <section className="bg-white border rounded-xl p-4 space-y-2" aria-label="Kết nối backend">
      <p role="status">{current&&snapshot?mqttLabels[snapshot.mqtt.state]:loading&&!snapshot?'Đang tải an toàn…':'Chưa xác định kết nối backend'}</p>
      <p className="text-sm">Chỉ đọc dữ liệu FARM001 · ENV01 → PUMP01. Các thông tin dưới đây giúp đối chiếu vận hành, không phải xác nhận toàn hệ thống đang an toàn hoặc bơm vật lý đang chạy.</p>
      {snapshot&&<p className="text-xs text-slate-500">Lần tải thành công: {time(snapshot.asOf)} · Tự tải mỗi 3 giây. Khi API lỗi, số liệu còn lại chỉ là lịch sử.</p>}
      {error&&<p role="alert" className="text-rose-700">{error}</p>}
    </section>
    {snapshot&&<>
      <section className="bg-white border rounded-xl p-4 space-y-2" aria-label="Liên động van tại bơm">
        <h2 className="font-semibold">Phản hồi van cục bộ tại PUMP01</h2>
        {!snapshot.relay?.valveInterlock?<p>Chưa có bằng chứng thiết bị báo hỗ trợ liên động van.</p>:<>
          <p className="font-semibold">Bằng chứng hiện tại: {!relayCurrent?'Chưa xác định':snapshot.relay.valveInterlock.fault?'Thiết bị báo đã khóa do liên động van':snapshot.relay.valveInterlock.state==='OPEN'?'Thiết bị báo có phản hồi OPEN':'Chưa có phản hồi mở van hợp lệ'}</p>
          <p>Bản báo đã lưu: {snapshot.relay.valveInterlock.state} · Mô phỏng · phiên bản {snapshot.relay.valveInterlock.version}</p>
          <p>Lỗi lưu: {snapshot.relay.valveInterlock.fault?reasonLabels[snapshot.relay.valveInterlock.fault]:'Không có lỗi liên động van trong mẫu'}</p>
          <p className="text-sm">Giờ nguồn: {time(snapshot.relay.observedAt)} · Backend nhận: {time(snapshot.relay.receivedAt)}</p>
        </>}
        <p className="text-sm text-slate-600">Hai công tắc độc lập trên board bơm, GPIO32 CLOSED / GPIO33 OPEN. Không lấy phản hồi từ GPIO bơm, ACK hoặc MQTT của van ở board khác. Khôi phục công tắc không tự bật lại; cần đối chiếu rồi reset khóa. Phản hồi này chưa xác nhận van cơ khí, nước thực hoặc quyền điều phối một nhánh cụ thể.</p>
      </section>
      <div className="grid md:grid-cols-2 gap-4">
        <section className="bg-white border rounded-xl p-4 space-y-2" aria-label="Relay và khóa an toàn">
          <h2 className="font-semibold">Relay PUMP01 và khóa an toàn</h2>
          <p className="font-semibold">Trạng thái hiện tại: {relayCurrent?snapshot.relay!.reportedState:'Chưa xác định'}</p>
          <p>Khóa an toàn hiện tại: {relayCurrent?(snapshot.relay!.safetyLockout?'Thiết bị báo đang khóa':'Thiết bị báo không khóa'):'Chưa xác định'}</p>
          <p className="text-sm">Độ mới bản báo: {freshnessLabels[relayFresh]}{!current?' · Chưa tải được trạng thái mới':''}</p>
          {snapshot.relay?<div className="text-sm text-slate-600 space-y-1">
            <p>Bản báo đã lưu: {snapshot.relay.reportedState} · Khóa: {snapshot.relay.safetyLockout?'Có':'Không'}</p>
            <p>Lý do thiết bị báo: {snapshot.relay.stateReason?reasonLabels[snapshot.relay.stateReason]:'Chưa có lý do trong bản tin'}</p>
            <p>Giờ nguồn: {time(snapshot.relay.observedAt)} · Backend nhận: {time(snapshot.relay.receivedAt)}</p>
          </div>:<p>Chưa nhận trạng thái relay; không suy ra OFF hoặc không khóa.</p>}
        </section>
        <section className="bg-white border rounded-xl p-4 space-y-2" aria-label="Điều kiện quan sát">
          <h2 className="font-semibold">Điều kiện quan sát tại backend</h2>
          <p>Chế độ điều khiển: {current?(snapshot.controlEnabled?'Đã bật trên backend':'Chưa bật trên backend'):'Chưa xác định'}</p>
          <p>Kênh gửi lệnh MQTT: {current?(snapshot.controlTransportConnected?'Backend báo đã kết nối':'Backend chưa sẵn sàng gửi'):'Chưa xác định'}</p>
          <p>ENV01: {freshnessLabels[sensorFresh]}{!current?' · Bản lưu trước':''}</p>
          <p>Độ ẩm đất đã lưu: {snapshot.sensor?snapshot.sensor.soilMoisture.toLocaleString('vi-VN',{maximumFractionDigits:1})+'%':'—'}</p>
          {snapshot.sensor&&<p className="text-xs text-slate-500">Giờ đo: {time(snapshot.sensor.observedAt)} · Nhận: {time(snapshot.sensor.receivedAt)}</p>}
          <p className="text-xs text-slate-500">Trang này dùng ngưỡng mới 15 giây cho cả cảm biến và relay như điều kiện tưới; không suy online/offline vật lý từ thiếu dữ liệu. API điều khiển vẫn kiểm tra lại khi gửi lệnh.</p>
        </section>
      </div>
      <section className="bg-white border rounded-xl p-4 space-y-2" aria-label="Quy tắc và lệnh đang theo dõi">
        <h2 className="font-semibold">Quy tắc và lệnh đang theo dõi</h2>
        <p>Quy tắc hiện tại: {current?(snapshot.rule.enabled?'Đang bật':'Đang tắt'):'Chưa xác định'}</p>
        <p>Kết quả tại lần tải: {ruleLabels[snapshot.rule.lastResult]??snapshot.rule.lastResult} · Mẫu khô: {snapshot.rule.lowCount}/2</p>
        <p className="text-sm">Cài đặt v{snapshot.settings.revision}: dưới {snapshot.settings.dryThreshold}% / tắt từ {snapshot.settings.wetThreshold}% · bật {snapshot.settings.durationSeconds}s · nghỉ {snapshot.settings.cooldownSeconds}s.</p>
        {snapshot.rule.cooldownUntil&&<p>Nghỉ đến mốc đã lưu: {time(snapshot.rule.cooldownUntil)}</p>}
        <p className="break-all">Lệnh bật do quy tắc đang theo dõi: {snapshot.rule.activeCommand??'Không có lệnh ON được rule theo dõi'}</p>
        <p>Lệnh chưa rõ kết quả đã lưu: {snapshot.queue.unresolved} · Đã quá hạn đối chiếu: {snapshot.queue.overdue}</p>
        <p className="text-xs text-slate-500">Tổng số lấy từ toàn bộ lịch sử lệnh, độc lập với danh sách gần nhất. Quá hạn đối chiếu khi hết hạn lệnh hơn 5 giây. Đọc trang không tự thử lại lệnh. Không có lần tưới đang theo dõi không chứng minh relay đã OFF.</p>
      </section>
      <section className="bg-white border rounded-xl p-4 space-y-3" aria-label="Lệnh cần đối chiếu">
        <h2 className="font-semibold">10 lệnh cần đối chiếu gần nhất</h2>
        {!snapshot.recentProblems.length&&<p>Không có lệnh cần đối chiếu trong dữ liệu đã lưu.</p>}
        {snapshot.recentProblems.map(command=><article key={command.commandId} className="border-t pt-2 text-sm space-y-1">
          <p className="font-semibold">{command.action} · {commandLabels[command.state]??command.state}</p>
          <p className="break-all">commandId: {command.commandId}</p>
          <p>Gửi lúc: {time(command.issuedAt)} · Hạn lệnh: {time(command.expiresAt)}</p>
          <p>Mã lỗi thiết bị: {command.errorCode??'Chưa có mã lỗi'}</p>
        </article>)}
        <p className="text-xs text-slate-500">Gồm lệnh thất bại, quá hạn xác nhận hoặc chưa rõ kết quả gửi. Không tự gửi lại ON; lệnh chưa rõ kết quả không đồng nghĩa relay đã tắt.</p>
      </section>
      <section className="bg-white border rounded-xl p-4 space-y-3" aria-label="Lịch sử relay">
        <h2 className="font-semibold">50 thay đổi relay gần nhất</h2>
        {!snapshot.stateHistory.length&&<p>Chưa có lịch sử relay.</p>}
        {snapshot.stateHistory.map(item=><article key={item.id} className="border-t pt-2 text-sm space-y-1">
          <p className="font-semibold">{item.reportedState} · {item.safetyLockout?'Khóa an toàn':'Không khóa'} · {item.stateReason?reasonLabels[item.stateReason]:'Lý do chưa được ghi nhận'}</p>
          <p>Giờ nguồn: {time(item.observedAt)} · Backend nhận: {time(item.receivedAt)}</p>
          <p className="text-slate-500">{changeLabels[item.changeType]??item.changeType} · Bản ghi #{item.id}</p>
        </article>)}
        <p className="text-xs text-slate-500">Lý do do thiết bị báo, không suy ra từ nút đã bấm. Mất kết nối có thể chỉ được ghi sau khi thiết bị nối lại; không coi thiếu bản ghi là chưa từng xảy ra lỗi. Giờ nhận lịch sử là lúc backend ghi thay đổi.</p>
      </section>
    </>}
    <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm space-y-2" aria-label="Giới hạn đang triển khai">
      <h2 className="font-semibold">Giới hạn đang triển khai</h2>
      <p>Mã firmware có boot OFF, timer, phao cạn, bảo vệ lưu lượng và liên động van bật theo cấu hình riêng. Metadata liên động van là bản báo của thiết bị, chưa phải xác minh việc bảo vệ thực sự tác động GPIO.</p>
      <p>Lý do FLOW do bộ điều khiển tự báo, chưa chứng minh hiệu chuẩn hoặc nước thật. Telemetry WATER riêng chưa điều khiển PUMP01. OTA, NVS và bảo vệ trên phần cứng thật chưa nghiệm thu; trạng thái relay không chứng minh nước đã chảy.</p>
      <p>Đặt lại khóa hoặc gửi OFF qua trang Điều khiển Actuator để theo dõi ACK và status mới; trang này không tự gửi lệnh.</p>
    </section>
    <nav aria-label="Màn hình liên quan" className="flex flex-wrap gap-3">
      <button className="border rounded px-3 py-2" onClick={()=>navigate('/iot/control')}>Mở Điều khiển Actuator</button>
      <button className="border rounded px-3 py-2" onClick={()=>navigate('/iot/automation')}>Mở Quy tắc Tự động hóa</button>
      <button className="border rounded px-3 py-2" onClick={()=>navigate('/iot/events')}>Mở Nhật ký sự kiện</button>
    </nav>
  </div>;
};
export const SafetyAndEdge:React.FC=()=>{const {navigate}=useApp();return <SafetyPanel navigate={navigate}/>;};
