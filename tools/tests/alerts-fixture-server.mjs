import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('./fixtures/alerts/',import.meta.url));
const server=await createServer({configFile:false,envDir:false,root,plugins:[react()],cacheDir:fileURLToPath(new URL('../../node_modules/.vite-alerts-test',import.meta.url)),server:{host:'127.0.0.1',port:4182,strictPort:true,fs:{allow:[root,fileURLToPath(new URL('../../src/',import.meta.url)),fileURLToPath(new URL('../../node_modules/',import.meta.url))]}}});
server.middlewares.use('/api',(_request,response)=>{response.statusCode=501;response.end('API fixture missing');});
await server.listen();
