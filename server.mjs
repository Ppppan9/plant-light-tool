import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff': 'font/woff' };
const server = http.createServer((req, res) => {
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end('Bad request');return;}
  if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  const name = path.resolve(root, '.' + pathname.replace(/\/$/, '/index.html'));
  if (!name.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(name, (err, data) => { if (err) { res.writeHead(404); res.end('Not found'); return; } res.writeHead(200, { 'content-type': mime[path.extname(name)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(data); });
});
server.listen(Number(process.env.PORT) || 4173, '127.0.0.1', () => console.log(`植物光路 http://127.0.0.1:${server.address().port}`));
