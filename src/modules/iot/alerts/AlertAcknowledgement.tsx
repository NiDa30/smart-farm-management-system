import React,{useState} from 'react';
import {type SensorAlert} from './alertApi';
interface Props {
  alert:Pick<SensorAlert,'id'|'clearedAt'|'acknowledgedAt'|'acknowledgementNote'>;title:string;busy:boolean;unavailable:boolean;needsCheck:boolean;error:string;success:boolean;
  onSave:(note:string)=>Promise<boolean>;onCheck:()=>void;onClose:()=>void;
}
export const AlertAcknowledgement:React.FC<Props>=({alert,title,busy,unavailable,needsCheck,error,success,onSave,onCheck,onClose})=>{
  const [note,setNote]=useState('');
  const unsaved=!!note.trim()&&note.trim()!==alert.acknowledgementNote;
  return <section aria-label="Xác nhận cảnh báo" className="bg-white border border-emerald-300 rounded-xl p-5 space-y-3">
    <div className="flex justify-between gap-3"><h2 className="font-semibold">{title} · #{alert.id}</h2><button disabled={busy} onClick={onClose} className="border rounded px-3 py-1">Đóng chi tiết</button></div>
    <p>Điều kiện cảm biến: {alert.clearedAt?'Đã trở về bình thường':'Đang cảnh báo'}</p>
    <p>Xác nhận đã xem: {alert.acknowledgedAt?new Date(alert.acknowledgedAt).toLocaleString('vi-VN'):'Chưa xem'}</p>
    {alert.acknowledgedAt&&<p className="whitespace-pre-wrap break-words">Ghi chú đã lưu: {alert.acknowledgementNote??'Không có ghi chú'}</p>}
    {!alert.acknowledgedAt&&!alert.clearedAt&&<form className="space-y-3" onSubmit={event=>{event.preventDefault();if(busy||unavailable||needsCheck||note.length>500)return;void onSave(note.trim()).then(saved=>{if(saved)setNote('');});}}>
      <label className="block text-sm">Ghi chú khi xác nhận (không bắt buộc, tối đa 500 ký tự)
        <textarea aria-label="Ghi chú khi xác nhận" value={note} maxLength={500} disabled={busy||needsCheck||unavailable} onChange={event=>setNote(event.target.value)} rows={3} className="block w-full border rounded p-2 mt-1" />
      </label>
      <button type="submit" disabled={busy||unavailable||needsCheck} className="bg-emerald-700 text-white rounded px-4 py-2 disabled:opacity-40">Xác nhận đã xem</button>
    </form>}
    {(alert.acknowledgedAt||alert.clearedAt)&&unsaved&&<div className="text-sm text-amber-800"><p>Ghi chú đang soạn chưa được lưu. Cảnh báo đã được xác nhận hoặc trở về bình thường trong lúc bạn thao tác.</p><p className="whitespace-pre-wrap break-words">Bản nháp: {note}</p></div>}
    {success&&<p className="text-emerald-700">Đã lưu xác nhận đã xem.</p>}
    {error&&<p role="alert" className="text-rose-700">{error}</p>}
    <button disabled={busy} onClick={onCheck} className="border rounded px-3 py-2 disabled:opacity-40">Đối chiếu trạng thái</button>
    <p className="text-sm text-slate-500">Xác nhận không đóng cảnh báo, không tắt quy tắc hoặc relay. Ghi chú đầu tiên được giữ nguyên; bản này chưa ghi danh tính người xác nhận.</p>
  </section>;
};
