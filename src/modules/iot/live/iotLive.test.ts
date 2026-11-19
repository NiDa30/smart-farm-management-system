import test from 'node:test';
import assert from 'node:assert/strict';
import {LiveConnection,createLiveLoop,parseLiveMessage,LIVE_FALLBACK_MS,LIVE_SILENCE_MS,type SocketLike} from './iotLive';

// Deterministic timers and sockets: the connection logic never touches the real network.
function harness(options:{noSocket?:boolean}={}) {
  let clock=0;const timers=new Map<number,{at:number;fn:()=>void}>();let nextId=1;
  const sockets:(SocketLike&{closed:boolean})[]=[];
  const connection=new LiveConnection({
    create:options.noSocket?null:()=>{const s={onopen:null,onmessage:null,onclose:null,onerror:null,closed:false,close(){this.closed=true;}} as SocketLike&{closed:boolean};sockets.push(s);return s;},
    url:()=>'ws://test/ws/iot',
    setTimer:(fn,ms)=>{const id=nextId++;timers.set(id,{at:clock+ms,fn});return id;},
    clearTimer:id=>{timers.delete(id as number);},
    random:()=>1,
  });
  const advance=(ms:number)=>{
    const end=clock+ms;
    for(;;){
      const due=[...timers.entries()].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!due)break;timers.delete(due[0]);clock=due[1].at;due[1].fn();
    }
    clock=end;
  };
  const say=(s:SocketLike,body:object)=>s.onmessage?.({data:JSON.stringify(body)});
  return {connection,sockets,advance,say,timers};
}

test('only well-formed messages with known topics are accepted',()=>{
  assert.deepEqual(parseLiveMessage('{"type":"changed","version":3,"topics":["alerts"]}'),{type:'changed',version:3,topics:['alerts']});
  assert.equal(parseLiveMessage('{"type":"changed","version":3,"topics":["pumps"]}'),null);
  assert.equal(parseLiveMessage('{"type":"changed","version":-1,"topics":["alerts"]}'),null);
  assert.equal(parseLiveMessage('{"type":"changed","version":1.5,"topics":["alerts"]}'),null);
  assert.equal(parseLiveMessage('{"type":"changed","version":1,"topics":[]}'),null);
  assert.equal(parseLiveMessage('not json'),null);
  assert.equal(parseLiveMessage(42),null);
  assert.deepEqual(parseLiveMessage('{"type":"hello","version":0}'),{type:'hello',version:0,topics:[]});
});

test('status is open only after the server greets, and topics reach only their listeners',()=>{
  const h=harness();let alerts=0,pump=0;
  h.connection.subscribe(['alerts'],()=>alerts++);h.connection.subscribe(['pump'],()=>pump++);
  assert.equal(h.connection.status,'connecting');assert.equal(h.sockets.length,1);
  h.sockets[0].onopen?.();assert.equal(h.connection.status,'connecting');
  h.say(h.sockets[0],{type:'hello',version:4});assert.equal(h.connection.status,'open');
  assert.equal(alerts+pump,0,'the first greeting does not force a refetch');
  h.say(h.sockets[0],{type:'changed',version:5,topics:['alerts']});
  assert.deepEqual([alerts,pump],[1,0]);
});

test('a skipped version or a reconnect refreshes every screen once',()=>{
  const h=harness();let a=0,b=0;
  h.connection.subscribe(['alerts'],()=>a++);h.connection.subscribe(['nodes'],()=>b++);
  h.say(h.sockets[0],{type:'hello',version:1});
  h.say(h.sockets[0],{type:'changed',version:3,topics:['alerts']});
  assert.deepEqual([a,b],[1,1]);
  h.sockets[0].onclose?.();
  assert.equal(h.connection.status,'reconnecting');assert.deepEqual([a,b],[2,2],'losing the socket refetches');
  h.advance(1000);assert.equal(h.sockets.length,2);
  h.say(h.sockets[1],{type:'hello',version:0});
  assert.equal(h.connection.status,'open');assert.deepEqual([a,b],[3,3],'changes during the outage are unknown');
});

test('reconnect backs off up to 30 s and a silent socket is treated as dead',()=>{
  const h=harness();h.connection.subscribe(['alerts'],()=>{});
  for(let i=0;i<8;i++){h.sockets.at(-1)!.onclose?.();h.advance(30000);}
  assert.equal(h.sockets.length,9);
  const delays=[...h.timers.values()];assert.equal(delays.length,0);
  h.say(h.sockets.at(-1)!,{type:'hello',version:0});
  h.advance(LIVE_SILENCE_MS-1);assert.equal(h.connection.status,'open');
  h.advance(1);assert.equal(h.sockets.at(-2)!.closed||h.sockets.at(-1)!.closed,true);
  assert.equal(h.connection.status,'reconnecting');
});

test('the socket closes when the last screen leaves and stays unsupported without WebSocket',()=>{
  const h=harness();const off=h.connection.subscribe(['alerts'],()=>{});
  off();assert.equal(h.sockets[0].closed,true);assert.equal(h.connection.status,'idle');
  const none=harness({noSocket:true});none.connection.subscribe(['alerts'],()=>{});
  assert.equal(none.connection.status,'unsupported');assert.equal(none.connection.delayFor(5000),5000);
});

test('a live loop polls at once on change, never twice concurrently, and slows down only while open',()=>{
  const h=harness();let polls=0;
  const loop=createLiveLoop(['alerts'],5000,h.connection);
  const poll=()=>{polls++;};
  loop.next(poll);h.advance(5000);assert.equal(polls,1,'without a socket greeting the base cadence applies');
  // While the first poll's request is "in flight" (next not yet called), a change is remembered.
  h.say(h.sockets[0],{type:'hello',version:0});
  h.say(h.sockets[0],{type:'changed',version:1,topics:['alerts']});
  assert.equal(polls,1,'no concurrent poll');
  loop.next(poll);h.advance(0);assert.equal(polls,2,'the remembered change runs right after the request');
  loop.next(poll);h.advance(LIVE_FALLBACK_MS-1);assert.equal(polls,2,'healthy socket: fallback delay');
  h.say(h.sockets[0],{type:'changed',version:2,topics:['alerts']});assert.equal(polls,3,'change runs the waiting poll at once');
  loop.next(poll);h.say(h.sockets[0],{type:'changed',version:3,topics:['pump']});assert.equal(polls,3,'other topics are ignored');
  loop.dispose();h.advance(LIVE_FALLBACK_MS*2);assert.equal(polls,3,'disposed loops never poll');
});
