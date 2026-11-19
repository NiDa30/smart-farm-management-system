import React,{useState} from 'react';
import {guardResultLabels,parseSimulation,stopReasonLabels,type SimulationResult} from './guardsApi';

const time=(v:string)=>new Date(v).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
const duration=(s:number)=>s<120?`${s} giây`:s<7200?`${Math.round(s/60)} phút`:`${(s/3600).toFixed(1)} giờ`;

/** Replays stored ENV01 data through the saved settings, calendar and guards. Sends no command. */
export const RuleSimulationPanel:React.FC<{disabled:boolean}>=({disabled})=>{
  const [hours,setHours]=useState(24),[result,setResult]=useState<SimulationResult|null>(null);
  const [running,setRunning]=useState(false),[error,setError]=useState('');
  const run=async()=>{
    setRunning(true);setError('');
    try{
      const response=await fetch('/api/v1/automation/watering/simulation',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({hours}),signal:AbortSignal.timeout(30000)});
      if(!response.ok)throw new Error(response.status===400?'Cài đặt hiện tại không hợp lệ để mô phỏng.':'Không chạy được mô phỏng.');
      setResult(parseSimulation(await response.json()));
    }catch(reason){setError(reason instanceof Error&&!(reason instanceof DOMException)?reason.message:'Không chạy được mô phỏng.');}
    finally{setRunning(false);}
  };
  const blocked=result?Object.entries(result.blocked):[];
  return <section aria-label="Mô phỏng quy tắc" className="bg-white border rounded-xl p-5 space-y-3">
    <h2 className="font-semibold">Mô phỏng trên dữ liệu đã lưu</h2>
    <p className="text-sm text-slate-500">Chạy lại dữ liệu ENV01 đã lưu qua cài đặt, lịch và điều kiện bổ sung đang lưu, để xem quy tắc sẽ bật bao nhiêu lần. Không gửi lệnh nào.</p>
    <div className="flex flex-wrap gap-2 items-center">
      <label className="text-sm">Khoảng dữ liệu <select aria-label="Khoảng mô phỏng" value={hours} onChange={e=>setHours(Number(e.target.value))} className="border rounded p-2 ml-1">
        <option value={24}>24 giờ qua</option><option value={72}>3 ngày qua</option><option value={168}>7 ngày qua</option></select></label>
      <button disabled={disabled||running} onClick={()=>void run()} className="border rounded px-4 py-2 disabled:opacity-40">{running?'Đang mô phỏng…':'Chạy mô phỏng'}</button>
    </div>
    {disabled&&<p className="text-xs text-slate-500">Lưu hoặc huỷ bản nháp trước; mô phỏng dùng cài đặt đã lưu.</p>}
    {error&&<p role="alert" className="text-rose-700">{error}</p>}
    {result&&<div className="space-y-3 text-sm" aria-label="Kết quả mô phỏng">
      <p>{time(result.from)} → {time(result.to)} · {result.samples.toLocaleString('vi-VN')} mẫu</p>
      {result.samples===0?<p>Không có dữ liệu ENV01 trong khoảng này.</p>:<>
        <p className="font-semibold">{result.runs} lượt bật · tổng {duration(result.pumpSeconds)} bơm chạy · {result.earlyStops} lượt tắt sớm · {result.timerStops} lượt hết giờ</p>
        {blocked.length>0&&<p>Bị chặn: {blocked.map(([k,v])=>`${guardResultLabels[k]??k} (${v})`).join('; ')}</p>}
        {Object.keys(result.runsPerDay).length>0&&<p>Theo ngày: {Object.entries(result.runsPerDay).map(([d,n])=>`${d.split('-').reverse().join('/')}: ${n}`).join(' · ')}</p>}
        {result.waterGuardAssumed&&<p className="text-amber-800">Điều kiện phao nước không mô phỏng được (không có lịch sử khớp thời điểm), nên được giả định là có nước.</p>}
        {result.events.length>0&&<details><summary className="cursor-pointer">Diễn biến ({result.events.length}{result.eventsTruncated?'+, đã cắt bớt':''})</summary>
          <table className="w-full text-left mt-2"><thead><tr className="text-slate-500"><th className="p-1">Thời điểm</th><th>Sự kiện</th><th>Đất</th></tr></thead><tbody>
            {result.events.map((e,i)=><tr key={i} className="border-t"><td className="p-1">{time(e.at)}</td>
              <td>{e.type==='START'?'Bật':e.type==='STOP'?`Tắt · ${stopReasonLabels[e.reason??'']??e.reason}`:`Bị chặn · ${guardResultLabels[e.reason??'']??e.reason}`}</td>
              <td>{e.soilMoisture===null?'—':`${e.soilMoisture}%`}</td></tr>)}
          </tbody></table></details>}
      </>}
      <p className="text-xs text-slate-500">Mô hình bỏ qua độ trễ thiết bị/ACK, dữ liệu cũ, thao tác thủ công và khóa an toàn; kết quả là ước tính, không phải lịch sử thật.</p>
    </div>}
  </section>;
};
