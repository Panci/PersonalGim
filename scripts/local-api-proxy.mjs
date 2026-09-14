import http from 'node:http';

const targetOrigin = (process.env.LOCAL_API_TARGET || 'http://srv1865637.hstgr.cloud:8081').replace(/\/$/, '');
const port = Number(process.env.LOCAL_API_PROXY_PORT || 8082);
const allowedOrigin = process.env.LOCAL_API_ALLOWED_ORIGIN || 'http://localhost:8081';

const readBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length ? Buffer.concat(chunks) : undefined;
};

const server = http.createServer(async (request, response) => {
  const origin = request.headers.origin;
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin === allowedOrigin ? allowedOrigin : allowedOrigin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    Vary: 'Origin',
  };

  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeaders);
    response.end();
    return;
  }

  if (!request.url?.startsWith('/api/')) {
    response.writeHead(404, { ...corsHeaders, 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'Ruta no disponible en el proxy local.' }));
    return;
  }

  try {
    const body = await readBody(request);
    const headers = {};
    if (request.headers.authorization) headers.Authorization = request.headers.authorization;
    if (request.headers['content-type']) headers['Content-Type'] = request.headers['content-type'];

    const upstream = await fetch(`${targetOrigin}${request.url}`, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : body,
    });
    const responseBody = Buffer.from(await upstream.arrayBuffer());
    const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';
    response.writeHead(upstream.status, { ...corsHeaders, 'Content-Type': contentType });
    response.end(responseBody);
  } catch (error) {
    response.writeHead(502, { ...corsHeaders, 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'No se pudo contactar con el API desplegado.' }));
    console.error(error);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Proxy API local escuchando en http://localhost:${port}/api -> ${targetOrigin}/api`);
});
