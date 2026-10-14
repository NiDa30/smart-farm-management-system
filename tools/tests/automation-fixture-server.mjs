import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./fixtures/automation/', import.meta.url));
const server = await createServer({
  configFile: false,
  envDir: false,
  root,
  cacheDir: fileURLToPath(new URL('../../node_modules/.vite-automation-test', import.meta.url)),
  plugins: [react()],
  server: {
    host: '127.0.0.1', port: 4177, strictPort: true,
    fs: { allow: [root,
      fileURLToPath(new URL('../../src/modules/iot/automation/', import.meta.url)),
      fileURLToPath(new URL('../../node_modules/', import.meta.url))] },
  },
});
// No application config, envfiles, or backend proxy. A missed fixture fails locally.
server.middlewares.use('/api', (_request, response) => {
  response.statusCode = 501;
  response.end('API fixture missing');
});
await server.listen();
