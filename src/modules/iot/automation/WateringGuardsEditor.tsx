import React,{useEffect,useState} from 'react';
import {parseNodes} from '../nodes/nodeApi';
import {guardSummary,parseOptional,sameGuards,validGuards,type WateringGuards} from './guardsApi';

type Draft={minAirTemperature:string;maxAirTemperature:string;maxAirHumidity:string;water:string;maxRunsPerDay:string};
const text=(n:number|null)=>n===null?'':String(n);
const draftOf=(g:WateringGuards):Draft=>({minAirTemperature:text(g.minAirTemperature),maxAirTemperature:text(g.maxAirTemperature),
  maxAirHumidity:text(g.maxAirHumidity),water:g.waterNode===null?'':`${g.waterNode}/${g.waterChannel}`,maxRunsPerDay:text(g.maxRunsPerDay)});

interface Props {editable:boolean;busy:boolean;refresh:number;onDirty:(dirty:boolean)=>void;onSaved:()=>void}

/** Extra conditions checked right before automatic ON. Empty fields are not checked. */
export const WateringGuardsEditor:React.FC<Props>=({editable,busy,refresh,onDirty,onSaved})=>{
  const [saved,setSaved]=useState<WateringGuards|null>(null),[draft,setDraft]=useState<Draft|null>(null);
  const [floats,setFloats]=useState<string[]>([]),[error,setError]=useState(''),[unconfirmed,setUnconfirmed]=useState(false);
  const [sending,setSending]=useState(false),[done,setDone]=useState(false);
  const dirty=!!saved&&!!draft&&JSON.stringify(draft)!==JSON.stringify(draftOf(saved));
  useEffect(()=>onDirty(dirty||unconfirmed),[dirty,unconfirmed,onDirty]);
  useEffect(()=>{
    const controller=new AbortController();
    Promise.all([fetch('/api/v1/automation/watering/guards',{signal:controller.signal,cache:'no-store'}),fetch('/api/v1/nodes',{signal:controller.signal,cache:'no-store'})])
      .then(async([g,n])=>{
        if(!g.ok)throw new Error();
        const value:unknown=await g.json();if(!validGuards(value))throw new Error();
        setSaved(value);setDraft(current=>current&&dirty?current:draftOf(value));
        if(n.ok){const nodes=parseNodes(await n.json());setFloats(nodes.nodes.flatMap(node=>node.channels.filter(c=>c.metric==='WATER_PRESENT').map(c=>`${node.nodeId}/${c.channelId}`)));}
      }).catch(reason=>{if(!(reason instanceof DOMException&&reason.name==='AbortError'))setError('Không tải được điều kiện bổ sung.');});
    return()=>controller.abort();
  // Reload when the rule changes elsewhere; a local draft is kept.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[refresh]);
  const build=():WateringGuards|null=>{
    if(!saved||!draft)return null;
    const min=parseOptional(draft.minAirTemperature),max=parseOptional(draft.maxAirTemperature),hum=parseOptional(draft.maxAirHumidity),runs=parseOptional(draft.maxRunsPerDay,true);
    if([min,max,hum,runs].includes(undefined))return null;
    const [node,channel]=draft.water?draft.water.split('/'):[null,null];
    const value={minAirTemperature:min!,maxAirTemperature:max!,maxAirHumidity:hum!,waterNode:node,waterChannel:channel,maxRunsPerDay:runs!,revision:saved.revision};
    return validGuards(value)?value:null;
  };
  const save=async(event:React.FormEvent)=>{
    event.preventDefault();
    const input=build();if(!input||!editable||busy||sending)return;
    setSending(true);setError('');setDone(false);let uncertain=true;
    try{
      const response=await fetch('/api/v1/automation/watering/guards',{method:'PUT',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(15000)});
      if(!response.ok){
        if(response.status>=400&&response.status<500)uncertain=false;
        throw new Error(response.status===409?'Không lưu được: tắt quy tắc, chờ lần chạy kết thúc hoặc tải lại vì phiên bản đã đổi.':response.status===400?'Điều kiện không hợp lệ: kiểm tra khoảng nhiệt độ, độ ẩm, số lượt và kênh phao.':'Chưa xác nhận lưu. Tải lại để đối chiếu; không tự gửi lại.');
      }
      const confirmed:unknown=await response.json();
      if(!validGuards(confirmed)||!sameGuards(input,confirmed)||confirmed.revision!==input.revision+1)throw new Error('Phản hồi không khớp. Tải lại để đối chiếu.');
      setSaved(confirmed);setDraft(draftOf(confirmed));setUnconfirmed(false);setDone(true);onSaved();
    }catch(reason){
      if(uncertain)setUnconfirmed(true);
      setError(reason instanceof TypeError||reason instanceof DOMException?'Chưa xác nhận lưu. Tải lại để đối chiếu; không tự gửi lại.':reason instanceof Error?reason.message:'Không lưu được.');
    }finally{setSending(false);}
  };
  const reload=()=>{if(saved){setDraft(draftOf(saved));}setUnconfirmed(false);setError('');onSaved();};
  if(!saved||!draft)return <section className="bg-white border rounded-xl p-5"><p className={error?'text-rose-700':''}>{error||'Đang tải điều kiện bổ sung…'}</p></section>;
  const field=(key:keyof Draft,label:string,hint:string)=><label className="block text-sm">{label}
    <input aria-label={label} value={draft[key]} disabled={!editable||busy||sending} inputMode="decimal" placeholder="Không kiểm tra"
      onChange={e=>{setDone(false);setDraft({...draft,[key]:e.target.value});}} className="block w-full border rounded p-2 mt-1"/>
    <span className="text-xs text-slate-500">{hint}</span></label>;
  const summary=guardSummary(saved),invalid=dirty&&!build();
  return <section aria-label="Điều kiện bổ sung" className="bg-white border rounded-xl p-5 space-y-3">
    <h2 className="font-semibold">Điều kiện bổ sung trước khi bật · v{saved.revision}</h2>
    <p className="text-sm">{summary.length?`Đang áp dụng: ${summary.join('; ')}.`:'Chưa có điều kiện bổ sung: quy tắc chỉ xét độ ẩm đất và khung giờ.'}</p>
    <form onSubmit={save} className="grid sm:grid-cols-2 gap-3">
      {field('minAirTemperature','Nhiệt độ không khí tối thiểu (°C)','Thấp hơn thì không tưới. -40 đến 80.')}
      {field('maxAirTemperature','Nhiệt độ không khí tối đa (°C)','Cao hơn thì không tưới (tránh tưới lúc nắng gắt).')}
      {field('maxAirHumidity','Độ ẩm không khí tối đa (%)','Từ mức này trở lên thì không tưới (thay cho cảm biến mưa).')}
      {field('maxRunsPerDay','Số lượt tưới tối đa mỗi ngày','Đếm theo ngày giờ Việt Nam. 1 đến 200.')}
      <label className="block text-sm sm:col-span-2">Bắt buộc phao báo có nước
        <select aria-label="Bắt buộc phao báo có nước" value={draft.water} disabled={!editable||busy||sending} onChange={e=>{setDone(false);setDraft({...draft,water:e.target.value});}} className="block w-full border rounded p-2 mt-1">
          <option value="">Không kiểm tra</option>
          {[...new Set([...floats,...(draft.water?[draft.water]:[])])].map(f=><option key={f} value={f}>{f}</option>)}
        </select>
        <span className="text-xs text-slate-500">Cần mẫu hợp lệ trong 15 giây có nước. Khi đang tưới mà phao không còn xác nhận có nước, quy tắc gửi lệnh tắt.</span>
      </label>
      <div className="sm:col-span-2 flex flex-wrap gap-2">
        <button type="submit" disabled={!editable||busy||sending||!dirty||invalid||unconfirmed} className="bg-emerald-700 text-white rounded px-4 py-2 disabled:opacity-40">Lưu điều kiện</button>
        <button type="button" disabled={sending} onClick={reload} className="border rounded px-4 py-2">Tải lại</button>
      </div>
    </form>
    {!editable&&<p className="text-sm text-slate-500">Chỉ sửa được khi quy tắc đang tắt và không có lần chạy dở.</p>}
    {invalid&&<p className="text-sm text-amber-800">Giá trị chưa hợp lệ: nhập số, nhiệt độ tối thiểu phải nhỏ hơn tối đa, số lượt là số nguyên.</p>}
    {done&&<p className="text-sm text-emerald-700">Đã lưu điều kiện v{saved.revision}.</p>}
    {error&&<p role="alert" className="text-rose-700">{error}</p>}
  </section>;
};
