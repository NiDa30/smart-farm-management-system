import React from 'react';
import type {Agriculture} from './agricultureApi';
import {nodeSummary} from './agricultureApi';
import {channelFreshness,metricLabels,sourceLabels,tankState,tankLabels} from '../nodes/nodeApi';
import {displayedAssessment,assessmentLabels} from '../zones/zoneApi';
const labels={EMPTY:'Chưa có mẫu',CLOCK_SKEW:'Lệch giờ nguồn',STALE:'Dữ liệu cũ',SENSOR_FAULT:'Cảm biến báo lỗi',FRESH:'Dữ liệu mới'};
const alertLabels={LOW_WATER:'Nước thấp',INCONSISTENT_FLOATS:'Phao không nhất quán',DRY_SOIL:'Đất thấp',SENSOR_FAULT:'Cảm biến báo lỗi'};
export function AgricultureOverview({data,now,unavailable,navigate}:{data:Agriculture;now:number;unavailable:boolean;navigate:(route:string)=>void}){
 const nodes=data.inventory.nodes.filter(n=>n.nodeType!=='ENVIRONMENT');
 return <section aria-label="Tổng quan nông nghiệp" className="space-y-4">
  <h2 className="font-bold text-lg">Node đất, trạm nước và vùng tưới</h2>
  <p className="text-sm text-slate-500">{nodes.filter(n=>n.nodeType==='SOIL').length} node đất · {nodes.filter(n=>n.nodeType==='WATER').length} trạm nước · {data.zones.zones.length} vùng tưới. Nguồn đo do thiết bị khai báo, chưa chứng minh hiệu chuẩn phần cứng.</p>
  <button className="text-emerald-700 underline" onClick={()=>navigate('/iot/realtime')}>Mở Sensor Realtime để quản lý node và vùng</button>
  <p className="text-xs text-slate-500">Trong Sensor Realtime chọn Node &amp; trạm nước → Vùng tưới. Dữ liệu mới không xác nhận thiết bị online hoặc cho phép bật bơm.</p>
  {!nodes.length&&<p>Chưa đăng ký node đất hoặc trạm nước.</p>}
  <div className="grid gap-3 md:grid-cols-2">{nodes.map(n=>{
   const summary=nodeSummary(n,now);
   return <article key={n.nodeId} aria-label={`Node ${n.nodeId}`} className="bg-white border rounded-xl p-4 space-y-2">
    <h3 className="font-semibold">{n.name} · {n.nodeId}</h3><p className="text-sm">{n.nodeType==='SOIL'?'Node đất':'Trạm nước'} · {n.areaId} · {unavailable?'Chưa xác nhận độ mới':`${summary.fresh}/${summary.total} kênh có dữ liệu mới`}</p>
    {n.nodeType==='WATER'&&<p>{unavailable?tankLabels.UNKNOWN:tankLabels[tankState(n,now)]}</p>}
    {n.channels.map(c=><div key={c.channelId} className="text-sm border-t pt-1"><p>{c.channelId} · {metricLabels[c.metric]}: {c.latest?.value==null?'—':typeof c.latest.value==='boolean'?(c.latest.value?'Có nước':'Không có nước'):c.latest.value.toLocaleString('vi-VN',{maximumFractionDigits:2})} {c.unit==='boolean'?'':c.unit}</p>
     <p className="text-xs text-slate-500">{unavailable?'Bản chụp cũ, chưa xác nhận hiện tại':labels[channelFreshness(c.latest,now)]} · {sourceLabels[c.latest?.dataSource??'UNSPECIFIED']}</p></div>)}
   </article>;
  })}</div>
  <section aria-label="Khảo sát vùng tưới" className="bg-white border rounded-xl p-4 space-y-2"><h3 className="font-semibold">Khảo sát vùng tưới</h3><p className="text-xs text-slate-500">Khảo sát ba điểm hiện tại, không tự điều khiển van/bơm; rule ENV01/PUMP01 vẫn độc lập.</p>
   {!data.zones.zones.length&&<p>Chưa khai báo vùng tưới.</p>}{data.zones.zones.map(z=>{const state=displayedAssessment(z,now,unavailable);return <p key={z.config.zoneId}>{z.config.name} · {z.config.zoneId} · {assessmentLabels[state]} · {sourceLabels[z.config.expectedSource]}{['DRY','WET','MIXED'].includes(state)&&` · ${z.assessment.dryCount}/3 điểm khô, ${z.assessment.wetCount}/3 điểm đủ ẩm`}</p>;})}
  </section>
  <section aria-label="Cảnh báo đất và nước" className="bg-white border rounded-xl p-4 space-y-2"><h3 className="font-semibold">Cảnh báo đất và nước đang mở</h3>
   <p>{unavailable?'Chưa xác nhận số cảnh báo hiện tại':`Trạm nước: ${data.waterActiveCount} · Đất: ${data.soilActiveCount}`}</p>
   {!data.recentChannelAlerts.length&&<p>Không có cảnh báo đất/nước đang mở trong bản chụp.</p>}
   {data.recentChannelAlerts.map(a=><p key={`${a.family}:${a.id}`} className="text-sm">{a.nodeId}{a.channelId&&` / ${a.channelId}`} · {alertLabels[a.type]} · {sourceLabels[a.dataSource]} · {a.acknowledgedAt?'Đã xem, vẫn đang mở':'Chưa xem'} · {new Date(a.openedAt).toLocaleString('vi-VN')}</p>)}
   <p className="text-xs text-slate-500">Hiển thị {data.recentChannelAlerts.length}/{data.waterActiveCount+data.soilActiveCount} cảnh báo đất/nước. Cảnh báo không tự đóng khi mẫu cũ hoặc đã xem.</p>
   <button className="text-emerald-700 underline" onClick={()=>navigate('/iot/alerts')}>Mở Trung tâm Cảnh báo</button>
  </section>
 </section>;
}
