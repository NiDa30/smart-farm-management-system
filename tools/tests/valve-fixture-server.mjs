import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./fixtures/valve/',import.meta.url));
const server=await createServer({configFile:false,envDir:false,root,plugins:[react()],cacheDir:fileURLToPath(new URL('../../node_modules/.vite-valve-test',import.meta.url)),server:{host:'127.0.0.1',port:4186,strictPort:true,fs:{allow:[root,fileURLToPath(new URL('../../src/',import.meta.url)),fileURLToPath(new URL('../../node_modules/',import.meta.url))]}}});
server.middlewares.use('/api',(_req,res)=>{res.statusCode=501;res.end('Missing API fixture');});await server.listen();
