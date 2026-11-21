// One shared /ws/iot connection for every IoT screen. The socket only says "these topics
// changed"; screens refetch through REST, so a lost or late message can only delay a refresh,
// never show wrong data. Without a socket, each screen keeps its original polling cadence.
export type LiveTopic='telemetry'|'nodes'|'pump'|'commands'|'alerts'|'automation'|'monitoring'|'events'|'safety'|'dashboard'|'actuators';
export type LiveStatus='idle'|'connecting'|'open'|'reconnecting'|'unsupported';
export const LIVE_TOPICS:readonly LiveTopic[]=['telemetry','nodes','pump','commands','alerts','automation','monitoring','events','safety','dashboard','actuators'];
export interface LiveMessage {type:'hello'|'changed'|'heartbeat';version:number;topics:LiveTopic[]}

/** Strict: anything unexpected is ignored rather than trusted. */
export function parseLiveMessage(text:unknown):LiveMessage|null {
  if(typeof text!=='string'||text.length>4096)return null;
  let value:unknown;
  try{value=JSON.parse(text);}catch{return null;}
  const v=value as {type?:unknown;version?:unknown;topics?:unknown};
  if(!v||typeof v!=='object'||!['hello','changed','heartbeat'].includes(v.type as string))return null;
  if(typeof v.version!=='number'||!Number.isSafeInteger(v.version)||v.version<0)return null;
  if(v.type!=='changed')return {type:v.type as LiveMessage['type'],version:v.version,topics:[]};
  if(!Array.isArray(v.topics)||v.topics.length===0||!v.topics.every(t=>LIVE_TOPICS.includes(t as LiveTopic)))return null;
  return {type:'changed',version:v.version,topics:v.topics as LiveTopic[]};
}

export interface SocketLike {
  onopen:(()=>void)|null;onmessage:((event:{data:unknown})=>void)|null;onclose:(()=>void)|null;onerror:(()=>void)|null;close():void;
}
export interface LiveDeps {
  create:((url:string)=>SocketLike)|null;url:()=>string;
  setTimer:(fn:()=>void,ms:number)=>unknown;clearTimer:(timer:unknown)=>void;random:()=>number;
}
/** Slowest safety-net refresh while the socket is healthy. */
export const LIVE_FALLBACK_MS=30000;
export const LIVE_SILENCE_MS=60000;
type Listener={topics:ReadonlySet<LiveTopic>;fn:()=>void};

export class LiveConnection {
  status:LiveStatus='idle';
  private listeners=new Set<Listener>();
  private statusListeners=new Set<()=>void>();
  private socket:SocketLike|null=null;
  private reconnect:unknown=null;private watchdog:unknown=null;
  private attempt=0;private version:number|null=null;private everOpened=false;
  constructor(readonly deps:LiveDeps){}

  subscribe(topics:readonly LiveTopic[],fn:()=>void):()=>void {
    const listener={topics:new Set(topics),fn};
    this.listeners.add(listener);
    if(this.listeners.size===1)this.start();
    return ()=>{if(this.listeners.delete(listener)&&this.listeners.size===0)this.stop();};
  }
  onStatus(fn:()=>void):()=>void {this.statusListeners.add(fn);return()=>{this.statusListeners.delete(fn);};}
  /** Screens keep their own cadence unless a healthy socket will tell them about changes. */
  delayFor(baseMs:number):number {return this.status==='open'?Math.max(baseMs,LIVE_FALLBACK_MS):baseMs;}

  private setStatus(next:LiveStatus) {
    if(this.status===next)return;
    const wasOpen=this.status==='open';this.status=next;
    this.statusListeners.forEach(fn=>fn());
    // Losing the socket: screens waiting on the long fallback delay go back to their own cadence.
    if(wasOpen)this.notifyAll();
  }
  private notify(topics:readonly LiveTopic[]) {
    for(const listener of [...this.listeners])if(topics.some(t=>listener.topics.has(t)))listener.fn();
  }
  private notifyAll() {for(const listener of [...this.listeners])listener.fn();}

