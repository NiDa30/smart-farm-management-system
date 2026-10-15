import type {CircuitConfig,CircuitSnapshot,CircuitView} from './circuitApi';
export const validPackageAccount=(value:string)=>value.length===12&&/^[0-9]{12}$/.test(value);
export function packageBlock(view:CircuitView,snapshot:CircuitSnapshot):string|null {
 const c=view.config;
 if(view.configurationState!=='CURRENT')return 'Cần sửa hoặc đọc lại mapping đang khớp.';
 if(c.expectedSource!=='SIMULATOR'||c.controllerId.length!==12||c.valveId.length!==7||!/^IRRIGATION(0[2-9]|[1-9][0-9])$/.test(c.controllerId)||!/^VALVE(0[2-9]|[1-9][0-9])$/.test(c.valveId))return 'Gói này dành cho board giám sát mô phỏng 02–99.';
 if(snapshot.circuits.filter(v=>v.config.controllerId===c.controllerId).length!==1)return 'Mỗi board giám sát cần controller/client ID riêng; mã này đang dùng chung.';
 return null;
}
export const monitorPackageFilename=(c:CircuitConfig)=>`FARM001-${c.circuitId}-r${c.revision}-${c.controllerId}-${c.valveId}-monitor.zip`;
export async function readMonitorPackage(c:CircuitConfig,accountId:string,signal:AbortSignal):Promise<Blob>{
 if(!validPackageAccount(accountId))throw new Error('Nhập Account ID gồm đúng 12 chữ số, không phải access key.');
 const query=new URLSearchParams({accountId,expectedRevision:String(c.revision),expectedZoneRevision:String(c.zoneRevision)});
 const r=await fetch(`/api/v1/irrigation-circuits/${encodeURIComponent(c.circuitId)}/monitor-package?${query}`,{signal,cache:'no-store'});
 if(r.status===409)throw new Error('Mapping hoặc danh tính đã đổi. Đọc lại cấu hình trước khi tải gói.');
 if(!r.ok)throw new Error('Chưa tải được gói Wokwi. Kiểm tra Account ID và thử tải lại khi backend sẵn sàng.');
 for(const [header,value] of Object.entries({'X-Smartfarm-Package':'IRRIGATION_MONITOR_V1','X-Smartfarm-Circuit':c.circuitId,'X-Smartfarm-Circuit-Revision':String(c.revision),'X-Smartfarm-Zone-Revision':String(c.zoneRevision),'X-Smartfarm-Controller':c.controllerId,'X-Smartfarm-Valve':c.valveId}))
  if(r.headers.get(header)!==value)throw new Error('Gói trả về không khớp nhánh và phiên bản đã chọn.');
 if(r.headers.get('Content-Type')?.split(';')[0].trim()!=='application/zip')throw new Error('Backend chưa trả về gói ZIP hợp lệ.');
 const blob=await r.blob();
 if(blob.size<22||blob.size>262144)throw new Error('Kích thước gói ZIP không hợp lệ.');
 const signature=new Uint8Array(await blob.slice(0,4).arrayBuffer());
 if(![80,75,3,4].every((v,i)=>v===signature[i]))throw new Error('Nội dung tải về không phải gói ZIP.');
 return blob;
}
