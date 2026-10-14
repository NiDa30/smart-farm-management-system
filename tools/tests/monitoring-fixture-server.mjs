import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('./fixtures/monitoring/',import.meta.url));
const server=await createServer({configFile:false,envDir:false,root,plugins:[react()],
 cacheDir:fileURLToPath(new URL('../../node_modules/.vite-monitoring-test',import.meta.url)),
 server:{host:'127.0.0.1',port:4179,strictPort:true,fs:{allow:[root,
 fileURLToPath(new URL('../../src/modules/iot/devices/',import.meta.url)),fileURLToPath(new URL('../../node_modules/',import.meta.url))]}}});
server.middlewares.use('/api',(_request,response)=>{response.statusCode=501;response.end('API fixture missing');});
await server.listen();
