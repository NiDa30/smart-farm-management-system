import React, { useEffect, useRef, useState } from 'react';
import { History, RefreshCw } from 'lucide-react';
import { fetchEvents, IoTEvent } from './eventApi';

const types: Record<IoTEvent['type'], string> = { VALVE_ALERT_OPENED:'Phát sinh cảnh báo van', VALVE_ALERT_CLEARED:'Cảnh báo van trở về bình thường', VALVE_ALERT_ACKNOWLEDGED:'Xác nhận đã xem cảnh báo van', ALERT_OPENED:'Phát sinh cảnh báo', ALERT_CLEARED:'Cảnh báo trở về bình thường', ALERT_ACKNOWLEDGED:'Xác nhận đã xem cảnh báo', COMMAND_CREATED:'Tạo lệnh điều khiển', COMMAND_ACK:'Thiết bị xác nhận lệnh', DEVICE_STATE:'Thay đổi trạng thái thiết bị', RULE_STARTED:'Bắt đầu lần chạy quy tắc' };
const labels: Record<string,string> = { POSITION_FAULT:'Lỗi vị trí van', OPEN:'Đang cảnh báo', ACKNOWLEDGED:'Đã xem cảnh báo', CLEARED:'Đã bình thường', PENDING:'Đang gửi', SENT:'Đã gửi, chờ ACK', EXECUTED:'Đã xác nhận thực thi', FAILED:'Thiết bị từ chối', TIMED_OUT:'Quá hạn ACK', PUBLISH_UNCERTAIN:'Chưa xác nhận gửi', ON:'Bật', OFF:'Tắt', RESET_LOCKOUT:'Reset khóa', LOW_SOIL:'Độ ẩm đất thấp', HIGH_TEMPERATURE:'Nhiệt độ cao', BOOT:'Khởi động', COMMAND_ON:'Nhận lệnh bật', COMMAND_OFF:'Tắt thủ công', LOCKOUT_RESET:'Reset khóa', TIMER_EXPIRED:'Hết thời gian hẹn', CONNECTION_LOST:'Mất kết nối khi đang bật', DEVICE_FAULT:'Lỗi thiết bị',WATER_LOW:'Bồn cạn nước hoặc đứt dây phao',FLOW_LOW:'Thiếu lưu lượng tại bộ điều khiển (thiết bị báo)',FLOW_SENSOR_FAULT:'Tín hiệu lưu lượng tại bộ điều khiển lỗi (thiết bị báo)', FIRST_STATUS:'Trạng thái đầu tiên', NEW_BOOT:'Khởi động lại', STATE_CHANGED:'Trạng thái thay đổi', COMMAND_SENT:'Đã gửi lệnh bật', COMMAND_UNCONFIRMED:'Chưa xác nhận lệnh', STOP_UNCONFIRMED:'Chưa xác nhận tắt', STOP_SENT:'Đã gửi lệnh tắt', REPORTED_OFF:'Thiết bị đã báo OFF', DISPATCH_FAILED:'Không xác nhận gửi lệnh' };
const display = (value: string | null) => value ? labels[value] ?? value : '—';
const time = (value: string | null) => value ? new Date(value).toLocaleString('vi-VN') : 'Không được lưu';
export const IoTEventLogger: React.FC = () => {
  const [category,setCategory]=useState(''), [device,setDevice]=useState(''), [hours,setHours]=useState(24);
  const [refresh,setRefresh]=useState(0), [items,setItems]=useState<IoTEvent[]>([]);
  const [next,setNext]=useState<string|null>(null), [loading,setLoading]=useState(true), [error,setError]=useState('');
  const [range,setRange]=useState<{from:string;to:string}|null>(null);
  const [selection,setSelection]=useState<IoTEvent|null>(null);
  const generation=useRef(0), request=useRef<AbortController|null>(null);
  const query = (from:string,to:string,cursor?:string) => {
    const params=new URLSearchParams({from,to,limit:'50'});
    if(category) params.set('category',category); if(device.trim()) params.set('deviceId',device.trim());
    if(cursor) params.set('cursor',cursor); return params;
  };
  useEffect(()=>{
    const id=++generation.current; request.current?.abort();
    const controller=new AbortController();request.current=controller;
    const timeout=setTimeout(()=>controller.abort(),10000);
    const to=new Date().toISOString(),from=new Date(Date.now()-hours*3600000).toISOString();
    setItems([]);setNext(null);setRange(null);setSelection(null);setLoading(true);setError('');
    fetchEvents(query(from,to),controller.signal).then(page=>{
      if(id===generation.current) {setItems(page.items);setNext(page.nextCursor);setRange({from:page.from,to:page.to});}
    }).catch(()=>{if(id===generation.current)setError('Không tải được nhật ký. Kiểm tra backend, mã thiết bị và thử Làm mới.');})
      .finally(()=>{clearTimeout(timeout);if(id===generation.current)setLoading(false);});
    return()=>{generation.current++;controller.abort();clearTimeout(timeout);};
  // Query filters deliberately reset the page and abort any previous request.
  },[category,device,hours,refresh]);
  const more=async()=>{
    if(!next || !range || loading)return;
    const id=++generation.current; const controller=new AbortController();request.current=controller;
    const timeout=setTimeout(()=>controller.abort(),10000);setLoading(true);setError('');
    try {
      const page=await fetchEvents(query(range.from,range.to,next),controller.signal);
      if(id===generation.current) {setItems(previous=>[...new Map([...previous,...page.items].map(item=>[item.id,item])).values()]);setNext(page.nextCursor);}
    } catch {if(id===generation.current)setError('Không tải được trang tiếp. Dữ liệu đã tải được giữ lại; bạn có thể thử lại.');}
    finally {clearTimeout(timeout);if(id===generation.current)setLoading(false);}
  };
  // Abort pagination too when leaving the page.
  useEffect(()=>()=>request.current?.abort(),[]);
  return <div className="max-w-6xl mx-auto space-y-4">
    <h1 className="text-xl font-bold flex gap-2 items-center"><History />Nhật ký sự kiện IoT</h1>
    <p className="text-sm text-slate-600">Dữ liệu PostgreSQL: cảnh báo, lệnh/ACK, trạng thái thiết bị và lần chạy tưới. Kết quả lệnh và lần chạy là trạng thái mới nhất đang lưu, không phải lịch sử mọi lần chuyển trạng thái.</p>
    <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-4 items-end">
      <label>Loại sự kiện<select aria-label="Loại sự kiện" value={category} onChange={e=>setCategory(e.target.value)} className="block border rounded p-2"><option value="">Tất cả</option><option value="ALERT">Cảnh báo</option><option value="COMMAND">Lệnh và ACK</option><option value="DEVICE">Trạng thái thiết bị</option><option value="RULE">Lần chạy quy tắc</option></select></label>
      <label>Mã thiết bị<input aria-label="Mã thiết bị" placeholder="Tất cả / ENV01 / PUMP01" value={device} onChange={e=>setDevice(e.target.value.toUpperCase())} className="block border rounded p-2" /></label>
      <label>Khoảng thời gian<select aria-label="Khoảng thời gian" value={hours} onChange={e=>setHours(Number(e.target.value))} className="block border rounded p-2"><option value={1}>1 giờ</option><option value={24}>24 giờ</option><option value={168}>7 ngày</option></select></label>
      <button onClick={()=>setRefresh(v=>v+1)} className="border rounded p-2 flex gap-2"><RefreshCw size={18} />Làm mới</button>
    </div>
    {range && <p className="text-xs text-slate-500">Từ {time(range.from)} đến {time(range.to)} · Đã tải {items.length} bản ghi. Nhấn Làm mới để lấy sự kiện mới; giờ hiển thị theo máy đang xem.</p>}
    {error && <p role="alert" className="text-rose-700">{error}</p>}
    {loading && <p role="status">Đang tải nhật ký…</p>}
    {!loading && !error && !items.length && <p>Chưa có sự kiện trong bộ lọc này.</p>}
    {!!items.length && <div className="bg-white border rounded-xl overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th className="p-3">Thời điểm</th><th>Thiết bị</th><th>Sự kiện</th><th>Kết quả đang lưu</th><th>Chi tiết</th></tr></thead><tbody>{items.map(item=><tr key={item.id} className="border-t"><td className="p-3">{time(item.eventAt)}<span className="block text-xs text-slate-500">{item.sourceAt ? 'Giờ thiết bị' : 'Giờ backend'}</span></td><td>{item.deviceId}</td><td>{types[item.type]}{item.action && ` · ${display(item.action)}`}</td><td>{display(item.state)}</td><td><button className="text-emerald-700 underline p-2" aria-label={`Chi tiết ${item.id}`} onClick={()=>setSelection(item)}>Xem</button></td></tr>)}</tbody></table></div>}
    {next && <button disabled={loading} onClick={()=>void more()} className="border rounded px-4 py-2 disabled:opacity-40">Tải thêm</button>}
    {selection && <section aria-label="Chi tiết sự kiện" className="border bg-white rounded-xl p-4 space-y-2 text-sm">
      <div className="flex justify-between"><h2 className="font-semibold">{types[selection.type]}</h2><button onClick={()=>setSelection(null)}>Đóng chi tiết</button></div>
      <p>Thiết bị: {selection.deviceId} · {display(selection.action)} · {display(selection.state)}</p>
      <p>Thời gian thiết bị: {time(selection.sourceAt)}</p><p>Thời gian backend ghi nhận: {time(selection.recordedAt)}</p>
      <p>Lý do: {display(selection.reason)}{selection.value!==null && ` · Giá trị ${selection.value}${selection.reason==='LOW_SOIL'?'%':selection.reason==='HIGH_TEMPERATURE'?'°C':''}`}</p>
      <p className="break-all">Command ID: {selection.commandId ?? 'Không có liên kết được lưu'}</p><p>Run ID: {selection.runId ?? 'Không có liên kết được lưu'}</p>
      <p className="text-xs text-slate-500">Không suy ra liên kết từ thời gian gần nhau. Lệnh được tạo hoặc đã gửi chưa chứng minh GPIO đã áp dụng; cần đối chiếu ACK và trạng thái thiết bị.</p>
    </section>}
  </div>;
};
