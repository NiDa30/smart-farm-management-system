import React, { useEffect, useRef, useState } from 'react';
import { IrrigationCalendarEditor } from './IrrigationCalendarEditor';
import {parseCalendar,sameCalendar,vietnamTime,type CalendarSettings,type CalendarView} from './calendarApi';
import { WateringSettingsEditor } from './WateringSettingsEditor';
import { sameSettings, validSettings, type WateringSettings } from './wateringSettings';
interface Rule { enabled: boolean; lowCount: number; activeCommand: string | null; cooldownUntil: string | null; lastResult: string }
interface Run { id: number; startedAt: string; commandId: string | null; result: string; dryThreshold?: number | null; wetThreshold?: number | null; durationSeconds?: number | null; cooldownSeconds?: number | null; settingsRevision?: number | null; calendarRevision?:number|null;calendarMode?:string|null;windowStart?:string|null;windowEnd?:string|null }
const isRule = (value: unknown): value is Rule => {
  if (!value || typeof value !== 'object') return false;
  const rule = value as Rule;
  return typeof rule.enabled === 'boolean' && typeof rule.lastResult === 'string'
    && Number.isInteger(rule.lowCount) && rule.lowCount >= 0 && rule.lowCount <= 2
    && (rule.activeCommand === null || typeof rule.activeCommand === 'string')
    && (rule.cooldownUntil === null || (typeof rule.cooldownUntil === 'string' && Number.isFinite(Date.parse(rule.cooldownUntil))));
};
export const AutomationManager: React.FC = () => {
  const [rule,setRule]=useState<Rule|null>(null),[runs,setRuns]=useState<Run[]>([]);
  const [loadError,setLoadError]=useState(''),[actionError,setActionError]=useState('');
  const [sending,setSending]=useState(false),[refresh,setRefresh]=useState(0);
  const [settings,setSettings]=useState<WateringSettings|null>(null),[settingsError,setSettingsError]=useState('');
  const [hasDraft,setHasDraft]=useState(false),[settingsUnconfirmed,setSettingsUnconfirmed]=useState(false);
  const [calendar,setCalendar]=useState<CalendarView|null>(null),[calendarError,setCalendarError]=useState('');
  const [calendarDraft,setCalendarDraft]=useState(false),[calendarUnconfirmed,setCalendarUnconfirmed]=useState(false);
  const requestVersion=useRef(0);
  const unconfirmedChange=useRef<boolean|null>(null);
  useEffect(() => {
    if (sending) return;
    let active=true; let timer: ReturnType<typeof setTimeout>; let controller: AbortController;
    const poll=async () => {
      const version=requestVersion.current;
      controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),5000);
      try {
        const responses=await Promise.all([fetch('/api/v1/automation/watering',{signal:controller.signal,cache:'no-store'}),fetch('/api/v1/automation/watering/runs',{signal:controller.signal,cache:'no-store'}),fetch('/api/v1/automation/watering/settings',{signal:controller.signal,cache:'no-store'}),fetch('/api/v1/automation/watering/calendar',{signal:controller.signal,cache:'no-store'})]);
        if (responses.some(r=>!r.ok)) throw new Error();
        const [state,history,savedSettings,savedCalendar]=await Promise.all(responses.map(r=>r.json()));
        if (!isRule(state) || !Array.isArray(history) || !validSettings(savedSettings)) throw new Error();
        const parsedCalendar=parseCalendar(savedCalendar);
        if (active && version===requestVersion.current) {
          setRule(state); setRuns(history); setSettings(savedSettings); setCalendar(parsedCalendar); setLoadError('');
          if (unconfirmedChange.current===state.enabled) { unconfirmedChange.current=null; setActionError(''); }
        }
      } catch { if(active && version===requestVersion.current) { setRule(null); setLoadError('Không tải được quy tắc. Kiểm tra backend.'); } }
      finally { clearTimeout(timeout); if(active) timer=setTimeout(poll,2000); }
    }; void poll(); return()=>{active=false;controller?.abort();clearTimeout(timer);};
  },[refresh,sending]);
  const changeSettings=async(input?:WateringSettings):Promise<WateringSettings|null>=>{
    requestVersion.current++;
    setSending(true);setSettingsError('');
    let uncertain=!!input;
    try {
      const response=await fetch('/api/v1/automation/watering/settings',{
        method:input?'PUT':'GET',cache:'no-store',
        ...(input?{headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}:{}),
        signal:AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        if (response.status>=400 && response.status<500) uncertain=false;
        throw new Error(response.status===409?'Không lưu được: quy tắc đang bật, lần chạy chưa kết thúc hoặc phiên bản đã đổi. Tải lại để đối chiếu.':response.status===400?'Cài đặt không hợp lệ. Kiểm tra giới hạn.':'Chưa xác nhận cài đặt. Tải lại để đối chiếu; không tự gửi lại.');
      }
      const confirmed:unknown=await response.json();
      if (!validSettings(confirmed) || (input && (!sameSettings(input,confirmed) || confirmed.revision!==input.revision+1))) {
        if (input) setSettingsUnconfirmed(true);
        throw new Error('Phản hồi cài đặt không hợp lệ. Tải lại để đối chiếu.');
      }
      setSettings(confirmed);setSettingsUnconfirmed(false);
      return confirmed;
    } catch(error) {
      const networkError=error instanceof TypeError || (error instanceof DOMException && ['AbortError','TimeoutError'].includes(error.name));
      if (uncertain) setSettingsUnconfirmed(true);
      setSettingsError(networkError?'Chưa xác nhận cài đặt. Tải lại để đối chiếu; không tự gửi lại.':error instanceof Error?error.message:'Không tải được cài đặt.');
      return null;
    } finally {setSending(false);setRefresh(v=>v+1);}
  };
  const changeCalendar=async(input?:CalendarSettings):Promise<CalendarSettings|null>=>{
    requestVersion.current++;setSending(true);setCalendarError('');let uncertain=!!input;
    try {
      const response=await fetch('/api/v1/automation/watering/calendar',{method:input?'PUT':'GET',cache:'no-store',signal:AbortSignal.timeout(15000),
        ...(input?{headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}:{})});
      if(!response.ok){
        if(response.status>=400&&response.status<500)uncertain=false;
        throw new Error(response.status===409?'Không lưu được lịch: tắt quy tắc, chờ run kết thúc và tải lại phiên bản mới.':response.status===400?'Lịch không hợp lệ: kiểm tra ngày, giờ và các khung chồng nhau.':'Chưa xác nhận lưu lịch. Tải lại để đối chiếu; không tự gửi lại.');
      }
      const confirmed=parseCalendar(await response.json());
      if(input&&(!sameCalendar(input,confirmed.settings)||confirmed.settings.revision!==input.revision+1))throw new Error('Phản hồi lịch không khớp. Tải lại để đối chiếu.');
      setCalendar(confirmed);setCalendarUnconfirmed(false);return confirmed.settings;
    }catch(error){if(uncertain)setCalendarUnconfirmed(true);setCalendarError(error instanceof TypeError||error instanceof DOMException?'Chưa xác nhận lưu lịch. Tải lại để đối chiếu; không tự gửi lại.':error instanceof Error?error.message:'Không tải được lịch.');return null;}
    finally{setSending(false);setRefresh(v=>v+1);}
  };
  const configure=async(enabled:boolean)=>{
    requestVersion.current++;
    unconfirmedChange.current=enabled;
    setSending(true);setActionError('');
    try {
      const response=await fetch('/api/v1/automation/watering',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled}),signal:AbortSignal.timeout(15000)});
      if(!response.ok) {
        if (response.status>=400 && response.status<500) unconfirmedChange.current=null;
        throw new Error(response.status===409?'Cần cảm biến mới và thiết bị OFF không khóa; lần chạy trước phải kết thúc.':'Chưa xác nhận thay đổi quy tắc. Kiểm tra lại trạng thái.');
      }
      const confirmed: unknown=await response.json();
      if (!isRule(confirmed)) throw new Error('Phản hồi quy tắc không hợp lệ. Kiểm tra lại trạng thái.');
      unconfirmedChange.current=null;
      setRule(confirmed);setLoadError('');
    } catch(e) {
      const networkError=e instanceof TypeError || (e instanceof DOMException && ['AbortError','TimeoutError'].includes(e.name));
      setActionError(networkError ? 'Chưa xác nhận thay đổi quy tắc. Kiểm tra lại trạng thái.' : e instanceof Error ? e.message : 'Không lưu được.');
    }
    finally {setSending(false);setRefresh(v=>v+1);}
  };
  const labels: Record<string,string> = { DISABLED:'Đã tắt', RESTART_PAUSED:'Tạm dừng sau khởi động', WAITING_SAMPLES:'Chờ mẫu mới', STALE_SENSOR:'Dữ liệu cảm biến đã cũ', COMMAND_SENT:'Đã gửi lệnh bật, theo dõi ACK/trạng thái', COMMAND_UNCONFIRMED:'Chưa xác nhận lệnh, đã tạm dừng', STOP_REQUESTED:'Yêu cầu dừng', STOP_SENT:'Đã gửi lệnh tắt, chờ trạng thái OFF', STOP_UNCONFIRMED:'Chưa xác nhận tắt; kiểm tra Điều khiển Actuator', REPORTED_OFF:'Thiết bị đã báo OFF', MANUAL_HOLD:'Tạm dừng do điều khiển thủ công', DISPATCH_FAILED:'Không xác nhận gửi lệnh, đã tạm dừng' };
  Object.assign(labels, { WAITING_SCHEDULE_SAMPLE:'Chờ mẫu mới trong khung giờ tưới',OUTSIDE_SCHEDULE:'Đang ngoài khung giờ tưới', COOLDOWN:'Đang nghỉ sau OFF xác nhận; xem mốc nghỉ đã lưu', SAFETY_LOCKOUT:'Bị chặn bởi khóa an toàn', DEVICE_NOT_READY:'Thiết bị chưa sẵn sàng: cần OFF mới và quyền điều khiển', COMMAND_PENDING:'Đang chờ kết quả lệnh trước; chưa gửi ON mới', WAITING_NEW_SAMPLE:'Chờ mẫu mới; mẫu trùng hoặc sai thứ tự không được tính', SOIL_NOT_LOW:'Đất chưa dưới ngưỡng tưới; chưa đủ điều kiện tưới', EXECUTION_CONFIRMED:'Thiết bị đã ACK thực thi ON; đang theo dõi trạng thái và thời hạn' });
  return <div className="max-w-5xl mx-auto space-y-4">
    <h1 className="text-xl font-bold">Quy tắc tưới tự động · Wokwi</h1>
    <section className="bg-white border rounded-xl p-5 space-y-3">
      <h2 className="font-semibold">Đất khô · ENV01 → PUMP01</h2>
      <p>{settings ? `Hai mẫu mới liên tiếp có độ ẩm đất dưới ${settings.dryThreshold}% → bật tối đa ${settings.durationSeconds} giây. Đất đạt ${settings.wetThreshold}% → gửi tắt sớm. Nghỉ ${settings.cooldownSeconds} giây sau OFF xác nhận.` : 'Đang tải cài đặt tưới…'}</p>
      <p className="text-sm text-slate-500">Mặc định tắt và tạm dừng sau restart backend. Điều khiển thủ công tạm dừng quy tắc. Dữ liệu quá 15 giây, khóa an toàn hoặc lệnh chưa xác nhận sẽ chặn bật tự động.</p>
      <p role="status">{rule ? (rule.enabled?'Quy tắc đang bật':'Quy tắc đang tắt') : 'Chưa xác định'}</p>
      <button disabled={!rule || sending || (!rule.enabled && (hasDraft || settingsUnconfirmed || calendarDraft || calendarUnconfirmed))} onClick={()=>void configure(!rule?.enabled)} className="bg-emerald-600 text-white rounded px-4 py-2 disabled:opacity-40">{rule?.enabled?'Tắt quy tắc':'Bật quy tắc'}</button>
      {rule && <><p>Mẫu đất thấp liên tiếp: {rule.lowCount}/2 · Kết quả: {labels[rule.lastResult] ?? rule.lastResult}</p>{rule.cooldownUntil && <p>Nghỉ đến: {new Date(rule.cooldownUntil).toLocaleString('vi-VN')}</p>}{rule.activeCommand && <p className="text-sm break-all">Lệnh đang theo dõi: {rule.activeCommand}</p>}</>}
      {(loadError || actionError) && <p role="alert" className="text-rose-700">{loadError || actionError}</p>}
    </section>
    {settings && <WateringSettingsEditor settings={settings} editable={!!rule && !rule.enabled && !rule.activeCommand} sending={sending}
      error={settingsError} unconfirmed={settingsUnconfirmed} onDirty={setHasDraft} onSave={changeSettings} onReload={()=>changeSettings()} />}
    {calendar && <IrrigationCalendarEditor view={calendar} editable={!!rule&&!rule.enabled&&!rule.activeCommand} busy={sending} error={calendarError} unconfirmed={calendarUnconfirmed}
      onDirty={setCalendarDraft} onSave={changeCalendar} onReload={()=>changeCalendar()} />}
    <section className="bg-white border rounded-xl p-4 space-y-3"><h2 className="font-semibold">20 lần chạy gần nhất</h2>{!runs.length && <p>Chưa có lần chạy.</p>}{runs.map(run=><div key={run.id} className="border-t pt-2 text-sm"><p>{new Date(run.startedAt).toLocaleString('vi-VN')} · {labels[run.result] ?? run.result}</p><p className="break-all">{run.commandId ?? 'Chưa xác nhận gửi lệnh'}</p><p>{run.settingsRevision != null ? `Cài đặt v${run.settingsRevision}: dưới ${run.dryThreshold}% / tắt từ ${run.wetThreshold}% · bật ${run.durationSeconds}s · nghỉ ${run.cooldownSeconds}s` : 'Cài đặt chưa được lưu cho lần chạy cũ.'}</p><p>{run.calendarRevision!=null?`Lịch v${run.calendarRevision} · ${run.calendarMode==='TIME_WINDOWS'?'Theo khung giờ':'Cả ngày'}`:'Lịch chưa được ghi cho lần chạy cũ.'}{run.windowStart&&run.windowEnd?` · ${vietnamTime(run.windowStart)} → ${vietnamTime(run.windowEnd)}`:''}</p></div>)}</section>
    <p className="text-sm text-amber-800">Chỉ thử với LED mô phỏng. Gửi lệnh thành công không đồng nghĩa đã bật; xem ACK và trạng thái trong Điều khiển Actuator.</p>
  </div>;
};
