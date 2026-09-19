import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const manifest = JSON.parse(await readFile(path.join(root, 'extension/manifest.json')));
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let route = url.pathname;
    if (route === '/watch' || route.startsWith('/shorts/')) {
      let html = await readFile(path.join(root, 'tests/browser/index.html'), 'utf8');
      if (route.startsWith('/shorts/')) html = html.replace('/sample.mp4', '/portrait.mp4');
      html = html.replace('<!-- scripts -->', manifest.content_scripts[0].js.map(file => `<script src="/extension/${file}"></script>`).join('\n'));
      res.setHeader('Content-Type', 'text/html'); res.end(html); return;
    }
    if (route === '/sample.mp4' || route === '/portrait.mp4') route = '/tests/browser' + route;
    const file = path.resolve(root, '.' + route);
    if (!file.startsWith(root + path.sep) || /(?:\.git|node_modules|\.env)/.test(route)) { res.writeHead(403); res.end(); return; }
    let content = await readFile(file);
    if ((route.endsWith('/options.html') || route.endsWith('/popup.html'))) content = content.toString().replace('<head>', '<head><script src="/tests/browser/chrome-stub.js"></script>');
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp4': 'video/mp4', '.png': 'image/png' };
    res.setHeader('Content-Type', mime[path.extname(file)] || 'text/plain');
    if (route.endsWith('.mp4')) {
      res.setHeader('Accept-Ranges','bytes');
      const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
      if (range) {
        const start=Number(range[1]), end=Math.min(range[2] ? Number(range[2]) : content.length-1,content.length-1);
        if (start > end || start >= content.length) { res.writeHead(416,{'Content-Range':`bytes */${content.length}`}); res.end(); return; }
        res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${content.length}`,'Content-Length':end-start+1});
        res.end(content.subarray(start,end+1)); return;
      }
      res.setHeader('Content-Length',content.length);
    }
    res.end(content);
  } catch { res.writeHead(404); res.end(); }
}).listen(Number(process.env.PORT || 8765), '127.0.0.1', () => console.log(`FloatPlayer fixture: http://127.0.0.1:${process.env.PORT || 8765}/watch?v=AAAAAAAAAAA`));
