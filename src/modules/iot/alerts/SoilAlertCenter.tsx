import React from 'react';
import {ChannelAlertCenter,type EpisodeConfig} from './ChannelAlertCenter';
import {parseSoilAlert,parseSoilAlerts,soilAlertTitle,soilSourceLabel,sameSoilEpisode,type SoilAlert} from './soilAlertApi';
const config:EpisodeConfig<SoilAlert>={endpoint:'/api/v1/soil-alerts',heading:'Cảnh báo đất nhiều điểm',groupLabel:'đất',
 parseAlert:parseSoilAlert,parseAlerts:parseSoilAlerts,alertTitle:soilAlertTitle,sourceLabel:soilSourceLabel,sameEpisode:sameSoilEpisode,
 explanation:<>
 <p>Mỗi kênh SOIL được đánh giá riêng: đất khô dưới 30%, trở về bình thường khi đạt 35%. Lỗi cảm biến dùng SENSOR_FAULT, không thay bằng đất 0%.</p>
 <p>Mở và hết cảnh báo cần hai mẫu mới liên tiếp, cùng lần khởi động và nguồn, cách nhau tối đa 15 giây. Chỉ xét mẫu không quá 30 giây.</p>
 <p>Mất dữ liệu, kênh bị thiếu, mẫu lỗi hoặc giá trị 30–dưới 35% không tự xóa cảnh báo đất khô. Nguồn khác nhau có đợt riêng. Ngưỡng hiện cố định cho demo, chưa theo cây hoặc loại đất.</p>
 </>,
 evidence:a=><p className="text-sm">Giá trị lúc phát sinh: {a.openedValue===null?'Lỗi cảm biến':`${a.openedValue.toLocaleString('vi-VN',{maximumFractionDigits:2})}%`}{a.clearedAt?` · Lúc hết điều kiện: ${a.clearedValue?.toLocaleString('vi-VN',{maximumFractionDigits:2})}%`:''}</p>};
export const SoilAlertCenter:React.FC<{onBusyChange:(busy:boolean)=>void}>=props=><ChannelAlertCenter {...props} config={config}/>;