  private start() {
    if(!this.deps.create){this.setStatus('unsupported');return;}
    this.connect();
  }
  private stop() {
    this.deps.clearTimer(this.reconnect);this.deps.clearTimer(this.watchdog);this.reconnect=this.watchdog=null;
    const socket=this.socket;this.socket=null;
    if(socket){socket.onopen=socket.onmessage=socket.onclose=socket.onerror=null;try{socket.close();}catch{/* already closed */}}
    this.attempt=0;this.setStatus('idle');
  }
  private connect() {
    this.reconnect=null;
    this.setStatus(this.everOpened?'reconnecting':'connecting');
    let socket:SocketLike;
    try{socket=this.deps.create!(this.deps.url());}catch{this.scheduleReconnect();return;}
    this.socket=socket;
    socket.onopen=()=>{if(this.socket!==socket)return;this.attempt=0;this.armWatchdog(socket);};
    socket.onmessage=event=>{
      if(this.socket!==socket)return;
      const message=parseLiveMessage(event.data);
      if(!message)return;
      this.armWatchdog(socket);
      if(message.type==='hello'){
        // Opening counts only once the server has spoken. After a reconnect, changes during the
        // outage are unknown, so every screen refetches once.
        const reopened=this.everOpened;
        this.version=message.version;this.everOpened=true;this.setStatus('open');
        if(reopened)this.notifyAll();
        return;
      }
      if(message.type==='heartbeat'){
        if(this.version!==null&&message.version!==this.version){this.version=message.version;this.notifyAll();}
        return;
      }
      const expected=this.version===null?null:this.version+1;
      this.version=Math.max(this.version??0,message.version);
      // A skipped version means a message was lost: refresh everything rather than guess.
      if(expected!==null&&message.version!==expected)this.notifyAll();else this.notify(message.topics);
    };
    socket.onerror=()=>{/* onclose follows */};
    socket.onclose=()=>{if(this.socket!==socket)return;this.socket=null;this.deps.clearTimer(this.watchdog);this.scheduleReconnect();};
  }
  private armWatchdog(socket:SocketLike) {
    this.deps.clearTimer(this.watchdog);
    this.watchdog=this.deps.setTimer(()=>{if(this.socket===socket){try{socket.close();}catch{/* ignore */}socket.onclose?.();}},LIVE_SILENCE_MS);
  }
  private scheduleReconnect() {
    if(this.listeners.size===0){this.setStatus('idle');return;}
    this.setStatus(this.everOpened?'reconnecting':'connecting');
    const base=Math.min(30000,1000*2**Math.min(this.attempt,5));this.attempt++;
    this.reconnect=this.deps.setTimer(()=>this.connect(),Math.round(base*(0.5+this.deps.random()/2)));
  }
}

export interface LiveLoop {next(poll:()=>void):void;dispose():void}
/**
 * Replaces `next=setTimeout(poll,ms)`: a change notification runs the poll at once; one that
 * arrives while a request is in flight runs it again as soon as that request finishes.
 */
export function createLiveLoop(topics:readonly LiveTopic[],baseMs:number,connection:LiveConnection=getLive()):LiveLoop {
  let timer:unknown=null,waiting=false,dirty=false,disposed=false,poll:(()=>void)|null=null;
  const run=()=>{if(disposed||!poll)return;waiting=false;dirty=false;poll();};
  const unsubscribe=connection.subscribe(topics,()=>{
    if(disposed)return;
    if(waiting){connection.deps.clearTimer(timer);run();}else dirty=true;
  });
  return {
    next(next){
      poll=next;if(disposed)return;
      waiting=true;timer=connection.deps.setTimer(run,dirty?0:connection.delayFor(baseMs));
    },
    dispose(){disposed=true;waiting=false;connection.deps.clearTimer(timer);unsubscribe();},
  };
}

let shared:LiveConnection|null=null;
export function getLive():LiveConnection {
  if(!shared){
    const hasSocket=typeof WebSocket!=='undefined'&&typeof location!=='undefined';
    shared=new LiveConnection({
      create:hasSocket?url=>new WebSocket(url) as unknown as SocketLike:null,
      url:()=>`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/ws/iot`,
      setTimer:(fn,ms)=>setTimeout(fn,ms),clearTimer:timer=>clearTimeout(timer as ReturnType<typeof setTimeout>),random:Math.random,
    });
  }
  return shared;
}
