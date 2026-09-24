'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { runAgent, connectionConfig, UserError } = require('./agent.cjs');
const ROOT = path.resolve(__dirname, '..');
const MAX_BODY = 12 * 1024 * 1024;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
function json(res, status, value) { if (res.destroyed) return; res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(value)); }
function validateOrigin(req) {
  const host = req.headers.host || '';
  if (!/^(127\.0\.0\.1|localhost|\[::1\])(?::\d{1,5})?$/.test(host)) throw new UserError('只允许通过本机地址访问。', 403);
  if (req.headers.origin && req.headers.origin !== `http://${host}`) throw new UserError('不允许跨站请求，请从同一地址打开工作台。', 403);
  if (req.headers['sec-fetch-site'] === 'cross-site') throw new UserError('不允许跨站请求。', 403);
}
async function readBody(req) {
  if (!(req.headers['content-type'] || '').match(/^application\/json(?:\s*;\s*charset=utf-8)?$/i)) throw new UserError('请求必须使用 JSON。', 415);
  if (Number(req.headers['content-length']) > MAX_BODY) throw new UserError('数据超过 12 MB，请截取需要复盘的时段。', 413);
  let bytes = 0; const chunks = [];
  for await (const chunk of req) { bytes += chunk.length; if (bytes > MAX_BODY) throw new UserError('数据超过 12 MB，请截取需要复盘的时段。', 413); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new UserError('请求 JSON 无效。'); }
}
async function serveStatic(req, res) {
  let pathname;
  try { pathname = decodeURIComponent(req.url.split('?')[0]); } catch { throw new UserError('路径无效。'); }
  if (pathname === '/') pathname = '/review/index.html';
  if (pathname === '/review' || pathname === '/review/') pathname = '/review/index.html';
  const segments = pathname.split('/').slice(1);
  if (segments.some(segment => !segment || segment.startsWith('.') || !/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(segment)) || pathname.includes('.test.')) throw new UserError('文件不存在。', 404);
  const allowed = ['/index.html', '/moisture-analyzer.html'].includes(pathname) || pathname.startsWith('/review/');
  const mime = TYPES[path.extname(pathname)];
  if (!allowed || !mime) throw new UserError('文件不存在。', 404);
  const filename = path.join(ROOT, pathname);
  let actual, stat;
  try { actual = await fs.realpath(filename); stat = await fs.stat(actual); } catch { throw new UserError('文件不存在。', 404); }
  if (actual !== filename || !stat.isFile() || stat.size > 15 * 1024 * 1024) throw new UserError('文件不存在。', 404);
  const data = await fs.readFile(actual);
  res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
  res.end(req.method === 'HEAD' ? undefined : data);
}
function createServer(options = {}) {
  const env = options.env || process.env;
  return http.createServer(async (req, res) => {
    const controller = new AbortController();
    res.on('close', () => { if (!res.writableEnded) controller.abort(); });
    req.on('aborted', () => controller.abort());
    try {
      validateOrigin(req);
      const pathname = req.url.split('?')[0];
      if (pathname === '/api/status' && req.method === 'GET') {
        let configured = false, model = null;
        try { const config = connectionConfig(undefined, env); configured = true; model = config.model; } catch { /* No secrets or configuration errors are returned. */ }
        return json(res, 200, { available: true, configured, model });
      }
      if (pathname === '/api/agent' && req.method === 'POST') {
        const body = await readBody(req);
        const output = await runAgent(body, { env, signal: controller.signal, transport: options.transport, timeoutMs: options.timeoutMs });
        return json(res, 200, output);
      }
      if (pathname.startsWith('/api/')) throw new UserError('接口不存在或请求方法不支持。', 404);
      if (!['GET', 'HEAD'].includes(req.method)) throw new UserError('请求方法不支持。', 405);
      await serveStatic(req, res);
    } catch (error) {
      json(res, error instanceof UserError ? error.status : 500, { error: error instanceof UserError ? error.message : '分析服务出现异常，未生成结论。请检查数据或稍后重试。' });
    }
  });
}
if (require.main === module) {
  const server = createServer();
  server.listen(8767, '127.0.0.1', () => process.stdout.write('DataLens: http://127.0.0.1:8767/review/\n'));
  server.on('error', () => { process.stderr.write('DataLens 启动失败，请检查 8767 端口是否已被占用。\n'); process.exitCode = 1; });
}
module.exports = { createServer };
