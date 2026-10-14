import React from 'react';
import {ChannelAlertCenter,type EpisodeConfig} from './ChannelAlertCenter';
import {waterAlertTitle,parseWaterAlert,parseWaterAlerts,waterSourceLabel,sameWaterEpisode,type WaterAlert} from './waterAlertApi';
const config:EpisodeConfig<WaterAlert>={endpoint:'/api/v1/water-alerts',heading:'Cảnh báo trạm nước',groupLabel:'nước',
 parseAlert:parseWaterAlert,parseAlerts:parseWaterAlerts,alertTitle:waterAlertTitle,sourceLabel:waterSourceLabel,sameEpisode:sameWaterEpisode,
 explanation:<>
 <p>Nước dưới LOW: hai phao khô. Phao bất nhất: HIGH có nước nhưng LOW khô. Lỗi cảm biến: quality SENSOR_FAULT; không coi lưu lượng 0 là lỗi.</p>
 <p>Mở và hết cảnh báo cần hai packet mới liên tiếp, cùng lần khởi động và nguồn, cách nhau tối đa 15 giây. Chỉ xét mẫu không quá 30 giây.</p>
 <p>Mất dữ liệu hoặc lỗi phao không tự xóa cảnh báo nước thấp. Nguồn mô phỏng và vật lý có đợt cảnh báo riêng; đổi nguồn không xóa đợt cũ.</p>
 </>};
export const WaterAlertCenter:React.FC<{onBusyChange:(busy:boolean)=>void}>=props=><ChannelAlertCenter {...props} config={config}/>;
